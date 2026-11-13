import time
import json
import threading
from datetime import datetime
from typing import Optional, Dict, Any, Generator, List
import cv2
import numpy as np

from src.config import settings, CameraConfig
from src.camera import RTSPStreamReader
from src.detector import VehicleDetector
from src.parking_engine import ParkingEngine
from src.annotator import FrameAnnotator

class CameraWorker:
    """Encapsulates stream capture, parking engine, and cached state for one CCTV camera."""
    def __init__(self, cam_cfg: CameraConfig, config=settings):
        self.cam_id = cam_cfg.id
        self.name = cam_cfg.name
        self.config = config
        
        self.camera = RTSPStreamReader(source=cam_cfg.source, name=self.name)
        self.engine = ParkingEngine(
            camera_id=self.cam_id,
            slots_file=cam_cfg.slots_file,
            overlap_threshold=self.config.overlap_threshold,
            history_size=self.config.history_size
        )

        self.lock = threading.Lock()
        self._latest_annotated: Optional[np.ndarray] = None
        self._latest_status: Dict[str, Any] = self.engine.get_summary_status()
        self._latest_status["name"] = self.name
        self._last_detections: List[Dict[str, Any]] = []

        # Encode initial frame so stream is ready immediately
        init_frame = self.camera.get_latest_frame()
        if init_frame is not None:
            _, init_jpeg = cv2.imencode(".jpg", init_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            self._latest_jpeg: Optional[bytes] = init_jpeg.tobytes()
        else:
            self._latest_jpeg = None

    def start(self):
        self.camera.start()

    def stop(self):
        self.camera.stop()

    def update_frame(self, detections: List[Dict[str, Any]], frame: np.ndarray):
        occupancy = self.engine.evaluate_frame(frame, detections)
        status = self.engine.get_summary_status()
        status["name"] = self.name

        # Annotate with camera label in HUD
        annotated = FrameAnnotator.annotate(
            frame=frame,
            slots=self.engine.slots,
            occupancy=occupancy,
            detections=detections,
            draw_detections=False,
            camera_name=self.name
        )

        ret, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])

        with self.lock:
            self._latest_annotated = annotated
            if ret:
                self._latest_jpeg = jpeg.tobytes()
            self._latest_status = status
            self._last_detections = detections

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            return dict(self._latest_status)

    def get_latest_jpeg(self) -> Optional[bytes]:
        with self.lock:
            return self._latest_jpeg

class VisionParkPipeline:
    """
    Scalable Multi-Camera Video Processing & Parking Coordination Pipeline.
    
    Optimized for Raspberry Pi 5 & Laptop:
    - Dedicated zero-lag grabber threads per CCTV camera.
    - Single shared YOLO11n detector instance in memory (prevents RAM & cache waste).
    - Periodic round-robin inference (0.5s interval keeps Pi 5 CPU cool).
    - Simultaneous live MJPEG streams for each camera.
    - Unified aggregate metrics for frontend dashboard.
    """
    def __init__(self, config=settings):
        self.config = config
        
        # 1 shared detector in memory across all cameras
        self.detector = VehicleDetector(
            model_path=self.config.model_path,
            confidence=self.config.confidence,
            imgsz=self.config.imgsz
        )

        # Initialize workers for all configured cameras
        self.workers: Dict[str, CameraWorker] = {}
        for cam_id, cam_cfg in self.config.cameras.items():
            self.workers[cam_id] = CameraWorker(cam_cfg=cam_cfg, config=self.config)

        self.running = False
        self.inference_thread: Optional[threading.Thread] = None

    def start(self):
        if self.running:
            return
        self.running = True
        
        for worker in self.workers.values():
            worker.start()

        self.inference_thread = threading.Thread(target=self._inference_loop, daemon=True)
        self.inference_thread.start()
        print(f"[Pipeline] VisionPark running with {len(self.workers)} camera(s).")

    def stop(self):
        self.running = False
        if self.inference_thread and self.inference_thread.is_alive():
            self.inference_thread.join(timeout=2.0)
        for worker in self.workers.values():
            worker.stop()
        print("[Pipeline] VisionPark stopped.")

    def _inference_loop(self):
        last_eval_time = 0.0

        while self.running:
            now = time.time()
            if (now - last_eval_time) >= self.config.interval_sec:
                for cam_id, worker in list(self.workers.items()):
                    if not self.running:
                        break
                    frame = worker.camera.get_latest_frame()
                    if frame is None:
                        continue
                    try:
                        if worker.camera._connected:
                            detections = self.detector.detect(frame)
                            worker.update_frame(detections, frame)
                        else:
                            # Camera offline: update JPEG with placeholder
                            ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
                            if ret:
                                with worker.lock:
                                    worker._latest_jpeg = jpeg.tobytes()
                    except Exception as e:
                        print(f"[Pipeline] Error on {cam_id}: {e}")

                last_eval_time = now

            time.sleep(0.02)

    def reload_slots(self, camera_id: Optional[str] = None):
        """Reloads slots from file for a specific camera or all cameras."""
        if camera_id and camera_id in self.workers:
            worker = self.workers[camera_id]
            cam_cfg = self.config.cameras.get(camera_id)
            if cam_cfg:
                worker.engine.reload_slots(cam_cfg.slots_file)
        else:
            for c_id, worker in self.workers.items():
                cam_cfg = self.config.cameras.get(c_id)
                if cam_cfg:
                    worker.engine.reload_slots(cam_cfg.slots_file)

    def get_status(self, camera_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns parking occupancy metrics:
        - If camera_id is given: returns that camera's metrics.
        - If camera_id is None: returns aggregated total metrics + breakdown by camera.
        """
        if camera_id and camera_id in self.workers:
            return self.workers[camera_id].get_status()

        # Unified aggregate across all cameras
        total = 0
        occupied = 0
        available = 0
        all_slots = []
        cameras_breakdown = {}

        for c_id, worker in self.workers.items():
            cam_stat = worker.get_status()
            cameras_breakdown[c_id] = cam_stat
            total += cam_stat.get("total", 0)
            occupied += cam_stat.get("occupied", 0)
            available += cam_stat.get("available", 0)
            all_slots.extend(cam_stat.get("slots", []))

        pct = round((occupied / total * 100), 1) if total > 0 else 0.0

        return {
            "total": total,
            "occupied": occupied,
            "available": available,
            "occupancy_percentage": pct,
            "last_updated": datetime.now().strftime("%H:%M:%S"),
            "cameras": cameras_breakdown,
            "slots": all_slots  # Flat list for seamless frontend compatibility
        }

    def get_all_slots(self, camera_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns slot configurations (for marking or map rendering)."""
        if camera_id and camera_id in self.workers:
            return self.workers[camera_id].engine.slots
        
        combined = []
        for worker in self.workers.values():
            combined.extend(worker.engine.slots)
        return combined

    def get_latest_jpeg(self, camera_id: Optional[str] = None) -> Optional[bytes]:
        """Returns latest annotated frame JPEG for a specific camera or first camera."""
        if camera_id and camera_id in self.workers:
            return self.workers[camera_id].get_latest_jpeg()
        # Fallback to first available camera
        if self.workers:
            first_worker = next(iter(self.workers.values()))
            return first_worker.get_latest_jpeg()
        return None

    def generate_mjpeg_stream(self, camera_id: Optional[str] = None) -> Generator[bytes, None, None]:
        """Generates continuous MJPEG multipart stream for a camera."""
        frame_delay = 1.0 / max(1, self.config.stream_fps)
        while True:
            frame_bytes = self.get_latest_jpeg(camera_id)
            if frame_bytes:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )
            time.sleep(frame_delay)

    # Legacy compatibility properties
    @property
    def engine(self):
        first = next(iter(self.workers.values()))
        return first.engine

import cv2
import time
import threading
from pathlib import Path
from datetime import datetime
from parking import ParkingEngine, PARKING_SLOTS

BASE_DIR = Path(__file__).resolve().parent
VIDEO_PATH = BASE_DIR / "videos" / "parking demo video.mp4"

def get_video(video_path=VIDEO_PATH):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")
    return cap

class CCTVCameraStream:
    """
    Live CCTV Camera Stream Manager.
    Simulates a 24/7 continuous CCTV feed from video data:
    - Runs in a background thread at native FPS
    - Seamlessly loops the footage
    - Computes real-time slot occupancy with high accuracy
    - Produces annotated frames with slot boundaries and stats
    - Thread-safe caching for instant API response times
    """
    def __init__(self, video_path=VIDEO_PATH, loop=True):
        self.video_path = Path(video_path)
        self.loop = loop
        self.engine = ParkingEngine(slots=PARKING_SLOTS)

        self.running = False
        self.thread = None
        self.lock = threading.Lock()

        self._latest_raw_frame = None
        self._latest_annotated_frame = None
        self._latest_jpeg = None
        self._latest_status = {
            "total": len(PARKING_SLOTS),
            "occupied": 0,
            "available": len(PARKING_SLOTS),
            "occupancy_percentage": 0.0,
            "last_updated": datetime.now().strftime("%H:%M:%S"),
            "slots": [{"id": s["id"], "occupied": False} for s in PARKING_SLOTS]
        }
        self.subscribers = []

        # Read initial frame
        self._load_initial_frame()

    def _load_initial_frame(self):
        try:
            cap = cv2.VideoCapture(str(self.video_path))
            if cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    self._process_single_frame(frame)
                cap.release()
        except Exception as e:
            print(f"Warning: Could not load initial frame: {e}")

    def _process_single_frame(self, frame):
        occupancy = self.engine.process_frame(frame)
        annotated = self.engine.annotate_frame(frame, occupancy)
        ret, jpeg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])

        occupied_count = sum(1 for status in occupancy.values() if status)
        total = len(PARKING_SLOTS)
        available_count = total - occupied_count

        status = {
            "total": total,
            "occupied": occupied_count,
            "available": available_count,
            "occupancy_percentage": round((occupied_count / total) * 100, 1) if total else 0.0,
            "last_updated": datetime.now().strftime("%H:%M:%S"),
            "slots": [
                {"id": s["id"], "occupied": bool(occupancy.get(s["id"], False))}
                for s in PARKING_SLOTS
            ]
        }

        with self.lock:
            self._latest_raw_frame = frame
            self._latest_annotated_frame = annotated
            if ret:
                self._latest_jpeg = jpeg.tobytes()
            self._latest_status = status

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_stream, daemon=True)
        self.thread.start()
        print(f"[CCTV Camera] Live background stream started from {self.video_path.name}")

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        print("[CCTV Camera] Stream stopped")

    def _run_stream(self):
        while self.running:
            cap = cv2.VideoCapture(str(self.video_path))
            if not cap.isOpened():
                print(f"[CCTV Camera] Error opening video file: {self.video_path}")
                time.sleep(1.0)
                continue

            fps = cap.get(cv2.CAP_PROP_FPS)
            delay = (1.0 / fps) if (fps and fps > 0) else 0.04

            while self.running:
                start_time = time.time()
                ret, frame = cap.read()

                if not ret:
                    if self.loop:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        break

                self._process_single_frame(frame)

                # Maintain realistic video playback rate
                elapsed = time.time() - start_time
                sleep_time = max(0.001, delay - elapsed)
                time.sleep(sleep_time)

            cap.release()

    def get_latest_status(self):
        with self.lock:
            return dict(self._latest_status)

    def get_latest_frame(self, annotated=True):
        with self.lock:
            if annotated:
                return self._latest_annotated_frame.copy() if self._latest_annotated_frame is not None else None
            return self._latest_raw_frame.copy() if self._latest_raw_frame is not None else None

    def get_latest_jpeg(self):
        with self.lock:
            return self._latest_jpeg

    def generate_mjpeg_stream(self):
        while True:
            frame_bytes = self.get_latest_jpeg()
            if frame_bytes:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
                )
            time.sleep(0.04)

# Global singleton CCTV stream instance
cctv_stream = CCTVCameraStream()

def test_video():
    cap = get_video()
    fps = cap.get(cv2.CAP_PROP_FPS)
    delay = max(1, int(1000 / fps))

    print(f"Video FPS: {fps}")
    print(f"Frame delay: {delay} ms")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        cv2.imshow("VisionPark Camera", frame)
        if cv2.waitKey(delay) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    test_video()
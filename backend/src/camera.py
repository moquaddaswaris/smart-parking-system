import os
import time
import threading
from typing import Optional, Tuple, Union
import cv2
import numpy as np

def create_offline_frame(width: int = 1280, height: int = 720, text: str = "Connecting to camera...") -> np.ndarray:
    """Generates a clean placeholder frame when camera is connecting or offline."""
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:] = (25, 28, 35) # Dark slate
    # Center text
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
    cx = max(20, (width - tw) // 2)
    cy = (height + th) // 2
    cv2.putText(frame, text, (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (120, 180, 240), 2, cv2.LINE_AA)
    return frame

class RTSPStreamReader:
    """
    Ultra-low-latency RTSP and Video Stream Reader.
    
    Optimized for multi-camera CCTV setups on Raspberry Pi 5 & Windows:
    - Thread-isolated frame grabbing eliminates queue latency.
    - Non-blocking auto-reconnect if a camera drops or reboots.
    - Forces TCP transport to prevent UDP packet drop and video tearing.
    - Graceful fallback with offline placeholder frames.
    """
    def __init__(
        self,
        source: Union[str, int],
        name: str = "CCTV Camera",
        rtsp_transport: str = "tcp",
        reconnect_delay: float = 3.0
    ):
        self.source = source
        self.name = name
        self.rtsp_transport = rtsp_transport
        self.reconnect_delay = reconnect_delay
        
        self.is_rtsp = isinstance(self.source, str) and self.source.startswith("rtsp://")
        self.is_video_file = isinstance(self.source, str) and not self.is_rtsp and not self.source.startswith("http://")
        
        # Configure OpenCV FFMPEG transport & connection timeout for RTSP (5s timeout)
        if self.is_rtsp:
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{self.rtsp_transport}|stimeout;5000000"

        self.cap: Optional[cv2.VideoCapture] = None
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()
        
        self._connected = False
        self._fps = 25.0
        self._frame_width = 1280
        self._frame_height = 720
        self._last_frame_time = 0.0
        self._latest_frame: Optional[np.ndarray] = create_offline_frame(
            self._frame_width, self._frame_height, f"[{self.name}] Connecting: {self.source}"
        )

    def _open_capture(self) -> bool:
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass

        print(f"[{self.name}] Connecting to: {self.source}")
        try:
            if self.is_rtsp:
                self.cap = cv2.VideoCapture(self.source, cv2.CAP_FFMPEG)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            else:
                self.cap = cv2.VideoCapture(self.source)

            if not self.cap or not self.cap.isOpened():
                print(f"[{self.name}] Failed to connect to {self.source}. Will retry...")
                self._connected = False
                with self.lock:
                    self._latest_frame = create_offline_frame(
                        self._frame_width, self._frame_height, f"[{self.name}] Offline - Retrying..."
                    )
                return False

            detected_fps = self.cap.get(cv2.CAP_PROP_FPS)
            if detected_fps and detected_fps > 0:
                self._fps = detected_fps
                
            w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            if w > 0 and h > 0:
                self._frame_width, self._frame_height = w, h

            self._connected = True
            print(f"[{self.name}] Connected ({self._frame_width}x{self._frame_height} @ {self._fps:.1f} FPS)")
            return True
        except Exception as e:
            print(f"[{self.name}] Connection exception: {e}")
            self._connected = False
            return False

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
        self._connected = False
        print(f"[{self.name}] Stream reader stopped.")

    def _worker_loop(self):
        while self.running:
            if not self._connected or self.cap is None or not self.cap.isOpened():
                if not self._open_capture():
                    time.sleep(self.reconnect_delay)
                    continue

            frame_delay = (1.0 / self._fps) if (self._fps > 0) else 0.04

            while self.running:
                start_time = time.time()
                ret, frame = self.cap.read()
                
                if not ret:
                    if self.is_video_file:
                        # Seamlessly loop local video
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        print(f"[{self.name}] Stream disconnected. Reconnecting...")
                        self._connected = False
                        with self.lock:
                            self._latest_frame = create_offline_frame(
                                self._frame_width, self._frame_height, f"[{self.name}] Reconnecting..."
                            )
                        break

                with self.lock:
                    self._latest_frame = frame
                    self._last_frame_time = time.time()

                if self.is_video_file:
                    elapsed = time.time() - start_time
                    sleep_time = max(0.001, frame_delay - elapsed)
                    time.sleep(sleep_time)
                else:
                    time.sleep(0.002)

            time.sleep(self.reconnect_delay)

    def get_latest_frame(self) -> Optional[np.ndarray]:
        with self.lock:
            if self._latest_frame is not None:
                return self._latest_frame.copy()
            return None

    def is_healthy(self) -> bool:
        if not self._connected:
            return False
        return (time.time() - self._last_frame_time) < 5.0

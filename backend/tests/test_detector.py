import sys
from pathlib import Path
import cv2

# Add backend root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import settings
from src.camera import RTSPStreamReader
from src.detector import VehicleDetector

def test_detector_inference():
    print(f"[Test Detector] Testing source: {settings.camera_source}")
    reader = RTSPStreamReader(source=settings.camera_source)
    reader.start()
    
    # Wait for frame
    import time
    frame = None
    for _ in range(20):
        frame = reader.get_latest_frame()
        if frame is not None:
            break
        time.sleep(0.1)

    reader.stop()

    if frame is None:
        print("[Test Detector] ERROR: Could not acquire frame.")
        return False

    print(f"[Test Detector] Frame acquired ({frame.shape[1]}x{frame.shape[0]})")
    detector = VehicleDetector(model_path=settings.model_path, confidence=0.2)
    detections = detector.detect(frame)
    print(f"[Test Detector] SUCCESS: Detected {len(detections)} objects.")
    for d in detections[:5]:
        print(f" - {d['class_name']} (conf: {d['confidence']}): bbox={d['bbox']}")
    return True

if __name__ == "__main__":
    success = test_detector_inference()
    sys.exit(0 if success else 1)

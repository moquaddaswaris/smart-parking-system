import sys
from pathlib import Path
import time

# Add backend root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import Config, settings
from src.pipeline import VisionParkPipeline

def test_pipeline_execution():
    print("[Test Pipeline] Creating test configuration with local video...")
    test_cfg = Config()
    # Configure 2 test cameras using the demo video
    test_cfg.cameras = {
        "cam1": test_cfg.cameras.get("cam1"),
        "cam2": test_cfg.cameras.get("cam2")
    }
    # Point both to demo video for the automated test
    for c in test_cfg.cameras.values():
        c.source = str(BASE_DIR / "videos" / "parking_demo.mp4")

    print(f"[Test Pipeline] Initializing pipeline with {len(test_cfg.cameras)} test camera(s)...")
    pipeline = VisionParkPipeline(config=test_cfg)
    pipeline.start()

    print("[Test Pipeline] Waiting for frame & inference (up to 15s)...")
    start = time.time()
    jpeg = None
    while time.time() - start < 15.0:
        jpeg = pipeline.get_latest_jpeg("cam1")
        status = pipeline.get_status()
        if jpeg is not None and len(jpeg) > 1000 and status.get("occupied", 0) > 0:
            break
        time.sleep(0.5)

    status = pipeline.get_status()
    print("[Test Pipeline] Multi-Camera Pipeline Status:")
    print(f" - Total slots across all cams: {status.get('total')}")
    print(f" - Occupied:                    {status.get('occupied')}")
    print(f" - Available:                   {status.get('available')}")
    print(f" - Occupancy %:                 {status.get('occupancy_percentage')}%")
    print(f" - Cameras breakdown:           {list(status.get('cameras', {}).keys())}")
    print(f" - JPEG frame size (cam1):      {len(jpeg) if jpeg else 0} bytes")

    pipeline.stop()

    assert status.get("total", 0) > 0, "No parking slots loaded"
    assert jpeg is not None and len(jpeg) > 1000, "JPEG generation failed"
    print("[Test Pipeline] SUCCESS: Multi-camera pipeline test passed!")
    return True

if __name__ == "__main__":
    try:
        test_pipeline_execution()
        sys.exit(0)
    except Exception as e:
        print(f"[Test Pipeline] FAILED: {e}")
        sys.exit(1)

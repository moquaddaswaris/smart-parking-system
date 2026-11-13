#!/usr/bin/env python3
"""
VisionPark Master Entry Point
Scalable Multi-Camera Smart Parking System for Raspberry Pi 5 & Windows Laptop.

Usage:
  # Start the multi-camera server:
  python run.py
  python run.py --port 8000

  # Mark parking slots for Camera 1 or Camera 2:
  python run.py --mark --camera cam1
  python run.py --mark --camera cam2

  # Mark slots on any custom camera URL:
  python run.py --mark --source "rtsp://username:password@ip:554/stream1"

  # Run headless terminal monitor:
  python run.py --headless
"""

import sys
import argparse
from pathlib import Path

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import settings

def parse_args():
    parser = argparse.ArgumentParser(description="VisionPark Multi-Camera Smart Parking System")
    parser.add_argument("--camera", type=str, default=None, help="Target camera ID (e.g. cam1, cam2)")
    parser.add_argument("--source", type=str, default=None, help="Custom RTSP URL or video path (overrides config)")
    parser.add_argument("--mark", action="store_true", help="Launch interactive 4-point polygon slot marker")
    parser.add_argument("--points", type=int, default=4, help="Number of corners per slot (default: 4 for quadrilaterals)")
    parser.add_argument("--start-id", type=int, default=None, help="Initial slot number (e.g. 1 for cam1, 13 for cam2)")
    parser.add_argument("--fresh", action="store_true", help="Start with a fresh clean slate (ignore previous markers)")
    parser.add_argument("--headless", action="store_true", help="Run in headless terminal mode (prints live occupancy)")
    parser.add_argument("--host", type=str, default=None, help="Server host (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=None, help="Server port (default: 8000)")
    parser.add_argument("--interval", type=float, default=None, help="Detection interval in seconds (default: 0.5)")
    return parser.parse_args()

def main():
    args = parse_args()

    # Override config with CLI arguments if provided
    if args.host:
        settings.host = args.host
    if args.port:
        settings.port = args.port
    if args.interval:
        settings.interval_sec = args.interval

    # 1. Slot Marking Mode
    if args.mark:
        from scripts.mark_slots import PolygonSlotMarker
        target_cam_id = args.camera or "cam1"
        cam_cfg = settings.cameras.get(target_cam_id) or settings.get_camera()

        cam_src = args.source or (cam_cfg.source if cam_cfg else "videos/parking_demo.mp4")
        out_file = str(cam_cfg.slots_file) if cam_cfg else "config/slots_cam1.json"

        marker = PolygonSlotMarker(
            source=cam_src,
            output_file=out_file,
            camera_id=target_cam_id,
            points_per_slot=args.points,
            fresh=args.fresh,
            start_id=args.start_id
        )
        marker.run()
        return

    # 2. Headless Terminal Mode
    if args.headless:
        from scripts.run_headless import main as run_headless_main
        run_headless_main()
        return

    # 3. Default: Full FastAPI Server with REST, WebSocket & MJPEG Stream
    import uvicorn
    from src.api import app

    lan_ip = "localhost"
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        lan_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("=" * 68)
    print(" VisionPark Multi-Camera Parking Server")
    print("=" * 68)
    print(f" Local Browser URL : http://localhost:{settings.port}")
    print(f" Network (LAN) URL : http://{lan_ip}:{settings.port}")
    print(f" Swagger API Docs  : http://localhost:{settings.port}/docs")
    print(f" Status Endpoint   : http://localhost:{settings.port}/api/parking/status")
    print("-" * 68)
    print(" Active Cameras:")
    for c_id, cam in settings.cameras.items():
        print(f"  [{c_id}] {cam.name}")
        print(f"    Live Stream    : http://localhost:{settings.port}/api/parking/stream/{c_id}")
    print("-" * 68)
    print(" NOTE: Do NOT type '0.0.0.0' into your web browser.")
    print("       '0.0.0.0' is only an internal bind address.")
    print("       Always use: http://localhost:8000 or http://127.0.0.1:8000")
    print("=" * 68)

    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")

if __name__ == "__main__":
    main()

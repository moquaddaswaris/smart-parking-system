#!/usr/bin/env python3
"""
VisionPark Headless Multi-Camera Monitor
Continuously monitors CCTV streams and outputs real-time parking data to console.
Works on Raspberry Pi 5 & Laptop without GUI/display.
"""

import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import settings
from src.pipeline import VisionParkPipeline

def parse_args():
    parser = argparse.ArgumentParser(description="VisionPark Headless Multi-Camera Monitor")
    parser.add_argument("--interval", type=float, default=None, help="Detection interval in seconds (e.g. 0.5)")
    parser.add_argument("--conf", type=float, default=None, help="Detection confidence threshold (e.g. 0.25)")
    return parser.parse_args()

def main():
    args = parse_args()
    
    if args.interval:
        settings.interval_sec = args.interval
    if args.conf:
        settings.confidence = args.conf

    print("=" * 68, flush=True)
    print(" VisionPark Multi-Camera Real-Time Monitor (Pi 5 & Laptop)", flush=True)
    print("=" * 68, flush=True)
    print(f" Model    : {settings.model_path}", flush=True)
    print(f" Interval : {settings.interval_sec}s", flush=True)
    print(" Active Cameras:", flush=True)
    for c_id, cam in settings.cameras.items():
        print(f"  - [{c_id}] {cam.name}: {cam.source}", flush=True)
    print("=" * 68, flush=True)

    pipeline = VisionParkPipeline(config=settings)
    pipeline.start()

    print("[VisionPark] Waiting for video streams & first inference...", flush=True)
    time.sleep(2.0)

    try:
        last_timestamp = None
        while True:
            status = pipeline.get_status()
            timestamp = status.get("last_updated", "")

            if timestamp and timestamp != last_timestamp:
                total = status.get("total", 0)
                occupied = status.get("occupied", 0)
                available = status.get("available", 0)
                pct = status.get("occupancy_percentage", 0.0)
                cameras = status.get("cameras", {})

                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                print(
                    f"\n[{now_str}] TOTAL: {total} spaces | Occupied: {occupied} | Available: {available} ({100-pct:4.1f}% Free)",
                    flush=True
                )

                for c_id, c_data in cameras.items():
                    c_name = c_data.get("name", c_id)
                    c_occ = c_data.get("occupied", 0)
                    c_avail = c_data.get("available", 0)
                    c_slots = c_data.get("slots", [])

                    slot_icons = []
                    for s in c_slots[:10]:
                        icon = "🚗" if s["occupied"] else "🟩"
                        slot_icons.append(f"P{s['id']:02d}:{icon}")
                    icons_str = " ".join(slot_icons)
                    if len(c_slots) > 10:
                        icons_str += f" ... (+{len(c_slots)-10} more)"

                    print(f"  -> [{c_name}] Occ: {c_occ}/{len(c_slots)} | Free: {c_avail} | {icons_str}", flush=True)

                last_timestamp = timestamp

            time.sleep(settings.interval_sec)

    except KeyboardInterrupt:
        print("\n[VisionPark] Shutting down cleanly...", flush=True)
    finally:
        pipeline.stop()

if __name__ == "__main__":
    main()

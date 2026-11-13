#!/usr/bin/env python3
"""
VisionPark Interactive Skewed Polygon Slot Marking Tool
Allows users to mark 4-point (or multi-point) parking polygons on a live CCTV RTSP stream or video feed.
Supports perspective distortion, skewed parking bays, and angled cameras.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import settings
from src.camera import RTSPStreamReader

def parse_args():
    parser = argparse.ArgumentParser(description="Interactive CCTV Skewed Polygon Slot Marker")
    parser.add_argument(
        "--camera",
        type=str,
        default=None,
        help="Camera ID to mark slots for (e.g. cam1, cam2)"
    )
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="RTSP camera URL, video file path, or webcam index (overrides config)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Path to save slots JSON file (overrides config)"
    )
    parser.add_argument(
        "--points-per-slot",
        type=int,
        default=4,
        help="Number of corner points per slot (default: 4 for quadrilaterals)"
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Start with a fresh clean slate (ignore existing marked slots)"
    )
    parser.add_argument(
        "--start-id",
        type=int,
        default=None,
        help="Initial slot ID number (e.g. 1 for cam1, 13 for cam2)"
    )
    parser.add_argument(
        "--snapshot",
        action="store_true",
        help="Capture and save a single frame from the camera and exit"
    )
    return parser.parse_args()

class PolygonSlotMarker:
    def __init__(self, source, output_file: str, camera_id: str = "cam1", points_per_slot: int = 4, fresh: bool = False, start_id: Optional[int] = None):
        self.source = source
        self.output_file = Path(output_file)
        self.camera_id = camera_id
        self.points_per_slot = points_per_slot
        self.fresh = fresh
        self.start_id = start_id
        self.slots: List[Dict[str, Any]] = []
        self.current_points: List[Tuple[int, int]] = []
        self.mouse_pos: Tuple[int, int] = (0, 0)
        self.frame = None
        self.window_name = f"VisionPark Slot Marker [{camera_id}]"

        # Load existing slots unless --fresh was specified
        if not self.fresh:
            self._load_existing_slots()
        else:
            print(f"[Marker] Starting with a clean slate for {camera_id}.")

    def _load_existing_slots(self):
        if self.output_file.exists():
            try:
                with open(self.output_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # Normalize legacy rectangular slots into polygon points if needed
                for item in data:
                    if "points" not in item and "x1" in item:
                        x1, y1, x2, y2 = item["x1"], item["y1"], item["x2"], item["y2"]
                        item["points"] = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
                self.slots = data
                print(f"[Marker] Loaded {len(self.slots)} existing slots from {self.output_file}")
            except Exception as e:
                print(f"[Marker] Warning: Could not read existing slots: {e}")

    def fetch_live_frame(self, reader: RTSPStreamReader, timeout=10.0):
        print("[Marker] Waiting for frame from camera...")
        start = cv2.getTickCount()
        while (cv2.getTickCount() - start) / cv2.getTickFrequency() < timeout:
            frame = reader.get_latest_frame()
            if frame is not None:
                return frame
            cv2.waitKey(50)
        return None

    def _add_completed_slot(self, points: List[Tuple[int, int]]):
        if self.slots:
            next_id = max([s["id"] for s in self.slots]) + 1
        elif self.start_id is not None:
            next_id = self.start_id
        else:
            # Auto-continue numbering if cam2
            start_offset = 0
            if self.camera_id != "cam1":
                cam1_file = self.output_file.parent / "slots_cam1.json"
                if cam1_file.exists():
                    try:
                        with open(cam1_file) as f:
                            s1 = json.load(f)
                            if s1:
                                start_offset = max(s["id"] for s in s1)
                    except Exception:
                        pass
            next_id = start_offset + 1
        
        # Calculate bounding box
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        x1, x2 = min(xs), max(xs)
        y1, y2 = min(ys), max(ys)

        new_slot = {
            "id": next_id,
            "camera_id": self.camera_id,
            "points": [[int(p[0]), int(p[1])] for p in points],
            "x1": int(x1),
            "y1": int(y1),
            "x2": int(x2),
            "y2": int(y2)
        }
        self.slots.append(new_slot)
        print(f"-> Marked Slot P{next_id:02d} ({len(points)} points): {new_slot['points']}")

    def mouse_callback(self, event, x, y, flags, param):
        self.mouse_pos = (x, y)

        if event == cv2.EVENT_LBUTTONDOWN:
            self.current_points.append((x, y))
            idx = len(self.current_points)
            print(f"Slot Corner {idx}/{self.points_per_slot}: ({x}, {y})")

            # Check if required corner points reached
            if len(self.current_points) == self.points_per_slot:
                self._add_completed_slot(self.current_points)
                self.current_points = []

        elif event == cv2.EVENT_RBUTTONDOWN:
            # Right-click completes polygon early (if at least 3 points clicked)
            if len(self.current_points) >= 3:
                self._add_completed_slot(self.current_points)
                self.current_points = []
            elif len(self.current_points) > 0:
                print("[Marker] Need at least 3 points to complete a polygon.")

    def save(self):
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.output_file, "w", encoding="utf-8") as f:
            json.dump(self.slots, f, indent=2)
        print(f"\n[Marker] SUCCESS: Saved {len(self.slots)} polygon slots to {self.output_file}")

        # Also sync to backend root parking_slots.json for backward compatibility
        root_slots = BASE_DIR / "parking_slots.json"
        try:
            with open(root_slots, "w", encoding="utf-8") as f:
                json.dump(self.slots, f, indent=2)
        except Exception:
            pass

    def run(self):
        reader = RTSPStreamReader(source=self.source)
        reader.start()

        self.frame = self.fetch_live_frame(reader)
        if self.frame is None:
            reader.stop()
            print(f"[Marker] ERROR: Failed to obtain frame from source: {self.source}")
            return

        print("\n" + "=" * 68)
        print(" VISIONPARK SKEWED POLYGON SLOT MARKER")
        print("=" * 68)
        print(f" MODE: {self.points_per_slot}-Point Polygon Selector (Perspective/Skewed CCTV)")
        print(" CONTROLS:")
        print(f"  - Left Click (4 points)  : Click the 4 corners of each parking bay")
        print("  - Right Click / Enter    : Finish polygon early (minimum 3 points)")
        print("  - 'u' / Backspace        : Undo last point (or last slot)")
        print("  - 'c'                    : Clear current points (or all slots)")
        print("  - 'r'                    : Refresh frame from live camera feed")
        print("  - 's'                    : Save slots to JSON file")
        print("  - 'q' / ESC              : Save and Quit")
        print("=" * 68 + "\n")

        try:
            cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
            cv2.setMouseCallback(self.window_name, self.mouse_callback)
        except Exception as e:
            print(f"[Marker] GUI Error (No X11 display?): {e}")
            snap_path = BASE_DIR / "config" / "camera_snapshot.jpg"
            cv2.imwrite(str(snap_path), self.frame)
            print(f"[Marker] Saved camera snapshot to {snap_path}")
            reader.stop()
            return

        while True:
            display = self.frame.copy()
            overlay = display.copy()

            # 1. Draw all completed slots as colored polygons
            for slot in self.slots:
                sid = slot["id"]
                pts = np.array(slot["points"], dtype=np.int32)

                # Transparent green fill
                cv2.fillPoly(overlay, [pts], (46, 175, 46))

            cv2.addWeighted(overlay, 0.18, display, 0.82, 0, display)

            # 2. Draw polygon outlines & badges
            for slot in self.slots:
                sid = slot["id"]
                pts = np.array(slot["points"], dtype=np.int32)

                # Solid border
                cv2.polylines(display, [pts], isClosed=True, color=(46, 175, 46), thickness=2)

                # Draw vertex dots
                for pt in pts:
                    cv2.circle(display, tuple(pt), 3, (0, 255, 0), -1)

                # Position label badge at topmost point
                top_idx = int(np.argmin(pts[:, 1]))
                lx, ly = int(pts[top_idx][0]), int(pts[top_idx][1])
                label = f"P{sid:02d}"
                (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(display, (lx, max(0, ly - th - 6)), (lx + tw + 6, ly), (46, 175, 46), -1)
                cv2.putText(
                    display,
                    label,
                    (lx + 3, max(th, ly - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )

            # 3. Draw in-progress points and rubber-band guide lines
            num_pts = len(self.current_points)
            if num_pts > 0:
                # Draw lines between clicked points
                for i in range(num_pts - 1):
                    cv2.line(display, self.current_points[i], self.current_points[i + 1], (0, 255, 255), 2)

                # Rubber-band line from last point to current mouse position
                cv2.line(display, self.current_points[-1], self.mouse_pos, (0, 200, 255), 1, cv2.LINE_AA)

                # Draw circles for clicked points with vertex numbers
                for i, pt in enumerate(self.current_points):
                    cv2.circle(display, pt, 5, (0, 140, 255), -1)
                    cv2.circle(display, pt, 7, (255, 255, 255), 1)
                    cv2.putText(display, str(i + 1), (pt[0] + 8, pt[1] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)

                # Cursor prompt indicator
                prompt = f"Click corner {num_pts + 1}/{self.points_per_slot}"
                cv2.putText(display, prompt, (self.mouse_pos[0] + 12, self.mouse_pos[1] + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1, cv2.LINE_AA)

            # 4. Status HUD overlay bar at bottom
            h, w = display.shape[:2]
            bar_text = f"Slots: {len(self.slots)}  |  In Progress: {num_pts}/{self.points_per_slot}  |  [U] Undo  [C] Clear  [R] Refresh  [S] Save  [Q] Exit"
            cv2.rectangle(display, (0, h - 35), (w, h), (20, 22, 28), -1)
            cv2.line(display, (0, h - 35), (w, h - 35), (50, 55, 65), 1)
            cv2.putText(display, bar_text, (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (200, 220, 255), 1, cv2.LINE_AA)

            cv2.imshow(self.window_name, display)
            key = cv2.waitKey(25) & 0xFF

            if key == ord("q") or key == 27:
                break
            elif key == ord("s"):
                self.save()
            elif key == ord("u") or key == 8:  # 8 is Backspace
                if self.current_points:
                    removed_pt = self.current_points.pop()
                    print(f"[Marker] Undid point ({removed_pt[0]}, {removed_pt[1]}). Remaining: {len(self.current_points)}")
                elif self.slots:
                    removed_slot = self.slots.pop()
                    print(f"[Marker] Removed slot P{removed_slot['id']:02d}")
            elif key == ord("c"):
                if self.current_points:
                    self.current_points.clear()
                    print("[Marker] Cancelled current slot in-progress.")
                else:
                    self.slots.clear()
                    print("[Marker] Cleared all slots.")
            elif key == 13 or key == 32:  # Enter or Space
                if len(self.current_points) >= 3:
                    self._add_completed_slot(self.current_points)
                    self.current_points = []
            elif key == ord("r"):
                fresh = reader.get_latest_frame()
                if fresh is not None:
                    self.frame = fresh
                    print("[Marker] Refreshed live frame from camera.")

        reader.stop()
        cv2.destroyAllWindows()

        # Save on exit if any slots exist
        if self.slots:
            self.save()

# Backward compatibility alias
SlotMarker = PolygonSlotMarker

def main():
    args = parse_args()

    # Determine camera and output file
    target_cam_id = args.camera or "cam1"
    cam_cfg = settings.cameras.get(target_cam_id) or settings.get_camera()

    cam_src = args.source or (cam_cfg.source if cam_cfg else "videos/parking_demo.mp4")
    out_file = args.output or (str(cam_cfg.slots_file) if cam_cfg else "config/slots_cam1.json")

    print(f"[Marker] Marking slots for: {target_cam_id} ({cam_src})")
    print(f"[Marker] Slots will be saved to: {out_file}")

    if args.snapshot:
        reader = RTSPStreamReader(source=cam_src, name=target_cam_id)
        reader.start()
        marker = PolygonSlotMarker(source=cam_src, output_file=out_file, camera_id=target_cam_id)
        frame = marker.fetch_live_frame(reader)
        reader.stop()
        if frame is not None:
            snap_path = BASE_DIR / "config" / f"snapshot_{target_cam_id}.jpg"
            cv2.imwrite(str(snap_path), frame)
            print(f"[Marker] Snapshot saved to {snap_path}")
        else:
            print("[Marker] Failed to capture snapshot.")
        return

    marker = PolygonSlotMarker(
        source=cam_src,
        output_file=out_file,
        camera_id=target_cam_id,
        points_per_slot=args.points_per_slot,
        fresh=args.fresh
    )
    marker.run()

if __name__ == "__main__":
    main()

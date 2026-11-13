import json
from pathlib import Path
from collections import deque
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np

def compute_box_intersection(box1: List[int], box2: List[int]) -> float:
    """Computes area of intersection between two [x1, y1, x2, y2] bounding boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    if x2 <= x1 or y2 <= y1:
        return 0.0
    return float((x2 - x1) * (y2 - y1))

def compute_box_area(box: List[int]) -> float:
    """Computes area of an [x1, y1, x2, y2] bounding box."""
    return float(max(0, box[2] - box[0]) * max(0, box[3] - box[1]))

class ParkingEngine:
    """
    Robust Skewed Polygon Parking Slot Occupancy Engine.
    
    Supports perspective-distorted CCTV camera feeds:
    1. Exact convex polygon intersection (cv2.intersectConvexConvex) for skewed bays.
    2. Vehicle wheel contact-point (ground patch) & centroid polygon containment test.
    3. Polygon-masked Computer Vision edge/texture density verification.
    4. Temporal majority-voting buffer to prevent single-frame flickering.
    """
    def __init__(
        self,
        camera_id: str = "cam1",
        slots: Optional[List[Dict[str, Any]]] = None,
        slots_file: Optional[Path] = None,
        overlap_threshold: float = 0.20,
        history_size: int = 3,
        use_cv_fallback: bool = False
    ):
        self.camera_id = camera_id
        self.slots_file = slots_file
        self.overlap_threshold = overlap_threshold
        self.history_size = max(1, history_size)
        self.use_cv_fallback = use_cv_fallback
        
        self.slots = slots if slots is not None else self._load_slots()
        self.history: Dict[int, deque] = {slot["id"]: deque(maxlen=self.history_size) for slot in self.slots}
        self.last_occupancy: Dict[int, bool] = {slot["id"]: False for slot in self.slots}

    def _normalize_slot(self, slot: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures slot has both polygon 'points' and bounding box 'x1, y1, x2, y2'."""
        slot["camera_id"] = slot.get("camera_id", self.camera_id)
        if "points" in slot and len(slot["points"]) >= 3:
            xs = [p[0] for p in slot["points"]]
            ys = [p[1] for p in slot["points"]]
            slot["x1"] = min(xs)
            slot["y1"] = min(ys)
            slot["x2"] = max(xs)
            slot["y2"] = max(ys)
        elif "x1" in slot:
            x1, y1, x2, y2 = slot["x1"], slot["y1"], slot["x2"], slot["y2"]
            slot["points"] = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
        return slot

    def _load_slots(self) -> List[Dict[str, Any]]:
        if self.slots_file and Path(self.slots_file).exists():
            try:
                with open(self.slots_file, "r", encoding="utf-8") as f:
                    raw_slots = json.load(f)
                normalized = [self._normalize_slot(s) for s in raw_slots]
                return normalized
            except Exception as e:
                print(f"[ParkingEngine] Error loading slots from {self.slots_file}: {e}")
        return []

    def reload_slots(self, slots_file: Optional[Path] = None) -> List[Dict[str, Any]]:
        """Reload slots from file (e.g. after user marks slots)."""
        if slots_file:
            self.slots_file = slots_file
        self.slots = self._load_slots()
        self.history = {slot["id"]: deque(maxlen=self.history_size) for slot in self.slots}
        self.last_occupancy = {slot["id"]: False for slot in self.slots}
        print(f"[ParkingEngine] Reloaded {len(self.slots)} parking slots.")
        return self.slots

    def evaluate_frame(
        self,
        frame: Optional[np.ndarray],
        detections: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[int, bool]:
        """
        Evaluates occupancy for each skewed slot based on vehicle detections and image features.
        """
        raw_occupancy: Dict[int, bool] = {}

        for slot in self.slots:
            sid = slot["id"]
            pts_float = np.ascontiguousarray(np.array(slot["points"], dtype=np.float32))
            pts_int = pts_float.astype(np.int32)
            pts_convex = cv2.convexHull(pts_float)
            slot_area = float(cv2.contourArea(pts_convex))

            is_occupied = False

            # Strategy 1: Match with detected vehicle bounding boxes (YOLO)
            if detections is not None and slot_area > 0:
                for det in detections:
                    vx1, vy1, vx2, vy2 = det["bbox"]
                    v_area = float(max(1, (vx2 - vx1) * (vy2 - vy1)))
                    
                    # Convert vehicle bbox to a 4-point convex polygon
                    v_poly = np.array([
                        [vx1, vy1],
                        [vx2, vy1],
                        [vx2, vy2],
                        [vx1, vy2]
                    ], dtype=np.float32)

                    # Compute exact geometric intersection area
                    inter_area, _ = cv2.intersectConvexConvex(pts_convex, v_poly)
                    if inter_area <= 0:
                        continue

                    overlap_slot = inter_area / slot_area
                    overlap_vehicle = inter_area / v_area

                    # In skewed CCTV perspective, ground touchpoint (bottom-center) is the truest location
                    touch_x = (vx1 + vx2) / 2.0
                    touch_y = float(vy2)
                    centroid_x = (vx1 + vx2) / 2.0
                    centroid_y = (vy1 + vy2) / 2.0

                    touch_inside = cv2.pointPolygonTest(pts_int, (touch_x, touch_y), False) >= 0
                    centroid_inside = cv2.pointPolygonTest(pts_int, (centroid_x, centroid_y), False) >= 0

                    if (
                        overlap_slot >= self.overlap_threshold
                        or (touch_inside and (overlap_slot >= 0.08 or overlap_vehicle >= 0.20))
                        or (centroid_inside and (overlap_slot >= 0.10 or overlap_vehicle >= 0.25))
                        or (overlap_vehicle >= 0.40 and (touch_inside or centroid_inside))
                    ):
                        is_occupied = True
                        break

            # Strategy 2: Computer Vision texture check inside polygon mask
            # ONLY when YOLO detections are not available (detections is None) AND fallback explicitly enabled
            elif detections is None and self.use_cv_fallback and frame is not None and slot_area > 0:
                is_occupied = self._cv_polygon_check(frame, slot, pts_int)

            # Strategy 3: Temporal smoothing (majority voting)
            if sid not in self.history:
                self.history[sid] = deque(maxlen=self.history_size)
            self.history[sid].append(is_occupied)

            votes = sum(1 for v in self.history[sid] if v)
            smoothed = votes > (len(self.history[sid]) // 2)
            raw_occupancy[sid] = smoothed

        self.last_occupancy = raw_occupancy
        return raw_occupancy

    def _cv_polygon_check(self, frame: np.ndarray, slot: Dict[str, Any], pts_int: np.ndarray) -> bool:
        """
        Polygon-masked computer vision verification (fallback when no YOLO detector is present).
        Computes edge density strictly inside the skewed slot boundary.
        """
        x1, y1, x2, y2 = slot["x1"], slot["y1"], slot["x2"], slot["y2"]
        h_frame, w_frame = frame.shape[:2]
        
        # Clamp to frame bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_frame, x2), min(h_frame, y2)

        if (x2 - x1) <= 6 or (y2 - y1) <= 6:
            return False

        # Crop frame to slot bounding box
        crop_frame = frame[y1:y2, x1:x2]

        # Shift polygon points to crop coordinate space
        shifted_pts = pts_int.copy()
        shifted_pts[:, 0] -= x1
        shifted_pts[:, 1] -= y1

        # Create polygon binary mask
        mask = np.zeros((y2 - y1, x2 - x1), dtype=np.uint8)
        cv2.fillPoly(mask, [shifted_pts], 255)

        slot_pixel_count = int(np.count_nonzero(mask))
        if slot_pixel_count == 0:
            return False

        # Edge analysis inside mask
        gray = cv2.cvtColor(crop_frame, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 40, 120)
        masked_edges = cv2.bitwise_and(edges, edges, mask=mask)

        edge_cnt = int(np.count_nonzero(masked_edges))
        edge_density = edge_cnt / slot_pixel_count

        return edge_density > 0.18

    def get_summary_status(self) -> Dict[str, Any]:
        """Returns structured JSON-ready metrics of the parking lot."""
        total = len(self.slots)
        occupied_count = sum(1 for status in self.last_occupancy.values() if status)
        available_count = total - occupied_count
        percentage = round((occupied_count / total * 100), 1) if total > 0 else 0.0

        return {
            "total": total,
            "occupied": occupied_count,
            "available": available_count,
            "occupancy_percentage": percentage,
            "last_updated": datetime.now().strftime("%H:%M:%S"),
            "camera_id": self.camera_id,
            "slots": [
                {
                    "id": slot["id"],
                    "camera_id": slot.get("camera_id", self.camera_id),
                    "occupied": bool(self.last_occupancy.get(slot["id"], False))
                }
                for slot in self.slots
            ]
        }

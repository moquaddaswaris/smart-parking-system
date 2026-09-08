import json
from pathlib import Path
import cv2
import numpy as np
from collections import deque

BASE_DIR = Path(__file__).resolve().parent
SLOTS_FILE = BASE_DIR / "parking_slots.json"

def load_slots(filepath=SLOTS_FILE):
    if not filepath.exists():
        return []
    with open(filepath, "r") as f:
        return json.load(f)

PARKING_SLOTS = load_slots()

def get_intersection(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    if x2 <= x1 or y2 <= y1:
        return 0

    return (x2 - x1) * (y2 - y1)

def get_area(box):
    return max(0, box[2] - box[0]) * max(0, box[3] - box[1])

def get_slot_match(vehicle_box, slot_box):
    vehicle_area = get_area(vehicle_box)
    slot_area = get_area(slot_box)
    intersection = get_intersection(vehicle_box, slot_box)

    if vehicle_area == 0 or slot_area == 0:
        return 0, 0

    vehicle_overlap = intersection / vehicle_area
    slot_overlap = intersection / slot_area

    return vehicle_overlap, slot_overlap

class ParkingEngine:
    """
    High-accuracy slot occupancy detection engine.
    Analyzes marked slots directly using multi-feature computer vision:
    - HSV color distribution (red/terracotta asphalt bay vs vehicle surfaces)
    - Canny edge density & gradient magnitude (windshields, roofs, metallic contours)
    - Intensity variance & standard deviation
    - Temporal stabilization buffer to prevent frame-to-frame flicker
    """
    def __init__(self, slots=None, history_size=3):
        self.slots = slots if slots is not None else PARKING_SLOTS
        self.history_size = history_size
        self.history = {slot["id"]: deque(maxlen=history_size) for slot in self.slots}

    def detect_slot(self, frame, slot):
        x1, y1, x2, y2 = slot["x1"], slot["y1"], slot["x2"], slot["y2"]
        h, w = y2 - y1, x2 - x1

        # Inner padding (14%) to avoid parking boundary line markings
        pad_y = int(h * 0.14)
        pad_x = int(w * 0.14)
        crop = frame[y1 + pad_y : y2 - pad_y, x1 + pad_x : x2 - pad_x]

        if crop.size == 0:
            return False

        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        # 1. Texture & Edge density
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 35, 110)
        edge_cnt = int(np.count_nonzero(edges))
        edge_density = edge_cnt / edges.size

        # 2. Ground color analysis (empty slot is reddish-terracotta asphalt)
        # Red hue wraps around 0 and 180 in OpenCV HSV (0..179)
        mask1 = cv2.inRange(hsv, np.array([0, 35, 45]), np.array([18, 255, 255]))
        mask2 = cv2.inRange(hsv, np.array([162, 35, 45]), np.array([180, 255, 255]))
        red_mask = cv2.bitwise_or(mask1, mask2)
        red_ratio = np.count_nonzero(red_mask) / red_mask.size

        # 3. Occupancy scoring
        occ_score = (1.0 - red_ratio) * 0.6 + min(1.0, edge_density / 0.08) * 0.4
        is_occupied = bool((occ_score > 0.48) and (red_ratio < 0.42 or edge_cnt > 450))

        return is_occupied

    def process_frame(self, frame, detections=None):
        raw_occupancy = {}
        for slot in self.slots:
            sid = slot["id"]
            occupied = self.detect_slot(frame, slot)

            # Optional bbox reinforcement if detections were supplied
            if detections and not occupied:
                for det in detections:
                    v_overlap, s_overlap = get_slot_match(det["bbox"], [slot["x1"], slot["y1"], slot["x2"], slot["y2"]])
                    if v_overlap >= 0.45 and s_overlap >= 0.15:
                        occupied = True
                        break

            # Buffer into history for temporal smoothing
            if sid not in self.history:
                self.history[sid] = deque(maxlen=self.history_size)
            self.history[sid].append(occupied)

            # Majority voting across the history buffer
            votes = sum(1 for v in self.history[sid] if v)
            smoothed_status = votes > (len(self.history[sid]) // 2)
            raw_occupancy[sid] = smoothed_status

        return raw_occupancy

    def annotate_frame(self, frame, occupancy):
        annotated = frame.copy()

        occupied_count = 0
        total_slots = len(self.slots)

        for slot in self.slots:
            sid = slot["id"]
            is_occ = occupancy.get(sid, False)
            if is_occ:
                occupied_count += 1

            x1, y1, x2, y2 = slot["x1"], slot["y1"], slot["x2"], slot["y2"]
            color = (34, 34, 220) if is_occ else (46, 175, 46)  # Red / Green in BGR
            status_text = "OCCUPIED" if is_occ else "AVAILABLE"

            # Draw slot border
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            # Semi-transparent highlight inside slot
            overlay = annotated.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
            cv2.addWeighted(overlay, 0.12 if not is_occ else 0.20, annotated, 0.88 if not is_occ else 0.80, 0, annotated)

            # Slot label badge
            badge_text = f"P{sid:02d}: {status_text}"
            (text_w, text_h), _ = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
            cv2.rectangle(annotated, (x1, y1 - text_h - 6), (x1 + text_w + 8, y1), color, -1)
            cv2.putText(annotated, badge_text, (x1 + 4, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        # Header status bar on video
        available_count = total_slots - occupied_count
        bar_h = 42
        cv2.rectangle(annotated, (0, 0), (annotated.shape[1], bar_h), (25, 28, 36), -1)

        cv2.putText(annotated, "VisionPark CCTV Live", (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
        status_banner = f"Total: {total_slots}  |  Occupied: {occupied_count}  |  Available: {available_count}"
        cv2.putText(annotated, status_banner, (320, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (140, 220, 255), 2, cv2.LINE_AA)

        return annotated

# Global singleton engine
_default_engine = ParkingEngine()

def get_occupancy(input_data):
    """
    Backwards-compatible get_occupancy:
    - If passed a frame (numpy array), runs direct slot computer vision.
    - If passed detections list, uses bbox matching or engine.
    """
    if isinstance(input_data, np.ndarray):
        return _default_engine.process_frame(input_data)
    elif isinstance(input_data, list):
        # Detections list
        occupancy = {slot["id"]: False for slot in PARKING_SLOTS}
        for detection in input_data:
            vehicle_box = detection["bbox"]
            best_slot = None
            best_score = 0
            for slot in PARKING_SLOTS:
                slot_box = [slot["x1"], slot["y1"], slot["x2"], slot["y2"]]
                v_overlap, s_overlap = get_slot_match(vehicle_box, slot_box)
                score = v_overlap
                if v_overlap >= 0.45 and s_overlap >= 0.15:
                    if score > best_score:
                        best_score = score
                        best_slot = slot["id"]
            if best_slot is not None:
                occupancy[best_slot] = True
        return occupancy
    return {slot["id"]: False for slot in PARKING_SLOTS}
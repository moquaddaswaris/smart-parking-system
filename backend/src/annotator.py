from typing import List, Dict, Any, Optional
import cv2
import numpy as np

# Color scheme (BGR)
COLOR_AVAILABLE = (46, 175, 46)     # Green
COLOR_OCCUPIED = (34, 34, 220)      # Red
COLOR_DETECTION = (255, 160, 40)    # Amber/Cyan for vehicle bounding box
COLOR_HUD_BG = (22, 24, 30)         # Dark slate
COLOR_TEXT_WHITE = (255, 255, 255)

class FrameAnnotator:
    """
    Renders clean, high-visibility annotations on camera frames for live CCTV monitoring.
    Supports skewed perspective polygons and multi-point parking bays.
    """
    @staticmethod
    def annotate(
        frame: np.ndarray,
        slots: List[Dict[str, Any]],
        occupancy: Dict[int, bool],
        detections: Optional[List[Dict[str, Any]]] = None,
        draw_detections: bool = False,
        camera_name: Optional[str] = None
    ) -> np.ndarray:
        if frame is None or frame.size == 0:
            return frame

        annotated = frame.copy()
        h, w = annotated.shape[:2]

        occupied_count = 0
        total_slots = len(slots)

        # Calculate dynamic resolution scaling factor (base reference: 1280px)
        scale = max(1.0, w / 1440.0)
        poly_thick = max(2, int(2 * scale))
        text_thick = max(1, int(round(scale)))
        font_scale = 0.44 * scale

        # 1. Draw semi-transparent polygon fills
        overlay = annotated.copy()
        for slot in slots:
            sid = slot["id"]
            is_occ = occupancy.get(sid, False)
            if is_occ:
                occupied_count += 1

            color = COLOR_OCCUPIED if is_occ else COLOR_AVAILABLE

            if "points" in slot and len(slot["points"]) >= 3:
                pts = np.array(slot["points"], dtype=np.int32)
                cv2.fillPoly(overlay, [pts], color)
            else:
                x1, y1, x2, y2 = slot["x1"], slot["y1"], slot["x2"], slot["y2"]
                cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)

        # Blend transparent overlays
        cv2.addWeighted(overlay, 0.20, annotated, 0.80, 0, annotated)

        # 2. Draw borders & labels
        for slot in slots:
            sid = slot["id"]
            is_occ = occupancy.get(sid, False)
            color = COLOR_OCCUPIED if is_occ else COLOR_AVAILABLE
            status_text = "OCCUPIED" if is_occ else "AVAILABLE"

            if "points" in slot and len(slot["points"]) >= 3:
                pts = np.array(slot["points"], dtype=np.int32)
                # Draw polygon boundary
                cv2.polylines(annotated, [pts], isClosed=True, color=color, thickness=poly_thick)

                # Locate topmost vertex for badge
                top_idx = int(np.argmin(pts[:, 1]))
                lx, ly = int(pts[top_idx][0]), int(pts[top_idx][1])
            else:
                x1, y1, x2, y2 = slot["x1"], slot["y1"], slot["x2"], slot["y2"]
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, poly_thick)
                lx, ly = x1, y1

            # Draw status badge
            badge_text = f"P{sid:02d}: {status_text}"
            (tw, th), _ = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_thick)
            pad = int(4 * scale)
            cv2.rectangle(annotated, (lx, max(0, ly - th - pad * 2)), (lx + tw + pad * 2, ly), color, -1)
            cv2.putText(
                annotated,
                badge_text,
                (lx + pad, max(th, ly - pad)),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                COLOR_TEXT_WHITE,
                text_thick,
                cv2.LINE_AA
            )

        # 3. Optional: Draw vehicle detections
        if draw_detections and detections:
            for det in detections:
                bx1, by1, bx2, by2 = det["bbox"]
                label = f"{det['class_name']} {det['confidence']:.2f}"
                cv2.rectangle(annotated, (bx1, by1), (bx2, by2), COLOR_DETECTION, 1)
                cv2.putText(
                    annotated,
                    label,
                    (bx1, max(15, by1 - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.4,
                    COLOR_DETECTION,
                    1,
                    cv2.LINE_AA
                )

        # 4. Top HUD bar
        bar_h = int(42 * scale)
        available_count = total_slots - occupied_count
        cv2.rectangle(annotated, (0, 0), (w, bar_h), COLOR_HUD_BG, -1)
        cv2.line(annotated, (0, bar_h), (w, bar_h), (60, 65, 75), max(1, int(scale)))

        title_scale = 0.65 * scale
        title_text = f"VisionPark CCTV  |  {camera_name}" if camera_name else "VisionPark CCTV Live"
        cv2.putText(annotated, title_text, (int(16 * scale), int(28 * scale)), cv2.FONT_HERSHEY_SIMPLEX, title_scale, COLOR_TEXT_WHITE, max(1, int(round(2 * scale))), cv2.LINE_AA)
        
        hud_text = f"Total: {total_slots}  |  Occupied: {occupied_count}  |  Available: {available_count}"
        hud_scale = 0.55 * scale
        (htw, _), _ = cv2.getTextSize(hud_text, cv2.FONT_HERSHEY_SIMPLEX, hud_scale, text_thick)
        cv2.putText(annotated, hud_text, (max(int(280 * scale), w - htw - int(20 * scale)), int(27 * scale)), cv2.FONT_HERSHEY_SIMPLEX, hud_scale, (140, 220, 255), text_thick, cv2.LINE_AA)

        return annotated

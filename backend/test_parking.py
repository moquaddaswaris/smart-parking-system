import cv2
from camera import get_video
from detector import VehicleDetector
from parking import get_occupancy, PARKING_SLOTS

cap = get_video()
detector = VehicleDetector()

print("Starting VisionPark Real-Time CCTV Test (Press 'q' in window to exit)...")

while True:
    ret, frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue

    detections = detector.detect(frame)
    # Direct high-accuracy slot occupancy detection on frame
    occupancy = get_occupancy(frame)

    for slot in PARKING_SLOTS:
        slot_id = slot["id"]
        x1 = slot["x1"]
        y1 = slot["y1"]
        x2 = slot["x2"]
        y2 = slot["y2"]

        is_occ = occupancy.get(slot_id, False)
        color = (0, 0, 255) if is_occ else (0, 255, 0)
        status = "OCCUPIED" if is_occ else "AVAILABLE"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            f"{slot_id}: {status}",
            (x1, y1 - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            color,
            2
        )

    for detection in detections:
        x1, y1, x2, y2 = detection["bbox"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 1)
        cv2.putText(
            frame,
            f'{detection["class_name"]} {detection["confidence"]:.2f}',
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 0, 0),
            1
        )

    occupied = sum(1 for v in occupancy.values() if v)
    available = len(PARKING_SLOTS) - occupied

    cv2.putText(
        frame,
        f"Occupied: {occupied}  Available: {available}",
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 255),
        2
    )

    cv2.imshow("VisionPark", frame)
    if cv2.waitKey(20) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
import cv2
import json

VIDEO_PATH = "videos/parking demo video.mp4"
OUTPUT_FILE = "parking_slots.json"

cap = cv2.VideoCapture(VIDEO_PATH)
ret, frame = cap.read()
cap.release()

if not ret:
    raise RuntimeError("Could not read video")

original = frame.copy()
slots = []
points = []
slot_id = 1

def mouse_callback(event, x, y, flags, param):
    global points, slot_id

    if event == cv2.EVENT_LBUTTONDOWN:
        points.append((x, y))
        print(f"Point {len(points)}: ({x}, {y})")

        if len(points) == 2:
            x1, y1 = points[0]
            x2, y2 = points[1]

            x1, x2 = sorted([x1, x2])
            y1, y2 = sorted([y1, y2])

            slots.append({
                "id": slot_id,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })

            print(f"Slot {slot_id}: ({x1}, {y1}, {x2}, {y2})")

            slot_id += 1
            points.clear()

cv2.namedWindow("VisionPark Slot Selector")
cv2.setMouseCallback("VisionPark Slot Selector", mouse_callback)

while True:
    display = original.copy()

    for slot in slots:
        cv2.rectangle(
            display,
            (slot["x1"], slot["y1"]),
            (slot["x2"], slot["y2"]),
            (0, 255, 0),
            2
        )

        cv2.putText(
            display,
            str(slot["id"]),
            (slot["x1"] + 5, slot["y1"] + 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

    if len(points) == 1:
        cv2.circle(display, points[0], 5, (0, 0, 255), -1)

    cv2.imshow("VisionPark Slot Selector", display)

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

cv2.destroyAllWindows()

with open(OUTPUT_FILE, "w") as file:
    json.dump(slots, file, indent=2)

print(f"\nSaved {len(slots)} slots to {OUTPUT_FILE}")
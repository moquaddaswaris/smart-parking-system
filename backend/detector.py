from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent

VEHICLE_CLASSES = {
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck"
}

class VehicleDetector:
    def __init__(self, model_name="yolo11n.pt"):
        model_path = BASE_DIR / model_name
        if not model_path.exists():
            model_path = BASE_DIR / "yolov8n.pt"
        self.model = YOLO(str(model_path))

    def detect(self, frame, conf=0.15, imgsz=640):
        # Run detection with vehicle classes
        results = self.model.predict(
            frame,
            classes=list(VEHICLE_CLASSES.keys()),
            conf=conf,
            imgsz=imgsz,
            verbose=False
        )

        detections = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                detections.append({
                    "class_id": class_id,
                    "class_name": VEHICLE_CLASSES.get(class_id, "Vehicle"),
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2]
                })

        return detections
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from ultralytics import YOLO

# Standard COCO vehicle classes
DEFAULT_VEHICLE_CLASSES = {
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck"
}

class VehicleDetector:
    """
    Lightweight Vehicle Detection Engine.
    
    Optimized for Raspberry Pi 5 ARM Cortex-A76:
    - Runs YOLO11 Nano (or YOLOv8 Nano) with CPU optimizations.
    - Filters by customizable vehicle classes.
    - Low-latency batch-1 prediction.
    """
    def __init__(
        self,
        model_path: str = "models/yolo11n.pt",
        confidence: float = 0.25,
        imgsz: int = 640,
        classes: Optional[List[int]] = None
    ):
        self.model_path = Path(model_path)
        self.confidence = confidence
        self.imgsz = imgsz
        self.classes = classes if classes is not None else list(DEFAULT_VEHICLE_CLASSES.keys())
        
        print(f"[Detector] Loading model from: {self.model_path}")
        if not self.model_path.exists():
            print(f"[Detector] Note: {self.model_path} not found locally, YOLO will download or load default.")
            
        self.model = YOLO(str(self.model_path))
        
        # Optimize OpenCV thread count on Pi 5 (4 physical cores)
        cv2.setNumThreads(4)

    def detect(self, frame: np.ndarray, conf: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Runs object detection on a single frame and returns bounding boxes.
        """
        if frame is None or frame.size == 0:
            return []

        use_conf = conf if conf is not None else self.confidence

        # Filter classes if specified
        predict_args = {
            "source": frame,
            "conf": use_conf,
            "imgsz": self.imgsz,
            "verbose": False,
            "device": "cpu"
        }
        
        if self.classes and len(self.classes) > 0:
            predict_args["classes"] = self.classes

        results = self.model.predict(**predict_args)

        detections = []
        for result in results:
            names = result.names
            for box in result.boxes:
                class_id = int(box.cls[0])
                score = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                class_name = names.get(class_id, DEFAULT_VEHICLE_CLASSES.get(class_id, f"Class {class_id}"))

                detections.append({
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(score, 3),
                    "bbox": [x1, y1, x2, y2]
                })

        return detections


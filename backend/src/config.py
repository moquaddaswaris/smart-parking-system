import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml

BASE_DIR = Path(__file__).resolve().parent.parent

class CameraConfig:
    def __init__(self, cam_id: str, data: Dict[str, Any], base_dir: Path):
        self.id = cam_id
        self.name = data.get("name", f"Camera {cam_id}")
        self.enabled = bool(data.get("enabled", True))
        
        # Source resolution
        src = data.get("source", "videos/parking_demo.mp4")
        if isinstance(src, str) and src.isdigit():
            self.source = int(src)
        elif isinstance(src, str) and not src.startswith("rtsp://") and not src.startswith("http://"):
            src_path = Path(src)
            self.source = str(base_dir / src_path) if not src_path.is_absolute() else str(src_path)
        else:
            self.source = str(src)

        # Slots file resolution
        slots_str = data.get("slots_file", f"config/slots_{cam_id}.json")
        slots_p = Path(slots_str)
        self.slots_file = (base_dir / slots_p) if not slots_p.is_absolute() else slots_p

class Config:
    def __init__(self, config_path: Optional[Path] = None):
        self.base_dir = BASE_DIR
        self.config_path = config_path or (self.base_dir / "config" / "config.yaml")
        
        # 1. First load environment variables directly from .env file
        env_file = self.base_dir / ".env"
        if env_file.exists():
            self._load_dotenv(env_file)

        # 2. Load YAML configuration for non-credential settings (intervals, thresholds)
        self.data: Dict[str, Any] = {}
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.data = yaml.safe_load(f) or {}
            except Exception as e:
                print(f"[Config] Warning: Failed to load {self.config_path}: {e}")

        # Detection settings
        det = self.data.get("detection", {})
        model_str = os.getenv("MODEL_PATH", det.get("model_path", "models/yolo11n.pt"))
        model_p = Path(model_str)
        self.model_path = str(model_p if model_p.is_absolute() else (self.base_dir / model_p))
        
        self.interval_sec = float(os.getenv("DETECTION_INTERVAL_SEC", det.get("interval_sec", 0.5)))
        self.confidence = float(os.getenv("DETECTION_CONFIDENCE", det.get("confidence", 0.25)))
        self.overlap_threshold = float(os.getenv("OVERLAP_THRESHOLD", det.get("overlap_threshold", 0.20)))
        self.imgsz = int(det.get("imgsz", 640))
        self.history_size = int(det.get("history_size", 3))

        # Server settings
        srv = self.data.get("server", {})
        self.host = os.getenv("HOST", srv.get("host", "0.0.0.0"))
        self.port = int(os.getenv("PORT", srv.get("port", 8000)))
        self.stream_fps = int(srv.get("stream_fps", 15))

        # 3. Multi-camera setup: fetch URLs directly from .env
        self.cameras: Dict[str, CameraConfig] = {}
        raw_cams = self.data.get("cameras", {})

        if not raw_cams:
            raw_cams = {
                "cam1": {"name": "Camera 1", "slots_file": "config/slots_cam1.json", "enabled": True},
                "cam2": {"name": "Camera 2", "slots_file": "config/slots_cam2.json", "enabled": True}
            }

        # Check for single camera override (CAMERA_SOURCE or CAMERA_URL)
        single_source = os.getenv("CAMERA_SOURCE") or os.getenv("CAMERA_URL")

        for cam_id, cam_info in raw_cams.items():
            cam_num = cam_id.replace("cam", "")
            
            # Fetch URL directly from .env: CAMERA_1_URL, CAMERA_2_URL, or CAMERA_SOURCE
            env_url = (
                os.getenv(f"CAMERA_{cam_num}_URL") or
                os.getenv(f"CAMERA_{cam_id.upper()}_URL") or
                os.getenv(f"{cam_id.upper()}_URL") or
                (single_source if cam_id == "cam1" else None)
            )

            if env_url and env_url.strip():
                cam_info["source"] = env_url.strip()

            # Check if camera is explicitly enabled/disabled in .env
            env_enabled = (
                os.getenv(f"CAMERA_{cam_num}_ENABLED") or
                os.getenv(f"CAMERA_{cam_id.upper()}_ENABLED")
            )
            if env_enabled is not None:
                cam_info["enabled"] = env_enabled.lower() in ("true", "1", "yes")

            cam_obj = CameraConfig(cam_id, cam_info, self.base_dir)
            if cam_obj.enabled:
                self.cameras[cam_id] = cam_obj

    def _load_dotenv(self, env_path: Path):
        """Loads key-value pairs from .env into os.environ."""
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    os.environ[key] = val
        except Exception as e:
            print(f"[Config] Error reading {env_path}: {e}")

    def get_camera(self, cam_id: Optional[str] = None) -> Optional[CameraConfig]:
        """Gets a specific camera or the first available camera."""
        if cam_id and cam_id in self.cameras:
            return self.cameras[cam_id]
        if self.cameras:
            return next(iter(self.cameras.values()))
        return None

# Global configuration instance
settings = Config()

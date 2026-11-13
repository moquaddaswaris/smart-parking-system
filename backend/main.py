"""
VisionPark Main API Entrypoint (Backward Compatible Wrapper)
Delegates to src.api.app
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.api import app, pipeline
from src.config import settings

# Export common objects for backward compatibility
cctv_stream = pipeline
PARKING_SLOTS = pipeline.engine.slots

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print(f" VisionPark API running at: http://localhost:{settings.port}")
    print(f" Swagger UI: http://localhost:{settings.port}/docs")
    print(" (Do NOT open 0.0.0.0 in browser, use http://localhost:8000)")
    print("=" * 60 + "\n")
    uvicorn.run(app, host=settings.host, port=settings.port)

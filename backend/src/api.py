import asyncio
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, JSONResponse

from src.config import settings
from src.pipeline import VisionParkPipeline

pipeline = VisionParkPipeline(config=settings)

@asynccontextmanager
async def lifespan(app: FastAPI):
    pipeline.start()
    yield
    pipeline.stop()

app = FastAPI(
    title="VisionPark Multi-Camera API",
    description="Intelligent CCTV Parking Occupancy System for Raspberry Pi 5 & Windows",
    version="2.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    status = pipeline.get_status()
    return {
        "name": "VisionPark",
        "version": "2.1.0",
        "status": "active" if pipeline.running else "idle",
        "cameras": list(settings.cameras.keys()),
        "total_slots": status.get("total", 0),
        "available": status.get("available", 0),
        "occupied": status.get("occupied", 0)
    }

@app.get("/api/parking/cameras")
def list_cameras():
    """Returns all configured cameras and their stream endpoints."""
    cam_list = []
    for c_id, cam in settings.cameras.items():
        cam_list.append({
            "id": c_id,
            "name": cam.name,
            "stream_url": f"/api/parking/stream/{c_id}",
            "status_url": f"/api/parking/status?camera={c_id}"
        })
    return JSONResponse(content=cam_list)

@app.get("/api/parking/status")
def parking_status(camera: Optional[str] = Query(None, description="Optional camera ID (e.g. cam1, cam2)")):
    """Returns live parking occupancy metrics (unified or per-camera)."""
    return JSONResponse(content=pipeline.get_status(camera))

@app.get("/api/parking/slots")
def parking_slots(camera: Optional[str] = Query(None, description="Optional camera ID (e.g. cam1, cam2)")):
    """Returns marked parking slot coordinates."""
    return JSONResponse(content=pipeline.get_all_slots(camera))

@app.get("/api/parking/stream")
def default_stream(camera: Optional[str] = Query(None, description="Optional camera ID")):
    """Live MJPEG CCTV camera stream with green/red slot bounding annotations."""
    return StreamingResponse(
        pipeline.generate_mjpeg_stream(camera),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/parking/stream/{camera_id}")
def camera_stream(camera_id: str):
    """Live MJPEG stream for a specific camera (e.g., /api/parking/stream/cam1)."""
    return StreamingResponse(
        pipeline.generate_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/parking/frame")
@app.get("/api/parking/frame/{camera_id}")
def parking_frame(camera_id: Optional[str] = None):
    """Returns the latest annotated JPEG frame for a camera."""
    jpeg_bytes = pipeline.get_latest_jpeg(camera_id)
    if not jpeg_bytes:
        return Response(status_code=503, content=b"Frame not ready")
    return Response(content=jpeg_bytes, media_type="image/jpeg")

@app.post("/api/parking/refresh")
def refresh_status():
    """Forces an immediate status evaluation and returns latest results."""
    return JSONResponse(content=pipeline.get_status())

@app.post("/api/parking/reload-slots")
def reload_slots(camera: Optional[str] = Query(None)):
    """Reloads slot definitions from disk."""
    pipeline.reload_slots(camera)
    return {"status": "ok"}

@app.websocket("/api/parking/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection pushing real-time multi-camera occupancy updates."""
    await websocket.accept()
    last_sent = None
    try:
        while True:
            current_status = pipeline.get_status()
            if current_status != last_sent:
                await websocket.send_json(current_status)
                last_sent = current_status
            await asyncio.sleep(0.5)
    except (WebSocketDisconnect, Exception):
        pass

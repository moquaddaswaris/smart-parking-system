import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response

from camera import cctv_stream
from parking import PARKING_SLOTS

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the continuous CCTV video processing background stream
    cctv_stream.start()
    yield
    # Cleanly stop stream on shutdown
    cctv_stream.stop()

app = FastAPI(
    title="VisionPark API",
    description="AI-powered smart parking occupancy system from CCTV camera video data",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "name": "VisionPark",
        "status": "running",
        "cctv_stream": "active" if cctv_stream.running else "idle",
        "total_slots": len(PARKING_SLOTS)
    }

@app.get("/api/parking/status")
def parking_status():
    """
    Returns current live parking occupancy metrics:
    total, occupied, available, occupancy percentage, and slot array.
    """
    return cctv_stream.get_latest_status()

@app.get("/api/parking/slots")
def parking_slots():
    """
    Returns the JSON-marked slot coordinates and identifiers.
    """
    return PARKING_SLOTS

@app.get("/api/parking/stream")
def parking_stream():
    """
    Live MJPEG CCTV camera stream with green/red slot bounding box annotations.
    """
    return StreamingResponse(
        cctv_stream.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/parking/frame")
def parking_frame():
    """
    Returns the current single annotated CCTV frame as a JPEG image.
    """
    jpeg_bytes = cctv_stream.get_latest_jpeg()
    if not jpeg_bytes:
        return Response(status_code=503, content=b"Frame not ready")
    return Response(content=jpeg_bytes, media_type="image/jpeg")

@app.post("/api/parking/refresh")
def refresh_status():
    """
    Forces an immediate status evaluation and returns latest results.
    """
    return cctv_stream.get_latest_status()

@app.websocket("/api/parking/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket connection pushing live occupancy updates to the frontend web app.
    """
    await websocket.accept()
    last_sent = None
    try:
        while True:
            current_status = cctv_stream.get_latest_status()
            if current_status != last_sent:
                await websocket.send_json(current_status)
                last_sent = current_status
            await asyncio.sleep(0.5)
    except (WebSocketDisconnect, Exception):
        pass
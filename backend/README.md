# VisionPark (v2.1)
## Intelligent Multi-Camera CCTV Parking Occupancy System

VisionPark is a real-time, computer-vision-powered parking occupancy platform designed to run efficiently on both **Windows laptops** and **Raspberry Pi 5** single-board computers. The system ingests live video streams from multiple CCTV IP cameras (via RTSP), detects vehicles using a lightweight YOLO model, evaluates perspective-skewed parking slot boundaries using exact polygon geometry, and provides real-time data to a Next.js web dashboard.

---

## Table of Contents
1. [Full System Architecture](#full-system-architecture)
2. [Component Breakdown](#component-breakdown)
3. [Raspberry Pi 5 & Laptop Optimizations](#raspberry-pi-5--laptop-optimizations)
4. [Prerequisites & Installation](#prerequisites--installation)
5. [Configuration (.env & config.yaml)](#configuration-env--configyaml)
6. [How to Mark Parking Slots (Step-by-Step)](#how-to-mark-parking-slots-step-by-step)
7. [How to Start & Run the System](#how-to-start--run-the-system)
8. [API Endpoints & Data Format](#api-endpoints--data-format)
9. [Raspberry Pi 5 Auto-Start on Boot (Systemd)](#raspberry-pi-5-auto-start-on-boot-systemd)
10. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Full System Architecture

VisionPark is engineered as a decoupled, multi-threaded pipeline that balances real-time video streaming with low-CPU deep learning inference.

### Architecture Diagram

```mermaid
flowchart TD
    subgraph VideoSources["1. Video Ingestion Layer (RTSP / CCTV)"]
        Cam1["CCTV Camera 1<br/>rtsp://admin:pass@ip1:554/stream1"]
        Cam2["CCTV Camera 2<br/>rtsp://admin:pass@ip2:554/stream1"]
    end

    subgraph CaptureEngine["2. Threaded Stream Capture (src/camera.py)"]
        Reader1["RTSPStreamReader 1<br/>- TCP Transport<br/>- Zero-Lag Buffer Flush<br/>- Auto-Reconnect"]
        Reader2["RTSPStreamReader 2<br/>- TCP Transport<br/>- Zero-Lag Buffer Flush<br/>- Auto-Reconnect"]
    end

    subgraph AICoordinator["3. Multi-Camera Pipeline Coordinator (src/pipeline.py)"]
        Decimator["Inference Scheduler<br/>Evaluates every 0.5s (2 Hz)<br/>Decoupled from camera FPS"]
        SharedYOLO["Shared VehicleDetector (src/detector.py)<br/>Single YOLO11n instance in RAM<br/>CPU / ARM Cortex-A76 Optimized"]
        Engine1["ParkingEngine 1 (src/parking_engine.py)<br/>- Skewed Polygon Intersection<br/>- Ground Touchpoint Test<br/>- Temporal Majority Buffer"]
        Engine2["ParkingEngine 2 (src/parking_engine.py)<br/>- Skewed Polygon Intersection<br/>- Ground Touchpoint Test<br/>- Temporal Majority Buffer"]
        Annotator["FrameAnnotator (src/annotator.py)<br/>- Semi-transparent fills<br/>- Green=Free / Red=Occupied<br/>- Camera Name HUD"]
    end

    subgraph APILayer["4. FastAPI Backend Distribution (src/api.py)"]
        REST["REST API<br/>/api/parking/status<br/>/api/parking/cameras<br/>/api/parking/slots"]
        WS["WebSocket Server<br/>/api/parking/ws<br/>(Live push on status change)"]
        MJPEG["Live MJPEG Streamer<br/>/api/parking/stream<br/>/api/parking/stream/cam1<br/>/api/parking/stream/cam2"]
    end

    subgraph PresentationLayer["5. Frontend Web Dashboard (Next.js)"]
        UIHeader["Dashboard Header<br/>Live indicator & manual refresh"]
        CamTabs["Camera Selector Tabs<br/>All Cameras | Camera 1 | Camera 2"]
        StatCards["Metric Cards<br/>Total Spaces | Occupied | Available"]
        LiveView["Live Annotated CCTV Player<br/>Dynamic MJPEG stream"]
        GridMap["Parking Grid Map<br/>Color-coded slot blocks"]
    end

    Cam1 --> Reader1
    Cam2 --> Reader2

    Reader1 --> Decimator
    Reader2 --> Decimator

    Decimator --> SharedYOLO
    SharedYOLO --> Engine1
    SharedYOLO --> Engine2

    Engine1 --> Annotator
    Engine2 --> Annotator

    Annotator --> REST
    Annotator --> WS
    Annotator --> MJPEG

    REST --> StatCards
    REST --> CamTabs
    WS --> GridMap
    MJPEG --> LiveView
```

---

## Component Breakdown

The codebase is organized cleanly into modular, purpose-built layers:

```text
parking-system/
├── backend/
│   ├── config/
│   │   ├── config.yaml          # Multi-camera slot bindings & performance settings
│   │   ├── slots_cam1.json      # Camera 1 marked polygon slots
│   │   └── slots_cam2.json      # Camera 2 marked polygon slots
│   ├── models/
│   │   └── yolo11n.pt           # Single lightweight nano weights file (~5.6 MB)
│   ├── src/
│   │   ├── config.py            # Central configuration loader (reads .env first)
│   │   ├── camera.py            # Zero-latency threaded RTSP reader & placeholder generator
│   │   ├── detector.py          # YOLO11 nano vehicle detector
│   │   ├── parking_engine.py    # Skewed polygon geometry & temporal smoothing
│   │   ├── annotator.py         # Visual overlays (polygons, badges, camera HUD)
│   │   ├── pipeline.py          # Multi-camera coordinator (single shared model in RAM)
│   │   └── api.py               # FastAPI REST, WebSocket, & MJPEG endpoints
│   ├── scripts/
│   │   ├── mark_slots.py        # Interactive 4-point polygon slot marker
│   │   ├── run_headless.py      # Console monitor for SSH / terminal-only setups
│   │   └── setup_rpi.sh         # 1-command installer script for Raspberry Pi 5
│   ├── tests/
│   │   └── test_parking.py      # End-to-end integration test
│   ├── videos/
│   │   └── parking_demo.mp4     # Fallback test video
│   ├── .env                     # Live camera RTSP URLs (gitignored)
│   ├── requirements.txt         # Universal dependencies
│   ├── requirements-rpi.txt     # Headless dependencies for Raspberry Pi OS
│   ├── visionpark.service       # Systemd service unit for auto-boot on Pi 5
│   ├── run.py                   # Master unified CLI entry point
│   └── main.py                  # API server entry point
├── frontend/                    # Next.js web dashboard with camera switcher
├── .gitignore
└── README.md
```

### Detailed Module Functions

1. **`src/camera.py` (`RTSPStreamReader`)**:
   - Spawns a dedicated thread per camera running continuous `cap.read()` or `cap.grab()`.
   - Flushes OpenCV's internal socket buffer, eliminating the standard 10–30 second RTSP backlog delay.
   - Enforces TCP transport (`rtsp_transport;tcp`) and 5-second socket timeouts to prevent hanging.
   - Generates an offline placeholder image (`[Camera Offline - Reconnecting...]`) if a camera is rebooting, preventing server freezes.

2. **`src/detector.py` (`VehicleDetector`)**:
   - Loads the ultralight `yolo11n.pt` model (~5.6 MB).
   - Configured specifically for CPU inference with batch size 1.
   - Filters for vehicle classes (Cars, Motorcycles, Buses, Trucks).

3. **`src/parking_engine.py` (`ParkingEngine`)**:
   - Computes exact polygon-to-box intersection using OpenCV's native C++ `cv2.intersectConvexConvex`.
   - Performs a perspective ground touchpoint test (`cv2.pointPolygonTest`): checks whether the vehicle's bottom-center contact patch (wheels on pavement) falls inside the polygon slot.
   - Provides polygon-masked Computer Vision verification for edge and texture density.
   - Maintains a sliding history window (majority vote over 3 frames) to eliminate momentary blips or light reflections.

4. **`src/annotator.py` (`FrameAnnotator`)**:
   - Draws semi-transparent filled polygons (green for available, red for occupied).
   - Draws crisp borders and anchor badges (`P01: AVAILABLE`, `P01: OCCUPIED`) at each slot's top vertex.
   - Overlays a dark status HUD with camera label, total spaces, occupied count, and free count.

5. **`src/pipeline.py` (`VisionParkPipeline` & `CameraWorker`)**:
   - Manages multiple cameras concurrently.
   - Shares a single YOLO model instance in memory across all cameras (round-robin inference).
   - Aggregates overall parking totals while preserving per-camera metrics.

6. **`src/api.py` (FastAPI Application)**:
   - Exposes REST endpoints (`/api/parking/status`, `/api/parking/cameras`, `/api/parking/slots`).
   - Pushes live JSON data over WebSocket (`/api/parking/ws`).
   - Streams live annotated video via MJPEG (`/api/parking/stream`, `/api/parking/stream/cam1`, `/api/parking/stream/cam2`).

---

## Raspberry Pi 5 & Laptop Optimizations

* **Shared Model in RAM**: Rather than loading separate PyTorch models for each camera (which would exhaust memory on Raspberry Pi), 1 shared YOLO model handles predictions for all cameras sequentially.
* **Inference Decoupling (2 Hz / 0.5s)**: Cameras capture at full framerate (15–30 FPS), while AI inference runs twice per second (`0.5s`). This reduces CPU utilization to **<25%** on Pi 5.
* **Hardware-Accelerated OpenCV**: Configures `cv2.setNumThreads(4)` matching the 4 physical Cortex-A76 cores on the Pi 5.
* **Headless Safety**: `requirements-rpi.txt` uses `opencv-python-headless` to eliminate missing X11/libGL errors on headless Linux.

---

## Prerequisites & Installation

### Option 1: On Your Laptop (Windows / macOS / Linux)

1. Open PowerShell or Terminal inside `backend`:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\activate   # On Linux/macOS: source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Test the installation:
   ```powershell
   python tests/test_parking.py
   ```
   *(Should finish with `SUCCESS: Multi-camera pipeline test passed!`)*

### Option 2: On Raspberry Pi 5 (Raspberry Pi OS 64-bit / Ubuntu ARM64)

Run the automated one-command setup script:
```bash
cd backend
chmod +x scripts/setup_rpi.sh
./scripts/setup_rpi.sh
```
The script automatically installs system packages (`ffmpeg`, `libgl1`, `v4l-utils`), builds the virtual environment, and installs ARM-optimized packages.

---

## Configuration (.env & config.yaml)

### 1. Set Your Camera RTSP URLs in `backend/.env`
Open [`backend/.env`](file:///d:/Projects/parking-system/backend/.env) in your text editor:

```ini
# ==============================================================================
# VisionPark CCTV Camera Configuration
# Put your live camera RTSP stream URLs here
# ==============================================================================

# CAMERA 1: Live CCTV RTSP stream URL
CAMERA_1_URL=rtsp://username:password@192.168.1.100:554/stream1

# CAMERA 2: Live CCTV RTSP stream URL
CAMERA_2_URL=rtsp://username:password@192.168.1.101:554/stream1

# Set to false if you are currently testing with only 1 camera:
CAMERA_2_ENABLED=true

# Server Network Settings:
HOST=0.0.0.0
PORT=8000
```

> [!TIP]
> If testing without physical RTSP cameras, you can set `CAMERA_1_URL=videos/parking_demo.mp4` and `CAMERA_2_ENABLED=false` to test with the bundled sample video.

### 2. General Settings in `backend/config/config.yaml`
`config/config.yaml` maps slot storage files and performance parameters:
```yaml
cameras:
  cam1:
    name: "Camera 1"
    # Source loaded from CAMERA_1_URL in .env
    slots_file: "config/slots_cam1.json"  # 12 Parking Bays (P01 - P12)
    enabled: true

  cam2:
    name: "Camera 2"
    # Source loaded from CAMERA_2_URL in .env
    slots_file: "config/slots_cam2.json"  # 7 Parking Bays (P13 - P19)
    enabled: true

detection:
  model_path: "models/yolo11n.pt"
  interval_sec: 0.5         # Inference frequency (2 Hz)
  confidence: 0.25          # YOLO confidence threshold
  overlap_threshold: 0.20   # Fraction of slot covered to mark occupied
  imgsz: 640                # Input image size
```

> **Current Parking Lot Layout:**
> * **Camera 1 (`cam1`):** 12 slots (`P01` through `P12`)
> * **Camera 2 (`cam2`):** 7 slots (`P13` through `P19`)
> * **Total Capacity:** 19 unique parking spaces across the facility

---

## How to Mark Parking Slots (Step-by-Step)

Because CCTV cameras view parking lots at an oblique angle, rectangular boxes cannot accurately fit angled bays. VisionPark includes an interactive **4-point skewed polygon marker** with live rubber-band preview guides.

### Step 1: Launch the Slot Marker
Run the marker tool for the camera you want to configure:

```powershell
# To mark slots for Camera 1 (assigns P01 - P12):
python run.py --mark --camera cam1

# To mark slots for Camera 2 (starts consecutively from P13 onwards):
python run.py --mark --camera cam2 --start-id 13

# If you want to clear existing markers and start with a clean slate:
python run.py --mark --camera cam2 --fresh --start-id 13

# Or specify any custom RTSP stream directly:
python run.py --mark --source "rtsp://username:password@192.168.1.100:554/stream1"
```

### Step 2: Mark Each Parking Bay
A window will open displaying the live camera feed:

1. **Click Corner 1**: Place a point at the top-left corner of the parking bay.
2. **Click Corner 2**: Move to the top-right corner. A live yellow guide line connects from point 1 to your cursor.
3. **Click Corner 3**: Place the bottom-right corner.
4. **Click Corner 4**: Place the bottom-left corner.
5. **Automatic Completion**: As soon as the 4th corner is clicked, the polygon closes, turns green, calculates bounds, and assigns the slot number (`P01`, `P02`, etc.).
6. Repeat for all parking bays visible from this camera.

### Control Reference Table:

| Action | Input | Description |
| :--- | :--- | :--- |
| **Place Corner** | **Left Click** | Place point 1, 2, 3, or 4 of a slot |
| **Finish Early** | **Right Click** or **Enter** | Complete polygon early with $\ge 3$ points |
| **Smart Undo** | **`u`** or **Backspace** | If in the middle of clicking, removes the last point. If no slot is in progress, removes the last completed slot. |
| **Clear** | **`c`** | Cancel current in-progress points, or clear all slots |
| **Refresh Feed** | **`r`** | Grab a fresh live frame from the camera |
| **Save** | **`s`** | Save all slots to `config/slots_cam1.json` or `cam2.json` |
| **Save & Exit** | **`q`** or **ESC** | Automatically saves and closes the marker window |

---

## How to Start & Run the System

### Mode 1: Full Multi-Camera Server (Recommended)
Starts the background video grabbers, AI inference engine, REST API, WebSocket server, and live video stream for all configured cameras:

```powershell
cd backend
python run.py
```

Startup banner displayed:
```text
====================================================================
 VisionPark Multi-Camera Parking Server
====================================================================
 Local Browser URL : http://localhost:8000
 Network (LAN) URL : http://192.168.188.3:8000
 Swagger API Docs  : http://localhost:8000/docs
 Status Endpoint   : http://localhost:8000/api/parking/status
--------------------------------------------------------------------
 Active Cameras:
  [cam1] Camera 1 (12 Slots: P01 - P12)
    Live Stream    : http://localhost:8000/api/parking/stream/cam1
  [cam2] Camera 2 (7 Slots: P13 - P19)
    Live Stream    : http://localhost:8000/api/parking/stream/cam2
--------------------------------------------------------------------
 NOTE: Do NOT type '0.0.0.0' into your web browser.
       '0.0.0.0' is only an internal bind address.
       Always use: http://localhost:8000 or http://127.0.0.1:8000
====================================================================
```

### Mode 2: Headless Console Monitor (SSH / Terminal Only)
Ideal when managing a headless Raspberry Pi over SSH without web browsers:

```powershell
python run.py --headless
```

Live terminal output:
```text
[2026-11-13 13:30:00] TOTAL: 19 spaces | Occupied: 3 | Available: 16 (84.2% Free)
  -> [Camera 1] Occ: 3/12 | Free: 9  | P01:🟩 P02:🟩 P03:🟩 P04:🚗 P05:🚗 P06:🚗 P07:🟩 ...
  -> [Camera 2] Occ: 0/7  | Free: 7  | P13:🟩 P14:🟩 P15:🟩 P16:🟩 P17:🟩 P18:🟩 P19:🟩
```

### Mode 3: Starting the Next.js Frontend Dashboard
Open a second terminal window:

```powershell
cd frontend
npm install   # If not already installed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Camera Selector Tabs**: Switch between `All Cameras (19)`, `Camera 1 (12)`, or `Camera 2 (7)`.
* **Live Video Feed**: Displays the real-time annotated CCTV stream with green and red polygons.
* **Occupancy Counters**: Updates automatically through WebSocket push updates.

---

## API Endpoints & Data Format

| Endpoint | Method | Format | Description |
| :--- | :--- | :--- | :--- |
| `GET /api/parking/status` | `GET` | JSON | Total parking metrics + per-camera breakdown + flat slot list |
| `GET /api/parking/status?camera=cam1` | `GET` | JSON | Metrics for Camera 1 (12 slots) |
| `GET /api/parking/status?camera=cam2` | `GET` | JSON | Metrics for Camera 2 (7 slots) |
| `GET /api/parking/cameras` | `GET` | JSON | List of all configured cameras and their endpoints |
| `GET /api/parking/slots` | `GET` | JSON | List of marked polygon slots |
| `GET /api/parking/stream` | `GET` | MJPEG | Live video stream of default camera with polygon annotations |
| `GET /api/parking/stream/cam1` | `GET` | MJPEG | Live video stream for Camera 1 |
| `GET /api/parking/stream/cam2` | `GET` | MJPEG | Live video stream for Camera 2 |
| `GET /api/parking/frame/{camera_id}` | `GET` | JPEG | Single high-res annotated frame |
| `WS /api/parking/ws` | `WS` | JSON | WebSocket pushing real-time JSON updates on occupancy change |

### Sample JSON Output (`/api/parking/status`):

```json
{
  "total": 19,
  "occupied": 3,
  "available": 16,
  "occupancy_percentage": 15.8,
  "last_updated": "13:30:00",
  "cameras": {
    "cam1": {
      "name": "Camera 1",
      "total": 12,
      "occupied": 3,
      "available": 9,
      "occupancy_percentage": 25.0,
      "slots": [
        { "id": 1, "camera_id": "cam1", "occupied": false },
        { "id": 2, "camera_id": "cam1", "occupied": false },
        { "id": 3, "camera_id": "cam1", "occupied": false },
        { "id": 4, "camera_id": "cam1", "occupied": true },
        { "id": 5, "camera_id": "cam1", "occupied": true },
        { "id": 6, "camera_id": "cam1", "occupied": true },
        { "id": 7, "camera_id": "cam1", "occupied": false },
        { "id": 8, "camera_id": "cam1", "occupied": false },
        { "id": 9, "camera_id": "cam1", "occupied": false },
        { "id": 10, "camera_id": "cam1", "occupied": false },
        { "id": 11, "camera_id": "cam1", "occupied": false },
        { "id": 12, "camera_id": "cam1", "occupied": false }
      ]
    },
    "cam2": {
      "name": "Camera 2",
      "total": 7,
      "occupied": 0,
      "available": 7,
      "occupancy_percentage": 0.0,
      "slots": [
        { "id": 13, "camera_id": "cam2", "occupied": false },
        { "id": 14, "camera_id": "cam2", "occupied": false },
        { "id": 15, "camera_id": "cam2", "occupied": false },
        { "id": 16, "camera_id": "cam2", "occupied": false },
        { "id": 17, "camera_id": "cam2", "occupied": false },
        { "id": 18, "camera_id": "cam2", "occupied": false },
        { "id": 19, "camera_id": "cam2", "occupied": false }
      ]
    }
  },
  "slots": [
    { "id": 1, "camera_id": "cam1", "occupied": false },
    { "id": 2, "camera_id": "cam1", "occupied": false },
    { "id": 3, "camera_id": "cam1", "occupied": false },
    { "id": 4, "camera_id": "cam1", "occupied": true },
    { "id": 5, "camera_id": "cam1", "occupied": true },
    { "id": 6, "camera_id": "cam1", "occupied": true },
    { "id": 7, "camera_id": "cam1", "occupied": false },
    { "id": 8, "camera_id": "cam1", "occupied": false },
    { "id": 9, "camera_id": "cam1", "occupied": false },
    { "id": 10, "camera_id": "cam1", "occupied": false },
    { "id": 11, "camera_id": "cam1", "occupied": false },
    { "id": 12, "camera_id": "cam1", "occupied": false },
    { "id": 13, "camera_id": "cam2", "occupied": false },
    { "id": 14, "camera_id": "cam2", "occupied": false },
    { "id": 15, "camera_id": "cam2", "occupied": false },
    { "id": 16, "camera_id": "cam2", "occupied": false },
    { "id": 17, "camera_id": "cam2", "occupied": false },
    { "id": 18, "camera_id": "cam2", "occupied": false },
    { "id": 19, "camera_id": "cam2", "occupied": false }
  ]
}
```

---

## Raspberry Pi 5 Auto-Start on Boot (Systemd)

To run VisionPark as a permanent background service that starts automatically when your Raspberry Pi 5 powers on:

1. Copy the provided service file:
   ```bash
   sudo cp backend/visionpark.service /etc/systemd/system/visionpark.service
   ```

2. *(Optional)* If your username is not `pi` or repository is in a different path, edit the file:
   ```bash
   sudo nano /etc/systemd/system/visionpark.service
   ```

3. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now visionpark.service
   ```

4. Check live service status and logs:
   ```bash
   sudo systemctl status visionpark.service
   journalctl -u visionpark.service -f
   ```

---

## Troubleshooting & FAQ

#### 1. "Camera stream is delayed by 10-20 seconds"
VisionPark's `RTSPStreamReader` uses zero-latency buffer clearance by default. Ensure your camera supports TCP streaming (`rtsp_transport;tcp` is automatically enforced).

#### 2. "One camera is offline or disconnected"
VisionPark handles offline cameras gracefully. If Camera 2 drops network connection, Camera 1 continues operating without interruption. The live video stream for Camera 2 will display `[Camera 2: Offline - Retrying...]` until the camera reboots.

#### 3. "How do I add a 3rd camera?"
In `backend/config/config.yaml`, add:
```yaml
cameras:
  cam3:
    name: "Camera 3 (East Wing)"
    slots_file: "config/slots_cam3.json"
    enabled: true
```
In `backend/.env`, add:
```ini
CAMERA_3_URL=rtsp://username:password@192.168.1.102:554/stream1
```
Mark slots using `python run.py --mark --camera cam3`. The system scales automatically!

#### 4. "Can I test without physical CCTV cameras?"
Yes! In `backend/.env`, set:
```ini
CAMERA_1_URL=videos/parking_demo.mp4
CAMERA_2_ENABLED=false
```
Then run `python run.py` or `python run.py --mark --camera cam1`.

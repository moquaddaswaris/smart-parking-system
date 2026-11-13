#!/usr/bin/env bash
# ==============================================================================
# VisionPark - Raspberry Pi 5 Automated Setup Script
# Works on Raspberry Pi OS 64-bit (Debian 12 Bookworm) & Ubuntu 24.04 ARM64
# ==============================================================================

set -e

echo "=========================================================="
echo " Setting up VisionPark on Raspberry Pi 5"
echo "=========================================================="

# 1. Update APT and install essential system libraries
echo "[1/5] Installing system packages (FFmpeg, OpenCV dependencies)..."
sudo apt-get update
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libgstreamer1.0-0 \
    v4l-utils

# 2. Set up virtual environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

echo "[2/5] Creating Python virtual environment in $BACKEND_DIR/venv..."
if [ ! -d "venv" ]; then
    python3 -m venv venv --system-site-packages
fi

# 3. Activate venv & install dependencies
echo "[3/5] Installing Python dependencies optimized for ARM Cortex-A76..."
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements-rpi.txt

# 4. Create default .env if not exists
if [ ! -f ".env" ]; then
    echo "[4/5] Creating default .env configuration..."
    cat << 'EOF' > .env
# CAMERA 1: Live CCTV RTSP stream URL
CAMERA_1_URL=rtsp://username:password@192.168.1.100:554/stream1

# CAMERA 2: Live CCTV RTSP stream URL
CAMERA_2_URL=rtsp://username:password@192.168.1.101:554/stream1
CAMERA_2_ENABLED=true

HOST=0.0.0.0
PORT=8000
EOF
fi

# 5. Make scripts executable
chmod +x scripts/mark_slots.py
chmod +x scripts/run_headless.py
chmod +x run.py

echo "=========================================================="
echo " VisionPark Raspberry Pi 5 setup completed successfully!"
echo "=========================================================="
echo ""
echo "Next steps:"
echo "1. Configure your CCTV RTSP camera in .env or config/config.yaml:"
echo "   nano .env"
echo ""
echo "2. Mark parking slots from your CCTV camera stream:"
echo "   source venv/bin/activate"
echo "   python run.py --mark --source \"rtsp://your-camera-rtsp-url\""
echo ""
echo "3. Run the live parking system:"
echo "   python run.py"
echo "   # Or headless in terminal:"
echo "   python run.py --headless"
echo ""
echo "4. Access the REST API & live video:"
echo "   API Status : http://<pi-ip>:8000/api/parking/status"
echo "   MJPEG Feed : http://<pi-ip>:8000/api/parking/stream"
echo "=========================================================="


"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ParkingMap from "@/components/ParkingMap";

interface ParkingSlotData {
  id: number;
  camera_id?: string;
  occupied: boolean;
}

interface CameraStatus {
  name: string;
  total: number;
  occupied: number;
  available: number;
  occupancy_percentage: number;
  slots: ParkingSlotData[];
}

interface ParkingStatusResponse {
  total: number;
  occupied: number;
  available: number;
  occupancy_percentage: number;
  last_updated: string;
  slots: ParkingSlotData[];
  cameras?: Record<string, CameraStatus>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const defaultSlots: ParkingSlotData[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: i + 1, camera_id: "cam1", occupied: false })),
  ...Array.from({ length: 7 }, (_, i) => ({ id: i + 13, camera_id: "cam2", occupied: false })),
];

export default function Home() {
  const [statusData, setStatusData] = useState<ParkingStatusResponse | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const applyStatus = useCallback((data: ParkingStatusResponse) => {
    if (data && Array.isArray(data.slots)) {
      setStatusData(data);
      setIsLive(true);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/parking/status`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Network response was not ok");
      const data: ParkingStatusResponse = await res.json();
      applyStatus(data);
    } catch (err) {
      console.warn("Could not fetch status from backend:", err);
      setIsLive(false);
    }
  }, [applyStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/parking/refresh`, {
        method: "POST",
        cache: "no-store",
      });
      if (res.ok) {
        const data: ParkingStatusResponse = await res.json();
        applyStatus(data);
      } else {
        await fetchStatus();
      }
    } catch (err) {
      console.warn("Refresh error:", err);
      await fetchStatus();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Connect WebSocket for real-time push updates with fallback polling
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let pollInterval: NodeJS.Timeout;

    const connectWebSocket = () => {
      try {
        const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/parking/ws";
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsLive(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: ParkingStatusResponse = JSON.parse(event.data);
            applyStatus(data);
          } catch (e) {
            console.error("Error parsing WS message:", e);
          }
        };

        ws.onclose = () => {
          setIsLive(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.warn("WebSocket connection failed:", err);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    fetchStatus();
    connectWebSocket();

    pollInterval = setInterval(fetchStatus, 2000);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchStatus, applyStatus]);

  // Compute active view data based on camera selection
  const cameraKeys = statusData?.cameras ? Object.keys(statusData.cameras) : [];
  
  let currentTotal = statusData?.total ?? 19;
  let currentOccupied = statusData?.occupied ?? 0;
  let currentAvailable = statusData?.available ?? 19;
  let currentSlots = statusData?.slots ?? defaultSlots;
  let streamUrl = `${API_BASE}/api/parking/stream`;

  if (selectedCamera !== "all" && statusData?.cameras?.[selectedCamera]) {
    const cam = statusData.cameras[selectedCamera];
    currentTotal = cam.total;
    currentOccupied = cam.occupied;
    currentAvailable = cam.available;
    currentSlots = cam.slots;
    streamUrl = `${API_BASE}/api/parking/stream/${selectedCamera}`;
  }

  const lastUpdated = statusData?.last_updated || "Connecting...";

  return (
    <>
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isLive={isLive}
      />
      <main className="min-h-screen bg-background px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Parking Dashboard
              </h1>
              <p className="mt-1 text-muted">
                Live multi-camera CCTV parking occupancy monitoring.
              </p>
            </div>

            {/* Camera Switcher Pills */}
            {cameraKeys.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-white p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCamera("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedCamera === "all"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  All Cameras ({statusData?.total || 0})
                </button>
                {cameraKeys.map((cId) => {
                  const camInfo = statusData?.cameras?.[cId];
                  return (
                    <button
                      key={cId}
                      type="button"
                      onClick={() => setSelectedCamera(cId)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        selectedCamera === cId
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {camInfo?.name || cId.toUpperCase()} ({camInfo?.total || 0})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              title={selectedCamera === "all" ? "Total Spaces (All)" : "Total Spaces"}
              value={currentTotal}
              type="total"
            />
            <StatCard
              title="Occupied"
              value={currentOccupied}
              type="occupied"
            />
            <StatCard
              title="Available"
              value={currentAvailable}
              type="available"
            />
          </div>

          <div className="mt-8">
            <ParkingMap
              slots={currentSlots}
              streamUrl={streamUrl}
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-muted">
              Last updated: {lastUpdated}
            </p>
            <p
              className={`text-sm font-medium ${
                isLive ? "text-success" : "text-amber-600"
              }`}
            >
              {isLive
                ? `System operating normally • ${cameraKeys.length > 0 ? `${cameraKeys.length} Cameras Active` : "CCTV Connected"}`
                : "Connecting to CCTV Backend..."}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

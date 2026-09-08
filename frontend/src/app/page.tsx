"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ParkingMap from "@/components/ParkingMap";

interface ParkingSlotData {
  id: number;
  occupied: boolean;
}

interface ParkingStatusResponse {
  total: number;
  occupied: number;
  available: number;
  occupancy_percentage: number;
  last_updated: string;
  slots: ParkingSlotData[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Default initial state (15 slots matching marked CCTV parking slots)
const defaultSlots: ParkingSlotData[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  occupied: false,
}));

export default function Home() {
  const [slots, setSlots] = useState<ParkingSlotData[]>(defaultSlots);
  const [total, setTotal] = useState<number>(15);
  const [occupied, setOccupied] = useState<number>(0);
  const [available, setAvailable] = useState<number>(15);
  const [lastUpdated, setLastUpdated] = useState<string>("Connecting...");
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const applyStatus = useCallback((data: ParkingStatusResponse) => {
    if (data && Array.isArray(data.slots)) {
      setSlots(data.slots);
      setTotal(data.total);
      setOccupied(data.occupied);
      setAvailable(data.available);
      setLastUpdated(data.last_updated || new Date().toLocaleTimeString());
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
          // Try reconnecting after 3 seconds
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

    // Initial fetch
    fetchStatus();
    connectWebSocket();

    // Fallback polling every 2 seconds in case WebSocket is unavailable
    pollInterval = setInterval(fetchStatus, 2000);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchStatus, applyStatus]);

  return (
    <>
      <Header
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isLive={isLive}
      />
      <main className="min-h-screen bg-background px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Parking Dashboard
            </h1>
            <p className="mt-1 text-muted">
              Monitor parking occupancy in real time.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              title="Total Spaces"
              value={total}
              type="total"
            />
            <StatCard
              title="Occupied"
              value={occupied}
              type="occupied"
            />
            <StatCard
              title="Available"
              value={available}
              type="available"
            />
          </div>

          <div className="mt-8">
            <ParkingMap
              slots={slots}
              streamUrl={`${API_BASE}/api/parking/stream`}
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
                ? "System operating normally • CCTV Connected"
                : "Connecting to CCTV Backend..."}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
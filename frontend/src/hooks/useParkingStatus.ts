"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ParkingStatusResponse, ParkingSlotData, ZoneStatus } from "@/types/parking";

// Hardcoded strictly to localhost:8000 to eliminate any fluctuation
const LOCAL_API_URL = "http://localhost:8000";

function normalizeBaseUrl(url?: string): string {
  const target = (url || LOCAL_API_URL).trim();
  // Strip any Render cloud fallback or trailing paths
  if (target.includes("render.com") || target.includes("smart-parking-system")) {
    return LOCAL_API_URL;
  }
  return target.replace(/\/+$/, "").replace(/\/api\/parking(\/status)?\/?$/, "");
}

const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || LOCAL_API_URL);

// Helper to format zone labels cleanly without camera, linear, or parallel mentions
export function formatZoneName(rawId?: string, rawName?: string): string {
  if (!rawId) return "Campus Zone";
  const lower = rawId.toLowerCase();
  if (lower === "cam1" || lower === "zone1") return "Zone 1";
  if (lower === "cam2" || lower === "zone2") return "Zone 2";
  if (rawName && !rawName.toLowerCase().includes("camera")) return rawName;
  return `Zone ${rawId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`;
}

export function useParkingStatus() {
  const [data, setData] = useState<ParkingStatusResponse | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const rawBackendDataRef = useRef<ParkingStatusResponse | null>(null);
  const lastSignatureRef = useRef<string>("");

  // Process incoming backend payload: clean zone labels and sort slots 1..N
  const processBackendResponse = useCallback(
    (raw: ParkingStatusResponse): ParkingStatusResponse => {
      const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];

      // Sort slots numerically by ID
      const sorted = [...rawSlots].sort((a, b) => a.id - b.id);

      // DIRECT OCCUPANCY MAPPING:
      // Strictly map the real Boolean from the backend payload
      const cleanSlots: ParkingSlotData[] = sorted.map((slot) => ({
        ...slot,
        occupied: Boolean(slot.occupied),
        zone: formatZoneName(slot.camera_id),
      }));

      // Recompute verified totals from clean slots
      const occupiedCount = cleanSlots.filter((s) => s.occupied).length;
      const totalCount = cleanSlots.length > 0 ? cleanSlots.length : raw.total || 0;
      const availableCount = Math.max(0, totalCount - occupiedCount);
      const occupancyPct =
        totalCount > 0 ? Number(((occupiedCount / totalCount) * 100).toFixed(0)) : 0;

      // Normalize zones dictionary
      const cleanZones: Record<string, ZoneStatus> = {};
      if (raw.cameras) {
        for (const [zId, zData] of Object.entries(raw.cameras)) {
          const zoneSlots = (zData.slots || [])
            .map((s) => cleanSlots.find((cs) => cs.id === s.id) || s)
            .map((s) => ({
              ...s,
              occupied: Boolean(s.occupied),
              zone: formatZoneName(s.camera_id),
            }));

          const zOccupied = zoneSlots.filter((s) => s.occupied).length;
          const zTotal = zoneSlots.length;
          const zAvailable = Math.max(0, zTotal - zOccupied);
          const zPct = zTotal > 0 ? Number(((zOccupied / zTotal) * 100).toFixed(0)) : 0;

          cleanZones[zId] = {
            ...zData,
            name: formatZoneName(zId, zData.name),
            slots: zoneSlots,
            total: zTotal,
            occupied: zOccupied,
            available: zAvailable,
            occupancy_percentage: zPct,
          };
        }
      }

      return {
        ...raw,
        total: totalCount,
        occupied: occupiedCount,
        available: availableCount,
        occupancy_percentage: occupancyPct,
        slots: cleanSlots,
        cameras: cleanZones,
      };
    },
    []
  );

  const applyStatus = useCallback(
    (newData: ParkingStatusResponse) => {
      if (!isMountedRef.current) return;
      if (!newData || !Array.isArray(newData.slots)) return;

      rawBackendDataRef.current = newData;
      const processed = processBackendResponse(newData);

      // Create signature of slot occupancy
      const signature = processed.slots.map((s) => `${s.id}:${s.occupied ? 1 : 0}`).join(",");

      setData((prev) => {
        if (prev && signature === lastSignatureRef.current) {
          if (prev.last_updated === processed.last_updated) {
            return prev;
          }
          return {
            ...prev,
            last_updated: processed.last_updated,
          };
        }
        lastSignatureRef.current = signature;
        return processed;
      });

      setIsLive(true);
      setIsConnecting(false);
      setConnectionError(null);
    },
    [processBackendResponse]
  );

  const fetchStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/parking/status`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ParkingStatusResponse = await res.json();
      applyStatus(json);
      return true;
    } catch {
      if (!wsConnectedRef.current && isMountedRef.current) {
        setIsLive(false);
      }
      return false;
    }
  }, [applyStatus]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/parking/refresh`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json: ParkingStatusResponse = await res.json();
        applyStatus(json);
      } else {
        await fetchStatus();
      }
    } catch {
      await fetchStatus();
    } finally {
      if (isMountedRef.current) {
        setTimeout(() => setIsRefreshing(false), 200);
      }
    }
  }, [applyStatus, fetchStatus]);

  // Backward-compatible switchBackend function (locked to local)
  const switchBackend = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    let pollInterval: ReturnType<typeof setInterval>;
    let wsReconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWebSocket = () => {
      if (!isMountedRef.current) return;
      try {
        const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/parking/ws";
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) return;
          wsConnectedRef.current = true;
          setIsLive(true);
          setIsConnecting(false);
          setConnectionError(null);
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const parsed: ParkingStatusResponse = JSON.parse(event.data);
            applyStatus(parsed);
          } catch (e) {
            console.error("WS Parse Error", e);
          }
        };

        ws.onclose = () => {
          if (!isMountedRef.current) return;
          wsConnectedRef.current = false;
          // Reconnect to localhost WebSocket after 3s
          wsReconnectTimeout = setTimeout(() => {
            if (isMountedRef.current) connectWebSocket();
          }, 3000);
        };

        ws.onerror = () => {
          wsConnectedRef.current = false;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch {
        wsConnectedRef.current = false;
        wsReconnectTimeout = setTimeout(() => {
          if (isMountedRef.current) connectWebSocket();
        }, 3000);
      }
    };

    // Immediate initial fetch to localhost
    fetchStatus();
    // Connect WebSocket to localhost
    connectWebSocket();

    // Fallback polling strictly against localhost:8000 when WS is not active
    pollInterval = setInterval(() => {
      if (!wsConnectedRef.current && isMountedRef.current) {
        fetchStatus();
      }
    }, 2500);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
      clearTimeout(wsReconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchStatus, applyStatus]);

  return {
    data,
    isLive,
    isRefreshing,
    isConnecting,
    connectionError,
    refresh,
    apiBase: API_BASE,
    activeBackendType: "local" as const,
    switchBackend,
  };
}

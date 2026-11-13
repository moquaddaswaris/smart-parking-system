"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ParkingStatusResponse, ParkingSlotData, ZoneStatus } from "@/types/parking";

const DEFAULT_CLOUD_URL = "https://smart-parking-system-u370.onrender.com";
const DEFAULT_LOCAL_URL = "http://127.0.0.1:8000";

const INITIAL_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_CLOUD_URL;

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
  const [apiBase, setApiBase] = useState<string>(INITIAL_API_BASE);
  const [data, setData] = useState<ParkingStatusResponse | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeBackendType, setActiveBackendType] = useState<"cloud" | "local">(
    INITIAL_API_BASE.includes("127.0.0.1") || INITIAL_API_BASE.includes("localhost")
      ? "local"
      : "cloud"
  );

  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const activeUrlRef = useRef<string>(apiBase);
  const rawBackendDataRef = useRef<ParkingStatusResponse | null>(null);
  const lastSignatureRef = useRef<string>("");

  activeUrlRef.current = apiBase;

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

  const fetchStatusFromUrl = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        const res = await fetch(`${url}/api/parking/status`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ParkingStatusResponse = await res.json();
        applyStatus(json);
        return true;
      } catch {
        return false;
      }
    },
    [applyStatus]
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const url = activeUrlRef.current;
      const res = await fetch(`${url}/api/parking/refresh`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json: ParkingStatusResponse = await res.json();
        applyStatus(json);
      } else {
        await fetchStatusFromUrl(url);
      }
    } catch {
      await fetchStatusFromUrl(activeUrlRef.current);
    } finally {
      if (isMountedRef.current) {
        setTimeout(() => setIsRefreshing(false), 200);
      }
    }
  }, [applyStatus, fetchStatusFromUrl]);

  const switchBackend = useCallback(
    async (target: "cloud" | "local") => {
      const newUrl = target === "local" ? DEFAULT_LOCAL_URL : DEFAULT_CLOUD_URL;
      setIsConnecting(true);
      setApiBase(newUrl);
      activeUrlRef.current = newUrl;
      setActiveBackendType(target);
      lastSignatureRef.current = "";

      const ok = await fetchStatusFromUrl(newUrl);
      if (!ok) {
        setIsLive(false);
        setConnectionError(
          `Could not reach ${target === "local" ? "local backend (port 8000)" : "cloud backend"}`
        );
      }
      setIsConnecting(false);
    },
    [fetchStatusFromUrl]
  );

  useEffect(() => {
    isMountedRef.current = true;
    let pollInterval: ReturnType<typeof setInterval>;
    let wsReconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWebSocket = (targetUrl: string) => {
      if (!isMountedRef.current) return;
      try {
        const wsUrl = targetUrl.replace(/^http/, "ws") + "/api/parking/ws";
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
          wsReconnectTimeout = setTimeout(() => connectWebSocket(activeUrlRef.current), 4000);
        };

        ws.onerror = () => {
          wsConnectedRef.current = false;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch {
        wsConnectedRef.current = false;
        wsReconnectTimeout = setTimeout(() => connectWebSocket(activeUrlRef.current), 5000);
      }
    };

    const initializeConnection = async () => {
      // Auto-probing: Check if local campus backend (port 8000) is running first
      let resolvedUrl = apiBase;
      try {
        const localProbe = await fetch(`${DEFAULT_LOCAL_URL}/api/parking/status`, {
          cache: "no-store",
          signal: AbortSignal.timeout(1200),
        });
        if (localProbe.ok) {
          const json: ParkingStatusResponse = await localProbe.json();
          resolvedUrl = DEFAULT_LOCAL_URL;
          setApiBase(DEFAULT_LOCAL_URL);
          activeUrlRef.current = DEFAULT_LOCAL_URL;
          setActiveBackendType("local");
          applyStatus(json);
          connectWebSocket(DEFAULT_LOCAL_URL);
          return;
        }
      } catch {
        // Local not active, proceed to primary cloud endpoint
      }

      // Sync from cloud backend
      activeUrlRef.current = resolvedUrl;
      await fetchStatusFromUrl(resolvedUrl);
      connectWebSocket(resolvedUrl);
    };

    initializeConnection();

    pollInterval = setInterval(() => {
      if (!wsConnectedRef.current && isMountedRef.current) {
        fetchStatusFromUrl(activeUrlRef.current);
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
  }, [apiBase, fetchStatusFromUrl, applyStatus]);

  return {
    data,
    isLive,
    isRefreshing,
    isConnecting,
    connectionError,
    refresh,
    apiBase,
    activeBackendType,
    switchBackend,
  };
}

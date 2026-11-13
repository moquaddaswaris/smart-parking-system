"use client";

import { useState, useMemo, useRef } from "react";
import {
  ParkingStatusResponse,
  ParkingSlotData,
  SlotFilterStatus,
  ParkingStats,
} from "@/types/parking";

export function useSlotFilter(statusData: ParkingStatusResponse | null) {
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<SlotFilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sticky recommended slot ID ref to prevent recommendation banner jitter
  const stickyRecommendedSlotIdRef = useRef<number | null>(null);

  const zones = useMemo(() => {
    return statusData?.cameras || {};
  }, [statusData?.cameras]);

  const zoneKeys = useMemo(() => {
    return Object.keys(zones);
  }, [zones]);

  const activeZoneSlots = useMemo(() => {
    if (!statusData) return [];
    if (selectedZone !== "all" && zones[selectedZone]) {
      return zones[selectedZone].slots || [];
    }
    return statusData.slots || [];
  }, [selectedZone, zones, statusData]);

  const stats: ParkingStats = useMemo(() => {
    if (!statusData) {
      return { total: 0, occupied: 0, available: 0, occupancyPercentage: 0 };
    }
    if (selectedZone !== "all" && zones[selectedZone]) {
      const z = zones[selectedZone];
      return {
        total: z.total,
        occupied: z.occupied,
        available: z.available,
        occupancyPercentage: z.occupancy_percentage,
      };
    }
    return {
      total: statusData.total,
      occupied: statusData.occupied,
      available: statusData.available,
      occupancyPercentage: statusData.occupancy_percentage,
    };
  }, [selectedZone, zones, statusData]);

  const filteredSlots = useMemo(() => {
    return activeZoneSlots.filter((slot: ParkingSlotData) => {
      // Status filter
      if (statusFilter === "available" && slot.occupied) return false;
      if (statusFilter === "occupied" && !slot.occupied) return false;

      // Search query filter (matches slot number or zone name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const slotNum = String(slot.id);
        const paddedSlotNum = slotNum.padStart(2, "0");
        const zoneStr = (slot.zone || "").toLowerCase();
        return (
          slotNum.includes(query) ||
          paddedSlotNum.includes(query) ||
          zoneStr.includes(query)
        );
      }

      return true;
    });
  }, [activeZoneSlots, statusFilter, searchQuery]);

  // Stable recommended available spot
  // If the previously recommended spot is still free and in scope, stick with it!
  const bestAvailableSlot = useMemo(() => {
    const availableSlots = activeZoneSlots.filter((s) => !s.occupied);
    if (availableSlots.length === 0) {
      stickyRecommendedSlotIdRef.current = null;
      return null;
    }

    const currentStickyId = stickyRecommendedSlotIdRef.current;
    if (currentStickyId !== null) {
      const existingStillFree = availableSlots.find((s) => s.id === currentStickyId);
      if (existingStillFree) {
        return existingStillFree;
      }
    }

    // Otherwise, pick the lowest ID free slot and stick to it
    const newBest = availableSlots[0];
    stickyRecommendedSlotIdRef.current = newBest.id;
    return newBest;
  }, [activeZoneSlots]);

  return {
    selectedZone,
    setSelectedZone,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    zoneKeys,
    zones,
    stats,
    filteredSlots,
    totalInScope: activeZoneSlots.length,
    bestAvailableSlot,
  };
}

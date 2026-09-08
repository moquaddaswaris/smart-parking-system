"use client";

import { useState } from "react";
import ParkingSlot from "./ParkingSlot";
import { Video, Grid } from "lucide-react";

interface ParkingSlotData {
  id: number;
  occupied: boolean;
}

interface ParkingMapProps {
  slots: ParkingSlotData[];
  streamUrl?: string;
}

export default function ParkingMap({
  slots,
  streamUrl = "http://127.0.0.1:8000/api/parking/stream",
}: ParkingMapProps) {
  const [viewMode, setViewMode] = useState<"map" | "cctv">("map");

  const total = slots.length;
  const occupied = slots.filter(slot => slot.occupied).length;
  const available = total - occupied;
  const percentage = total > 0 ? ((occupied / total) * 100).toFixed(0) : "0";

  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">
              Parking Map
            </h2>
            <div className="flex items-center rounded-lg border border-border bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  viewMode === "map"
                    ? "bg-white text-primary shadow-xs font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Map View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cctv")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  viewMode === "cctv"
                    ? "bg-white text-primary shadow-xs font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>Live CCTV</span>
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted">
            {viewMode === "map"
              ? "Live status of all parking spaces"
              : "Direct real-time CCTV camera feed with AI detection"}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-muted">Available {available}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            <span className="text-muted">Occupied {occupied}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        {viewMode === "map" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {slots.map(slot => (
              <ParkingSlot
                key={slot.id}
                id={slot.id}
                occupied={slot.occupied}
              />
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={streamUrl}
              alt="Live CCTV Parking Stream"
              className="h-auto w-full object-contain"
            />
            <div className="absolute bottom-3 left-3 rounded-md bg-black/70 px-3 py-1 text-xs text-white backdrop-blur-xs">
              AI Overlay: Green = Available, Red = Occupied
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-muted">Overall occupancy</span>
        <span className="text-sm font-semibold text-primary">
          {percentage}%
        </span>
      </div>
    </section>
  );
}
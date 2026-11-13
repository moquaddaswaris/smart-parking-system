"use client";

import { ParkingSlotData } from "@/types/parking";
import { COURTYARD_TOPOLOGY } from "@/lib/courtyardTopology";

interface ParkingSlotCardProps {
  slot: ParkingSlotData;
  onSelect: (slot: ParkingSlotData) => void;
  isSaved?: boolean;
}

export default function ParkingSlotCard({
  slot,
  onSelect,
  isSaved = false,
}: ParkingSlotCardProps) {
  const { id, occupied } = slot;
  const topology = COURTYARD_TOPOLOGY[id];
  const code = topology?.code || `P${String(id).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      aria-label={`${code}: ${occupied ? "Occupied" : "Available"}${
        isSaved ? ", Saved Spot" : ""
      }`}
      className={`touch-target relative flex items-center justify-between p-3 rounded-xl border-2 transition-all active:scale-95 text-left ${
        occupied
          ? "bg-red-50/80 border-red-200 hover:border-red-400 text-red-950"
          : "bg-emerald-50/80 border-emerald-200 hover:border-emerald-400 text-emerald-950"
      } ${isSaved ? "ring-2 ring-primary ring-offset-1" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-base font-black tracking-tight text-slate-900">
          {code}
        </span>
        {isSaved && (
          <span className="text-[9px] font-extrabold uppercase bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.2 rounded">
            My Spot
          </span>
        )}
      </div>

      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
          occupied
            ? "bg-red-600 text-white shadow-2xs"
            : "bg-emerald-600 text-white shadow-2xs"
        }`}
      >
        {occupied ? "Occupied" : "Free"}
      </span>
    </button>
  );
}

"use client";

import { SlotFilterStatus } from "@/types/parking";
import { CheckCircle2, Car, Layers } from "lucide-react";

interface FilterBarProps {
  statusFilter: SlotFilterStatus;
  onFilterChange: (status: SlotFilterStatus) => void;
  counts: {
    total: number;
    available: number;
    occupied: number;
  };
}

export default function FilterBar({
  statusFilter,
  onFilterChange,
  counts,
}: FilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Filter spots by availability"
      className="grid grid-cols-3 gap-1.5 w-full rounded-2xl border-2 border-border bg-card p-1.5 shadow-2xs"
    >
      {/* All Bays Button */}
      <button
        type="button"
        aria-pressed={statusFilter === "all"}
        onClick={() => onFilterChange("all")}
        className={`touch-target flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-black transition cursor-pointer select-none ${
          statusFilter === "all"
            ? "bg-primary text-white shadow-xs"
            : "text-muted hover:text-foreground hover:bg-slate-100"
        }`}
      >
        <Layers className="h-3.5 w-3.5 shrink-0" />
        <span>All</span>
        <span className="text-[10px] font-bold opacity-80">({counts.total})</span>
      </button>

      {/* Free Bays Button */}
      <button
        type="button"
        aria-pressed={statusFilter === "available"}
        onClick={() => onFilterChange("available")}
        className={`touch-target flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-black transition cursor-pointer select-none ${
          statusFilter === "available"
            ? "bg-success text-white shadow-xs"
            : "text-muted hover:text-foreground hover:bg-slate-100"
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-light" />
        <span>Free</span>
        <span className="text-[10px] font-bold opacity-80">({counts.available})</span>
      </button>

      {/* Occupied Bays Button */}
      <button
        type="button"
        aria-pressed={statusFilter === "occupied"}
        onClick={() => onFilterChange("occupied")}
        className={`touch-target flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-black transition cursor-pointer select-none ${
          statusFilter === "occupied"
            ? "bg-danger text-white shadow-xs"
            : "text-muted hover:text-foreground hover:bg-slate-100"
        }`}
      >
        <Car className="h-3.5 w-3.5 shrink-0 text-danger-light" />
        <span>Occupied</span>
        <span className="text-[10px] font-bold opacity-80">({counts.occupied})</span>
      </button>
    </div>
  );
}

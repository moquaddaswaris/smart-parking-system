"use client";

import { ZoneStatus } from "@/types/parking";
import { MapPin } from "lucide-react";

interface ZoneSelectorProps {
  zoneKeys: string[];
  zones: Record<string, ZoneStatus>;
  selectedZone: string;
  onSelectZone: (id: string) => void;
  totalSpots: number;
}

export default function ZoneSelector({
  zoneKeys,
  zones,
  selectedZone,
  onSelectZone,
  totalSpots,
}: ZoneSelectorProps) {
  if (zoneKeys.length === 0) return null;

  return (
    <nav
      aria-label="Parking zone selection"
      className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedZone === "all"}
        onClick={() => onSelectZone("all")}
        className={`touch-target flex shrink-0 items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
          selectedZone === "all"
            ? "border-primary bg-primary text-white shadow-xs"
            : "border-border bg-card text-foreground hover:border-slate-400"
        }`}
      >
        <MapPin className="h-3.5 w-3.5" />
        <span>All Zones</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
            selectedZone === "all"
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-foreground"
          }`}
        >
          {totalSpots}
        </span>
      </button>

      {zoneKeys.map((zId) => {
        const zone = zones[zId];
        const isSelected = selectedZone === zId;
        const displayName = zone?.name || `Zone ${zId.toUpperCase()}`;
        const availableCount = zone?.available ?? 0;

        return (
          <button
            key={zId}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectZone(zId)}
            className={`touch-target flex shrink-0 items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
              isSelected
                ? "border-primary bg-primary text-white shadow-xs"
                : "border-border bg-card text-foreground hover:border-slate-400"
            }`}
          >
            <span>{displayName}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                isSelected
                  ? "bg-white/20 text-white"
                  : availableCount > 0
                  ? "bg-success-light text-success-dark border border-success-border"
                  : "bg-danger-light text-danger-dark border border-danger-border"
              }`}
            >
              {availableCount} free
            </span>
          </button>
        );
      })}
    </nav>
  );
}


"use client";

import { ParkingStats, ParkingSlotData } from "@/types/parking";

interface QuickStatsProps {
  stats: ParkingStats;
  zoneName?: string;
  slots?: ParkingSlotData[];
}

export default function QuickStats({ stats, zoneName, slots = [] }: QuickStatsProps) {
  const { total, occupied, available } = stats;

  const zone1Slots = [1, 2, 3, 4, 5, 6, 7].map(
    (id) => slots.find((s) => s.id === id) || { id, occupied: false }
  );

  // 12 Slots: 6 Up and 6 Down
  const zone2TopRow = [19, 18, 17, 16, 15, 14].map(
    (id) => slots.find((s) => s.id === id) || { id, occupied: false }
  );

  const zone2BottomRow = [8, 9, 10, 11, 12, 13].map(
    (id) => slots.find((s) => s.id === id) || { id, occupied: false }
  );

  const zone1Free = zone1Slots.filter((s) => !s.occupied).length;
  const zone2Free = [...zone2TopRow, ...zone2BottomRow].filter((s) => !s.occupied).length;

  return (
    <section
      aria-label="Parking Space Summary"
      className="rounded-2xl border-2 border-border bg-card p-3.5 sm:p-5 shadow-2xs"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-700 leading-none tabular-nums sm:text-3xl">
            {available}
          </span>
          <span className="text-xs font-black text-emerald-700">Available</span>
          <span className="text-slate-300 font-bold">/</span>
          <span className="text-xl font-black text-red-600 leading-none tabular-nums sm:text-2xl">
            {occupied}
          </span>
          <span className="text-xs font-black text-red-600">Occupied</span>
        </div>

        <span className="text-[11px] font-black text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg tabular-nums">
          {total} Total
        </span>
      </div>

      {/* 19-Slot Status Bar Mirroring Physical Layout: Zone 1 (7 Linear) | Gap | Zone 2 (6 Up / 6 Down) */}
      <div
        className="flex items-center gap-1.5 mt-3"
        aria-label="19-slot spatial bar with 6 up and 6 down"
      >
        {/* Left 7 segments (Zone 1: P01–P07) */}
        <div className="grid grid-cols-7 gap-[2px] h-6 flex-[7] rounded-l-md overflow-hidden bg-slate-200">
          {zone1Slots.map((s) => (
            <span
              key={`bar-z1-${s.id}`}
              title={`P${String(s.id).padStart(2, "0")}: ${
                s.occupied ? "Occupied" : "Free"
              }`}
              className={`h-full transition-colors duration-200 ${
                s.occupied ? "bg-[#dc2626]" : "bg-[#16a34a]"
              }`}
            />
          ))}
        </div>

        {/* Center 1-Car Gap notch */}
        <div
          className="w-2 h-6 rounded-xs bg-amber-400 border border-amber-500 shrink-0 flex items-center justify-center"
          title="1-Car Gap"
        >
          <span className="text-[6px] font-black text-amber-950">G</span>
        </div>

        {/* Right 12 segments: 6 Up and 6 Down (Zone 2: P08–P19) */}
        <div className="flex flex-col gap-[2px] flex-[12]">
          {/* Upper Row: 6 Up (P19 → P14) */}
          <div className="grid grid-cols-6 gap-[2px] h-[11px] rounded-tr-md overflow-hidden bg-slate-200">
            {zone2TopRow.map((s) => (
              <span
                key={`bar-z2-top-${s.id}`}
                title={`P${String(s.id).padStart(2, "0")} (6 Up): ${
                  s.occupied ? "Occupied" : "Free"
                }`}
                className={`h-full transition-colors duration-200 ${
                  s.occupied ? "bg-[#dc2626]" : "bg-[#16a34a]"
                }`}
              />
            ))}
          </div>

          {/* Lower Row: 6 Down (P08 → P13) */}
          <div className="grid grid-cols-6 gap-[2px] h-[11px] rounded-br-md overflow-hidden bg-slate-200">
            {zone2BottomRow.map((s) => (
              <span
                key={`bar-z2-bot-${s.id}`}
                title={`P${String(s.id).padStart(2, "0")} (6 Down): ${
                  s.occupied ? "Occupied" : "Free"
                }`}
                className={`h-full transition-colors duration-200 ${
                  s.occupied ? "bg-[#dc2626]" : "bg-[#16a34a]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Per-Zone Free Badges & 6 Up / 6 Down indicator */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-200">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-600">Zone 1 · 7 Bays</span>
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded tabular-nums">
            {zone1Free} Free
          </span>
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-600">Zone 2 · 12 (6 Up / 6 Down)</span>
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded tabular-nums">
            {zone2Free} Free
          </span>
        </div>
      </div>
    </section>
  );
}

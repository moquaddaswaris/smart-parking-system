"use client";

import { ParkingSlotData } from "@/types/parking";
import ParkingSlotCard from "./ParkingSlotCard";
import { SearchX, RotateCcw } from "lucide-react";

interface ParkingGridProps {
  slots: ParkingSlotData[];
  onSelectSlot: (slot: ParkingSlotData) => void;
  savedSlotId?: number | null;
  onResetFilters: () => void;
}

export default function ParkingGrid({
  slots,
  onSelectSlot,
  savedSlotId,
  onResetFilters,
}: ParkingGridProps) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center sm:p-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted">
          <SearchX className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-black text-foreground">
          No parking spots match your filter
        </h3>
        <p className="mt-1 text-xs font-semibold text-muted">
          Try clearing your search query or selecting a different status filter.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="touch-target mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-hover active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>
    );
  }

  // Group slots according to physical zones & 6 Up / 6 Down
  const zone1Slots = slots.filter((s) => s.id >= 1 && s.id <= 7);
  const zone2TopRow = [19, 18, 17, 16, 15, 14]
    .map((id) => slots.find((s) => s.id === id))
    .filter((s): s is ParkingSlotData => Boolean(s));
  const zone2BottomRow = [8, 9, 10, 11, 12, 13]
    .map((id) => slots.find((s) => s.id === id))
    .filter((s): s is ParkingSlotData => Boolean(s));

  // Any other slots not in 1..19
  const otherSlots = slots.filter((s) => s.id > 19);

  return (
    <div className="space-y-6" role="region" aria-label="Parking slots grouped by zone">
      {/* Zone 1: 7 Slots */}
      {zone1Slots.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Zone 1 · 7 Bays (P01–P07)
            </h4>
            <span className="text-[10px] font-bold text-muted">
              {zone1Slots.filter((s) => !s.occupied).length} Available
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {zone1Slots.map((slot) => (
              <ParkingSlotCard
                key={`z1-slot-${slot.id}`}
                slot={slot}
                onSelect={onSelectSlot}
                isSaved={savedSlotId === slot.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Zone 2: 12 Slots — 6 Up and 6 Down */}
      {(zone2TopRow.length > 0 || zone2BottomRow.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Zone 2 · 12 Bays (6 Up / 6 Down)
            </h4>
            <span className="text-[10px] font-bold text-muted">
              {[...zone2TopRow, ...zone2BottomRow].filter((s) => !s.occupied).length} Available
            </span>
          </div>

          {/* Row 1: 6 Up */}
          {zone2TopRow.length > 0 && (
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Upper Row · 6 Up (P19 → P14)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {zone2TopRow.map((slot) => (
                  <ParkingSlotCard
                    key={`z2-top-slot-${slot.id}`}
                    slot={slot}
                    onSelect={onSelectSlot}
                    isSaved={savedSlotId === slot.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Row 2: 6 Down */}
          {zone2BottomRow.length > 0 && (
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5 border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Lower Row · 6 Down (P08 → P13)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {zone2BottomRow.map((slot) => (
                  <ParkingSlotCard
                    key={`z2-bot-slot-${slot.id}`}
                    slot={slot}
                    onSelect={onSelectSlot}
                    isSaved={savedSlotId === slot.id}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Any overflow/other slots */}
      {otherSlots.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
            Additional Bays
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {otherSlots.map((slot) => (
              <ParkingSlotCard
                key={`other-slot-${slot.id}`}
                slot={slot}
                onSelect={onSelectSlot}
                isSaved={savedSlotId === slot.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

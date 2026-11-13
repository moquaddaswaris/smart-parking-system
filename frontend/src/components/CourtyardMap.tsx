"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ParkingSlotData, SlotFilterStatus } from "@/types/parking";
import ParkingBay from "./ParkingBay";
import { Maximize2, MoveHorizontal } from "lucide-react";

interface CourtyardMapProps {
  slots: ParkingSlotData[];
  selectedSlotId: number | null;
  onSelectSlot: (slot: ParkingSlotData) => void;
  statusFilter: SlotFilterStatus;
}

export default function CourtyardMap({
  slots,
  selectedSlotId,
  onSelectSlot,
  statusFilter,
}: CourtyardMapProps) {
  const [horizontalMode, setHorizontalMode] = useState<"detail" | "fit">("detail");
  const [viewportThumbStyle, setViewportThumbStyle] = useState<{ left: string; width: string }>({
    left: "0%",
    width: "44%",
  });

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  // Group slots according to physical courtyard layout
  const zone1Slots = [1, 2, 3, 4, 5, 6, 7].map(
    (id) => slots.find((s) => s.id === id) || { id, occupied: false }
  );

  const zone2BottomRow = [8, 9, 10, 11, 12, 13].map(
    (id) => slots.find((s) => s.id === id) || { id, occupied: false }
  );

  const zone2TopRow = [19, 18, 17, 16, 15, 14].map(
    (id) => slots.find((s) => s.id === id) || { id, occupied: false }
  );

  const zone1Free = zone1Slots.filter((s) => !s.occupied).length;
  const zone2Free = [...zone2BottomRow, ...zone2TopRow].filter((s) => !s.occupied).length;

  const matchesFilter = useCallback(
    (slot: ParkingSlotData) => {
      if (statusFilter === "available") return !slot.occupied;
      if (statusFilter === "occupied") return slot.occupied;
      return true;
    },
    [statusFilter]
  );

  // Updates mini-map thumb position as user scrolls horizontally
  const updateMiniMapViewport = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const scrollW = viewport.scrollWidth;
    const clientW = viewport.clientWidth;
    if (scrollW <= clientW) {
      setViewportThumbStyle({ left: "0%", width: "100%" });
      return;
    }

    const widthPct = Math.max(18, (clientW / scrollW) * 100);
    const maxLeftPct = 100 - widthPct;
    const scrollRatio = viewport.scrollLeft / (scrollW - clientW);
    const leftPct = Math.min(maxLeftPct, Math.max(0, scrollRatio * maxLeftPct));

    setViewportThumbStyle({
      width: `${widthPct.toFixed(1)}%`,
      left: `${leftPct.toFixed(1)}%`,
    });
  }, []);

  useEffect(() => {
    updateMiniMapViewport();
  }, [horizontalMode, updateMiniMapViewport]);

  const scrollToSection = (target: "zone1" | "gap" | "zone2") => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    if (maxScroll <= 0) return;

    if (target === "zone1") {
      viewport.scrollTo({ left: 0, behavior: "smooth" });
    } else if (target === "gap") {
      viewport.scrollTo({ left: Math.round(maxScroll * 0.52), behavior: "smooth" });
    } else if (target === "zone2") {
      viewport.scrollTo({ left: maxScroll, behavior: "smooth" });
    }
  };

  const isFit = horizontalMode === "fit";

  return (
    <section
      aria-label="Continuous Horizontal 19-Slot Courtyard Map"
      className="rounded-2xl bg-white p-2 sm:p-3 border-2 border-slate-200/90 shadow-xs space-y-2 text-slate-900"
    >
      {/* View Mode Toggle Header */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
          Courtyard Layout
        </span>

        <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setHorizontalMode("detail")}
            className={`touch-target py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              !isFit
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 font-bold"
            }`}
          >
            <MoveHorizontal className="h-3.5 w-3.5 text-sky-600" />
            <span>Detail Pan</span>
          </button>

          <button
            type="button"
            onClick={() => setHorizontalMode("fit")}
            className={`touch-target py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              isFit
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black"
                : "text-slate-600 hover:text-slate-900 font-bold"
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Fit Strip</span>
          </button>
        </div>
      </div>

      {/* HORIZONTAL MINI-MAP & ZONE NAVIGATOR BAR (In Detail Pan Mode) */}
      {!isFit && (
        <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 space-y-1.5 animate-in fade-in">
          {/* Interactive Zone Jump Pills */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollToSection("zone1")}
              className="flex-[7] py-1 px-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[9.5px] font-extrabold tracking-tight transition-colors truncate cursor-pointer"
            >
              Zone 1: P01–P07 ({zone1Free} Free)
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("gap")}
              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-black uppercase tracking-tight shrink-0 cursor-pointer"
            >
              1-Car Gap
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("zone2")}
              className="flex-[6] py-1 px-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-[9.5px] font-extrabold tracking-tight transition-colors truncate cursor-pointer"
            >
              Zone 2: P08–P19 ({zone2Free} Free)
            </button>
          </div>

          {/* Live Scroll Viewport Position Track */}
          <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <div className="absolute inset-y-0 left-0 w-[50%] bg-emerald-500/25" />
            <div className="absolute inset-y-0 left-[50%] w-[7%] bg-amber-400/50" />
            <div className="absolute inset-y-0 right-0 w-[43%] bg-sky-500/25" />
            <div
              className="absolute top-0 bottom-0 bg-primary rounded-full shadow-xs transition-all duration-75"
              style={{
                left: viewportThumbStyle.left,
                width: viewportThumbStyle.width,
              }}
            />
          </div>
        </div>
      )}

      {/* HORIZONTAL COURTYARD SCROLL / FIT VIEWPORT */}
      <div
        ref={scrollViewportRef}
        onScroll={updateMiniMapViewport}
        className={`w-full rounded-xl border-2 border-slate-500/80 courtyard-concrete-surface shadow-inner ${
          isFit ? "overflow-x-hidden" : "overflow-x-auto smooth-pan-scroll no-scrollbar"
        }`}
      >
        {/* CONTINUOUS HORIZONTAL LOT CANVAS: Zone 1 [7 cols] + Gap [1 col] + Zone 2 [6 cols] */}
        <div
          className={`flex flex-col justify-between transition-all duration-200 select-none ${
            isFit ? "w-full p-1.5" : "w-[920px] p-2.5"
          }`}
        >
          {/* MAIN UNIFIED HORIZONTAL ALIGNMENT ROW */}
          <div
            className={`flex items-stretch ${
              isFit ? "gap-1 h-[196px]" : "gap-1.5 h-[280px]"
            }`}
          >
            {/* ========================================================= */}
            {/* LEFT SECTION: ZONE 1 (P01 to P07 Horizontally)            */}
            {/* ========================================================= */}
            <div className="flex-[7] min-w-0 flex flex-col justify-between">
              {/* Dark Green Hedge / Garden Island Strip above P01–P07 */}
              <div
                className={`rounded-t-xl rounded-b-md hedge-island-surface border-2 border-[#142c16] shadow-inner flex flex-col items-center justify-center px-1.5 relative overflow-hidden ${
                  isFit ? "h-[76px]" : "h-[88px]"
                }`}
              >
                <span
                  className={`font-black tracking-widest uppercase text-emerald-100 bg-black/40 px-2 py-0.5 rounded-full border border-emerald-400/30 ${
                    isFit ? "text-[7px]" : "text-[10px]"
                  }`}
                >
                  HEDGE / GARDEN ISLAND
                </span>
                {!isFit && (
                  <span className="text-[8.5px] font-bold text-emerald-200/90 mt-1">
                    Zone 1 · 7 Bays (P01–P07)
                  </span>
                )}
              </div>

              {/* 7 Horizontal Bays: P01 to P07 */}
              <div
                className={`grid grid-cols-7 mt-auto ${
                  isFit ? "gap-[2px] h-[112px]" : "gap-1 h-[178px]"
                }`}
              >
                {zone1Slots.map((slot) => (
                  <ParkingBay
                    key={`bay-${slot.id}`}
                    slot={slot}
                    isFitMode={isFit}
                    matchesFilter={matchesFilter(slot)}
                    isSelected={selectedSlotId === slot.id}
                    onSelect={onSelectSlot}
                  />
                ))}
              </div>
            </div>

            {/* ========================================================= */}
            {/* CENTER DIVIDER: 1-CAR GAP                                 */}
            {/* ========================================================= */}
            <div
              className="flex-[1] min-w-0 rounded-xl border-x-2 border-dashed border-slate-600/80 bg-slate-300/50 flex flex-col items-center justify-between py-1 px-0.5 relative"
              aria-label="1-Car Gap between Zone 1 and Zone 2"
            >
              {/* Top Two-Wheeler (2W) Landmark */}
              <div className="flex flex-col items-center bg-slate-800 text-slate-100 p-0.5 rounded border border-slate-600 shadow-2xs">
                <svg className="w-3 h-3 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="5.5" cy="17.5" r="3.5" />
                  <circle cx="18.5" cy="17.5" r="3.5" />
                  <path d="M15 6h3l2 5.5M5.5 17.5L9 11h5l2 6.5" />
                </svg>
                {!isFit && (
                  <span className="text-[7px] font-black uppercase text-slate-300 mt-0.5">
                    2W
                  </span>
                )}
              </div>

              {/* Vertical 1-CAR GAP Label */}
              <div className="my-auto flex items-center justify-center">
                <span
                  className={`bg-slate-900/95 text-amber-300 border border-amber-400/50 rounded px-0.5 py-1.5 font-black uppercase tracking-widest whitespace-nowrap [writing-mode:vertical-rl] rotate-180 shadow-xs ${
                    isFit ? "text-[6.5px]" : "text-[9px]"
                  }`}
                >
                  1-CAR GAP
                </span>
              </div>

              {/* Bottom Badge */}
              {!isFit && (
                <div className="text-[7px] font-mono font-bold text-slate-700 bg-white/80 px-1 py-0.5 rounded border border-slate-400">
                  GAP
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* RIGHT SECTION: ZONE 2 (12 Bays: 6 Up and 6 Down)          */}
            {/* ========================================================= */}
            <div className="flex-[6] min-w-0 flex flex-col justify-between">
              {/* Courtyard Plaza / Steps Landmark Header above P19–P14 */}
              <div
                className={`rounded-t-lg courtyard-plaza-surface border border-slate-500/80 flex items-center justify-center px-1 shadow-xs ${
                  isFit ? "h-[16px]" : "h-[24px]"
                }`}
              >
                <span
                  className={`font-black uppercase text-slate-900 bg-white/90 px-1.5 py-0.2 rounded ${
                    isFit ? "text-[6.5px]" : "text-[8.5px] tracking-widest"
                  }`}
                >
                  {isFit ? "PLAZA" : "COURTYARD PLAZA · STEPS"}
                </span>
              </div>

              {/* 2x6 Parallel Grid */}
              <div className="flex-1 flex flex-col justify-between mt-1">
                {/* Top/Back Row: P19, P18, P17, P16, P15, P14 */}
                <div
                  className={`grid grid-cols-6 ${
                    isFit ? "gap-[2px] h-[85px]" : "gap-1 h-[120px]"
                  }`}
                >
                  {zone2TopRow.map((slot) => (
                    <ParkingBay
                      key={`bay-${slot.id}`}
                      slot={slot}
                      isFitMode={isFit}
                      matchesFilter={matchesFilter(slot)}
                      isSelected={selectedSlotId === slot.id}
                      onSelect={onSelectSlot}
                    />
                  ))}
                </div>

                {/* Shared Center Divider Line */}
                <div className="h-[4px] my-0.5 rounded-full bg-slate-700 flex items-center">
                  <div className="w-full border-t border-dashed border-amber-300/80" />
                </div>

                {/* Bottom/Front Row: P08, P09, P10, P11, P12, P13 */}
                <div
                  className={`grid grid-cols-6 ${
                    isFit ? "gap-[2px] h-[85px]" : "gap-1 h-[120px]"
                  }`}
                >
                  {zone2BottomRow.map((slot) => (
                    <ParkingBay
                      key={`bay-${slot.id}`}
                      slot={slot}
                      isFitMode={isFit}
                      matchesFilter={matchesFilter(slot)}
                      isSelected={selectedSlotId === slot.id}
                      onSelect={onSelectSlot}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CONTINUOUS FRONT COURTYARD DRIVING APRON BASELINE */}
          <div className="mt-2 pt-1.5 border-t-2 border-slate-500/70 flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-slate-700 px-1">
            <span>← P01–P07 Front Apron</span>
            <span className="text-slate-600 font-extrabold">Continuous Courtyard Baseline</span>
            <span>P08–P13 Front Apron →</span>
          </div>
        </div>
      </div>

      {/* Legend & Hint Footer */}
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs cv-bay-available inline-block" />
            <span className="text-emerald-800 font-extrabold">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs cv-bay-occupied inline-block" />
            <span className="text-red-700 font-extrabold">Occupied</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold">
          {isFit ? "All 19 bays fitted · Tap any bay" : "Swipe horizontally · Tap any bay"}
        </span>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { ParkingSlotData } from "@/types/parking";
import { COURTYARD_TOPOLOGY, VEHICLE_STYLES } from "@/lib/courtyardTopology";
import { VerticalCarGraphic } from "./ParkingBay";
import {
  X,
  CheckCircle2,
  Car,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Compass,
} from "lucide-react";

interface SlotDetailSheetProps {
  slot: ParkingSlotData | null;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (slotId: number) => void;
  onToggleSlotOccupancy?: (slotId: number) => void;
}

export default function SlotDetailSheet({
  slot,
  onClose,
  isSaved,
  onToggleSave,
  onToggleSlotOccupancy,
}: SlotDetailSheetProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (slot) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [slot, onClose]);

  if (!slot) return null;

  const { id, occupied } = slot;
  const topology = COURTYARD_TOPOLOGY[id];
  const slotCode = topology?.code || `P${String(id).padStart(2, "0")}`;
  const zoneLabel = topology?.zoneLabel || "Campus Courtyard";
  const styleIdx = topology?.styleIdx ?? (id % VEHICLE_STYLES.length);
  const vehicle = VEHICLE_STYLES[styleIdx];

  const pairedSlotCode = topology?.pairedWith;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-sheet-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 transition-opacity animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl transition-transform animate-in slide-in-from-bottom sm:slide-in-from-bottom-4"
      >
        {/* Mobile handle indicator */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${
                occupied
                  ? "border-danger-border bg-danger-light text-danger-dark"
                  : "border-success-border bg-success-light text-success-dark"
              }`}
            >
              {occupied ? (
                <Car className="h-6 w-6 text-danger" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-success" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="slot-sheet-title"
                  className="text-2xl font-black text-foreground tabular-nums"
                >
                  {slotCode}
                </h3>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    occupied
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {occupied ? "Occupied" : "Available"}
                </span>
              </div>
              <p className="text-xs font-bold text-muted mt-0.5">{zoneLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close slot details"
            className="touch-target flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-foreground active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Spatial Neighbors & Back-to-Back Pairing */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-slate-50 rounded-xl p-3 border-2 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              Horizontal & Paired
            </span>
            <span className="text-xs font-black text-foreground mt-1 block">
              L: {topology?.leftNeighbor || "Edge"} · R: {topology?.rightNeighbor || "Edge"}
            </span>
            <span className="text-[10px] font-semibold text-muted block mt-0.5">
              {pairedSlotCode ? `Paired with ${pairedSlotCode}` : "Linear Row (Hedge Border)"}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border-2 border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
              Bay Status
            </span>
            <span className="text-xs font-black text-foreground mt-1 block">
              {occupied ? "In Use (Parked)" : "Open for Parking"}
            </span>
            <span className="text-[10px] font-semibold text-muted block mt-0.5">
              Near Academic Block
            </span>
          </div>
        </div>

        {/* Detected Vehicle Card (when Occupied) */}
        {occupied && (
          <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between border border-slate-800 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-7 h-12 flex items-center justify-center">
                <VerticalCarGraphic styleIdx={styleIdx} isFitMode={false} />
              </div>
              <div>
                <span className="text-xs font-extrabold block">{vehicle.label}</span>
                <span className="text-[10px] font-mono text-slate-400 block">
                  AI Space Detection · Overlap Active
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              BAY {slotCode}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          {/* Toggle slot status for testing / manual override */}
          {onToggleSlotOccupancy && (
            <button
              type="button"
              onClick={() => onToggleSlotOccupancy(id)}
              className={`touch-target flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-4 text-xs font-black transition active:scale-95 ${
                occupied
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xs"
                  : "bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-xs"
              }`}
            >
              <span>{occupied ? `Mark ${slotCode} Available (Free)` : `Mark ${slotCode} Occupied (Busy)`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleSave(id)}
            className={`touch-target flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-xs font-bold transition active:scale-95 ${
              isSaved
                ? "border-primary bg-primary text-white shadow-xs"
                : "border-border bg-border-subtle text-foreground hover:bg-slate-200"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-4 w-4" />
                <span>Saved as Your Spot (Tap to Clear)</span>
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                <span>I Parked Here (Save Spot)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

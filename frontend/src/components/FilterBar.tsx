"use client";

import { SlotFilterStatus } from "@/types/parking";
import { Search, X, CheckCircle2, Car, Layers } from "lucide-react";

interface FilterBarProps {
  statusFilter: SlotFilterStatus;
  onFilterChange: (status: SlotFilterStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    total: number;
    available: number;
    occupied: number;
  };
}

export default function FilterBar({
  statusFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <label htmlFor="slot-search" className="sr-only">
          Search parking slot number
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
          <Search className="h-4 w-4" />
        </div>
        <input
          id="slot-search"
          type="text"
          inputMode="numeric"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search slot # (e.g. 05)..."
          className="touch-target w-full rounded-xl border-2 border-border bg-card py-2 pl-9 pr-9 text-xs font-bold text-foreground placeholder:text-muted/70 shadow-2xs transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear slot search query"
            className="touch-target absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Status Buttons */}
      <div
        role="group"
        aria-label="Filter spots by availability"
        className="flex items-center gap-1.5 overflow-x-auto rounded-xl border-2 border-border bg-card p-1 shadow-2xs"
      >
        <button
          type="button"
          aria-pressed={statusFilter === "all"}
          onClick={() => onFilterChange("all")}
          className={`touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
            statusFilter === "all"
              ? "bg-primary text-white shadow-xs"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All</span>
          <span className="text-[10px] opacity-80">({counts.total})</span>
        </button>

        <button
          type="button"
          aria-pressed={statusFilter === "available"}
          onClick={() => onFilterChange("available")}
          className={`touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
            statusFilter === "available"
              ? "bg-success text-white shadow-xs"
              : "text-muted hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-success-light" />
          <span>Free</span>
          <span className="text-[10px] opacity-80">({counts.available})</span>
        </button>

        <button
          type="button"
          aria-pressed={statusFilter === "occupied"}
          onClick={() => onFilterChange("occupied")}
          className={`touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
            statusFilter === "occupied"
              ? "bg-danger text-white shadow-xs"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Car className="h-3.5 w-3.5 text-danger-light" />
          <span>Occupied</span>
          <span className="text-[10px] opacity-80">({counts.occupied})</span>
        </button>
      </div>
    </div>
  );
}

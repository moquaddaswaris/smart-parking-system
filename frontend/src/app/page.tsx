"use client";

import { useState, useEffect, useCallback } from "react";
import { useParkingStatus } from "@/hooks/useParkingStatus";
import { useSlotFilter } from "@/hooks/useSlotFilter";
import { ActiveTab, ParkingSlotData } from "@/types/parking";

import Header from "@/components/Header";
import QuickStats from "@/components/QuickStats";
import FilterBar from "@/components/FilterBar";
import CourtyardMap from "@/components/CourtyardMap";
import ParkingGrid from "@/components/ParkingGrid";
import SlotDetailSheet from "@/components/SlotDetailSheet";
import CampusInfoView from "@/components/CampusInfoView";

import { Grid, Info, Map, LayoutGrid } from "lucide-react";

export default function Home() {
  const {
    data,
    isRefreshing,
    refresh,
  } = useParkingStatus();

  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    stats,
    filteredSlots,
  } = useSlotFilter(data);

  // Tab navigation state: 'slots' | 'info'
  const [activeTab, setActiveTab] = useState<ActiveTab>("slots");

  // Display style in Slots tab: 'courtyard' (physical map) vs 'grid' (cards)
  const [slotViewStyle, setSlotViewStyle] = useState<"courtyard" | "grid">("courtyard");

  // Slot detail sheet state
  const [detailSlot, setDetailSlot] = useState<ParkingSlotData | null>(null);

  // Saved parking spot in localStorage for mobile driver convenience
  const [savedSlotId, setSavedSlotId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("visionpark_saved_slot");
      if (stored) {
        setSavedSlotId(Number(stored));
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  }, []);

  const handleToggleSave = (slotId: number) => {
    try {
      if (savedSlotId === slotId) {
        localStorage.removeItem("visionpark_saved_slot");
        setSavedSlotId(null);
      } else {
        localStorage.setItem("visionpark_saved_slot", String(slotId));
        setSavedSlotId(slotId);
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Interactive toggle for testing individual slot state in the sheet
  const handleToggleSlotOccupancy = useCallback((slotId: number) => {
    setDetailSlot((prev) => {
      if (!prev || prev.id !== slotId) return prev;
      return { ...prev, occupied: !prev.occupied };
    });
  }, []);

  const handleResetFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Mobile-First Header with Clear RGIPT Branding & Unified Live Sync */}
      <Header
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        lastSync={data?.last_updated}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-3 py-3 pb-8 focus:outline-none sm:px-6 sm:py-5"
      >
        <div className="flex flex-col gap-3.5">
          {/* Smart Parking Dashboard Header (Visible on Mobile & Desktop) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b-2 border-border pb-2.5">
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground">
                Smart Parking Dashboard
              </h1>
              <p className="text-xs font-bold text-muted">
                Live Campus Lot Overview · 19 Total Bays
              </p>
            </div>

            {/* Navigation Tabs (Available on Mobile & Desktop) */}
            <div
              role="tablist"
              aria-label="View selection"
              className="flex items-center gap-1 rounded-xl border-2 border-border bg-card p-1 shadow-2xs self-start sm:self-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "slots"}
                onClick={() => setActiveTab("slots")}
                className={`touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  activeTab === "slots"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Parking Slots</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "info"}
                onClick={() => setActiveTab("info")}
                className={`touch-target flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                  activeTab === "info"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>Lot Info</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Hero Card with 6 Up / 6 Down 19-Slot Spatial Bar */}
          <QuickStats
            stats={stats}
            slots={data?.slots || []}
          />

          {/* Active Tab View */}
          {activeTab === "slots" && (
            <div className="flex flex-col gap-3">
              {/* Filter Bar with Status Chips & Search */}
              <FilterBar
                statusFilter={statusFilter}
                onFilterChange={setStatusFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                counts={{
                  total: stats.total,
                  available: stats.available,
                  occupied: stats.occupied,
                }}
              />

              {/* View Switcher: Parking Map vs Simple Cards */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-foreground">
                  {slotViewStyle === "courtyard"
                    ? "Visual Lot Map"
                    : "Slot Cards (6 Up / 6 Down)"}
                </span>

                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSlotViewStyle("courtyard")}
                    className={`touch-target px-2.5 py-1 rounded-md flex items-center gap-1.5 transition ${
                      slotViewStyle === "courtyard"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900 font-bold"
                    }`}
                  >
                    <Map className="h-3.5 w-3.5 text-primary" />
                    <span>Lot Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlotViewStyle("grid")}
                    className={`touch-target px-2.5 py-1 rounded-md flex items-center gap-1.5 transition ${
                      slotViewStyle === "grid"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900 font-bold"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5 text-slate-600" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>

              {/* Exact Physical 19-Slot Map: Zone 1 (7 Bays) | 1-Car Gap | Zone 2 (6 Up / 6 Down) */}
              {slotViewStyle === "courtyard" ? (
                <CourtyardMap
                  slots={data?.slots || []}
                  selectedSlotId={detailSlot?.id || null}
                  onSelectSlot={(slot) => setDetailSlot(slot)}
                  statusFilter={statusFilter}
                />
              ) : (
                <ParkingGrid
                  slots={filteredSlots}
                  onSelectSlot={(slot) => setDetailSlot(slot)}
                  savedSlotId={savedSlotId}
                  onResetFilters={handleResetFilters}
                />
              )}
            </div>
          )}

          {activeTab === "info" && (
            <CampusInfoView
              savedSlotId={savedSlotId}
              onSelectSavedSlot={() => {
                if (!data) return;
                const found = data.slots.find((s) => s.id === savedSlotId);
                if (found) {
                  setDetailSlot(found);
                  setActiveTab("slots");
                }
              }}
            />
          )}
        </div>
      </main>

      {/* Slot Details Modal / Bottom Sheet */}
      <SlotDetailSheet
        slot={detailSlot}
        onClose={() => setDetailSlot(null)}
        isSaved={detailSlot ? savedSlotId === detailSlot.id : false}
        onToggleSave={handleToggleSave}
        onToggleSlotOccupancy={handleToggleSlotOccupancy}
      />
    </div>
  );
}

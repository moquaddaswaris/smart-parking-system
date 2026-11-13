"use client";

import { Shield, Clock, MapPin, PhoneCall, Cpu, BookmarkCheck } from "lucide-react";

interface CampusInfoViewProps {
  savedSlotId: number | null;
  onSelectSavedSlot: () => void;
}

export default function CampusInfoView({
  savedSlotId,
  onSelectSavedSlot,
}: CampusInfoViewProps) {
  return (
    <div className="space-y-4">
      {/* Saved Slot Notice */}
      {savedSlotId && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-primary-light p-4 text-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-2xs">
              <BookmarkCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">
                Saved Parking Spot
              </p>
              <p className="text-base font-black text-foreground">
                You are parked at Slot {String(savedSlotId).padStart(2, "0")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSelectSavedSlot}
            className="touch-target rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs active:scale-95"
          >
            Locate Spot
          </button>
        </div>
      )}

      {/* Campus Info Card */}
      <div className="rounded-2xl border-2 border-card-border bg-card p-5 shadow-2xs">
        <h3 className="text-base font-black text-foreground sm:text-lg">
          RGIPT Smart Campus Parking
        </h3>
        <p className="mt-1 text-xs font-semibold text-muted">
          Rajiv Gandhi Institute of Petroleum Technology, Jais, Amethi, UP.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Operational Hours</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">24/7 Automated Monitoring</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Campus Zones</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">Gate 1 Entrance & Gate 2 East Lot</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Intelligent AI Engine</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">Real-Time Automated Space Detection</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Campus Security</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">Internal Intercom Ext: 1001</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border-2 border-border bg-border-subtle p-3.5">
          <div className="flex items-center gap-2 text-xs font-black text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>Driver Guidelines</span>
          </div>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs font-semibold text-muted">
            <li>Please park centered between marked white lane demarcations.</li>
            <li>Maintain vehicle speed below 15 km/h inside parking areas.</li>
            <li>Slots designated in green are vacant and ready to occupy.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

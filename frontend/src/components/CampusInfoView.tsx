"use client";

import {
  Shield,
  Clock,
  MapPin,
  PhoneCall,
  Cpu,
  BookmarkCheck,
  Building2,
  Code2,
  CheckCircle2,
  Ban,
} from "lucide-react";

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
            className="touch-target rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs active:scale-95 cursor-pointer"
          >
            Locate Spot
          </button>
        </div>
      )}

      {/* Campus Lot Information Card */}
      <div className="rounded-2xl border-2 border-card-border bg-card p-5 shadow-2xs">
        <div className="border-b border-border pb-3.5">
          <h3 className="text-base font-black text-foreground sm:text-lg">
            RGIPT Smart Campus Parking
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            Rajiv Gandhi Institute of Petroleum Technology, Jais, Amethi, UP – 229304
          </p>
        </div>

        {/* Concise Location & Surrounding Landmarks (Zero Emojis, No Chips) */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900">
                In Front of Admin Building &amp; RG Plaza
              </h4>
              <p className="mt-0.5 text-xs font-medium text-slate-600">
                Near Vidyasagar Hostel and Subhash Chandra Bose Hostel
              </p>
            </div>
          </div>
        </div>

        {/* System Details Grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Operational Hours</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">24/7 Automated Vision Monitoring</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Courtyard Topology</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                Zone 1 (P01–P07) · No Parking Zone · Zone 2 (P08–P19)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Detection Engine</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">Real-Time AI Vision Space Detection</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-border-subtle p-3.5">
            <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h4 className="text-xs font-black text-foreground">Campus Security &amp; Helpdesk</h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">Security Control Gate 1 (Ext: 1001)</p>
            </div>
          </div>
        </div>

        {/* Driver Guidelines */}
        <div className="mt-4 rounded-xl border-2 border-border bg-border-subtle p-3.5">
          <div className="flex items-center gap-2 text-xs font-black text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>Driver Guidelines &amp; Parking Rules</span>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs font-semibold text-muted">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Park centered strictly within designated white bays (Green = Available, Red = Occupied).</span>
            </li>
            <li className="flex items-start gap-2">
              <Ban className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>Strictly <strong>NO PARKING</strong> in the central buffer zone between Zone 1 and Zone 2.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Maintain driving speed strictly below 15 km/h along the central courtyard apron.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Development Team Card with Photos */}
      <div className="rounded-2xl border-2 border-card-border bg-card p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground sm:text-base">
                Development &amp; Engineering Team
              </h3>
              <p className="text-[11px] font-semibold text-muted">
                Smart Parking System · Science &amp; Technology Council, RGIPT
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-800">
            S&amp;T RGIPT
          </span>
        </div>

        {/* 3 Developers with Photos (Supports real photos: moquaddas.jpg, jitesh.jpg, arin.jpg with svg fallback) */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {/* Developer 1: Moquaddas Waris */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-primary/40 hover:shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20 rounded-full border-2 border-primary/30 p-0.5 bg-slate-100 shadow-xs overflow-hidden">
                <img
                  src="/team/moquaddas.jpg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith(".svg")) {
                      target.src = "/team/moquaddas.svg";
                    }
                  }}
                  alt="Moquaddas Waris"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <h4 className="mt-2.5 text-sm font-black text-foreground">
                Moquaddas Waris
              </h4>
              <p className="font-mono text-xs font-bold text-primary mt-0.5">
                24CD3026
              </p>
              <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                Developer
              </span>
            </div>
          </div>

          {/* Developer 2: Jitesh Saagar */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-indigo-400/40 hover:shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20 rounded-full border-2 border-indigo-400/30 p-0.5 bg-slate-100 shadow-xs overflow-hidden">
                <img
                  src="/team/jitesh.jpg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith(".svg")) {
                      target.src = "/team/jitesh.svg";
                    }
                  }}
                  alt="Jitesh Saagar"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <h4 className="mt-2.5 text-sm font-black text-foreground">
                Jitesh Saagar
              </h4>
              <p className="font-mono text-xs font-bold text-indigo-600 mt-0.5">
                24MC3041
              </p>
              <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                Developer
              </span>
            </div>
          </div>

          {/* Developer 3: Arin Kumar */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-emerald-400/40 hover:shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-20 w-20 rounded-full border-2 border-emerald-400/30 p-0.5 bg-slate-100 shadow-xs overflow-hidden">
                <img
                  src="/team/arin.jpg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith(".svg")) {
                      target.src = "/team/arin.svg";
                    }
                  }}
                  alt="Arin Kumar"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <h4 className="mt-2.5 text-sm font-black text-foreground">
                Arin Kumar
              </h4>
              <p className="font-mono text-xs font-bold text-emerald-600 mt-0.5">
                24IT3008
              </p>
              <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                Developer
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { RefreshCw } from "lucide-react";

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSync?: string;
}

export default function Header({
  onRefresh,
  isRefreshing,
  lastSync,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/98 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex h-14 sm:h-16 max-w-5xl items-center justify-between px-3.5 sm:px-6">
        {/* RGIPT Smart Parking Product Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Clear, Enlarged Logo without outer white box or border */}
          <div className="relative h-11 w-11 sm:h-12 sm:w-12 shrink-0 flex items-center justify-center mt-1">
            <Image
              src="/rgipt-logo.png"
              alt="RGIPT Logo"
              width={48}
              height={48}
              className="h-full w-full object-contain drop-shadow-2xs select-none"
              priority
            />
          </div>

          <div className="min-w-0 truncate">
            <span className="text-base sm:text-lg font-black tracking-tight text-foreground block truncate">
              VisionPark
            </span>
            <p className="text-[11px] font-bold text-muted truncate">
              RGIPT Smart Parking
            </p>
          </div>
        </div>

        {/* Combined Live Sync Status & Refresh Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? "Refreshing live data" : "Tap to refresh parking status"}
            title="Tap to refresh live status"
            className="touch-target flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-2.5 sm:px-3 py-1.5 text-slate-800 shadow-2xs transition active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-[11px] sm:text-xs font-extrabold tabular-nums text-slate-800">
              {lastSync ? lastSync.split(" ")[1] || lastSync : "Syncing..."}
            </span>
            <RefreshCw
              className={`h-3.5 w-3.5 text-primary shrink-0 transition-transform ${isRefreshing ? "animate-spin" : ""
                }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}

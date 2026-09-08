import Image from "next/image";
import { RefreshCw, Circle, LayoutDashboard } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
            <Image
              src="/rgipt-logo.png"
              alt="RGIPT Logo"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="border-l border-border pl-2">
            <h1 className="text-lg font-bold tracking-tight text-primary sm:text-xl">
              VisionPark
            </h1>
            <p className="text-xs font-medium text-muted">
              RGIPT • Smart Parking Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted sm:flex">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </div>

          <button
            type="button"
            aria-label="Refresh parking status"
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-background hover:cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-primary" />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-light px-3 py-2">
            <Circle className="h-2.5 w-2.5 fill-success text-success" />
            <span className="text-xs font-semibold text-success sm:text-sm">
              Live
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
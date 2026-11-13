interface ParkingSlotProps {
  id: number;
  occupied: boolean;
  cameraId?: string;
}

export default function ParkingSlot({ id, occupied, cameraId }: ParkingSlotProps) {
  const camLabel = cameraId === "cam1" ? "Cam 1" : cameraId === "cam2" ? "Cam 2" : cameraId;

  return (
    <div
      className={`relative flex min-h-28 flex-col items-center justify-center rounded-xl border-2 transition ${
        occupied
          ? "border-danger/30 bg-danger-light"
          : "border-success/30 bg-success-light"
      }`}
    >
      {camLabel && (
        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/80 border border-border/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs">
          {camLabel}
        </span>
      )}

      <span className="text-xs font-medium text-muted">
        SLOT
      </span>

      <span className="text-2xl font-bold text-foreground">
        {String(id).padStart(2, "0")}
      </span>

      <span
        className={`mt-1 text-xs font-semibold ${
          occupied ? "text-danger" : "text-success"
        }`}
      >
        {occupied ? "Occupied" : "Available"}
      </span>

      <span
        className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${
          occupied ? "bg-danger" : "bg-success"
        }`}
      />
    </div>
  );
}
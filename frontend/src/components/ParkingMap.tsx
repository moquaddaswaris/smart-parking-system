import ParkingSlot from "./ParkingSlot";

interface ParkingSlotData {
  id: number;
  occupied: boolean;
}

interface ParkingMapProps {
  slots: ParkingSlotData[];
}

export default function ParkingMap({ slots }: ParkingMapProps) {
  const occupied = slots.filter(slot => slot.occupied).length;
  const available = slots.length - occupied;
  const percentage = ((occupied / slots.length) * 100).toFixed(0);

  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Parking Map
          </h2>
          <p className="mt-1 text-sm text-muted">
            Live status of all parking spaces
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="text-muted">Available {available}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
            <span className="text-muted">Occupied {occupied}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {slots.map(slot => (
            <ParkingSlot
              key={slot.id}
              id={slot.id}
              occupied={slot.occupied}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-muted">
          Overall occupancy
        </span>
        <span className="text-sm font-semibold text-primary">
          {percentage}%
        </span>
      </div>
    </section>
  );
}
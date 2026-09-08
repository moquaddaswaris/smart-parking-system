import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ParkingMap from "@/components/ParkingMap";

const parkingSlots = [
  { id: 1, occupied: false },
  { id: 2, occupied: true },
  { id: 3, occupied: false },
  { id: 4, occupied: true },
  { id: 5, occupied: false },
  { id: 6, occupied: false },
  { id: 7, occupied: true },
  { id: 8, occupied: false },
  { id: 9, occupied: false },
  { id: 10, occupied: true },
  { id: 11, occupied: false },
  { id: 12, occupied: false },
  { id: 13, occupied: false },
  { id: 14, occupied: true },
  { id: 15, occupied: false },
  { id: 16, occupied: false },
  { id: 17, occupied: false },
  { id: 18, occupied: false },
  { id: 19, occupied: false },
];

export default function Home() {
  const occupied = parkingSlots.filter(slot => slot.occupied).length;
  const available = parkingSlots.length - occupied;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Parking Dashboard
            </h1>
            <p className="mt-1 text-muted">
              Monitor parking occupancy in real time.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              title="Total Spaces"
              value={parkingSlots.length}
              type="total"
            />
            <StatCard
              title="Occupied"
              value={occupied}
              type="occupied"
            />
            <StatCard
              title="Available"
              value={available}
              type="available"
            />
          </div>

          <div className="mt-8">
            <ParkingMap slots={parkingSlots} />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-muted">
              Last updated: Just now
            </p>
            <p className="text-sm font-medium text-success">
              System operating normally
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
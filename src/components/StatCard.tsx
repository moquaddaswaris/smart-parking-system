interface StatCardProps {
  title: string;
  value: number;
  type: "total" | "occupied" | "available";
}

export default function StatCard({ title, value, type }: StatCardProps) {
  const styles = {
    total: "border-primary/20 bg-primary-light text-primary",
    occupied: "border-danger/20 bg-danger-light text-danger",
    available: "border-success/20 bg-success-light text-success",
  };

  return (
    <div className={`rounded-xl border p-5 ${styles[type]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: string;
}

export function StatsCard({ title, value, trend }: Readonly<StatsCardProps>) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{value}</p>
      {trend && <span>{trend}</span>}
    </div>
  );
}

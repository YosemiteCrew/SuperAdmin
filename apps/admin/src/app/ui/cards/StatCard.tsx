import clsx from "clsx";

type Props = {
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down";
    percentage: string;
  };
  className?: string;
};

export default function StatCard({ label, value, trend, className }: Props) {
  return (
    <div
      className={clsx(
        "bg-neutral-0 border border-card-border rounded-2xl p-5",
        className
      )}
    >
      <p className="text-caption-1 text-text-tertiary mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-heading-1 text-text-primary">{value}</span>
        {trend && (
          <span
            className={clsx(
              "flex items-center gap-1 text-caption-1 font-medium mb-1",
              trend.direction === "up" ? "text-success-800" : "text-danger-800"
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={trend.direction === "down" ? "rotate-180" : ""}
            >
              <path d="M6 10V2M6 2L2 6M6 2L10 6" />
            </svg>
            {trend.percentage}
          </span>
        )}
      </div>
    </div>
  );
}

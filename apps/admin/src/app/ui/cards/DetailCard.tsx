import type { ReactNode } from "react";
import clsx from "clsx";

type DetailRow = {
  label: string;
  value: ReactNode;
};

type Props = {
  title: string;
  rows: DetailRow[];
  className?: string;
};

export default function DetailCard({ title, rows, className }: Props) {
  return (
    <div
      className={clsx(
        "bg-neutral-0 border border-card-border rounded-2xl p-5",
        className
      )}
    >
      <h2 className="text-heading-3 text-text-primary mb-4">{title}</h2>
      <div className="flex flex-col">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={clsx(
              "flex items-center justify-between py-3",
              i < rows.length - 1 && "border-b border-card-border"
            )}
          >
            <span className="text-caption-1 text-text-tertiary">
              {row.label}
            </span>
            <span className="text-body-4 text-text-primary font-medium">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

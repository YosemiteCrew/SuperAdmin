"use client";
import clsx from "clsx";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className, style }: Props) {
  return (
    <div
      className={clsx("animate-pulse rounded-xl bg-neutral-100", className)}
      style={style}
    />
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={clsx("h-4 rounded-md", className)} />;
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-card-border last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonText key={i} className="flex-1" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-neutral-0 border border-card-border rounded-2xl p-4">
      <div className="flex items-center gap-4 py-3 mb-1">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 rounded-md opacity-50" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx("bg-neutral-0 border border-card-border rounded-2xl p-5 flex flex-col gap-4", className)}>
      <Skeleton className="h-5 w-32" />
      <div className="flex flex-col gap-3">
        <div className="flex justify-between">
          <SkeletonText className="w-20" />
          <SkeletonText className="w-28" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="w-16" />
          <SkeletonText className="w-36" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="w-24" />
          <SkeletonText className="w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonListPage({ cols = 6 }: { cols?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-56 rounded-2xl" />
      </div>
      <SkeletonTable rows={6} cols={cols} />
    </div>
  );
}

export function SkeletonDetailPage({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-64" />
      <div className={`grid grid-cols-1 lg:grid-cols-${cards} gap-4`}>
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

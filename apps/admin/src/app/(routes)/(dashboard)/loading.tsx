const CARD =
  'rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]';

function Bar({ className }: Readonly<{ className: string }>) {
  return <div className={`rounded bg-raised ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <output aria-label="Loading" className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Bar className="h-7 w-48" />
        <Bar className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${CARD} flex flex-col gap-3 p-5`}>
            <Bar className="h-3 w-24" />
            <Bar className="h-8 w-20" />
          </div>
        ))}
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="border-b border-line bg-raised px-5 py-3">
          <Bar className="h-3 w-32" />
        </div>
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </output>
  );
}

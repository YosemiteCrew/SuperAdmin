const CARD =
  'rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_4px_12px_var(--sh05)]';

const ROW_WIDTHS = ['w-full', 'w-[92%]', 'w-[96%]', 'w-[88%]', 'w-[94%]'];

function Bar({ className }: Readonly<{ className: string }>) {
  return <div className={`rounded-full bg-[var(--inset)] ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <output aria-label="Loading" className="flex animate-pulse flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <Bar className="h-[22px] w-[220px]" />
        <Bar className="h-[11px] w-[320px]" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${CARD} flex h-[108px] flex-col justify-center gap-3 p-5`}>
            <Bar className="h-[11px] w-24" />
            <Bar className="h-7 w-20" />
          </div>
        ))}
      </div>

      <div className={`${CARD} flex flex-col gap-3 px-5 py-[18px]`}>
        <Bar className="h-[11px] w-[140px]" />
        {ROW_WIDTHS.map((width) => (
          <Bar key={width} className={`h-[15px] ${width}`} />
        ))}
      </div>
    </output>
  );
}

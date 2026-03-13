"use client";

const PRACTICE_FUNNEL_DATA = [
  { label: "Signup", count: 200, pct: 100 },
  { label: "Profile Done", count: 180, pct: 90 },
  { label: "1st Appt.", count: 128, pct: 64 },
  { label: "3+ Features", count: 94, pct: 47 },
  { label: "Free Trial", count: 71, pct: 35 },
  { label: "Paid Upgrade", count: 12, pct: 6 },
];

const PET_PARENT_FUNNEL_DATA = [
  { label: "Signup", count: 200, pct: 100 },
  { label: "Pet Added", count: 180, pct: 90 },
  { label: "1st Appt.", count: 128, pct: 64 },
  { label: "2+ Features", count: 94, pct: 47 },
  { label: "Active User", count: 71, pct: 35 },
  { label: "Rebooked", count: 12, pct: 6 },
];

const GREY_STEPS = [
  "bg-gray-900",
  "bg-gray-800",
  "bg-gray-600",
  "bg-gray-500",
  "bg-gray-400",
  "bg-gray-300",
];

function FunnelChart({
  data,
  title,
  showAllFilter = false,
}: {
  data: { label: string; count: number; pct: number }[];
  title: string;
  showAllFilter?: boolean;
}) {
  return (
    <div className="rounded-[25px] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#302F2E]">{title}</h3>
        <div className="flex gap-2">
          {showAllFilter && (
            <select className="rounded-[25px] border-0 bg-gray-50 px-3 py-2 text-sm text-[#302F2E] outline-none focus:outline-none focus:ring-0">
              <option>All</option>
            </select>
          )}
          <select className="rounded-[25px] border-0 bg-gray-50 px-3 py-2 text-sm text-[#302F2E] outline-none focus:outline-none focus:ring-0">
            <option>30D</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((row, i) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-medium text-[#302F2E]">{row.label}</span>
            <div className="relative flex flex-1">
              <div
                className={`flex h-9 w-full items-center justify-between rounded px-4 text-sm font-medium text-white ${GREY_STEPS[i]}`}
                style={{ width: `${row.pct}%`, minWidth: 72 }}
              >
                <span className="flex-1" />
                <span className="shrink-0">{row.count}</span>
                <span className="flex-1 text-right">{row.pct}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PracticeFunnelChart() {
  return (
    <FunnelChart data={PRACTICE_FUNNEL_DATA} title="Practice Funnel" showAllFilter />
  );
}

export function PetParentFunnelChart() {
  return <FunnelChart data={PET_PARENT_FUNNEL_DATA} title="Pet Parent Funnel" />;
}

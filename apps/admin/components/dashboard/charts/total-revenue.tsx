"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const REVENUE_DATA = [
  { month: "March", value: 8000 },
  { month: "April", value: 12000 },
  { month: "May", value: 13400 },
  { month: "June", value: 11000 },
  { month: "July", value: 15000 },
  { month: "August", value: 14000 },
];

function RevenueTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[25px] border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-[#302F2E]">$13.4K</p>
    </div>
  );
}

export function TotalRevenue() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="revenue-filter"
            defaultChecked
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-normal text-[#302F2E]">Vet Business</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="revenue-filter"
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-normal text-[#302F2E]">Sitting Business</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="revenue-filter"
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-normal text-[#302F2E]">Breeding Business</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="revenue-filter"
            className="h-4 w-4 accent-blue-600"
          />
          <span className="text-sm font-normal text-[#302F2E]">Grooming Business</span>
        </label>
      </div>
      <div className="h-64 min-h-[256px] w-full">
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={REVENUE_DATA}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#302F2E" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#302F2E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              ticks={[4000, 8000, 12000, 16000, 20000]}
              tickFormatter={(v) => `$${v / 1000}K`}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#302F2E"
              strokeWidth={2}
              fill="url(#fillRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

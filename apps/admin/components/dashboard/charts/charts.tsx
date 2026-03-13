"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TREND_DATA = [
  { month: "Jan", users: 1200 },
  { month: "Feb", users: 1800 },
  { month: "March", users: 2650 },
  { month: "April", users: 2200 },
  { month: "May", users: 2800 },
];

const ENGAGEMENT_DATA = [
  { label: "Active", value: 38, display: "38%" },
  { label: "Inactive", value: 18, display: "18%" },
  { label: "Churn Risk", value: 14, display: "14%" },
  { label: "New", value: 16, display: "16%" },
  { label: "Engaged", value: 11, display: "11%" },
  { label: "Dormant", value: 3, display: "3%" },
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[25px] border border-gray-200 bg-white p-4 shadow-lg">
      <p className="text-sm font-medium text-[#302F2E]">March 2025</p>
      <p className="text-sm text-gray-500">Total 2,650</p>
      <p className="mt-2 text-xs text-gray-500">Hospitals 320</p>
      <p className="text-xs text-gray-500">Breeders 210</p>
      <p className="text-xs text-gray-500">Groomers 190</p>
      <p className="text-xs text-gray-500">Pet Parents 1830</p>
      <p className="text-xs text-gray-500">Developers 100</p>
    </div>
  );
}

export function NewUserTrendChart() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="h-64 min-h-[256px] w-full">
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={TREND_DATA}>
            <defs>
              <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#302F2E" stopOpacity={0.3} />
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
              ticks={[1000, 2000, 3000, 4000, 5000]}
              tickFormatter={(v) => `${v / 1000}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#302F2E"
              strokeWidth={2}
              fill="url(#fillTrend)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function UserEngagementChart() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="h-64 min-h-[256px] w-full">
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={ENGAGEMENT_DATA} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              domain={[0, 60]}
              ticks={[0, 15, 30, 45, 60]}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              width={80}
            />
            <Bar
              dataKey="value"
              fill="#302F2E"
              radius={[0, 4, 4, 0]}
              barSize={20}
              label={{
                position: "right",
                dataKey: "display",
                fill: "#6B7280",
                fontSize: 12,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <NewUserTrendChart />
      <UserEngagementChart />
    </div>
  );
}

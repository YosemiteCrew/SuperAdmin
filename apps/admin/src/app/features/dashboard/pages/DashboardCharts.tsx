"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const leadTrendData = [
  { month: "Jan", leads: 12 },
  { month: "Feb", leads: 19 },
  { month: "Mar", leads: 15 },
  { month: "Apr", leads: 22 },
  { month: "May", leads: 28 },
  { month: "Jun", leads: 25 },
];

const businessDistribution = [
  { type: "Hospital", count: 8 },
  { type: "Breeder", count: 12 },
  { type: "Boarder", count: 6 },
  { type: "Groomer", count: 10 },
];

export default function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      <div className="bg-neutral-0 border border-card-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-body-3-emphasis sm:text-heading-3 text-text-primary mb-3 sm:mb-4">
          Lead Trends
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={leadTrendData}>
            <defs>
              <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#171717" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#171717" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={30} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#171717"
              strokeWidth={2}
              fill="url(#leadGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-neutral-0 border border-card-border rounded-2xl p-4 sm:p-5">
        <h2 className="text-body-3-emphasis sm:text-heading-3 text-text-primary mb-3 sm:mb-4">
          Business Distribution
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={businessDistribution}>
            <XAxis
              dataKey="type"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={30} />
            <Tooltip />
            <Bar dataKey="count" fill="#171717" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

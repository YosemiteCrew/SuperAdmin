"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const ANALYTICS_DATA = [
  { name: "A", filled: 175, empty: 25 },
  { name: "B", filled: 112, empty: 88 },
];

export function AnalyticsReport() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="h-52 min-h-[208px] w-full">
        <ResponsiveContainer width="100%" height={208}>
          <BarChart
            data={ANALYTICS_DATA}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 12 }}
              hide
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              ticks={[0, 40, 80, 120, 160, 200]}
            />
            <Bar
              dataKey="filled"
              fill="#302F2E"
              radius={[0, 0, 0, 0]}
              barSize={48}
              stackId="a"
            />
            <Bar
              dataKey="empty"
              fill="#E5E7EB"
              radius={[4, 4, 0, 0]}
              barSize={48}
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

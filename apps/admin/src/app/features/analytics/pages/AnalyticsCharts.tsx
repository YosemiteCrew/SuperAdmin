"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import type { ChartDataPoint } from "@/app/types/analytics";

type Props = {
  userTrend: ChartDataPoint[];
  businessTrend: ChartDataPoint[];
  leadsTrend: ChartDataPoint[];
};

export default function AnalyticsCharts({
  userTrend,
  businessTrend,
  leadsTrend,
}: Props) {
  return (
    <>
      {/* Row 2: User Growth Chart */}
      <div className="bg-neutral-0 border border-card-border rounded-2xl p-5">
        <h2 className="text-body-3-emphasis text-text-primary mb-4">
          User Growth
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={userTrend}>
            <defs>
              <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#247aed" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#247aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#247aed"
              strokeWidth={2}
              fill="url(#userGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-neutral-0 border border-card-border rounded-2xl p-5">
          <h2 className="text-heading-3 text-text-primary mb-4">
            Business Growth
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={businessTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#54b492"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-neutral-0 border border-card-border rounded-2xl p-5">
          <h2 className="text-heading-3 text-text-primary mb-4">
            Lead Acquisition
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leadsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Bar
                dataKey="value"
                fill="#f68523"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

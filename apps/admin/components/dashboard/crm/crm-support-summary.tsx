"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const TICKETS_DATA = [
  { name: "Resolved", value: 38, color: "#302F2E" },
  { name: "Open", value: 62, color: "#D1D5DB" },
];

const ISSUES_DATA = [
  { label: "Login", value: 38, display: "38%" },
  { label: "Appointment", value: 18, display: "18%" },
  { label: "Profile", value: 14, display: "14%" },
  { label: "Slow", value: 16, display: "16%" },
  { label: "Payment", value: 11, display: "11%" },
  { label: "Sync", value: 3, display: "3%" },
];

export function CrmSupportSummary() {
  return (
    <section>
      <h3 className="mb-6 text-xl font-semibold text-[#302F2E]">Support Summary</h3>

      {/* Row 1: Total Tickets & Top Mentioned Issues - side by side, reduced height */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[25px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-base font-semibold text-[#302F2E]">Total Tickets (7d)</h4>
            <span className="text-xl font-bold text-[#302F2E]">31</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TICKETS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {TICKETS_DATA.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4">
              <div className="flex items-center gap-2 text-xs text-[#302F2E]">
                <span className="h-2 w-2 rounded-full bg-[#302F2E]" />
                Resolved 38%
              </div>
              <div className="flex items-center gap-2 text-xs text-[#302F2E]">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                Open 62%
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[25px] border border-gray-200 bg-white p-5 shadow-sm">
          <h4 className="mb-2 text-base font-semibold text-[#302F2E]">
            Top Mentioned Issues (30d)
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ISSUES_DATA}
                layout="vertical"
                margin={{ left: 0, right: 40 }}
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 60]}
                  ticks={[0, 15, 30, 45, 60]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <Bar
                  dataKey="value"
                  fill="#302F2E"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  label={{
                    position: "right",
                    dataKey: "display",
                    fill: "#6B7280",
                    fontSize: 11,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: KPI Cards - side by side */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[25px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center text-[#302F2E]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Avg Response Time</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#302F2E]">38 mins</span>
              <span className="text-xs font-medium text-green-600">↑ 23%</span>
            </div>
          </div>
        <div className="rounded-[25px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center text-[#302F2E]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Avg. Resolution Time</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#302F2E]">2.6 days</span>
              <span className="text-xs font-medium text-red-600">↓ 11%</span>
            </div>
          </div>
        <div className="rounded-[25px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-8 w-8 items-center justify-center text-[#302F2E]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Reopened Tickets</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#302F2E]">28%</span>
              <span className="text-xs font-medium text-green-600">↓ 11%</span>
            </div>
          </div>
      </div>
    </section>
  );
}

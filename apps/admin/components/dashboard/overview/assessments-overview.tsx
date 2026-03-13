"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const ASSESSMENTS_DATA = [
  { month: "July", value: 700 },
  { month: "August", value: 500, highlight: 407 },
  { month: "September", value: 600 },
  { month: "October", value: 480 },
  { month: "November", value: 670 },
  { month: "December", value: 670 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: { month: string; highlight?: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const highlight = payload[0]?.payload?.highlight;
  if (!highlight || payload[0]?.payload?.month !== "August") return null;
  return (
    <div className="rounded-[25px] border border-gray-200 bg-blue-50 px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-[#302F2E]">{highlight}</p>
    </div>
  );
}

export function AssessmentsOverview() {
  return (
    <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#302F2E]" />
            <span className="text-sm font-normal text-[#302F2E]">
              Number of times used
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
            <span className="text-sm font-normal text-[#302F2E]">
              Drop off at which Question
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#302F2E]" />
            <span className="text-sm font-normal text-[#302F2E]">
              Time taken to complete Assessment
            </span>
          </div>
        </div>
        <select className="rounded-[25px] border-0 bg-gray-50 px-4 py-2.5 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
          <option>Canine Grimace Scale</option>
        </select>
      </div>
      <div className="h-72 min-h-[288px] w-full">
        <ResponsiveContainer width="100%" height={288}>
          <BarChart data={ASSESSMENTS_DATA} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#302F2E", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#302F2E", fontSize: 12 }}
              ticks={[0, 200, 400, 600, 800]}
              tickFormatter={(v) => (v === 0 ? "0" : `${v} times`)}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" fill="#302F2E" radius={[4, 4, 0, 0]} barSize={40}>
              {ASSESSMENTS_DATA.map((entry) => (
                <Cell key={entry.month} fill="#302F2E" />
              ))}
            </Bar>
            <ReferenceDot
              x="August"
              y={500}
              r={4}
              fill="#60A5FA"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

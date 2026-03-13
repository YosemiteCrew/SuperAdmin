"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export type InsightDataPoint = {
  label: string;
  value: number;
  display: string;
};

type CrmFeaturesDropoffProps = {
  mostUsedFeatures?: InsightDataPoint[];
  dropOffIndicators?: InsightDataPoint[];
  leftChartTitle?: string;
  rightChartTitle?: string;
};

const DEFAULT_MOST_USED = [
  { label: "Appointments", value: 38, display: "38%" },
  { label: "Assessments", value: 18, display: "18%" },
  { label: "Chat", value: 14, display: "14%" },
  { label: "Inventory", value: 16, display: "16%" },
  { label: "Calendar View", value: 11, display: "11%" },
  { label: "Discounts", value: 3, display: "3%" },
];

const DEFAULT_DROP_OFF = [
  { label: "No Appt", value: 38, display: "38%" },
  { label: "Low Feature Usage", value: 18, display: "18%" },
  { label: "Infrequent Logins", value: 14, display: "14%" },
  { label: "Inactive Staff", value: 16, display: "16%" },
  { label: "Missing Profile Info", value: 11, display: "11%" },
  { label: "No Recent Activity", value: 3, display: "3%" },
];

export function CrmFeaturesDropoff({
  mostUsedFeatures = DEFAULT_MOST_USED,
  dropOffIndicators = DEFAULT_DROP_OFF,
  leftChartTitle = "Most Used Features (30d)",
  rightChartTitle = "Top Drop-off Indicators (30d)",
}: CrmFeaturesDropoffProps) {
  return (
    <section>
      <div className="sticky top-0 z-10 -mx-1 -mt-1 border-b border-transparent bg-white/95 px-1 pb-4 pt-1 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-[#302F2E]">
          Feature & Drop-off Insights
        </h3>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[25px] border border-gray-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-[#302F2E]">
            {leftChartTitle}
          </h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mostUsedFeatures}
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
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={100}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Bar
                  dataKey="value"
                  fill="#302F2E"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                  label={{
                    position: "right",
                    dataKey: "display",
                    fill: "#302F2E",
                    fontSize: 12,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[25px] border border-gray-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-[#302F2E]">
            {rightChartTitle}
          </h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dropOffIndicators}
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
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={120}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Bar
                  dataKey="value"
                  fill="#302F2E"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                  label={{
                    position: "right",
                    dataKey: "display",
                    fill: "#302F2E",
                    fontSize: 12,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import "./BarGraph.css";
interface SourceData {
  source: string;
  value: number;
}

const data: SourceData[] = [
  { source: "Website", value: 38 },
  { source: "Referral", value: 18 },
  { source: "Social Media", value: 14 },
  { source: "Event Booth", value: 16 },
  { source: "Email campaigns", value: 11 },
  { source: "Cold Outreach", value: 3 },
];

export default function SourceBreakdownChart() {
  return (
    <div className='BarGraphDiv' style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
          barCategoryGap={10}
        >
          <XAxis
            type="number"
            domain={[0, 60]}
            tickFormatter={(tick) => `${tick}%`}
          />
          <YAxis
            type="category"
            dataKey="source"
            width={150}
            tick={{ fontSize: 14 }}
          />
          <Tooltip
            formatter={(value: number) => `${value}%`}
            contentStyle={{ borderRadius: "8px", fontSize: "14px" }}
          />
          <Bar
            dataKey="value"
            fill="#000000"
            radius={[50, 50, 50, 50]}
            barSize={12}
          >
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value: unknown) => `${value}%`}
              style={{ fill: "#000000", fontSize: "14px" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

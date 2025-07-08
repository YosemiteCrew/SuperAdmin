"use client";
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";

const defaultData = [
  { month: "March", websiteOutreach: 320, salesOutreach: 300 },
  { month: "April", websiteOutreach: 407, salesOutreach: 540 },
  { month: "May", websiteOutreach: 380, salesOutreach: 450 },
  { month: "June", websiteOutreach: 400, salesOutreach: 290 },
  { month: "July", websiteOutreach: 450, salesOutreach: 350 },
  { month: "August", websiteOutreach: 450, salesOutreach: 500 },
];

function Conversion({ data = defaultData }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWebsite" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#000000" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend
            iconType="square"
            formatter={(value) => {
              if (value === "websiteOutreach") return "Website Outreach";
              if (value === "salesOutreach") return "Outreach Through Sales";
              return value;
            }}
          />

          <Area
            type="monotone"
            dataKey="websiteOutreach"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorWebsite)"
            dot={{ stroke: "#3b82f6", strokeWidth: 2, fill: "#fff", r: 4 }}
          />

          <Area
            type="monotone"
            dataKey="salesOutreach"
            stroke="#000000"
            fillOpacity={1}
            fill="url(#colorSales)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Conversion;

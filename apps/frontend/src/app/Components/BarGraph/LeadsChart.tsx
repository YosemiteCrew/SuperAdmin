"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./BarGraph.css";
interface LeadData {
  month: string;
  leads: number;
}

const data: LeadData[] = [
  { month: "Jan", leads: 50 },
  { month: "Feb", leads: 100 },
  { month: "March", leads: 60 },
  { month: "April", leads: 40 },
  { month: "May", leads: 75 },
];

export default function LeadsChart() {
  return (
    <div className='BarGraphDiv' style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              fontSize: "14px",
            }}
            formatter={(value: number) => [`${value} Leads`, ""]}
          />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="#000000"
            fillOpacity={1}
            fill="url(#colorLeads)"
            dot={{ stroke: "#000000", strokeWidth: 2, fill: "#ffffff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

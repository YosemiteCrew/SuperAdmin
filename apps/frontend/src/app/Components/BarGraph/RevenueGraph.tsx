import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import "./BarGraph.css";

const defaultData = [
  { month: 'March', value: 8000 },
  { month: 'April', value: 13400 },
  { month: 'May', value: 18000 },
  { month: 'June', value: 12000 },
  { month: 'July', value: 11000 },
  { month: 'August', value: 15000 },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', padding: 6, borderRadius: 4, boxShadow: '0 2px 8px #0001' }}>
        <span style={{ color: '#3b82f6', fontWeight: 600 }}>${(payload[0].value / 1000).toFixed(1)}K</span>
      </div>
    );
  }
  return null;
};

function RevenueGraph({ chartData = defaultData }) {
  return (
    <div className='BarGraphDiv' style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 40, left: 40, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#302F2E" stopOpacity={0.15}/>
              <stop offset="100%" stopColor="#302F2E" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={13} />
          <YAxis axisLine={false} tickLine={false} fontSize={13} tickFormatter={v => `$${v/1000}K`} />
          <Tooltip content={CustomTooltip} cursor={{ stroke: '#302F2E', strokeWidth: 1, opacity: 0.1 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#222"
            strokeWidth={3}
            fill="url(#colorValue)"
            dot={{ r: 5, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueGraph;
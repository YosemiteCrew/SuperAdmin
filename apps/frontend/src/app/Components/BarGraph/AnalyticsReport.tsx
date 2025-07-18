import React from 'react';
import { BarChart, Bar, YAxis, ResponsiveContainer } from 'recharts';

const defaultData = [
  { name: 'A', total: 30, value: 170 }, // full + value = total height (200)
  { name: 'B', total: 80, value: 120 }, // 80 + 120 = 200
];

function AnalyticsReport({ data = defaultData }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barCategoryGap={40}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <YAxis domain={[0, 200]} tick={{ fontSize: 14 }} />

          {/* Background portion (full) */}
          <Bar
            dataKey="full"
            stackId="a"
            barSize={60}
            fill="#EDEDED"
            radius={[16, 16, 16, 16]}
            isAnimationActive={false}
          />

          {/* Foreground value portion */}
          <Bar
            dataKey="value"
            stackId="a"
            barSize={60}
            fill="#222"
            radius={[16, 16, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsReport;

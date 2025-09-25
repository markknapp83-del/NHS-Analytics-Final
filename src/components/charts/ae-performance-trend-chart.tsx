'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrustMetrics } from '@/types/database';

interface AEPerformanceTrendChartProps {
  data: TrustMetrics[];
}

export function AEPerformanceTrendChart({ data }: AEPerformanceTrendChartProps) {
  const chartData = data
    .filter(record =>
      record.ae_data?.four_hour_performance_pct !== null &&
      record.ae_data?.four_hour_performance_pct !== undefined
    )
    .map(record => ({
      period: new Date(record.period).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit'
      }),
      performance: record.ae_data?.four_hour_performance_pct || 0,
      target: 95
    }))
    .slice(-12); // Last 12 months

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
          label={{ value: '%', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'A&E 4-hour Performance']}
          labelStyle={{ color: '#334155' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        />
        <ReferenceLine
          y={95}
          stroke="#dc2626"
          strokeDasharray="5 5"
          label={{ value: "95% NHS Standard", position: "top" }}
        />
        <Line
          type="monotone"
          dataKey="performance"
          stroke="#dc2626"
          strokeWidth={2}
          dot={{ fill: '#dc2626', strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, stroke: '#dc2626', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
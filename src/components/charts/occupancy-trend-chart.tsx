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

interface OccupancyTrendChartProps {
  data: TrustMetrics[];
}

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
  const chartData = data
    .filter(record => record.capacity_data?.virtual_ward_occupancy_rate)
    .map(record => ({
      period: new Date(record.period).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
      }),
      occupancy: (record.capacity_data?.virtual_ward_occupancy_rate || 0) * 100,
      target: 85
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded">
        <p className="text-slate-500">No virtual ward occupancy data available for this trust</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
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
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Occupancy Rate']}
          labelStyle={{ color: '#334155' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        />
        <ReferenceLine
          y={85}
          stroke="#f59e0b"
          strokeDasharray="5 5"
          label={{ value: "85% Optimal", position: "topLeft" }}
        />
        <Line
          type="monotone"
          dataKey="occupancy"
          stroke="#8b5cf6"
          strokeWidth={3}
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
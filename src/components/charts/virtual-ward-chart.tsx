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

interface VirtualWardChartProps {
  data: TrustMetrics[];
}

export function VirtualWardChart({ data }: VirtualWardChartProps) {
  const chartData = data
    .filter(record =>
      record.capacity_data?.virtual_ward_occupancy_rate !== null &&
      record.capacity_data?.virtual_ward_occupancy_rate !== undefined
    )
    .map(record => ({
      period: new Date(record.period).toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit'
      }),
      occupancyRate: (record.capacity_data?.virtual_ward_occupancy_rate || 0) * 100,
      capacity: record.capacity_data?.virtual_ward_capacity || 0
    }))
    .slice(-12); // Last 12 months

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500">
        No virtual ward data available
      </div>
    );
  }

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
          stroke="#2563eb"
          strokeDasharray="5 5"
          label={{ value: "85% Target", position: "topLeft" }}
        />
        <Line
          type="monotone"
          dataKey="occupancyRate"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ICBMetrics } from '@/hooks/useICBData';

interface ICBWaitingListChartProps {
  icbMetrics: ICBMetrics;
}

export function ICBWaitingListChart({ icbMetrics }: ICBWaitingListChartProps) {
  const chartData = icbMetrics.monthlyData.map(monthData => ({
    period: new Date(monthData.period).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    }),
    totalWaiting: monthData.waitingList
  }));

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Total Patients Awaiting Treatment</h3>
        <div className="text-sm text-slate-600">
          Current: <span className="font-medium text-slate-900">
            {formatNumber(icbMetrics.totalWaitingList)}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            stroke="#64748b"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            tickFormatter={formatNumber}
            label={{ value: 'Patients', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => [value.toLocaleString(), 'Total Waiting']}
            labelStyle={{ color: '#334155' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Bar
            dataKey="totalWaiting"
            fill="#005eb8"
            radius={[4, 4, 0, 0]}
            name="Total Waiting"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
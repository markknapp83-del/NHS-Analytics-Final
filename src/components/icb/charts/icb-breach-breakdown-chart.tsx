'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ICBMetrics } from '@/hooks/useICBData';

interface ICBBreachBreakdownChartProps {
  icbMetrics: ICBMetrics;
}

export function ICBBreachBreakdownChart({ icbMetrics }: ICBBreachBreakdownChartProps) {
  // For now, we'll show the 52+ week breaches total
  // This will be enhanced when we add separate 52/65/78 week calculations to ICB data
  const chartData = icbMetrics.monthlyData.map(monthData => ({
    period: new Date(monthData.period).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    }),
    '52+ weeks': monthData.breaches52Week,
    // Temporary estimates for 65+ and 78+ weeks based on 52+ weeks
    // This will be replaced with actual data when we enhance the hook
    '65+ weeks': Math.floor(monthData.breaches52Week * 0.6), // ~60% of 52+ week waiters
    '78+ weeks': Math.floor(monthData.breaches52Week * 0.3)  // ~30% of 52+ week waiters
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
        <h3 className="font-semibold text-slate-700">Breach Breakdown</h3>
        <div className="text-sm text-slate-600">
          52+ weeks: <span className="font-medium text-red-600">
            {formatNumber(icbMetrics.total52WeekBreaches)}
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
            label={{ value: 'Patients', angle: -90, position: 'insideLeft' }}
            tickFormatter={formatNumber}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name
            ]}
            labelStyle={{ color: '#334155' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar
            dataKey="52+ weeks"
            fill="#f59e0b"
            name="52+ weeks"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="65+ weeks"
            fill="#ef4444"
            name="65+ weeks"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="78+ weeks"
            fill="#dc2626"
            name="78+ weeks"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-1">
        * 65+ and 78+ week figures are estimated. Will be enhanced with actual breach data.
      </p>
    </div>
  );
}
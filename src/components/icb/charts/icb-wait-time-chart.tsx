'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ICBMetrics } from '@/hooks/useICBData';

interface ICBWaitTimeChartProps {
  icbMetrics: ICBMetrics;
}

export function ICBWaitTimeChart({ icbMetrics }: ICBWaitTimeChartProps) {
  // For now, we'll calculate a simple average wait metric based on the proportion
  // of patients waiting over 18 weeks. This will be enhanced when we add proper
  // median wait time aggregation to the ICB data hook.
  const chartData = icbMetrics.monthlyData.map(monthData => {
    // Estimate average wait based on compliance - this is a temporary approximation
    // Higher compliance = lower average wait, lower compliance = higher average wait
    const estimatedAvgWait = monthData.rttCompliance >= 92
      ? 8 + (100 - monthData.rttCompliance) * 0.5
      : 12 + (100 - monthData.rttCompliance) * 0.8;

    return {
      period: new Date(monthData.period).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
      }),
      avgWait: Math.max(1, estimatedAvgWait) // Minimum 1 week
    };
  });

  const maxWait = Math.max(...chartData.map(d => d.avgWait));
  const yAxisMax = Math.ceil(maxWait * 1.1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Average Wait Time Trend</h3>
        <div className="text-sm text-slate-600">
          Estimated: <span className="font-medium text-slate-900">
            {chartData[chartData.length - 1]?.avgWait.toFixed(1) || '0'} weeks
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            stroke="#64748b"
          />
          <YAxis
            domain={[0, yAxisMax]}
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            label={{ value: 'Weeks', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)} weeks`, 'Est. Average Wait']}
            labelStyle={{ color: '#334155' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Area
            type="monotone"
            dataKey="avgWait"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-500 mt-1">
        * Estimated based on RTT compliance rates. Will be enhanced with actual median wait times.
      </p>
    </div>
  );
}
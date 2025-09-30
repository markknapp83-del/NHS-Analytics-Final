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
import { ICBMetrics } from '@/hooks/useICBData';

interface ICBRTTPerformanceChartProps {
  icbMetrics: ICBMetrics;
}

export function ICBRTTPerformanceChart({ icbMetrics }: ICBRTTPerformanceChartProps) {
  const chartData = icbMetrics.monthlyData.map(monthData => ({
    period: new Date(monthData.period).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    }),
    compliance: monthData.rttCompliance,
    target: 92
  }));

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 92) return '#22c55e';
    if (compliance >= 80) return '#f59e0b';
    return '#ef4444';
  };

  const latestCompliance = icbMetrics.avgRTTCompliance;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">ICB RTT Performance vs 92% Target</h3>
        <div className="text-sm text-slate-600">
          Current: <span className={`font-medium`} style={{ color: getComplianceColor(latestCompliance) }}>
            {latestCompliance.toFixed(1)}%
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
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
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'RTT Compliance']}
            labelStyle={{ color: '#334155' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <ReferenceLine
            y={92}
            stroke="#dc2626"
            strokeDasharray="5 5"
            label={{ value: "92% Target", position: "top" }}
          />
          <Line
            type="monotone"
            dataKey="compliance"
            stroke="#005eb8"
            strokeWidth={3}
            dot={{ fill: '#005eb8', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#005eb8', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
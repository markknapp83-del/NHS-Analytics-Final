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
import { TrustMetrics } from '@/types/database';

interface WaitingListChartProps {
  data: TrustMetrics[];
  selectedSpecialty?: string;
}

export function WaitingListChart({ data, selectedSpecialty = 'trust_total' }: WaitingListChartProps) {
  // Helper function to get value from nested structure
  const getValue = (record: TrustMetrics, field: string) => {
    if (selectedSpecialty === 'trust_total') {
      return record?.rtt_data?.trust_total?.[field];
    } else {
      return record?.rtt_data?.specialties?.[selectedSpecialty]?.[field];
    }
  };

  const chartData = data
    .filter(record => record.rtt_data) // Only include records with RTT data
    .map(record => {
      const totalWaiting = getValue(record, 'total_incomplete_pathways') || 0;
      const within18Weeks = getValue(record, 'total_within_18_weeks') || 0;

      return {
        period: new Date(record.period).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        }),
        totalWaiting,
        within18Weeks,
        over18Weeks: totalWaiting - within18Weeks
      };
    });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="#64748b"
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            value.toLocaleString(),
            name === 'within18Weeks' ? 'Within 18 weeks' :
            name === 'over18Weeks' ? 'Over 18 weeks' : 'Total Waiting'
          ]}
          labelStyle={{ color: '#334155' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        />
        <Area
          type="monotone"
          dataKey="within18Weeks"
          stackId="1"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="over18Weeks"
          stackId="1"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
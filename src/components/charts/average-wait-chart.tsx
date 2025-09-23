'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrustMetrics } from '@/types/database';

interface AverageWaitChartProps {
  data: TrustMetrics[];
  selectedSpecialty?: string;
}

export function AverageWaitChart({ data, selectedSpecialty = 'trust_total' }: AverageWaitChartProps) {
  const chartData = data
    .filter(record => record.rtt_data) // Only include records with RTT data
    .map(record => {
      let medianWait: number | null = null;

      // Extract median wait time from JSONB structure
      if (selectedSpecialty === 'trust_total') {
        medianWait = record.rtt_data?.trust_total?.median_wait_weeks || null;
      } else if (record.rtt_data?.specialties?.[selectedSpecialty]) {
        medianWait = record.rtt_data.specialties[selectedSpecialty].median_wait_weeks || null;
      }

      return {
        period: new Date(record.period).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        }),
        medianWait: medianWait || 0
      };
    })
    .filter(item => item.medianWait > 0); // Remove records without valid wait times

  const maxWait = Math.max(...chartData.map(d => d.medianWait));
  const yAxisMax = Math.ceil(maxWait * 1.1);

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
          domain={[0, yAxisMax]}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
          label={{ value: 'Weeks', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)} weeks`, 'Median Wait Time']}
          labelStyle={{ color: '#334155' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        />
        <Line
          type="monotone"
          dataKey="medianWait"
          stroke="#0ea5e9"
          strokeWidth={3}
          dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
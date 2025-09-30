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

interface RTTPerformanceChartProps {
  data: TrustMetrics[];
  selectedSpecialty?: string;
}

export function RTTPerformanceChart({ data, selectedSpecialty = 'trust_total' }: RTTPerformanceChartProps) {
  const chartData = data
    .filter(record => record.rtt_data) // Only include records with RTT data
    .map(record => {
      let compliance: number | null = null;

      // Extract compliance data from JSONB structure
      if (selectedSpecialty === 'trust_total') {
        compliance = record.rtt_data?.trust_total?.percent_within_18_weeks || null;
      } else if (record.rtt_data?.specialties?.[selectedSpecialty]) {
        const rawValue = record.rtt_data.specialties[selectedSpecialty].percent_within_18_weeks || null;
        // Convert decimal to percentage for specialty data (0.43 -> 43.0)
        compliance = rawValue !== null ? rawValue * 100 : null;
      }

      return {
        period: new Date(record.period).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        }),
        compliance,
        target: 92
      };
    })
    .filter(item => item.compliance !== null); // Remove records without compliance data

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
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'RTT Compliance']}
          labelStyle={{ color: '#334155' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          cursor={{ stroke: '#005eb8', strokeWidth: 1, strokeDasharray: '5 5' }}
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
          activeDot={{ r: 6, stroke: '#003087', strokeWidth: 2, fill: '#005eb8' }}
          animationDuration={800}
          animationBegin={0}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
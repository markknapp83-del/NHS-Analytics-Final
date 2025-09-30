'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrustMetrics } from '@/types/database';

interface CommunityTrendsChartProps {
  data: TrustMetrics[];
}

export function CommunityTrendsChart({ data }: CommunityTrendsChartProps) {
  const chartData = data
    .filter(record => record.community_health_data)
    .map(record => {
      const communityData = record.community_health_data!;

      // Calculate totals for key services with safe property access
      const mskTotal = communityData.adult_services?.msk_service?.total_waiting || 0;
      const podiatryTotal = communityData.adult_services?.podiatry?.total_waiting || 0;
      const physiotherapyTotal = (
        (communityData.adult_services?.therapy_physiotherapy?.total_waiting || 0) +
        (communityData.cyp_services?.therapy_physiotherapy?.total_waiting || 0)
      );
      const audiologyTotal = (
        (communityData.adult_services?.audiology?.total_waiting || 0) +
        (communityData.cyp_services?.audiology?.total_waiting || 0)
      );

      return {
        period: new Date(record.period).toLocaleDateString('en-GB', {
          month: 'short',
          year: 'numeric'
        }),
        'MSK Services': mskTotal,
        'Podiatry': podiatryTotal,
        'Physiotherapy': physiotherapyTotal,
        'Audiology': audiologyTotal
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        No community health data available
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
          tick={{ fontSize: 12 }}
          stroke="#64748b"
          label={{ value: 'Patients Waiting', angle: -90, position: 'insideLeft' }}
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
        <Line
          type="monotone"
          dataKey="MSK Services"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Podiatry"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Physiotherapy"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Audiology"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
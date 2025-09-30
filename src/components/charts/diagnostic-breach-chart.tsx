'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DiagnosticService } from "@/types/nhs-data";

interface DiagnosticBreachChartProps {
  data: DiagnosticService[];
}

export function DiagnosticBreachChart({ data }: DiagnosticBreachChartProps) {
  const chartData = data.map(service => ({
    name: service.name,
    breachRate: service.breachRate,
    totalWaiting: service.totalWaiting,
    sixWeekBreaches: service.sixWeekBreaches,
    thirteenWeekBreaches: service.thirteenWeekBreaches
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={100}
        />
        <YAxis />
        <Tooltip
          formatter={(value, name) => [
            `${Number(value).toFixed(1)}${name === 'breachRate' ? '%' : ''}`,
            name === 'breachRate' ? 'Breach Rate' :
            name === 'totalWaiting' ? 'Total Waiting' :
            name === 'sixWeekBreaches' ? '6+ Week Breaches' :
            '13+ Week Breaches'
          ]}
        />
        <Legend />
        <Bar dataKey="breachRate" fill="#ef4444" name="Breach Rate %" />
      </BarChart>
    </ResponsiveContainer>
  );
}
'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DiagnosticService } from '@/lib/diagnostic-intelligence';

interface DiagnosticScatterChartProps {
  data: DiagnosticService[];
}

export function DiagnosticScatterChart({ data }: DiagnosticScatterChartProps) {
  const chartData = data.map(service => ({
    name: service.name,
    x: service.totalWaiting,
    y: service.breachRate,
    size: service.sixWeekBreaches
  }));

  const getColor = (breachRate: number) => {
    if (breachRate >= 15) return '#dc2626'; // red-600
    if (breachRate >= 10) return '#ea580c'; // orange-600
    if (breachRate >= 5) return '#f59e0b'; // amber-500
    return '#16a34a'; // green-600
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Total Waiting"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Breach Rate %"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) => [
            name === 'x' ? `${Number(value).toLocaleString()} patients` :
            `${Number(value).toFixed(1)}%`,
            name === 'x' ? 'Total Waiting' : 'Breach Rate'
          ]}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0) {
              return payload[0].payload.name;
            }
            return '';
          }}
        />
        <Scatter data={chartData}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.y)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
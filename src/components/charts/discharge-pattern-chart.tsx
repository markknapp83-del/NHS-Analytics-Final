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
import { TrustMetrics } from '@/types/database';

interface DischargePatternChartProps {
  data: TrustMetrics[];
}

export function DischargePatternChart({ data }: DischargePatternChartProps) {
  const chartData = data
    .filter(record => record.capacity_data?.avg_daily_discharges)
    .map(record => ({
      period: new Date(record.period).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
      }),
      discharges: record.capacity_data?.avg_daily_discharges || 0
    }));

  // Count all periods with any capacity data for context
  const totalCapacityPeriods = data.filter(record =>
    record.capacity_data?.virtual_ward_capacity || record.capacity_data?.virtual_ward_occupancy_rate
  ).length;

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded">
        <div className="text-center">
          <p className="text-slate-500 mb-2">No discharge data available for this trust</p>
          {totalCapacityPeriods > 0 && (
            <p className="text-xs text-slate-400">
              Note: Discharge data is limited in the dataset. Capacity data available for {totalCapacityPeriods} month{totalCapacityPeriods !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show data limitation warning if we have capacity data but limited discharge data
  const showDataWarning = totalCapacityPeriods > chartData.length;

  return (
    <div className="space-y-3">
      {showDataWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <p className="text-xs text-amber-700">
              <strong>Limited Data:</strong> Discharge data available for {chartData.length} month{chartData.length !== 1 ? 's' : ''} of {totalCapacityPeriods} month{totalCapacityPeriods !== 1 ? 's' : ''} with capacity data.
            </p>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={showDataWarning ? 200 : 240}>
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
            label={{ value: 'Patients/Day', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}`, 'Daily Discharges']}
            labelStyle={{ color: '#334155' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Bar
            dataKey="discharges"
            fill="#06b6d4"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
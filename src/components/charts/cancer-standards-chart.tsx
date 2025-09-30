'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancerData, CANCER_STANDARDS } from '@/types/cancer';

interface CancerStandardsChartProps {
  data: CancerData;
  selectedCancerType?: string;
}

export function CancerStandardsChart({ data, selectedCancerType = 'all' }: CancerStandardsChartProps) {
  // Get data based on selected cancer type
  const getStandardData = (standardKey: '28_day_fds' | '31_day_combined' | '62_day_combined') => {
    if (selectedCancerType === 'all') {
      return data.standards[standardKey]?.summary || { performance_pct: 0, total_treated: 0, breaches: 0, within_standard: 0 };
    } else {
      const cancerTypeData = data.standards[standardKey]?.by_cancer_type?.[selectedCancerType];
      return cancerTypeData || { performance_pct: 0, total_treated: 0, breaches: 0, within_standard: 0 };
    }
  };

  const chartData = [
    {
      name: '28-day FDS',
      performance: getStandardData('28_day_fds').performance_pct,
      target: 75,
      treated: getStandardData('28_day_fds').total_treated,
      breaches: getStandardData('28_day_fds').breaches
    },
    {
      name: '31-day Combined',
      performance: getStandardData('31_day_combined').performance_pct,
      target: 96,
      treated: getStandardData('31_day_combined').total_treated,
      breaches: getStandardData('31_day_combined').breaches
    },
    {
      name: '62-day Combined',
      performance: getStandardData('62_day_combined').performance_pct,
      target: 85,
      treated: getStandardData('62_day_combined').total_treated,
      breaches: getStandardData('62_day_combined').breaches
    }
  ];

  const getBarColor = (performance: number, target: number) => {
    if (performance >= target) return '#16a34a'; // Green
    if (performance >= target - 5) return '#eab308'; // Yellow
    if (performance >= target - 10) return '#f97316'; // Orange
    return '#dc2626'; // Red
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900">{label}</p>
          <p className="text-blue-600">
            Performance: <span className="font-semibold">{data.performance.toFixed(1)}%</span>
          </p>
          <p className="text-slate-600">
            Target: <span className="font-semibold">{data.target}%</span>
          </p>
          <p className="text-slate-600">
            Patients Treated: <span className="font-semibold">{data.treated.toLocaleString()}</span>
          </p>
          <p className="text-red-600">
            Breaches: <span className="font-semibold">{data.breaches.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 bg-blue-500 rounded"></div>
          Performance by Waiting Time Standard
        </CardTitle>
        <p className="text-sm text-slate-600">
          Performance against NHS cancer targets
        </p>
      </CardHeader>
      <CardContent>
        {/* Chart container with centering */}
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={chartData}
              margin={{ top: 60, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                label={{ value: 'Performance (%)', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Target reference lines */}
              <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />
              <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />
              <ReferenceLine y={96} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />

              <Bar
                dataKey="performance"
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationBegin={0}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Statistics - matches adjacent card positioning */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Best Standard</p>
            <p className="font-semibold text-green-600">
              {Math.max(...chartData.map(d => d.performance)).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">
              {chartData.find(d => d.performance === Math.max(...chartData.map(c => c.performance)))?.name || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Worst Standard</p>
            <p className="font-semibold text-red-600">
              {Math.min(...chartData.map(d => d.performance)).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">
              {chartData.find(d => d.performance === Math.min(...chartData.map(c => c.performance)))?.name || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Above Target</p>
            <p className={`font-semibold ${chartData.filter(d => d.performance >= d.target).length > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {chartData.filter(d => d.performance >= d.target).length} of {chartData.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Total Patients</p>
            <p className="font-semibold text-slate-900">
              {chartData.reduce((sum, d) => sum + d.treated, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Legend - moved down to align with adjacent card */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded"></div>
              <span>Above Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded"></div>
              <span>Within 5% of Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-orange-500 rounded"></div>
              <span>5-10% Below Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded"></div>
              <span>&gt;10% Below Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-red-400"></div>
              <span>Target Lines</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
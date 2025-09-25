'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancerData } from '@/types/cancer';

interface CancerTrendChartProps {
  data: CancerData[];
  selectedCancerType?: string;
}

export function CancerTrendChart({ data, selectedCancerType = 'all' }: CancerTrendChartProps) {
  const formatQuarterLabel = (period: string) => {
    const [year, quarter] = period.split('-');
    return `${quarter} ${year}`;
  };

  // Get data based on selected cancer type
  const getQuarterData = (quarter: CancerData) => {
    if (selectedCancerType === 'all') {
      return {
        '28_day_fds': quarter.standards['28_day_fds'].summary.performance_pct,
        '31_day_combined': quarter.standards['31_day_combined'].summary.performance_pct,
        '62_day_combined': quarter.standards['62_day_combined'].summary.performance_pct
      };
    } else {
      const type28 = quarter.standards['28_day_fds'].by_cancer_type[selectedCancerType];
      const type31 = quarter.standards['31_day_combined'].by_cancer_type[selectedCancerType];
      const type62 = quarter.standards['62_day_combined'].by_cancer_type[selectedCancerType];

      return {
        '28_day_fds': type28?.performance_pct || 0,
        '31_day_combined': type31?.performance_pct || 0,
        '62_day_combined': type62?.performance_pct || 0
      };
    }
  };

  // Since we have sparse data, just plot the available points
  // This will show lines connecting the actual data points with proper spacing
  const chartData = data.map(quarter => {
    const quarterData = getQuarterData(quarter);
    return {
      period: formatQuarterLabel(quarter.period),
      fullPeriod: quarter.period,
      '28_day_fds': quarterData['28_day_fds'],
      '31_day_combined': quarterData['31_day_combined'],
      '62_day_combined': quarterData['62_day_combined']
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">{entry.value.toFixed(1)}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 bg-green-500 rounded"></div>
          Cancer Performance Trends
        </CardTitle>
        <p className="text-sm text-slate-600">
          Quarterly performance across all standards
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={chartData}
            margin={{ top: 40, right: 30, left: 60, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#64748b"
              label={{
                value: 'Performance (%)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              domain={[0, 100]}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="line"
              wrapperStyle={{ paddingTop: '10px' }}
            />

            {/* Target reference lines */}
            <ReferenceLine y={75} stroke="#8b5cf6" strokeDasharray="5 5" opacity={0.6} />
            <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="5 5" opacity={0.6} />
            <ReferenceLine y={96} stroke="#22c55e" strokeDasharray="5 5" opacity={0.6} />

            <Line
              type="monotone"
              dataKey="62_day_combined"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
              name="62-day Standard (Target: 85%)"
            />
            <Line
              type="monotone"
              dataKey="31_day_combined"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
              name="31-day Standard (Target: 96%)"
            />
            <Line
              type="monotone"
              dataKey="28_day_fds"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#8b5cf6', strokeWidth: 2 }}
              name="28-day FDS (Target: 75%)"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Statistics - matches other cards positioning */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Latest 62-Day</p>
            <p className="font-semibold text-red-600">
              {chartData[chartData.length - 1]?.['62_day_combined'].toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">{chartData[chartData.length - 1]?.period}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Latest 31-Day</p>
            <p className="font-semibold text-blue-600">
              {chartData[chartData.length - 1]?.['31_day_combined'].toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">{chartData[chartData.length - 1]?.period}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Latest 28-Day FDS</p>
            <p className="font-semibold text-purple-600">
              {chartData[chartData.length - 1]?.['28_day_fds'].toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500">{chartData[chartData.length - 1]?.period}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Data Points</p>
            <p className="font-semibold text-slate-900">
              {chartData.length} quarters
            </p>
            <p className="text-xs text-slate-500">
              {chartData[0]?.period} - {chartData[chartData.length - 1]?.period}
            </p>
          </div>
        </div>

        {/* Custom Legend - moved down to align with other cards */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded"></div>
              <span>62-day Standard (Most Critical)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-blue-500 rounded"></div>
              <span>31-day Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-purple-500 rounded"></div>
              <span>28-day FDS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-slate-400"></div>
              <span>Target Lines</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
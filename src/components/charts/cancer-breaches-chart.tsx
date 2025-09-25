'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancerData, CANCER_TYPE_DISPLAY_NAMES } from '@/types/cancer';

interface CancerBreachesChartProps {
  data: CancerData;
  selectedCancerType?: string;
}

export function CancerBreachesChart({ data, selectedCancerType = 'all' }: CancerBreachesChartProps) {
  // Get cancer types by total breaches across all standards
  const allCancerTypeBreaches = Object.entries(data.standards['62_day_combined'].by_cancer_type)
    .map(([type, typeData62]) => {
      const type28 = data.standards['28_day_fds'].by_cancer_type[type];
      const type31 = data.standards['31_day_combined'].by_cancer_type[type];

      const breaches62 = typeData62.breaches;
      const breaches31 = type31?.breaches || 0;
      const breaches28 = type28?.breaches || 0;

      const totalBreaches = breaches28 + breaches31 + breaches62;
      const totalTreated = (type28?.total_treated || 0) +
                          (type31?.total_treated || 0) +
                          typeData62.total_treated;

      return {
        type,
        name: CANCER_TYPE_DISPLAY_NAMES[type] || type,
        '28_day_breaches': breaches28,
        '31_day_breaches': breaches31,
        '62_day_breaches': breaches62,
        total_breaches: totalBreaches,
        total_treated: totalTreated,
        overall_performance: totalTreated > 0 ? ((totalTreated - totalBreaches) / totalTreated * 100) : 0
      };
    })
    .filter(item => item.total_breaches > 0 && !['all_cancers', 'missing_invalid'].includes(item.type)) // Only show individual cancer types with breaches
    .sort((a, b) => b.total_breaches - a.total_breaches); // Sort by total breaches

  // Always show top 10 cancer types with visual highlighting based on selection
  const cancerTypeBreaches = allCancerTypeBreaches.slice(0, 10).map(item => ({
    ...item,
    isHighlighted: selectedCancerType === 'all' || selectedCancerType === item.type
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalBreaches = data['28_day_breaches'] + data['31_day_breaches'] + data['62_day_breaches'];

      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{data.name}</p>
          <div className="space-y-1">
            <p className="text-amber-600">
              28-day Breaches: <span className="font-semibold">{data['28_day_breaches'].toLocaleString()}</span>
            </p>
            <p className="text-orange-600">
              31-day Breaches: <span className="font-semibold">{data['31_day_breaches'].toLocaleString()}</span>
            </p>
            <p className="text-red-600">
              62-day Breaches: <span className="font-semibold">{data['62_day_breaches'].toLocaleString()}</span>
            </p>
            <div className="border-t pt-1 mt-2">
              <p className="text-slate-600">
                Total Breaches: <span className="font-semibold">{totalBreaches.toLocaleString()}</span>
              </p>
              <p className="text-slate-600">
                Total Treated: <span className="font-semibold">{data.total_treated.toLocaleString()}</span>
              </p>
              <p className="text-slate-600">
                Overall Performance: <span className="font-semibold">{data.overall_performance.toFixed(1)}%</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 bg-red-500 rounded"></div>
          Cancer Pathway Breaches
        </CardTitle>
        <p className="text-sm text-slate-600">
          Total breaches by cancer type across all standards
          {selectedCancerType !== 'all' && (
            <span className="block text-xs text-amber-600 mt-1">
              Highlighting: {cancerTypeBreaches.find(d => d.type === selectedCancerType)?.name || 'Selected cancer type'}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={cancerTypeBreaches}
            margin={{ top: 40, right: 30, left: 50, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              stroke="#64748b"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#64748b"
              label={{
                value: 'Number of Breaches',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="rect"
              wrapperStyle={{ paddingTop: '10px' }}
            />

            <Bar
              dataKey="62_day_breaches"
              stackId="breaches"
              name="62-day Breaches"
              radius={[0, 0, 0, 0]}
            >
              {cancerTypeBreaches.map((entry, index) => (
                <Cell
                  key={`cell-62-${index}`}
                  fill={entry.isHighlighted ? "#dc2626" : "#dc2626"}
                  fillOpacity={entry.isHighlighted ? 1 : 0.3}
                />
              ))}
            </Bar>
            <Bar
              dataKey="31_day_breaches"
              stackId="breaches"
              name="31-day Breaches"
              radius={[0, 0, 0, 0]}
            >
              {cancerTypeBreaches.map((entry, index) => (
                <Cell
                  key={`cell-31-${index}`}
                  fill={entry.isHighlighted ? "#f97316" : "#f97316"}
                  fillOpacity={entry.isHighlighted ? 1 : 0.3}
                />
              ))}
            </Bar>
            <Bar
              dataKey="28_day_breaches"
              stackId="breaches"
              name="28-day FDS Breaches"
              radius={[4, 4, 0, 0]}
            >
              {cancerTypeBreaches.map((entry, index) => (
                <Cell
                  key={`cell-28-${index}`}
                  fill={entry.isHighlighted ? "#eab308" : "#eab308"}
                  fillOpacity={entry.isHighlighted ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Statistics - matches top cards positioning */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Most Breaches</p>
            <p className="font-semibold text-red-600">
              {Math.max(...cancerTypeBreaches.map(d => d.total_breaches)).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {cancerTypeBreaches.find(d => d.total_breaches === Math.max(...cancerTypeBreaches.map(c => c.total_breaches)))?.name || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Total Breaches</p>
            <p className="font-semibold text-slate-900">
              {cancerTypeBreaches.reduce((sum, d) => sum + d.total_breaches, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Cancer Types</p>
            <p className="font-semibold text-slate-900">
              {cancerTypeBreaches.length} shown
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Worst 62-Day</p>
            <p className="font-semibold text-red-600">
              {Math.max(...cancerTypeBreaches.map(d => d['62_day_breaches'])).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {cancerTypeBreaches.find(d => d['62_day_breaches'] === Math.max(...cancerTypeBreaches.map(c => c['62_day_breaches'])))?.name || '—'}
            </p>
          </div>
        </div>

        {/* Custom Legend - moved down to align with top cards */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-600 rounded"></div>
              <span>62-day Breaches</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-orange-500 rounded"></div>
              <span>31-day Breaches</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded"></div>
              <span>28-day FDS Breaches</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
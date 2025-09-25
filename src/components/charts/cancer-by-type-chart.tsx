'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancerData, CANCER_TYPE_DISPLAY_NAMES } from '@/types/cancer';

interface CancerByTypeChartProps {
  data: CancerData;
  selectedCancerType?: string;
  onCancerTypeClick?: (cancerType: string) => void;
}

export function CancerByTypeChart({ data, selectedCancerType = 'all', onCancerTypeClick }: CancerByTypeChartProps) {
  // Debug logging
  console.log('Cancer data received:', data);
  console.log('62-day combined data:', data?.standards?.['62_day_combined']);
  console.log('by_cancer_type keys:', Object.keys(data?.standards?.['62_day_combined']?.by_cancer_type || {}));

  // Get 62-day performance by cancer type and sort by volume
  const allCancerTypeData = Object.entries(data.standards['62_day_combined'].by_cancer_type || {})
    .map(([type, typeData]) => {
      return {
        type,
        name: CANCER_TYPE_DISPLAY_NAMES[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        performance: typeData.performance_pct,
        treated: typeData.total_treated,
        breaches: typeData.breaches,
        category: type.startsWith('suspected_') ? 'suspected' : 'treated'
      };
    })
    .filter(item => {
      // Exclude aggregate types and only show individual cancer types with data
      const isValidType = item.treated > 0 &&
                         item.performance !== undefined &&
                         item.performance !== null &&
                         !['all_cancers', 'missing_invalid'].includes(item.type);
      return isValidType;
    })
    .sort((a, b) => b.treated - a.treated); // Sort by volume (largest first)

  // Always show top 10 cancer types, but apply visual highlighting based on selection
  const cancerTypeData = allCancerTypeData.slice(0, 10).sort((a, b) => a.performance - b.performance); // Top 10 by volume, then sort by performance

  console.log('Final processed cancer data:', cancerTypeData);

  const getBarColor = (performance: number) => {
    if (performance >= 85) return 'from-green-500 to-green-600'; // Green
    if (performance >= 80) return 'from-yellow-500 to-yellow-600'; // Yellow
    if (performance >= 75) return 'from-orange-500 to-orange-600'; // Orange
    return 'from-red-500 to-red-600'; // Red
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 85) return 'text-green-600';
    if (performance >= 80) return 'text-yellow-600';
    if (performance >= 75) return 'text-orange-600';
    return 'text-red-600';
  };

  if (cancerTypeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-4 w-4 bg-purple-500 rounded"></div>
            62-Day Performance by Cancer Type
          </CardTitle>
          <p className="text-sm text-slate-600">
            Top cancer types by volume (urgent pathway)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            No cancer performance data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create chart data - reverse order so lowest performance appears at top
  const chartData = cancerTypeData.map((item, index) => ({
    name: item.name.length > 25 ? item.name.substring(0, 23) + '...' : item.name,
    fullName: item.name,
    performance: item.performance,
    treated: item.treated,
    breaches: item.breaches,
    category: item.category
  }));

  const maxValue = 100; // Performance is always out of 100%

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="h-4 w-4 bg-purple-500 rounded"></div>
          62-Day Performance by Cancer Type
        </CardTitle>
        <p className="text-sm text-slate-600">
          Top {chartData.length} cancer types by volume (urgent pathway) • Sorted by performance
          {selectedCancerType !== 'all' && (
            <span className="block text-xs text-amber-600 mt-1">
              Highlighting: {cancerTypeData.find(d => d.type === selectedCancerType)?.name || 'Selected cancer type'}
            </span>
          )}
          {onCancerTypeClick && (
            <span className="block text-xs text-blue-600 mt-1">Click bars to highlight cancer type</span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {/* Custom horizontal bar chart */}
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const widthPercentage = (item.performance / maxValue) * 100;
            const targetWidthPercentage = (85 / maxValue) * 100; // 85% target line

            return (
              <div key={index} className="flex items-center gap-3">
                {/* Cancer type name */}
                <div className="w-40 text-xs text-right truncate text-slate-600">
                  {item.name}
                </div>

                {/* Bar container with target line */}
                <div className="flex-1 relative">
                  {/* Target line background */}
                  <div className="absolute h-6 w-full bg-slate-100 rounded-md">
                    {/* 85% target line */}
                    <div
                      className="absolute top-0 h-6 w-0.5 bg-red-400 opacity-70"
                      style={{ left: `${targetWidthPercentage}%` }}
                    />
                  </div>

                  {/* Performance bar */}
                  <div
                    className={`h-6 bg-gradient-to-r ${getBarColor(item.performance)} rounded-md transition-all duration-300 ease-out relative group ${
                      onCancerTypeClick ? 'cursor-pointer hover:shadow-md' : ''
                    } ${
                      selectedCancerType !== 'all' && selectedCancerType !== cancerTypeData.find(d => d.name === item.fullName)?.type
                        ? 'opacity-30 grayscale'
                        : ''
                    }`}
                    style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                    onClick={() => {
                      if (onCancerTypeClick) {
                        const cancerType = cancerTypeData.find(d => d.name === item.fullName)?.type;
                        if (cancerType) {
                          onCancerTypeClick(selectedCancerType === cancerType ? 'all' : cancerType);
                        }
                      }
                    }}
                  >
                    {/* Performance value inside bar */}
                    <div className="absolute right-2 top-0 h-full flex items-center">
                      <span className="text-xs font-medium text-white opacity-90">
                        {item.performance.toFixed(1)}%
                      </span>
                    </div>

                    {/* Hover tooltip */}
                    <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="bg-slate-900 text-white px-3 py-2 rounded text-xs whitespace-nowrap">
                        <div className="font-semibold">{item.fullName}</div>
                        <div className="text-blue-400">
                          62-day Performance: {item.performance.toFixed(1)}%
                        </div>
                        <div className="text-slate-300">
                          Target: 85%
                        </div>
                        <div className="text-slate-300">
                          Patients Treated: {item.treated.toLocaleString()}
                        </div>
                        <div className="text-red-400">
                          Breaches: {item.breaches.toLocaleString()}
                        </div>
                        <div className="text-slate-400 mt-1">
                          Category: {item.category === 'suspected' ? 'Suspected' : 'Confirmed'} Cancer
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance value */}
                <div className={`w-16 text-xs font-medium ${getPerformanceColor(item.performance)}`}>
                  {item.performance.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 text-sm">
          <div className="text-center">
            <p className="text-slate-600">Best Performance</p>
            <p className="font-semibold text-green-600">
              {Math.max(...chartData.map(d => d.performance)).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 truncate">
              {chartData.find(d => d.performance === Math.max(...chartData.map(c => c.performance)))?.name || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Worst Performance</p>
            <p className="font-semibold text-red-600">
              {Math.min(...chartData.map(d => d.performance)).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 truncate">
              {chartData.find(d => d.performance === Math.min(...chartData.map(c => c.performance)))?.name || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Above Target</p>
            <p className={`font-semibold ${chartData.filter(d => d.performance >= 85).length > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {chartData.filter(d => d.performance >= 85).length} of {chartData.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-slate-600">Total Patients</p>
            <p className="font-semibold text-slate-900">
              {chartData.reduce((sum, d) => sum + d.treated, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded"></div>
              <span>≥85% (Target)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded"></div>
              <span>80-84%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-orange-500 rounded"></div>
              <span>75-79%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-red-500 rounded"></div>
              <span>{"<75%"}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-red-400"></div>
              <span>85% Target Line</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
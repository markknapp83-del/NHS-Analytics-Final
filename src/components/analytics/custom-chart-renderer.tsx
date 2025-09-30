'use client';

import { useMemo } from 'react';
import {
  LineChart,
  BarChart,
  AreaChart,
  ScatterChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Scatter,
  Cell
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useNHSData } from '@/hooks/use-nhs-data';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { generateChartData } from '@/lib/chart-data-generator';
import { getChartTitle, getTimePeriodLabel, calculateCorrelation } from '@/lib/analytics-utils';
import type { ChartConfiguration } from '@/types/analytics';

interface CustomChartRendererProps {
  config: ChartConfiguration;
}

export function CustomChartRenderer({ config }: CustomChartRendererProps) {
  const { getTrustData, getAllTrusts } = useNHSData();
  const [selectedTrust] = useTrustSelection();

  const chartData = useMemo(() => {
    return generateChartData(config, getTrustData, getAllTrusts, selectedTrust);
  }, [config, getTrustData, getAllTrusts, selectedTrust]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (config.chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis || 'period'}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={config.yAxis}
              stroke="var(--nhs-blue)"
              strokeWidth={2}
              dot={{ fill: 'var(--nhs-blue)', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis || 'period'}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey={config.yAxis} fill="var(--nhs-blue)">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry, config.yAxis)} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={config.xAxis || 'period'}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey={config.yAxis}
              stroke="var(--nhs-blue)"
              fill="var(--nhs-light-blue)"
              fillOpacity={0.6}
            />
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey={config.xAxis}
              name={config.xAxis}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey={config.yAxis}
              name={config.yAxis}
              tick={{ fontSize: 12 }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter
              name="Data Points"
              dataKey={config.yAxis}
              fill="var(--nhs-blue)"
            />
          </ScatterChart>
        );

      default:
        return (
          <div className="text-center text-slate-500">
            Select chart type and metrics to preview
          </div>
        );
    }
  };

  // Helper function to get bar colors based on performance thresholds
  const getBarColor = (entry: any, dataKey: string) => {
    if (!entry[dataKey]) return '#94a3b8'; // slate-400

    // Performance-based coloring for RTT metrics
    if (dataKey.includes('percent_within_18_weeks')) {
      // Only convert specialty-specific RTT percentages, not trust_total
      const value = dataKey.includes('trust_total')
        ? entry[dataKey]
        : entry[dataKey] * 100; // Convert decimal to percentage for comparison
      if (value >= 92) return '#22c55e'; // green-500
      if (value >= 75) return '#84cc16'; // lime-500
      if (value >= 50) return '#eab308'; // yellow-500
      return '#ef4444'; // red-500
    }

    // Breach count coloring (lower is better)
    if (dataKey.includes('52_plus_weeks') || dataKey.includes('65_plus_weeks') || dataKey.includes('78_plus_weeks')) {
      const value = entry[dataKey];
      if (value === 0) return '#22c55e'; // green-500
      if (value <= 10) return '#84cc16'; // lime-500
      if (value <= 50) return '#eab308'; // yellow-500
      return '#ef4444'; // red-500
    }

    return 'var(--nhs-blue)';
  };

  if (!config.xAxis && !config.yAxis) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Configure Your Analysis</h3>
          <p className="text-slate-500">Select metrics and chart type to see live preview</p>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No Data Available</h3>
          <p className="text-slate-500">
            No data matches your current filters and selection criteria
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chart Title and Stats */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {getChartTitle(config)}
        </h3>
        <div className="flex gap-4 text-sm text-slate-600">
          <span>Data points: {chartData.length}</span>
          <span>Time period: {getTimePeriodLabel(config.timePeriod)}</span>
          {config.analysisType === 'correlation' && config.xAxis && config.yAxis && (
            <span>
              Correlation: {calculateCorrelation(chartData, config.xAxis, config.yAxis)}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
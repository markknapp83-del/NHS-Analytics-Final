'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChartBuilderControls } from '@/components/analytics/chart-builder-controls';
import { CustomChartRenderer } from '@/components/analytics/custom-chart-renderer';
import type { ChartConfiguration } from '@/types/analytics';

export default function CustomAnalyticsPage() {
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    chartType: 'line',
    xAxis: '',
    yAxis: '',
    groupBy: '',
    filters: {},
    trustSelection: 'single',
    timePeriod: 'latest',
    analysisType: 'trend'
  });

  return (
    <div className="h-full flex">
      {/* Left Panel - Chart Builder Tools */}
      <div className="w-1/3 border-r border-slate-200 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Custom Analytics</h1>
            <p className="text-slate-600">Build custom visualizations and correlations</p>
          </div>

          <ChartBuilderControls
            config={chartConfig}
            onChange={setChartConfig}
          />
        </div>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="flex-1 p-6">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Live Preview</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export Data
              </Button>
              <Button variant="outline" size="sm">
                Export Chart
              </Button>
              <Button size="sm">
                Save Analysis
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-slate-50 rounded-lg p-6">
            <CustomChartRenderer config={chartConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
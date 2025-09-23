'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useNHSData } from '@/hooks/use-nhs-data';
import { useAvailableMetrics } from '@/hooks/use-available-metrics';
import { AdvancedFilters } from './advanced-filters';
import type { ChartConfiguration } from '@/types/analytics';

interface ChartBuilderProps {
  config: ChartConfiguration;
  onChange: (config: ChartConfiguration) => void;
}

export function ChartBuilderControls({ config, onChange }: ChartBuilderProps) {
  const { getAllTrusts } = useNHSData();
  const availableMetrics = useAvailableMetrics();

  return (
    <div className="space-y-6">
      {/* Chart Type Selection */}
      <div>
        <Label className="text-sm font-medium">Chart Type</Label>
        <Select
          value={config.chartType}
          onValueChange={(value) => onChange({...config, chartType: value as any})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="line">Line Chart</SelectItem>
            <SelectItem value="bar">Bar Chart</SelectItem>
            <SelectItem value="scatter">Scatter Plot</SelectItem>
            <SelectItem value="area">Area Chart</SelectItem>
            <SelectItem value="heatmap">Heatmap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metric Selection */}
      <div>
        <Label className="text-sm font-medium">X-Axis Metric</Label>
        <Select
          value={config.xAxis}
          onValueChange={(value) => onChange({...config, xAxis: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select X-axis metric" />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map(metric => (
              <SelectItem key={metric.key} value={metric.key}>
                {metric.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">Y-Axis Metric</Label>
        <Select
          value={config.yAxis}
          onValueChange={(value) => onChange({...config, yAxis: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Y-axis metric" />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map(metric => (
              <SelectItem key={metric.key} value={metric.key}>
                {metric.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Trust Selection */}
      <div>
        <Label className="text-sm font-medium">Trust Selection</Label>
        <RadioGroup
          value={config.trustSelection}
          onValueChange={(value) => onChange({...config, trustSelection: value as any})}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single">Current Trust</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multiple" id="multiple" />
            <Label htmlFor="multiple">Compare Trusts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all">All Trusts</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Time Period Selection */}
      <div>
        <Label className="text-sm font-medium">Time Period</Label>
        <Select
          value={config.timePeriod}
          onValueChange={(value) => onChange({...config, timePeriod: value as any})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">All Available Data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <Label className="text-sm font-medium">Advanced Filters</Label>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 mt-4">
          <AdvancedFilters
            filters={config.filters}
            onChange={(filters) => onChange({...config, filters})}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Analysis Type */}
      <div>
        <Label className="text-sm font-medium">Analysis Type</Label>
        <RadioGroup
          value={config.analysisType}
          onValueChange={(value) => onChange({...config, analysisType: value as any})}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="trend" id="trend" />
            <Label htmlFor="trend">Trend Analysis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="correlation" id="correlation" />
            <Label htmlFor="correlation">Correlation Analysis</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="distribution" id="distribution" />
            <Label htmlFor="distribution">Distribution Analysis</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
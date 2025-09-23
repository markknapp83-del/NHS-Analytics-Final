export interface ChartConfiguration {
  chartType: 'line' | 'bar' | 'scatter' | 'area' | 'heatmap';
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  filters: Record<string, any>;
  trustSelection: 'single' | 'multiple' | 'all';
  timePeriod?: 'latest' | '3months' | '6months' | '12months';
  analysisType?: 'trend' | 'correlation' | 'distribution';
}
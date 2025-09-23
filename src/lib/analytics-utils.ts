import type { ChartConfiguration } from '@/types/analytics';

export function getChartTitle(config: ChartConfiguration): string {
  if (!config.xAxis && !config.yAxis) {
    return 'Custom Analysis';
  }

  const xAxisLabel = getMetricDisplayName(config.xAxis);
  const yAxisLabel = getMetricDisplayName(config.yAxis);

  switch (config.analysisType) {
    case 'correlation':
      return `${yAxisLabel} vs ${xAxisLabel}`;

    case 'distribution':
      return `Distribution of ${yAxisLabel}`;

    case 'trend':
    default:
      if (config.trustSelection === 'single') {
        return `${yAxisLabel} Over Time`;
      } else {
        return `${yAxisLabel} Comparison`;
      }
  }
}

export function getTimePeriodLabel(timePeriod?: string): string {
  switch (timePeriod) {
    case 'latest':
      return 'Latest Month';
    case '3months':
      return 'Last 3 Months';
    case '6months':
      return 'Last 6 Months';
    case '12months':
      return 'All Available Data';
    default:
      return 'All Available Data';
  }
}

export function getMetricDisplayName(metricKey: string): string {
  const metricNames: Record<string, string> = {
    // Trust-level RTT
    'trust_total_percent_within_18_weeks': 'RTT 18-week Compliance',
    'trust_total_total_incomplete_pathways': 'Total Waiting List',
    'trust_total_total_52_plus_weeks': '52+ Week Waiters',
    'trust_total_total_65_plus_weeks': '65+ Week Waiters',
    'trust_total_total_78_plus_weeks': '78+ Week Waiters',
    'trust_total_median_wait_weeks': 'Median Wait Time',

    // A&E
    'ae_4hr_performance_pct': 'A&E 4-hour Performance',
    'ae_attendances_total': 'Total A&E Attendances',
    'ae_over_4hrs_total': 'A&E Over 4 Hours',
    'ae_emergency_admissions_total': 'Emergency Admissions',
    'ae_12hr_wait_admissions': '12+ Hour Wait Admissions',

    // Specialties
    'rtt_general_surgery_percent_within_18_weeks': 'General Surgery RTT',
    'rtt_urology_percent_within_18_weeks': 'Urology RTT',
    'rtt_trauma_orthopaedics_percent_within_18_weeks': 'Trauma & Orthopaedics RTT',
    'rtt_ent_percent_within_18_weeks': 'ENT RTT',
    'rtt_ophthalmology_percent_within_18_weeks': 'Ophthalmology RTT',

    // Diagnostics
    'diag_mri_total_waiting': 'MRI Total Waiting',
    'diag_mri_6week_breaches': 'MRI 6+ Week Breaches',
    'diag_ct_total_waiting': 'CT Total Waiting',
    'diag_ct_6week_breaches': 'CT 6+ Week Breaches',
    'diag_ultrasound_total_waiting': 'Ultrasound Total Waiting',
    'diag_ultrasound_6week_breaches': 'Ultrasound 6+ Week Breaches',

    // Capacity
    'virtual_ward_capacity': 'Virtual Ward Capacity',
    'virtual_ward_occupancy_rate': 'Virtual Ward Occupancy',
    'avg_daily_discharges': 'Average Daily Discharges',

    // Time
    'period': 'Time Period'
  };

  return metricNames[metricKey] || metricKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function calculateCorrelation(
  data: any[],
  xField: string,
  yField: string
): string {
  if (!data.length || !xField || !yField) {
    return 'N/A';
  }

  const validPairs = data
    .filter(item => {
      const x = item[xField];
      const y = item[yField];
      return typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y);
    })
    .map(item => [item[xField], item[yField]]);

  if (validPairs.length < 2) {
    return 'Insufficient data';
  }

  const n = validPairs.length;
  const sumX = validPairs.reduce((sum, [x]) => sum + x, 0);
  const sumY = validPairs.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = validPairs.reduce((sum, [x, y]) => sum + (x * y), 0);
  const sumX2 = validPairs.reduce((sum, [x]) => sum + (x * x), 0);
  const sumY2 = validPairs.reduce((sum, [, y]) => sum + (y * y), 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return 'N/A';
  }

  const correlation = numerator / denominator;
  const strength = getCorrelationStrength(Math.abs(correlation));

  return `${correlation.toFixed(3)} (${strength})`;
}

function getCorrelationStrength(absCorrelation: number): string {
  if (absCorrelation >= 0.8) return 'Very Strong';
  if (absCorrelation >= 0.6) return 'Strong';
  if (absCorrelation >= 0.4) return 'Moderate';
  if (absCorrelation >= 0.2) return 'Weak';
  return 'Very Weak';
}

export function formatMetricValue(value: number, format: 'number' | 'percentage' | 'currency'): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(value);
    case 'number':
    default:
      return value.toLocaleString('en-GB');
  }
}

export function getPerformanceColor(value: number, metricKey: string): string {
  // RTT compliance metrics (higher is better, 92% is target)
  if (metricKey.includes('percent_within_18_weeks')) {
    if (value >= 92) return '#22c55e'; // green-500
    if (value >= 75) return '#84cc16'; // lime-500
    if (value >= 50) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  }

  // A&E performance (higher is better, 95% is target)
  if (metricKey === 'ae_4hr_performance_pct') {
    if (value >= 95) return '#22c55e'; // green-500
    if (value >= 80) return '#84cc16'; // lime-500
    if (value >= 60) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  }

  // Breach counts (lower is better)
  if (metricKey.includes('52_plus_weeks') || metricKey.includes('65_plus_weeks') || metricKey.includes('78_plus_weeks')) {
    if (value === 0) return '#22c55e'; // green-500
    if (value <= 10) return '#84cc16'; // lime-500
    if (value <= 50) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  }

  // Default NHS blue
  return '#005eb8';
}

export function generateInsights(data: any[], config: ChartConfiguration): string[] {
  const insights: string[] = [];

  if (!data.length) {
    return ['No data available for analysis'];
  }

  // Basic statistics
  if (config.yAxis) {
    const values = data.map(d => d[config.yAxis]).filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

      insights.push(`Range: ${min.toFixed(1)} to ${max.toFixed(1)} (avg: ${avg.toFixed(1)})`);

      // Performance insights for RTT
      if (config.yAxis.includes('percent_within_18_weeks')) {
        const aboveTarget = values.filter(v => v >= 92).length;
        const belowThreshold = values.filter(v => v < 50).length;

        if (aboveTarget > 0) {
          insights.push(`${aboveTarget} data points meet the 92% RTT target`);
        }
        if (belowThreshold > 0) {
          insights.push(`${belowThreshold} data points show critical performance (<50%)`);
        }
      }
    }
  }

  // Correlation insights
  if (config.analysisType === 'correlation' && config.xAxis && config.yAxis) {
    const correlation = calculateCorrelation(data, config.xAxis, config.yAxis);
    if (correlation !== 'N/A' && correlation !== 'Insufficient data') {
      const corrValue = parseFloat(correlation.split(' ')[0]);
      if (Math.abs(corrValue) >= 0.6) {
        const direction = corrValue > 0 ? 'positive' : 'negative';
        insights.push(`Strong ${direction} correlation detected between metrics`);
      }
    }
  }

  return insights;
}
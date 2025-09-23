import type { NHSTrustData } from '@/types/nhs-data';
import type { ChartConfiguration } from '@/types/analytics';

export function generateChartData(
  config: ChartConfiguration,
  getTrustData: (trustCode: string) => NHSTrustData[],
  getAllTrusts: () => Array<{code: string, name: string, icb: string}>,
  selectedTrust: string
): any[] {
  if (!config.xAxis && !config.yAxis) {
    return [];
  }

  let baseData: NHSTrustData[] = [];

  // Get data based on trust selection
  switch (config.trustSelection) {
    case 'single':
      baseData = getTrustData(selectedTrust);
      break;

    case 'multiple':
      // For now, include a few comparison trusts - in real implementation,
      // this would come from user selection
      const comparisonTrusts = ['RGT', 'RGN', 'RQW'].slice(0, 5);
      baseData = comparisonTrusts.flatMap(code =>
        getTrustData(code).map(data => ({
          ...data,
          trust_comparison_key: `${data.trust_name} (${data.trust_code})`
        }))
      );
      break;

    case 'all':
      const allTrusts = getAllTrusts();
      // Limit to prevent performance issues - take latest period for all trusts
      baseData = allTrusts.map(trust => {
        const trustData = getTrustData(trust.code);
        return trustData[trustData.length - 1]; // Latest data only
      }).filter(Boolean);
      break;
  }

  // Apply time period filter
  baseData = applyTimePeriodFilter(baseData, config.timePeriod);

  // Apply advanced filters
  baseData = applyAdvancedFilters(baseData, config.filters);

  // Transform data based on chart type and analysis type
  return transformDataForChart(baseData, config);
}

function applyTimePeriodFilter(data: NHSTrustData[], timePeriod?: string): NHSTrustData[] {
  if (!timePeriod || timePeriod === '12months') {
    return data;
  }

  const sortedData = data.sort((a, b) => b.period.localeCompare(a.period));

  switch (timePeriod) {
    case 'latest':
      // Group by trust and take latest for each
      const latestByTrust = new Map();
      sortedData.forEach(record => {
        if (!latestByTrust.has(record.trust_code)) {
          latestByTrust.set(record.trust_code, record);
        }
      });
      return Array.from(latestByTrust.values());

    case '3months':
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().substring(0, 7) + '-01';
      return data.filter(record => record.period >= threeMonthsAgoStr);

    case '6months':
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().substring(0, 7) + '-01';
      return data.filter(record => record.period >= sixMonthsAgoStr);

    default:
      return data;
  }
}

function applyAdvancedFilters(data: NHSTrustData[], filters: Record<string, any>): NHSTrustData[] {
  let filteredData = [...data];

  // ICB filter
  if (filters.icb) {
    filteredData = filteredData.filter(record => record.icb_name === filters.icb);
  }

  // RTT performance threshold filter
  if (filters.rttMin && !isNaN(parseFloat(filters.rttMin))) {
    filteredData = filteredData.filter(record =>
      record.trust_total_percent_within_18_weeks >= parseFloat(filters.rttMin) // Already stored as percentage
    );
  }
  if (filters.rttMax && !isNaN(parseFloat(filters.rttMax))) {
    filteredData = filteredData.filter(record =>
      record.trust_total_percent_within_18_weeks <= parseFloat(filters.rttMax) // Already stored as percentage
    );
  }

  // Exclude zero values filter
  if (filters.excludeZeros) {
    filteredData = filteredData.filter(record => {
      // Check all numeric fields for zero values
      const numericFields = [
        'trust_total_percent_within_18_weeks',
        'trust_total_total_incomplete_pathways',
        'ae_4hr_performance_pct',
        'ae_attendances_total'
      ];
      return numericFields.some(field => record[field as keyof NHSTrustData] && record[field as keyof NHSTrustData] !== 0);
    });
  }

  // Minimum sample size (for trust-level analysis)
  if (filters.minSampleSize && !isNaN(parseInt(filters.minSampleSize))) {
    const minSize = parseInt(filters.minSampleSize);
    const trustCounts = new Map();

    // Count records per trust
    filteredData.forEach(record => {
      const count = trustCounts.get(record.trust_code) || 0;
      trustCounts.set(record.trust_code, count + 1);
    });

    // Filter out trusts with insufficient data
    filteredData = filteredData.filter(record =>
      (trustCounts.get(record.trust_code) || 0) >= minSize
    );
  }

  return filteredData;
}

function transformDataForChart(data: NHSTrustData[], config: ChartConfiguration): any[] {
  if (!data.length) return [];

  switch (config.analysisType) {
    case 'trend':
      return transformForTrendAnalysis(data, config);

    case 'correlation':
      return transformForCorrelationAnalysis(data, config);

    case 'distribution':
      return transformForDistributionAnalysis(data, config);

    default:
      return transformForTrendAnalysis(data, config);
  }
}

function transformForTrendAnalysis(data: NHSTrustData[], config: ChartConfiguration): any[] {
  if (config.trustSelection === 'single') {
    // Time series for single trust
    return data.map(record => ({
      period: formatPeriodForChart(record.period),
      [config.xAxis]: getFieldValue(record, config.xAxis),
      [config.yAxis]: getFieldValue(record, config.yAxis),
      trust_name: record.trust_name,
      trust_code: record.trust_code
    }));
  } else {
    // Multi-trust comparison
    return data.map(record => ({
      trust_name: `${record.trust_name} (${record.trust_code})`,
      [config.xAxis]: getFieldValue(record, config.xAxis),
      [config.yAxis]: getFieldValue(record, config.yAxis),
      period: formatPeriodForChart(record.period),
      icb_name: record.icb_name
    }));
  }
}

function transformForCorrelationAnalysis(data: NHSTrustData[], config: ChartConfiguration): any[] {
  return data
    .filter(record => {
      const xValue = getFieldValue(record, config.xAxis);
      const yValue = getFieldValue(record, config.yAxis);
      return xValue !== null && yValue !== null && xValue !== 0 && yValue !== 0;
    })
    .map(record => ({
      [config.xAxis]: getFieldValue(record, config.xAxis),
      [config.yAxis]: getFieldValue(record, config.yAxis),
      trust_name: record.trust_name,
      trust_code: record.trust_code,
      period: formatPeriodForChart(record.period)
    }));
}

function transformForDistributionAnalysis(data: NHSTrustData[], config: ChartConfiguration): any[] {
  const values = data
    .map(record => getFieldValue(record, config.yAxis))
    .filter(value => value !== null && value !== undefined && typeof value === 'number') as number[];

  // Create histogram bins
  const bins = createHistogramBins(values, 10);

  return bins.map((bin, index) => ({
    bin: `${bin.min.toFixed(1)} - ${bin.max.toFixed(1)}`,
    count: bin.count,
    percentage: ((bin.count / values.length) * 100).toFixed(1)
  }));
}

function getFieldValue(record: NHSTrustData, fieldName: string): number | string | null {
  if (!fieldName) return null;

  const value = record[fieldName as keyof NHSTrustData];

  if (fieldName === 'period') {
    return formatPeriodForChart(record.period);
  }

  // Convert percentage fields from decimal to percentage for display
  if (typeof value === 'number' && (fieldName.includes('percent_within_18_weeks') || fieldName.includes('4hr_performance_pct'))) {
    return value * 100;
  }

  return typeof value === 'number' ? value : null;
}

function formatPeriodForChart(period: string): string {
  const date = new Date(period);
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short'
  });
}

function createHistogramBins(values: number[], binCount: number) {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / binCount;

  const bins = Array(binCount).fill(0).map((_, index) => ({
    min: min + index * binSize,
    max: min + (index + 1) * binSize,
    count: 0
  }));

  values.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
    bins[binIndex].count++;
  });

  return bins;
}
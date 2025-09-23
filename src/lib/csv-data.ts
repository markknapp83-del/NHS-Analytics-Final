import Papa from 'papaparse';
import { NHSTrustData, TrustSummary } from '@/types/nhs-data';

let cachedData: NHSTrustData[] | null = null;

export async function loadNHSData(): Promise<NHSTrustData[]> {
  if (cachedData) return cachedData;

  try {
    const response = await fetch('/data/unified_monthly_data_enhanced.csv');
    const csvText = await response.text();

    const result = Papa.parse<NHSTrustData>(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });

    if (result.errors.length > 0) {
      console.error('CSV parsing errors:', result.errors);
    }

    cachedData = result.data.filter(row => row.trust_code && row.trust_name);
    console.log(`Loaded ${cachedData.length} NHS trust records`);

    return cachedData;
  } catch (error) {
    console.error('Failed to load NHS data:', error);
    return [];
  }
}

export function getTrustData(trustCode: string): NHSTrustData[] {
  if (!cachedData) return [];
  return cachedData
    .filter(row => row.trust_code === trustCode)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function getAllTrusts(): TrustSummary[] {
  if (!cachedData) return [];

  const trustsMap = new Map<string, TrustSummary>();

  cachedData.forEach(row => {
    if (!trustsMap.has(row.trust_code)) {
      trustsMap.set(row.trust_code, {
        code: row.trust_code,
        name: row.trust_name,
        icb: row.icb_name || 'Unknown ICB',
        latestPeriod: row.period,
        recordCount: 1
      });
    } else {
      const existing = trustsMap.get(row.trust_code)!;
      existing.recordCount++;
      // Keep the latest period
      if (row.period > existing.latestPeriod) {
        existing.latestPeriod = row.period;
      }
    }
  });

  return Array.from(trustsMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getLatestDataForTrust(trustCode: string): NHSTrustData | null {
  const trustData = getTrustData(trustCode);
  return trustData.length > 0 ? trustData[trustData.length - 1] : null;
}

export function getTrustDataForPeriod(trustCode: string, period: string): NHSTrustData | null {
  if (!cachedData) return null;

  return cachedData.find(row =>
    row.trust_code === trustCode &&
    row.period === period
  ) || null;
}

export function getPerformanceLevel(percentage: number | null | undefined): {
  level: 'excellent' | 'good' | 'concern' | 'critical';
  color: string;
  bgColor: string;
} {
  if (percentage === null || percentage === undefined) {
    return { level: 'critical', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  }

  if (percentage >= 90) {
    return { level: 'excellent', color: 'text-green-700', bgColor: 'bg-green-100' };
  }
  if (percentage >= 75) {
    return { level: 'good', color: 'text-green-600', bgColor: 'bg-green-50' };
  }
  if (percentage >= 50) {
    return { level: 'concern', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  }
  return { level: 'critical', color: 'text-red-700', bgColor: 'bg-red-100' };
}

export function calculateTrend(current: number | null, previous: number | null): {
  trend: 'up' | 'down' | 'stable';
  percentage: number;
  isPositive: boolean;
} {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return { trend: 'stable', percentage: 0, isPositive: false };
  }

  const change = ((current - previous) / previous) * 100;
  const threshold = 0.1; // 0.1% threshold for "stable"

  if (Math.abs(change) < threshold) {
    return { trend: 'stable', percentage: change, isPositive: false };
  }

  return {
    trend: change > 0 ? 'up' : 'down',
    percentage: Math.abs(change),
    isPositive: change > 0
  };
}
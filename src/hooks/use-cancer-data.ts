'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { CancerData } from '@/types/cancer';

export function useCancerData(trustCode: string | null) {
  const [data, setData] = useState<CancerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCancerData() {
      if (!trustCode) {
        setData([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data: cancerData, error: fetchError } = await supabase
          .from('trust_metrics')
          .select('period, cancer_data, data_type')
          .eq('trust_code', trustCode)
          .eq('data_type', 'quarterly')
          .not('cancer_data', 'is', null)
          .order('period', { ascending: true });

        if (fetchError) throw fetchError;

        const parsed = (cancerData || []).map((row: any) => ({
          period: row.period,
          ...row.cancer_data
        }));

        setData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cancer data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCancerData();
  }, [trustCode]);

  return { data, isLoading, error };
}

export function getLatestCancerData(data: CancerData[]) {
  return data[data.length - 1];
}

export function getPreviousQuarterData(data: CancerData[]) {
  return data[data.length - 2];
}

export function getCancerTypePerformance(
  cancerData: CancerData,
  cancerType: string,
  standard: string
) {
  const standardKey = standard.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
  return cancerData.standards[standardKey as keyof typeof cancerData.standards]?.by_cancer_type?.[cancerType];
}

export function calculateOverallPerformance(cancerData: CancerData): number {
  // Weighted average: 62-day has highest weight as most critical
  const weights = {
    '28_day_fds': 0.2,
    '31_day_combined': 0.3,
    '62_day_combined': 0.5
  };

  let weightedSum = 0;
  let totalWeight = 0;

  Object.entries(weights).forEach(([standard, weight]) => {
    const perf = cancerData.standards[standard as keyof typeof cancerData.standards].summary.performance_pct;
    weightedSum += perf * weight;
    totalWeight += weight;
  });

  return Math.round(weightedSum / totalWeight * 10) / 10;
}
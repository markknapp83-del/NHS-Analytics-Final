'use client';

import { useState, useEffect, useMemo } from 'react';
import { useNHSData } from './useNHSData';
import type { TrustMetrics, Trust } from '@/types/database';

export interface ICBMetrics {
  code: string;
  name: string;
  trustCount: number;
  avgRTTCompliance: number;
  totalWaitingList: number;
  total52WeekBreaches: number;
  avgAEPerformance: number;
  monthlyData: Array<{
    period: string;
    rttCompliance: number;
    waitingList: number;
    breaches52Week: number;
    aePerformance: number;
  }>;
  trusts: Array<{
    code: string;
    name: string;
    latestRTT: number;
    latestAE: number;
    waitingList: number;
  }>;
}

export function useICBData() {
  const { trusts: allTrusts, getTrustData, getLatestDataForTrust, isLoading: trustsLoading } = useNHSData();
  const [icbMetrics, setICBMetrics] = useState<ICBMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group trusts by ICB
  const icbGroups = useMemo(() => {
    const groups = new Map<string, Trust[]>();
    allTrusts.forEach(trust => {
      if (trust.icb_name && trust.icb_code) {
        const icbKey = trust.icb_code;
        if (!groups.has(icbKey)) {
          groups.set(icbKey, []);
        }
        groups.get(icbKey)!.push(trust);
      }
    });
    return groups;
  }, [allTrusts]);

  // Get all ICBs with basic info
  const allICBs = useMemo(() => {
    return Array.from(icbGroups.entries()).map(([code, trusts]) => ({
      code,
      name: trusts[0]?.icb_name || 'Unknown ICB',
      trustCount: trusts.length,
      trusts: trusts.map(t => ({ code: t.code, name: t.name }))
    }));
  }, [icbGroups]);

  useEffect(() => {
    if (!trustsLoading && allTrusts.length > 0 && icbMetrics.length === 0 && !isLoading) {
      loadICBMetrics();
    }
  }, [allTrusts, trustsLoading, icbMetrics.length, isLoading]);

  const loadICBMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const icbMetricsData: ICBMetrics[] = [];

      for (const [icbCode, trusts] of icbGroups.entries()) {
        const icbName = trusts[0]?.icb_name || 'Unknown ICB';

        // Get historical data for all trusts in this ICB
        const allTrustHistoricalData = await Promise.all(
          trusts.map(async (trust) => {
            try {
              const historicalData = await getTrustData(trust.code);
              return { trust, data: historicalData };
            } catch (error) {
              console.warn(`Failed to get historical data for trust ${trust.code}:`, error);
              return { trust, data: [] };
            }
          })
        );

        // Filter trusts that have data
        const validTrustData = allTrustHistoricalData.filter(({ data }) => data.length > 0);

        if (validTrustData.length === 0) {
          console.warn(`No valid data for ICB ${icbName}`);
          continue;
        }

        // Get the most recent non-null data for each metric per trust
        const getLatestNonNullValue = (trustData: any[], getter: (record: any) => any) => {
          // Go backwards from most recent to find first non-null value
          for (let i = trustData.length - 1; i >= 0; i--) {
            const value = getter(trustData[i]);
            if (value !== null && value !== undefined && !isNaN(value)) {
              return { value, record: trustData[i] };
            }
          }
          return null;
        };

        // Calculate current aggregated metrics using most recent non-null data
        const rttValues: number[] = [];
        const waitingListValues: number[] = [];
        const breachValues: number[] = [];
        const aeValues: number[] = [];

        validTrustData.forEach(({ trust, data }) => {
          // RTT compliance - get latest non-null
          const rttResult = getLatestNonNullValue(data, (record) =>
            record.rtt_data?.trust_total?.percent_within_18_weeks
          );
          if (rttResult) rttValues.push(rttResult.value);

          // Waiting list - get latest non-null
          const waitingResult = getLatestNonNullValue(data, (record) =>
            record.rtt_data?.trust_total?.total_incomplete_pathways
          );
          if (waitingResult) waitingListValues.push(waitingResult.value);

          // 52-week breaches - get latest non-null
          const breachResult = getLatestNonNullValue(data, (record) =>
            record.rtt_data?.trust_total?.total_52_plus_weeks
          );
          if (breachResult) breachValues.push(breachResult.value);

          // A&E performance - get latest non-null
          const aeResult = getLatestNonNullValue(data, (record) =>
            record.ae_data?.four_hour_performance_pct
          );
          if (aeResult) {
            aeValues.push(aeResult.value);
          }
        });

        // Calculate aggregated metrics
        const avgRTTCompliance = rttValues.length > 0
          ? rttValues.reduce((sum, val) => sum + val, 0) / rttValues.length
          : 0;

        const totalWaitingList = waitingListValues.reduce((sum, val) => sum + val, 0);

        const total52WeekBreaches = breachValues.reduce((sum, val) => sum + val, 0);

        const avgAEPerformance = aeValues.length > 0
          ? aeValues.reduce((sum, val) => sum + val, 0) / aeValues.length
          : 0;

        // Build monthly data from historical data
        const periodMap = new Map<string, {
          rttValues: number[];
          waitingListValues: number[];
          breaches52WeekValues: number[];
          aeValues: number[];
        }>();

        // Collect all data points by period
        validTrustData.forEach(({ data: trustHistoricalData }) => {
          trustHistoricalData.forEach(record => {
            if (!periodMap.has(record.period)) {
              periodMap.set(record.period, {
                rttValues: [],
                waitingListValues: [],
                breaches52WeekValues: [],
                aeValues: []
              });
            }

            const periodData = periodMap.get(record.period)!;

            const rttCompliance = record.rtt_data?.trust_total?.percent_within_18_weeks;
            const waitingList = record.rtt_data?.trust_total?.total_incomplete_pathways;
            const breaches52Week = record.rtt_data?.trust_total?.total_52_plus_weeks;
            const aePerformance = record.ae_data?.four_hour_performance_pct;

            if (rttCompliance !== null && rttCompliance !== undefined) {
              periodData.rttValues.push(rttCompliance);
            }
            if (waitingList !== null && waitingList !== undefined) {
              periodData.waitingListValues.push(waitingList);
            }
            if (breaches52Week !== null && breaches52Week !== undefined) {
              periodData.breaches52WeekValues.push(breaches52Week);
            }
            if (aePerformance !== null && aePerformance !== undefined) {
              periodData.aeValues.push(aePerformance);
            }
          });
        });

        // Calculate monthly aggregations - only include periods with sufficient data
        const monthlyData = Array.from(periodMap.entries())
          .filter(([period, values]) => {
            // Only include periods where we have meaningful data from at least some trusts
            return values.rttValues.length > 0 || values.waitingListValues.length > 0 || values.breaches52WeekValues.length > 0;
          })
          .map(([period, values]) => ({
            period,
            rttCompliance: values.rttValues.length > 0
              ? values.rttValues.reduce((sum, val) => sum + val, 0) / values.rttValues.length
              : 0,
            waitingList: values.waitingListValues.reduce((sum, val) => sum + val, 0),
            breaches52Week: values.breaches52WeekValues.reduce((sum, val) => sum + val, 0),
            aePerformance: values.aeValues.length > 0
              ? values.aeValues.reduce((sum, val) => sum + val, 0) / values.aeValues.length
              : 0
          }))
          .sort((a, b) => a.period.localeCompare(b.period));

        // Create trust breakdown using latest non-null values
        const trustsBreakdown = validTrustData.map(({ trust, data }) => {
          const rttResult = getLatestNonNullValue(data, (record) =>
            record.rtt_data?.trust_total?.percent_within_18_weeks
          );
          const aeResult = getLatestNonNullValue(data, (record) =>
            record.ae_data?.four_hour_performance_pct
          );
          const waitingResult = getLatestNonNullValue(data, (record) =>
            record.rtt_data?.trust_total?.total_incomplete_pathways
          );

          return {
            code: trust.code,
            name: trust.name,
            latestRTT: rttResult?.value || 0,
            latestAE: aeResult?.value || 0,
            waitingList: waitingResult?.value || 0
          };
        });

        icbMetricsData.push({
          code: icbCode,
          name: icbName,
          trustCount: trusts.length,
          avgRTTCompliance,
          totalWaitingList,
          total52WeekBreaches,
          avgAEPerformance,
          monthlyData,
          trusts: trustsBreakdown
        });
      }

      // Sort by RTT compliance (best first for default view)
      icbMetricsData.sort((a, b) => b.avgRTTCompliance - a.avgRTTCompliance);

      setICBMetrics(icbMetricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ICB metrics');
      console.error('ICB data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getICBByCode = (icbCode: string): ICBMetrics | undefined => {
    return icbMetrics.find(icb => icb.code === icbCode);
  };

  const getICBByName = (icbName: string): ICBMetrics | undefined => {
    return icbMetrics.find(icb => icb.name === icbName);
  };

  const getTopPerformingICBs = (limit: number = 5): ICBMetrics[] => {
    return [...icbMetrics]
      .sort((a, b) => b.avgRTTCompliance - a.avgRTTCompliance)
      .slice(0, limit);
  };

  const getWorstPerformingICBs = (limit: number = 5): ICBMetrics[] => {
    return [...icbMetrics]
      .sort((a, b) => a.avgRTTCompliance - b.avgRTTCompliance)
      .slice(0, limit);
  };

  return {
    allICBs,
    icbMetrics,
    isLoading: isLoading || trustsLoading,
    error,
    refreshICBData: loadICBMetrics,
    getICBByCode,
    getICBByName,
    getTopPerformingICBs,
    getWorstPerformingICBs
  };
}

export function useSelectedICB(icbCode: string | null) {
  const { getICBByCode } = useICBData();

  return useMemo(() => {
    return icbCode ? getICBByCode(icbCode) : null;
  }, [icbCode, getICBByCode]);
}
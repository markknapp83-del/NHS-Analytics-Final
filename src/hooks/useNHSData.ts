'use client';

import { useState, useEffect, useCallback } from 'react';
import { nhsDatabase } from '@/lib/supabase-client';
import type { TrustMetrics, Trust, DateRange } from '@/types/database';

export function useNHSData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trusts, setTrusts] = useState<Trust[]>([]);

  useEffect(() => {
    loadTrusts();
  }, []);

  const loadTrusts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const trustsData = await nhsDatabase.getAllTrusts();
      setTrusts(trustsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trusts');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrustData = useCallback(async (trustCode: string, dateRange?: DateRange): Promise<TrustMetrics[]> => {
    try {
      return await nhsDatabase.getTrustMetrics(trustCode, dateRange);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get trust data');
    }
  }, []);

  const getLatestDataForTrust = useCallback(async (trustCode: string): Promise<TrustMetrics | null> => {
    try {
      return await nhsDatabase.getLatestTrustMetrics(trustCode);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get latest trust data');
    }
  }, []);

  const getTrustsByICB = useCallback(async (icbCode: string): Promise<Trust[]> => {
    try {
      return await nhsDatabase.getTrustsByICB(icbCode);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get trusts by ICB');
    }
  }, []);

  const getRTTPerformance = useCallback(async (trustCode: string, specialties?: string[]) => {
    try {
      return await nhsDatabase.getRTTPerformance(trustCode, specialties);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get RTT performance');
    }
  }, []);

  const getAEPerformance = useCallback(async (trustCode: string) => {
    try {
      return await nhsDatabase.getAEPerformance(trustCode);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get A&E performance');
    }
  }, []);

  const getDiagnosticsData = useCallback(async (trustCode: string, testTypes?: string[]) => {
    try {
      return await nhsDatabase.getDiagnosticsData(trustCode, testTypes);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get diagnostics data');
    }
  }, []);

  const compareMultipleTrusts = useCallback(async (trustCodes: string[], metrics: string[]) => {
    try {
      return await nhsDatabase.compareMultipleTrusts(trustCodes, metrics);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to compare trusts');
    }
  }, []);

  const getICBBenchmarks = useCallback(async (icbCode: string) => {
    try {
      return await nhsDatabase.getICBBenchmarks(icbCode);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get ICB benchmarks');
    }
  }, []);

  const getTrendAnalysis = useCallback(async (trustCode: string, metric: string) => {
    try {
      return await nhsDatabase.getTrendAnalysis(trustCode, metric);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get trend analysis');
    }
  }, []);

  return {
    trusts,
    isLoading,
    error,
    refreshTrusts: loadTrusts,
    getTrustData,
    getLatestDataForTrust,
    getTrustsByICB,
    getRTTPerformance,
    getAEPerformance,
    getDiagnosticsData,
    compareMultipleTrusts,
    getICBBenchmarks,
    getTrendAnalysis
  };
}

export function useTrustMetrics(trustCode: string | null, dateRange?: DateRange) {
  const [metrics, setMetrics] = useState<TrustMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trustCode) {
      console.log('[useTrustMetrics] No trust code provided');
      setMetrics([]);
      return;
    }

    console.log('[useTrustMetrics] Loading metrics for trust:', trustCode);

    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('[useTrustMetrics] Fetching data...');
        const data = await nhsDatabase.getTrustMetrics(trustCode, dateRange);
        console.log('[useTrustMetrics] Data received:', data?.length, 'records');
        setMetrics(data);
      } catch (err) {
        console.error('[useTrustMetrics] Error loading metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trust metrics');
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [trustCode, dateRange]);

  return { metrics, isLoading, error };
}

export function useLatestTrustMetrics(trustCode: string | null) {
  const [metrics, setMetrics] = useState<TrustMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trustCode) {
      setMetrics(null);
      return;
    }

    const loadLatestMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await nhsDatabase.getLatestTrustMetrics(trustCode);
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load latest trust metrics');
      } finally {
        setIsLoading(false);
      }
    };

    loadLatestMetrics();
  }, [trustCode]);

  return { metrics, isLoading, error };
}
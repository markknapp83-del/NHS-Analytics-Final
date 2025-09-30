import { supabaseAuth } from '@/lib/supabase-auth';
import type {
  Database,
  TrustMetrics,
  Trust,
  DateRange,
  ComparisonData,
  BenchmarkData,
  TrendData,
  RTTData,
  AEData,
  DiagnosticsData
} from '@/types/database';

// Use the authenticated client from supabase-auth
// This ensures proper session handling and RLS policy compliance
export const supabase = supabaseAuth;

// Performance monitoring interface
interface PerformanceMetrics {
  queryCount: number;
  totalTime: number;
  averageTime: number;
  cacheHits: number;
  cacheMisses: number;
}

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class NHSDatabaseClient {
  private client = supabase;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private metrics: PerformanceMetrics = {
    queryCount: 0,
    totalTime: 0,
    averageTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // Cache TTL configurations (in milliseconds)
  private readonly cacheTTL = {
    trusts: 5 * 60 * 1000,        // 5 minutes - trust list changes rarely
    metrics: 2 * 60 * 1000,       // 2 minutes - metrics data
    benchmarks: 10 * 60 * 1000,   // 10 minutes - benchmark data
    trends: 5 * 60 * 1000         // 5 minutes - trend analysis
  };

  // Cache management methods
  private getCacheKey(...parts: string[]): string {
    return parts.join(':');
  }

  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCache(entry)) {
      this.metrics.cacheHits++;
      return entry.data as T;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    this.metrics.cacheMisses++;
    return null;
  }

  // Performance monitoring
  private async withPerformanceTracking<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.metrics.queryCount++;
      this.metrics.totalTime += duration;
      this.metrics.averageTime = this.metrics.totalTime / this.metrics.queryCount;

      if (duration > 1000) { // Only log slow queries
        console.log(`[Supabase] ${operationName}: ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      console.error(`[Supabase] ${operationName} failed:`, error);
      throw error;
    }
  }

  async getTrustMetrics(trustCode: string, dateRange?: DateRange): Promise<TrustMetrics[]> {
    const cacheKey = this.getCacheKey('metrics', trustCode, dateRange?.start || 'all', dateRange?.end || 'all');
    const cached = this.getCache<TrustMetrics[]>(cacheKey);
    if (cached) {
      console.log('[getTrustMetrics] Returning cached data for', trustCode, ':', cached.length, 'records');
      return cached;
    }

    console.log('[getTrustMetrics] Fetching from database for', trustCode);

    return this.withPerformanceTracking(async () => {
      let query = this.client
        .from('trust_metrics')
        .select('*')
        .eq('trust_code', trustCode)
        .order('period', { ascending: true });

      if (dateRange) {
        query = query
          .gte('period', dateRange.start)
          .lte('period', dateRange.end);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[getTrustMetrics] Database error:', error);
        throw new Error(`Failed to fetch trust metrics: ${error.message}`);
      }

      const result = data || [];
      console.log('[getTrustMetrics] Database returned', result.length, 'records for', trustCode);
      this.setCache(cacheKey, result, this.cacheTTL.metrics);
      return result;
    }, `getTrustMetrics(${trustCode})`);
  }

  async getAllTrusts(): Promise<Trust[]> {
    console.log('[getAllTrusts] Starting - checking cache');
    const cacheKey = this.getCacheKey('trusts', 'all');
    const cached = this.getCache<Trust[]>(cacheKey);
    if (cached) {
      console.log('[getAllTrusts] Returning cached data:', cached.length, 'trusts');
      return cached;
    }

    console.log('[getAllTrusts] No cache found, fetching from database');

    return this.withPerformanceTracking(async () => {
      // Try RPC function first with timeout
      try {
        console.log('[getAllTrusts] Calling get_distinct_trusts RPC function');

        // Create timeout promise (10 seconds)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout after 10s')), 10000)
        );

        const rpcPromise = this.client.rpc('get_distinct_trusts');

        const { data: rpcData, error: rpcError } = await Promise.race([
          rpcPromise,
          timeoutPromise
        ]) as { data: any[] | null, error: any };

        console.log('[getAllTrusts] RPC response:', { hasData: !!rpcData, dataLength: rpcData?.length, hasError: !!rpcError, error: rpcError });

        if (!rpcError && rpcData && rpcData.length > 0) {
          console.log('[getAllTrusts] Fetched', rpcData.length, 'distinct trusts from RPC function');

          const result: Trust[] = rpcData.map((row: any) => ({
            code: row.trust_code,
            name: row.trust_name,
            icb_code: row.icb_code,
            icb_name: row.icb_name
          }));

          result.sort((a, b) => a.name.localeCompare(b.name));
          console.log('[getAllTrusts] Returning', result.length, 'unique trusts from RPC');

          this.setCache(cacheKey, result, this.cacheTTL.trusts);
          return result;
        }

        console.warn('[getAllTrusts] RPC failed or returned no data, falling back to direct query:', rpcError);
      } catch (rpcErr) {
        console.error('[getAllTrusts] RPC error/timeout, falling back to direct query:', rpcErr);
      }

      // Fallback: Direct query with limit and timeout
      try {
        console.log('[getAllTrusts] Using fallback: direct query with limit');

        const fallbackTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Fallback query timeout after 10s')), 10000)
        );

        const fallbackQueryPromise = this.client
          .from('trust_metrics')
          .select('trust_code, trust_name, icb_code, icb_name')
          .not('trust_name', 'like', 'Unknown%')
          .limit(2000) // Reasonable limit to ensure we get all unique trusts
          .order('trust_name');

        const { data, error } = await Promise.race([
          fallbackQueryPromise,
          fallbackTimeoutPromise
        ]) as { data: any[] | null, error: any };

        if (error) {
          console.error('[getAllTrusts] Fallback query error:', error);
          throw new Error(`Failed to fetch trusts: ${error.message}`);
        }

        if (!data || data.length === 0) {
          console.warn('[getAllTrusts] No data returned from fallback query');
          return [];
        }

        console.log('[getAllTrusts] Fallback query returned', data.length, 'records');

        // Client-side deduplication
        const trustMap = new Map<string, Trust>();
        data.forEach((row: any) => {
          if (!trustMap.has(row.trust_code) && row.trust_name) {
            trustMap.set(row.trust_code, {
              code: row.trust_code,
              name: row.trust_name,
              icb_code: row.icb_code,
              icb_name: row.icb_name
            });
          }
        });

        const result = Array.from(trustMap.values());
        result.sort((a, b) => a.name.localeCompare(b.name));

        console.log('[getAllTrusts] Returning', result.length, 'unique trusts from fallback');

        this.setCache(cacheKey, result, this.cacheTTL.trusts);
        return result;
      } catch (fallbackErr) {
        console.error('[getAllTrusts] Fallback query failed:', fallbackErr);
        // Return empty array rather than throwing - let UI show error state
        return [];
      }
    }, 'getAllTrusts');
  }

  async getTrustsByICB(icbCode: string): Promise<Trust[]> {
    const { data, error } = await this.client
      .from('trust_metrics')
      .select('trust_code, trust_name, icb_code, icb_name')
      .eq('icb_code', icbCode)
      .order('trust_name');

    if (error) {
      throw new Error(`Failed to fetch trusts by ICB: ${error.message}`);
    }

    // Remove duplicates
    const trustMap = new Map<string, Trust>();
    (data as any)?.forEach((row: any) => {
      if (!trustMap.has(row.trust_code)) {
        trustMap.set(row.trust_code, {
          code: row.trust_code,
          name: row.trust_name,
          icb_code: row.icb_code,
          icb_name: row.icb_name
        });
      }
    });

    return Array.from(trustMap.values());
  }

  async getLatestTrustMetrics(trustCode: string): Promise<TrustMetrics | null> {
    const { data, error } = await this.client
      .from('trust_metrics')
      .select('*')
      .eq('trust_code', trustCode)
      .order('period', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No data found
      }
      throw new Error(`Failed to fetch latest trust metrics: ${error.message}`);
    }

    return data;
  }

  async getRTTPerformance(trustCode: string, specialties?: string[]): Promise<RTTData[]> {
    const metrics = await this.getTrustMetrics(trustCode);

    return metrics.map(metric => {
      const rttData = metric.rtt_data;

      if (specialties && specialties.length > 0) {
        // Filter to only include specified specialties
        const filteredSpecialties: { [key: string]: any } = {};
        specialties.forEach(specialty => {
          if (rttData.specialties[specialty]) {
            filteredSpecialties[specialty] = rttData.specialties[specialty];
          }
        });

        return {
          ...rttData,
          specialties: filteredSpecialties
        };
      }

      return rttData;
    }) as RTTData[];
  }

  async getAEPerformance(trustCode: string): Promise<AEData[]> {
    const metrics = await this.getTrustMetrics(trustCode);
    return metrics.map(metric => metric.ae_data);
  }

  async getDiagnosticsData(trustCode: string, testTypes?: string[]): Promise<DiagnosticsData[]> {
    const metrics = await this.getTrustMetrics(trustCode);

    return metrics.map(metric => {
      const diagnosticsData = metric.diagnostics_data;

      if (testTypes && testTypes.length > 0) {
        // Filter to only include specified test types
        const filteredDiagnostics: { [key: string]: any } = {};
        testTypes.forEach(testType => {
          if (diagnosticsData[testType]) {
            filteredDiagnostics[testType] = diagnosticsData[testType];
          }
        });

        return filteredDiagnostics as DiagnosticsData;
      }

      return diagnosticsData;
    });
  }

  async compareMultipleTrusts(trustCodes: string[], metrics: string[]): Promise<ComparisonData> {
    // Get latest data for each trust
    const promises = trustCodes.map(async (code) => {
      const latest = await this.getLatestTrustMetrics(code);
      return { code, data: latest };
    });

    const results = await Promise.all(promises);
    const trusts: Trust[] = [];
    const metricsData: { [trustCode: string]: { [metric: string]: number | null } } = {};

    results.forEach(({ code, data }) => {
      if (data) {
        trusts.push({
          code: data.trust_code,
          name: data.trust_name,
          icb_code: data.icb_code,
          icb_name: data.icb_name
        });

        metricsData[code] = {};
        metrics.forEach(metric => {
          metricsData[code][metric] = this.extractMetricValue(data, metric);
        });
      }
    });

    // Calculate benchmarks
    const benchmarks: { [metric: string]: any } = {};
    metrics.forEach(metric => {
      const values = Object.values(metricsData)
        .map(trustMetrics => trustMetrics[metric])
        .filter(val => val !== null) as number[];

      if (values.length > 0) {
        values.sort((a, b) => a - b);
        benchmarks[metric] = {
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          median: values[Math.floor(values.length / 2)],
          best: Math.max(...values),
          worst: Math.min(...values)
        };
      }
    });

    return {
      trusts,
      metrics: metricsData,
      benchmarks
    };
  }

  async getICBBenchmarks(icbCode: string): Promise<BenchmarkData> {
    const { data, error } = await this.client
      .from('trust_metrics')
      .select('*')
      .eq('icb_code', icbCode)
      .order('period', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch ICB benchmarks: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`No data found for ICB: ${icbCode}`);
    }

    const icbName = (data as any)[0].icb_name || 'Unknown ICB';
    const trustCount = new Set((data as any).map((d: any) => d.trust_code)).size;

    // Get latest data for each trust
    const latestDataByTrust = new Map<string, TrustMetrics>();
    (data as any).forEach((record: any) => {
      const existing = latestDataByTrust.get(record.trust_code);
      if (!existing || record.period > existing.period) {
        latestDataByTrust.set(record.trust_code, record);
      }
    });

    const latestData = Array.from(latestDataByTrust.values());

    // Calculate benchmark metrics
    const metrics: { [metric: string]: any } = {};
    const metricPaths = [
      'rtt_data.trust_total.percent_within_18_weeks',
      'ae_data.four_hour_performance_pct',
      'diagnostics_data.mri_scans.six_week_breaches'
    ];

    metricPaths.forEach(metricPath => {
      const values = latestData
        .map(record => this.extractMetricValue(record, metricPath))
        .filter(val => val !== null) as number[];

      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const bestIndex = metricPath.includes('breaches') ? 0 : values.length - 1;

        metrics[metricPath] = {
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          median: values[Math.floor(values.length / 2)],
          percentile_25: values[Math.floor(values.length * 0.25)],
          percentile_75: values[Math.floor(values.length * 0.75)],
          best_performing_trust: {
            code: latestData.find(record =>
              this.extractMetricValue(record, metricPath) === values[bestIndex]
            )?.trust_code || '',
            name: latestData.find(record =>
              this.extractMetricValue(record, metricPath) === values[bestIndex]
            )?.trust_name || '',
            value: values[bestIndex]
          }
        };
      }
    });

    return {
      icb_code: icbCode,
      icb_name: icbName,
      trust_count: trustCount,
      metrics
    };
  }

  async getTrendAnalysis(trustCode: string, metric: string): Promise<TrendData> {
    const metrics = await this.getTrustMetrics(trustCode);

    const dataPoints = metrics.map(record => ({
      period: record.period,
      value: this.extractMetricValue(record, metric) || 0,
      target: this.getTargetValue(metric)
    }));

    // Simple trend analysis
    const values = dataPoints.map(dp => dp.value);
    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    let rateOfChange = 0;

    if (values.length > 1) {
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      rateOfChange = ((lastValue - firstValue) / firstValue) * 100;

      if (Math.abs(rateOfChange) > 1) {
        direction = rateOfChange > 0 ? 'improving' : 'declining';
      }
    }

    return {
      trust_code: trustCode,
      metric,
      data_points: dataPoints,
      trend_analysis: {
        direction,
        rate_of_change: rateOfChange,
        correlation_coefficient: this.calculateCorrelation(values),
        seasonal_pattern: false // Simplified for now
      }
    };
  }

  private extractMetricValue(record: TrustMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let value: any = record;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return typeof value === 'number' ? value : null;
  }

  private getTargetValue(metric: string): number | undefined {
    // Standard NHS targets
    const targets: { [key: string]: number } = {
      'rtt_data.trust_total.percent_within_18_weeks': 92,
      'ae_data.four_hour_performance_pct': 95,
      'diagnostics_data.mri_scans.six_week_breaches': 1
    };

    return targets[metric];
  }

  private calculateCorrelation(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const meanX = indices.reduce((sum, val) => sum + val, 0) / n;
    const meanY = values.reduce((sum, val) => sum + val, 0) / n;

    const numerator = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const denomX = Math.sqrt(indices.reduce((sum, x) => sum + (x - meanX) ** 2, 0));
    const denomY = Math.sqrt(values.reduce((sum, y) => sum + (y - meanY) ** 2, 0));

    return denomX && denomY ? numerator / (denomX * denomY) : 0;
  }

  // Performance and cache management methods
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getCacheStats(): { size: number; hitRate: number } {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (this.metrics.cacheHits / totalRequests) * 100 : 0
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[Supabase] Cache cleared');
  }

  // Connection health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const startTime = performance.now();

    try {
      const { data, error } = await this.client
        .from('trust_metrics')
        .select('trust_code')
        .limit(1);

      const latency = performance.now() - startTime;

      if (error) {
        return { status: 'unhealthy', latency };
      }

      return { status: 'healthy', latency };
    } catch (error) {
      const latency = performance.now() - startTime;
      return { status: 'unhealthy', latency };
    }
  }
}

export const nhsDatabase = new NHSDatabaseClient();
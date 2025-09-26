'use client';

import { useState, useEffect } from 'react';

// Force dynamic rendering for this page since it accesses environment variables
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { nhsDatabase } from '@/lib/supabase-client';
import { useNHSData, useTrustMetrics, useLatestTrustMetrics } from '@/hooks/useNHSData';
import { TrustSelectorHeader } from '@/components/dashboard/trust-selector';
import { OverviewKPICards } from '@/components/dashboard/overview-kpi-cards';
import { RTTPerformanceChart } from '@/components/charts/rtt-performance-chart';
import { AEPerformanceChart } from '@/components/charts/ae-performance-chart';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

export default function TestIntegrationPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Database Connection', status: 'pending', message: 'Not started' },
    { name: 'Get All Trusts', status: 'pending', message: 'Not started' },
    { name: 'Get Trust Metrics (RGT)', status: 'pending', message: 'Not started' },
    { name: 'JSONB Structure Validation', status: 'pending', message: 'Not started' },
    { name: 'Hook Integration Test', status: 'pending', message: 'Not started' },
    { name: 'Component Integration Test', status: 'pending', message: 'Not started' }
  ]);

  const [selectedTrust, setSelectedTrust] = useState<string>('RGT');
  const [testData, setTestData] = useState<any>(null);

  // Test hooks
  const { trusts, isLoading: trustsLoading, error: trustsError } = useNHSData();
  const { metrics: trustMetrics, isLoading: metricsLoading, error: metricsError } = useTrustMetrics(selectedTrust);
  const { metrics: latestMetrics, isLoading: latestLoading, error: latestError } = useLatestTrustMetrics(selectedTrust);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTest = async (index: number, testFunction: () => Promise<any>) => {
    const startTime = Date.now();
    updateTest(index, { status: 'running', message: 'Running...' });

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      updateTest(index, {
        status: 'success',
        message: 'Passed',
        details: result,
        duration
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTest(index, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      throw error;
    }
  };

  const runAllTests = async () => {
    try {
      // Test 1: Database Connection
      await runTest(0, async () => {
        // Check environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key || url === 'test_url' || key === 'test_key') {
          throw new Error('Supabase environment variables not configured properly');
        }

        // Test basic connection by attempting a simple query
        const trusts = await nhsDatabase.getAllTrusts();
        return { connectionTest: 'passed', environmentCheck: 'configured' };
      });

      // Test 2: Get All Trusts
      const trustsResult = await runTest(1, async () => {
        const trusts = await nhsDatabase.getAllTrusts();

        if (!Array.isArray(trusts)) {
          throw new Error('getAllTrusts did not return an array');
        }

        if (trusts.length === 0) {
          throw new Error('No trusts found in database');
        }

        const expectedTrustCount = 151;
        const actualCount = trusts.length;

        return {
          trustCount: actualCount,
          expectedCount: expectedTrustCount,
          matchesExpected: actualCount === expectedTrustCount,
          sampleTrusts: trusts.slice(0, 5).map(t => ({ code: t.code, name: t.name }))
        };
      });

      // Test 3: Get Trust Metrics for RGT
      const rgtResult = await runTest(2, async () => {
        const metrics = await nhsDatabase.getTrustMetrics('RGT');

        if (!Array.isArray(metrics)) {
          throw new Error('getTrustMetrics did not return an array');
        }

        if (metrics.length === 0) {
          throw new Error('No metrics found for RGT');
        }

        const latestMetric = metrics[metrics.length - 1];

        return {
          recordCount: metrics.length,
          latestPeriod: latestMetric.period,
          trustName: latestMetric.trust_name,
          hasRTTData: !!latestMetric.rtt_data,
          hasAEData: !!latestMetric.ae_data,
          hasDiagnosticsData: !!latestMetric.diagnostics_data
        };
      });

      // Test 4: JSONB Structure Validation
      await runTest(3, async () => {
        const latestMetric = await nhsDatabase.getLatestTrustMetrics('RGT');

        if (!latestMetric) {
          throw new Error('No latest metrics found for RGT');
        }

        const validation = {
          rttData: {
            exists: !!latestMetric.rtt_data,
            hasTrustTotal: !!latestMetric.rtt_data?.trust_total,
            hasSpecialties: !!latestMetric.rtt_data?.specialties,
            trustTotalCompliance: latestMetric.rtt_data?.trust_total?.percent_within_18_weeks,
            specialtyCount: latestMetric.rtt_data?.specialties ? Object.keys(latestMetric.rtt_data.specialties).length : 0
          },
          aeData: {
            exists: !!latestMetric.ae_data,
            fourHourPerformance: latestMetric.ae_data?.four_hour_performance_pct,
            totalAttendances: latestMetric.ae_data?.total_attendances
          },
          diagnosticsData: {
            exists: !!latestMetric.diagnostics_data,
            testTypes: latestMetric.diagnostics_data ? Object.keys(latestMetric.diagnostics_data).length : 0
          },
          capacityData: {
            exists: !!latestMetric.capacity_data,
            virtualWardOccupancy: latestMetric.capacity_data?.virtual_ward_occupancy_rate
          }
        };

        // Validate structure matches TypeScript types
        const structureValid =
          validation.rttData.exists &&
          validation.aeData.exists &&
          typeof validation.rttData.trustTotalCompliance === 'number' &&
          typeof validation.aeData.fourHourPerformance === 'number';

        if (!structureValid) {
          throw new Error('JSONB structure does not match expected TypeScript types');
        }

        return validation;
      });

      // Test 5: Hook Integration
      await runTest(4, async () => {
        // This test relies on the hook states
        const hookResults = {
          trustsHook: {
            loading: trustsLoading,
            error: trustsError,
            trustCount: trusts.length,
            hasData: trusts.length > 0
          },
          metricsHook: {
            loading: metricsLoading,
            error: metricsError,
            recordCount: trustMetrics.length,
            hasData: trustMetrics.length > 0
          },
          latestMetricsHook: {
            loading: latestLoading,
            error: latestError,
            hasData: !!latestMetrics
          }
        };

        if (trustsError || metricsError || latestError) {
          throw new Error(`Hook errors: ${[trustsError, metricsError, latestError].filter(Boolean).join(', ')}`);
        }

        return hookResults;
      });

      // Test 6: Component Integration
      await runTest(5, async () => {
        // Test that components can render with the data
        const componentTest = {
          trustSelectorReady: trusts.length > 0,
          kpiCardsReady: trustMetrics.length > 0,
          chartsReady: trustMetrics.length > 0,
          latestDataAvailable: !!latestMetrics
        };

        const allReady = Object.values(componentTest).every(Boolean);

        if (!allReady) {
          throw new Error('Not all components have required data');
        }

        return componentTest;
      });

      setTestData({ trustsResult, rgtResult });

    } catch (error) {
      console.error('Test suite failed:', error);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'running': return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-600';
      case 'running': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Integration Tests</h1>
          <p className="text-slate-600">
            Comprehensive testing of Supabase integration and component functionality
          </p>
        </div>
        <Button onClick={runAllTests} disabled={tests.some(t => t.status === 'running')}>
          Run All Tests
        </Button>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <div className="font-medium">{test.name}</div>
                  <div className={`text-sm ${getStatusColor(test.status)}`}>
                    {test.message}
                    {test.duration && ` (${test.duration}ms)`}
                  </div>
                </div>
              </div>
              {test.details && (
                <Badge variant="outline">
                  View Details
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Environment Check */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Supabase URL:</span>
              <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http') ? 'default' : 'destructive'}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Supabase Key:</span>
              <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'default' : 'destructive'}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Missing'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Component Integration Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Trust Selector Test */}
          <div>
            <h3 className="font-semibold mb-2">Trust Selector</h3>
            <TrustSelectorHeader />
          </div>

          {/* KPI Cards Test */}
          {trustMetrics.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">KPI Cards</h3>
              <OverviewKPICards trustData={trustMetrics} />
            </div>
          )}

          {/* Charts Test */}
          {trustMetrics.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>RTT Performance Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <RTTPerformanceChart data={trustMetrics} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>A&E Performance Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <AEPerformanceChart data={trustMetrics} />
                </CardContent>
              </Card>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Raw Data Preview */}
      {latestMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Metrics Sample (RGT)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify({
                trust_code: latestMetrics.trust_code,
                trust_name: latestMetrics.trust_name,
                period: latestMetrics.period,
                rtt_data_sample: latestMetrics.rtt_data?.trust_total,
                ae_data_sample: latestMetrics.ae_data,
                diagnostics_keys: latestMetrics.diagnostics_data ? Object.keys(latestMetrics.diagnostics_data) : []
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
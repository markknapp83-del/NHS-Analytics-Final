'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTrustMetrics } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { Activity, Clock, Users, AlertTriangle, TrendingUp, TrendingDown, Stethoscope } from 'lucide-react';
import { AEPerformanceChart } from '@/components/charts/ae-performance-chart';
import { DiagnosticsSummaryChart } from '@/components/charts/diagnostics-summary-chart';
import { EnhancedKPICard } from '@/components/dashboard/enhanced-kpi-card';
import { calculateTrend, findPreviousMonthData } from '@/lib/trend-calculator';

export default function OperationalPage() {
  const [selectedTrust] = useTrustSelection();
  const { metrics: trustData, isLoading } = useTrustMetrics(selectedTrust);

  // All hooks must be called before any conditional returns
  const aeData = useMemo(() => {
    // Find the latest record that has A&E data
    const latestDataWithAE = [...trustData].reverse().find(record =>
      record.ae_4hr_performance_pct !== null &&
      record.ae_4hr_performance_pct !== undefined &&
      record.ae_attendances_total !== null &&
      record.ae_attendances_total !== undefined
    );

    // Find previous record with A&E data for trend calculation
    const reversedData = [...trustData].reverse();
    const latestIndex = latestDataWithAE ? reversedData.findIndex(record => record.period === latestDataWithAE.period) : -1;
    const previousDataWithAE = latestIndex >= 0 ? reversedData.slice(latestIndex + 1).find(record =>
      record.ae_4hr_performance_pct !== null &&
      record.ae_4hr_performance_pct !== undefined &&
      record.ae_attendances_total !== null &&
      record.ae_attendances_total !== undefined
    ) : null;

    return { latest: latestDataWithAE, previous: previousDataWithAE };
  }, [trustData]);

  const previousMonthData = aeData.previous;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!trustData.length) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Operational Data Available</h3>
          <p className="text-slate-600">
            No operational performance data found for the selected trust.
          </p>
        </div>
      </div>
    );
  }

  const latestData = aeData.latest || trustData[trustData.length - 1];
  const previousData = aeData.previous;


  // Diagnostics types - simplified list based on common NHS diagnostics
  const diagnosticTypes = [
    { key: 'mri', name: 'MRI' },
    { key: 'ct', name: 'CT Scan' },
    { key: 'ultrasound', name: 'Ultrasound' },
    { key: 'nuclear_medicine', name: 'Nuclear Medicine' },
    { key: 'echocardiography', name: 'Echocardiography' },
    { key: 'gastroscopy', name: 'Gastroscopy' },
    { key: 'colonoscopy', name: 'Colonoscopy' },
    { key: 'cystoscopy', name: 'Cystoscopy' }
  ];


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operational Performance</h1>
          <p className="text-slate-600">
            Emergency department and diagnostic service performance analysis
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Data: {new Date(latestData.period).toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
          })}
        </Badge>
      </div>

      {/* A&E Performance Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Emergency Department Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedKPICard
            title="A&E 4-hour Performance"
            value={latestData.ae_4hr_performance_pct || 0}
            previousValue={previousMonthData?.ae_4hr_performance_pct}
            symbol={Clock}
            format="percentage"
            target={95}
            description="Target: 95%"
            trend={previousMonthData ? calculateTrend(
              latestData.ae_4hr_performance_pct || 0,
              previousMonthData.ae_4hr_performance_pct || 0,
              true
            ) : undefined}
          />

          <EnhancedKPICard
            title="Total Attendances"
            value={latestData.ae_attendances_total || 0}
            previousValue={previousMonthData?.ae_attendances_total}
            symbol={Users}
            format="number"
            description="Monthly attendances"
            trend={previousMonthData ? calculateTrend(
              latestData.ae_attendances_total || 0,
              previousMonthData.ae_attendances_total || 0,
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="Over 4 Hours"
            value={latestData.ae_over_4hrs_total || 0}
            previousValue={previousMonthData?.ae_over_4hrs_total}
            symbol={AlertTriangle}
            format="number"
            description="Breached 4-hour target"
            trend={previousMonthData ? calculateTrend(
              latestData.ae_over_4hrs_total || 0,
              previousMonthData.ae_over_4hrs_total || 0,
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="Emergency Admissions"
            value={latestData.ae_emergency_admissions_total || 0}
            previousValue={previousMonthData?.ae_emergency_admissions_total}
            symbol={Activity}
            format="number"
            description="Admitted via A&E"
            trend={previousMonthData ? calculateTrend(
              latestData.ae_emergency_admissions_total || 0,
              previousMonthData.ae_emergency_admissions_total || 0,
              false
            ) : undefined}
          />
        </div>
      </div>

      {/* A&E Performance Detail */}
      <Card>
        <CardHeader>
          <CardTitle>A&E Performance Analysis</CardTitle>
          <CardDescription>Detailed breakdown of emergency department metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">4-hour Performance</span>
                  <span className="text-sm text-slate-600">
                    {latestData.ae_4hr_performance_pct?.toFixed(1)}% / 95% target
                  </span>
                </div>
                <Progress
                  value={Math.min(latestData.ae_4hr_performance_pct || 0, 100)}
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">12-hour Wait Admissions</span>
                  <span className="text-sm text-slate-600">
                    {latestData.ae_12hr_wait_admissions?.toLocaleString() || '0'}
                  </span>
                </div>
                <Badge variant={
                  (latestData.ae_12hr_wait_admissions || 0) === 0 ? 'default' : 'destructive'
                }>
                  {(latestData.ae_12hr_wait_admissions || 0) === 0 ? 'Target Met' : 'Action Required'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Services Performance</CardTitle>
          <CardDescription>Waiting times and breach analysis across diagnostic tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diagnosticTypes.map((type) => {
              const totalWaiting = (latestData as any)[`diag_${type.key}_total_waiting`] as number;
              const sixWeekBreaches = (latestData as any)[`diag_${type.key}_6week_breaches`] as number;
              const thirteenWeekBreaches = (latestData as any)[`diag_${type.key}_13week_breaches`] as number;

              if (!totalWaiting || totalWaiting === 0) {
                return (
                  <div key={type.key} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-500">{type.name}</h4>
                      <p className="text-sm text-slate-400">No data available</p>
                    </div>
                  </div>
                );
              }

              const breachRate = ((sixWeekBreaches || 0) / totalWaiting) * 100;
              const performanceLevel = breachRate < 1 ? 'excellent' : breachRate < 5 ? 'good' : breachRate < 15 ? 'concern' : 'critical';

              return (
                <div key={type.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex-1">
                    <h4 className="font-medium">{type.name}</h4>
                    <p className="text-sm text-slate-600">
                      {totalWaiting.toLocaleString()} total waiting
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm text-slate-600">6+ weeks</p>
                        <p className="font-semibold text-orange-600">
                          {sixWeekBreaches?.toLocaleString() || '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">13+ weeks</p>
                        <p className="font-semibold text-red-600">
                          {thirteenWeekBreaches?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      performanceLevel === 'excellent' ? 'default' :
                      performanceLevel === 'good' ? 'secondary' :
                      performanceLevel === 'concern' ? 'outline' : 'destructive'
                    }>
                      {breachRate.toFixed(1)}% breach rate
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>A&E Performance Trend</CardTitle>
            <CardDescription>4-hour performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <AEPerformanceChart data={trustData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnostics Overview</CardTitle>
            <CardDescription>Waiting list summary by test type</CardDescription>
          </CardHeader>
          <CardContent>
            <DiagnosticsSummaryChart data={trustData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
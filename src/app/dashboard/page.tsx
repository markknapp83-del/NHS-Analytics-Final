'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTrustMetrics } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { AlertTriangle } from 'lucide-react';
import { RTTPerformanceChart } from '@/components/charts/rtt-performance-chart';
import { CommunityTrendsChart } from '@/components/charts/community-trends-chart';
import { OverviewKPICards } from '@/components/dashboard/overview-kpi-cards';
import { DiagnosticBreachBreakdownChart } from '@/components/charts/diagnostic-breach-breakdown-chart';
import { PageTitle, PageDescription } from '@/components/ui/typography';
import { CriticalIssuesPanel } from '@/components/dashboard/critical-issues-panel';

export default function OverviewPage() {
  const [selectedTrust] = useTrustSelection();
  const { metrics: trustData, isLoading } = useTrustMetrics(selectedTrust);

  // Filter data to only include entries with some meaningful data
  const filteredData = useMemo(() => {
    return trustData.filter(data =>
      data.rtt_data || data.diagnostics_data || data.ae_data || data.community_health_data
    );
  }, [trustData]);

  // Find the latest data entry that actually has some data
  const latestDataWithSomeData = useMemo(() => {
    for (let i = filteredData.length - 1; i >= 0; i--) {
      const data = filteredData[i];
      if (data && (data.rtt_data || data.diagnostics_data || data.ae_data || data.community_health_data)) {
        return data;
      }
    }
    return null;
  }, [filteredData]);


  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!filteredData.length) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-slate-600">
            No performance data found for the selected trust. Please select a different trust or check data availability.
          </p>
        </div>
      </div>
    );
  }

  const latestData = latestDataWithSomeData;

  return (
    <div className="p-6 space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <PageTitle>Performance Overview</PageTitle>
          <PageDescription>
            Comprehensive trust health dashboard with meaningful metrics across RTT, diagnostics, procurement activity, and community health data
          </PageDescription>
        </div>
        {latestData && (
          <Badge variant="outline" className="text-sm">
            Latest Data: {new Date(latestData.period).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric'
            })}
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <OverviewKPICards trustData={filteredData} />

      {/* Middle Section: RTT Performance + Critical Issues Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: RTT Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>RTT Performance Trend</CardTitle>
            <CardDescription>18-week compliance over time with 92% NHS standard</CardDescription>
          </CardHeader>
          <CardContent>
            <RTTPerformanceChart data={filteredData} />
          </CardContent>
        </Card>

        {/* Right: Critical Issues Alert */}
        <CriticalIssuesPanel trustData={filteredData} />
      </div>

      {/* Bottom Section: Community Services + Diagnostic Services Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Community Services Waiting Lists */}
        <Card>
          <CardHeader>
            <CardTitle>Community Services Waiting Lists</CardTitle>
            <CardDescription>Total patients waiting by major service over time</CardDescription>
          </CardHeader>
          <CardContent>
            <CommunityTrendsChart data={filteredData} />
          </CardContent>
        </Card>

        {/* Right: Diagnostic Services Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Services Breakdown</CardTitle>
            <CardDescription>
              6+ and 13+ week breach categories across diagnostic services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DiagnosticBreachBreakdownChart data={filteredData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
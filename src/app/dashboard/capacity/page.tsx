'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTrustMetrics } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { Building2, Bed, Users, Activity, Clock, Stethoscope, BarChart3 } from 'lucide-react';
import { AEPerformanceTrendChart } from '@/components/charts/ae-performance-trend-chart';
import { VirtualWardChart } from '@/components/charts/virtual-ward-chart';
import { FlowCorrelationChart } from '@/components/charts/flow-correlation-chart';
import { DischargePatternChart } from '@/components/charts/discharge-pattern-chart';
import { EnhancedKPICard } from '@/components/dashboard/enhanced-kpi-card';
import { calculateTrend, findPreviousMonthData } from '@/lib/trend-calculator';

export default function CapacityFlowPage() {
  const [selectedTrust] = useTrustSelection();
  const { metrics: trustData, isLoading } = useTrustMetrics(selectedTrust);

  // All hooks must be called before any conditional returns
  const previousMonthVWData = useMemo(() => {
    return findPreviousMonthData(trustData);
  }, [trustData]);

  const previousMonthAEData = useMemo(() => {
    return findPreviousMonthData(trustData);
  }, [trustData]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
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
          <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-slate-600">
            No capacity data found for the selected trust.
          </p>
        </div>
      </div>
    );
  }

  // Find the latest record that has A&E data
  const latestDataWithAE = [...trustData].reverse().find(record =>
    record.ae_data?.four_hour_performance_pct !== null &&
    record.ae_data?.four_hour_performance_pct !== undefined &&
    record.ae_data?.total_attendances !== null &&
    record.ae_data?.total_attendances !== undefined
  );

  // Find the latest record that has Virtual Ward data
  const latestDataWithVW = [...trustData].reverse().find(record =>
    record.capacity_data?.virtual_ward_occupancy_rate !== null &&
    record.capacity_data?.virtual_ward_occupancy_rate !== undefined &&
    record.capacity_data?.virtual_ward_capacity !== null &&
    record.capacity_data?.virtual_ward_capacity !== undefined
  );

  const latestAEData = latestDataWithAE || trustData[trustData.length - 1];
  const latestVWData = latestDataWithVW || trustData[trustData.length - 1];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Capacity & Flow Intelligence</h1>
          <p className="text-slate-600">
            Emergency department performance, virtual ward utilization, and patient flow analytics
          </p>
        </div>
      </div>

      {/* Virtual Ward KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Virtual Ward Capacity</h2>
          <Badge variant="outline" className="text-sm">
            Latest Data: {new Date(latestVWData.period).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric'
            })}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EnhancedKPICard
            title="Virtual Ward Beds"
            value={latestVWData.capacity_data?.virtual_ward_capacity || 0}
            previousValue={previousMonthVWData?.capacity_data?.virtual_ward_capacity}
            symbol={Bed}
            format="number"
            description="Total virtual ward capacity"
            trend={previousMonthVWData ? calculateTrend(
              latestVWData.capacity_data?.virtual_ward_capacity || 0,
              previousMonthVWData?.capacity_data?.virtual_ward_capacity || 0,
              true
            ) : undefined}
          />

          <EnhancedKPICard
            title="VW Occupancy Rate"
            value={(latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * 100}
            previousValue={previousMonthVWData ? (previousMonthVWData?.capacity_data?.virtual_ward_occupancy_rate || 0) * 100 : undefined}
            symbol={BarChart3}
            format="percentage"
            target={85}
            description="Virtual ward utilization"
            trend={previousMonthVWData ? calculateTrend(
              (latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * 100,
              (previousMonthVWData?.capacity_data?.virtual_ward_occupancy_rate || 0) * 100,
              true
            ) : undefined}
          />

          <EnhancedKPICard
            title="Occupied Beds"
            value={Math.round((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * (latestVWData.virtual_ward_capacity || 0))}
            previousValue={previousMonthVWData ? Math.round((previousMonthVWData?.capacity_data?.virtual_ward_occupancy_rate || 0) * (previousMonthVWData?.capacity_data?.virtual_ward_capacity || 0)) : undefined}
            symbol={Activity}
            format="number"
            description="Currently occupied virtual ward beds"
            trend={previousMonthVWData ? calculateTrend(
              Math.round((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * (latestVWData.virtual_ward_capacity || 0)),
              Math.round((previousMonthVWData?.capacity_data?.virtual_ward_occupancy_rate || 0) * (previousMonthVWData?.capacity_data?.virtual_ward_capacity || 0)),
              false
            ) : undefined}
          />
        </div>
      </div>

      {/* Virtual Ward Utilization Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Ward Utilization</CardTitle>
          <CardDescription>Current capacity utilization and efficiency metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Occupancy Rate</span>
                  <span className="text-sm text-slate-600">
                    {((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * 100).toFixed(1)}% / 85% optimal
                  </span>
                </div>
                <Progress
                  value={Math.min((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * 100, 100)}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Bed Utilization</span>
                  <span className="text-sm text-slate-600">
                    {Math.round((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * (latestVWData.virtual_ward_capacity || 0))} occupied
                  </span>
                </div>
                <div className="text-2xl font-bold text-[#005eb8]">
                  {latestVWData.virtual_ward_capacity || 0} total beds
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-1">Available Beds</h4>
                {(() => {
                  const availableBeds = Math.round((latestVWData.virtual_ward_capacity || 0) * (1 - (latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0)));
                  const isOverCapacity = availableBeds < 0;

                  return (
                    <div>
                      <p className={`text-xl font-bold ${isOverCapacity ? 'text-red-600' : 'text-green-600'}`}>
                        {isOverCapacity ? Math.abs(availableBeds) : availableBeds}
                      </p>
                      {isOverCapacity && (
                        <p className="text-xs text-red-600 font-medium mt-1">
                          beds over capacity
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-1">Occupied Beds</h4>
                <p className="text-xl font-bold text-blue-600">
                  {Math.round((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * (latestVWData.virtual_ward_capacity || 0))}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-1">Utilization Rate</h4>
                <p className="text-xl font-bold text-purple-600">
                  {((latestVWData.capacity_data?.virtual_ward_occupancy_rate || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discharge Patterns */}
        <Card>
          <CardHeader>
            <CardTitle>Discharge Efficiency</CardTitle>
            <CardDescription>Daily discharge patterns and capacity turnover</CardDescription>
          </CardHeader>
          <CardContent>
            <DischargePatternChart data={trustData} />
          </CardContent>
        </Card>

        {/* Virtual Ward Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Virtual Ward Utilization</CardTitle>
            <CardDescription>Occupancy rate and efficiency metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <VirtualWardChart data={trustData} />
          </CardContent>
        </Card>
      </div>

      {/* A&E Performance KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Emergency Department Performance</h2>
          <Badge variant="outline" className="text-sm">
            Latest Data: {new Date(latestAEData.period).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric'
            })}
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedKPICard
            title="4-Hour Performance"
            value={latestAEData.ae_data?.four_hour_performance_pct || 0}
            previousValue={previousMonthAEData?.ae_data?.four_hour_performance_pct}
            symbol={Clock}
            format="percentage"
            target={95}
            description="4-hour A&E standard"
            trend={previousMonthAEData ? calculateTrend(
              latestAEData.ae_data?.four_hour_performance_pct || 0,
              previousMonthAEData.ae_4hr_performance_pct || 0,
              true
            ) : undefined}
          />

          <EnhancedKPICard
            title="Total Attendances"
            value={latestAEData.ae_data?.total_attendances || 0}
            previousValue={previousMonthAEData?.ae_data?.total_attendances}
            symbol={Users}
            format="number"
            description="Monthly A&E attendances"
            trend={previousMonthAEData ? calculateTrend(
              latestAEData.ae_data?.total_attendances || 0,
              previousMonthAEData.ae_attendances_total || 0,
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="Over 4 Hours"
            value={latestAEData.ae_data?.over_four_hours_total || 0}
            previousValue={previousMonthAEData?.ae_data?.over_four_hours_total}
            symbol={Clock}
            format="number"
            description="Patients breaching 4-hour target"
            trend={previousMonthAEData ? calculateTrend(
              latestAEData.ae_data?.over_four_hours_total || 0,
              previousMonthAEData.ae_over_4hrs_total || 0,
              false
            ) : undefined}
          />

          <EnhancedKPICard
            title="12-Hour Waits"
            value={latestAEData.ae_data?.twelve_hour_wait_admissions || 0}
            previousValue={previousMonthAEData?.ae_data?.twelve_hour_wait_admissions}
            symbol={Stethoscope}
            format="number"
            target={0}
            description="12-hour wait admissions"
            trend={previousMonthAEData ? calculateTrend(
              latestAEData.ae_data?.twelve_hour_wait_admissions || 0,
              previousMonthAEData.ae_12hr_wait_admissions || 0,
              false
            ) : undefined}
          />
        </div>
      </div>

      {/* A&E Performance Trend - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>A&E Performance Trend</CardTitle>
          <CardDescription>4-hour performance over time with 95% NHS standard</CardDescription>
        </CardHeader>
        <CardContent>
          <AEPerformanceTrendChart data={trustData} />
        </CardContent>
      </Card>
    </div>
  );
}
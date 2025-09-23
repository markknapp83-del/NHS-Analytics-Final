'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrustMetrics } from '@/types/database';
import { Clock, AlertTriangle, Activity, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICard {
  title: string;
  value: number | undefined;
  previousValue?: number;
  target?: number;
  format: 'percentage' | 'number';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  getStatus: (value: number) => 'excellent' | 'good' | 'concern' | 'critical' | 'no-data';
}

export function OverviewKPICards({ trustData }: { trustData: TrustMetrics[] }) {
  // Find the latest record that has A&E data for accurate performance metrics
  const latestDataWithAE = [...trustData].reverse().find(record =>
    record.ae_data?.four_hour_performance_pct !== null &&
    record.ae_data?.four_hour_performance_pct !== undefined &&
    record.ae_data?.total_attendances !== null &&
    record.ae_data?.total_attendances !== undefined
  );

  const latestData = latestDataWithAE || trustData[trustData.length - 1];

  // Find previous record with A&E data for trend calculation
  const reversedData = [...trustData].reverse();
  const latestIndex = latestDataWithAE ? reversedData.findIndex(record => record.period === latestDataWithAE.period) : -1;
  const previousDataWithAE = latestIndex >= 0 ? reversedData.slice(latestIndex + 1).find(record =>
    record.ae_data?.four_hour_performance_pct !== null &&
    record.ae_data?.four_hour_performance_pct !== undefined &&
    record.ae_data?.total_attendances !== null &&
    record.ae_data?.total_attendances !== undefined
  ) : null;

  const previousData = previousDataWithAE;

  // Calculate critical diagnostics from JSONB data
  const criticalDiagnostics = useMemo(() => {
    if (!latestData?.diagnostics_data) {
      return { count: 0, services: [] };
    }

    let criticalCount = 0;
    const criticalServices: string[] = [];

    Object.entries(latestData.diagnostics_data).forEach(([testType, data]) => {
      if (data.total_waiting > 0) {
        const breachRate = (data.six_week_breaches / data.total_waiting) * 100;
        if (breachRate > 15) {
          criticalCount++;
          criticalServices.push(testType);
        }
      }
    });

    return { count: criticalCount, services: criticalServices };
  }, [latestData]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === null || previous === undefined) {
      return { change: 0, direction: 'neutral' as const };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      change: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' as const
    };
  };

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const kpiCards: KPICard[] = [
    {
      title: "RTT 18-week Compliance",
      value: latestData?.rtt_data?.trust_total?.percent_within_18_weeks,
      previousValue: previousData?.rtt_data?.trust_total?.percent_within_18_weeks,
      target: 92,
      format: "percentage",
      description: "Target: 92%",
      icon: Clock,
      getStatus: (value: number) => value >= 92 ? 'excellent' : value >= 75 ? 'good' : value >= 50 ? 'concern' : 'critical'
    },
    {
      title: "Critical Diagnostics",
      value: criticalDiagnostics.count,
      previousValue: undefined, // No trend for count
      target: 0,
      format: "number",
      description: `${criticalDiagnostics.count} services above 15% breach rate`,
      icon: AlertTriangle,
      getStatus: (value: number) => value === 0 ? 'excellent' : value <= 2 ? 'concern' : 'critical'
    },
    {
      title: "A&E 4-hour Performance",
      value: latestData?.ae_data?.four_hour_performance_pct,
      previousValue: previousData?.ae_data?.four_hour_performance_pct,
      target: 95,
      format: "percentage",
      description: "Target: 95%",
      icon: Activity,
      getStatus: (value: number) => !value ? 'no-data' : value >= 95 ? 'excellent' : value >= 85 ? 'good' : value >= 70 ? 'concern' : 'critical'
    },
    {
      title: "Capacity Utilization",
      value: latestData?.capacity_data?.virtual_ward_occupancy_rate,
      previousValue: previousData?.capacity_data?.virtual_ward_occupancy_rate,
      target: 85,
      format: "percentage",
      description: "Virtual Ward occupancy - Target: 85%",
      icon: Building2,
      getStatus: (value: number) => !value ? 'no-data' : value <= 90 && value >= 80 ? 'excellent' : value <= 95 ? 'good' : 'critical'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'concern': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'no-data': return 'text-slate-400';
      default: return 'text-slate-900';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-100 text-green-700 border-green-200">Excellent</Badge>;
      case 'good': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Good</Badge>;
      case 'concern': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">Concern</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'no-data': return <Badge variant="outline" className="text-slate-500">No Data</Badge>;
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiCards.map((kpi) => {
        const status = kpi.value !== undefined && kpi.value !== null ? kpi.getStatus(kpi.value) : 'no-data';
        const trend = (kpi.previousValue !== null && kpi.previousValue !== undefined && kpi.value !== null && kpi.value !== undefined) ? calculateTrend(kpi.value, kpi.previousValue) : null;
        const colorClass = getStatusColor(status);

        return (
          <Card key={kpi.title} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <kpi.icon className={`h-6 w-6 ${colorClass}`} />
                {getStatusBadge(status)}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">{kpi.title}</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${colorClass}`}>
                    {kpi.value !== undefined && kpi.value !== null
                      ? kpi.format === 'percentage'
                        ? `${kpi.value.toFixed(1)}%`
                        : kpi.value.toLocaleString()
                      : '—'
                    }
                  </p>
                  {trend && (
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={trend.direction as 'up' | 'down' | 'neutral'} />
                      <span className="text-sm text-slate-600">
                        {trend.change.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">{kpi.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
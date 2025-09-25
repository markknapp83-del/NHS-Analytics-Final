'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CancerData } from '@/types/cancer';
import { Target, Clock, Zap, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CancerKPICardsProps {
  currentData: CancerData;
  previousData?: CancerData | null;
  selectedCancerType?: string;
}

interface KPICard {
  title: string;
  value: number | undefined;
  previousValue?: number;
  target: number;
  format: 'percentage' | 'number';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  getStatus: (value: number, target: number) => 'excellent' | 'good' | 'concern' | 'critical' | 'no-data';
}

export function CancerKPICards({ currentData, previousData, selectedCancerType = 'all' }: CancerKPICardsProps) {
  const calculateTrend = (current: number, previous: number) => {
    if (previous === null || previous === undefined) {
      return { change: 0, direction: 'neutral' as const };
    }
    const change = current - previous;
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

  const getPerformanceStatus = (value: number, target: number) => {
    if (value >= target) return 'excellent';
    if (value >= target - 5) return 'good';
    if (value >= target - 10) return 'concern';
    return 'critical';
  };

  // Get data for selected cancer type or all cancer types
  const getCancerTypeData = (data: CancerData, cancerType: string) => {
    if (cancerType === 'all') {
      return {
        overall_performance: data.metadata.overall_performance_weighted,
        day_62_performance: data.standards['62_day_combined'].summary.performance_pct,
        day_28_performance: data.standards['28_day_fds'].summary.performance_pct,
        total_treated: data.metadata.total_patients_treated_all_standards
      };
    } else {
      // Get specific cancer type data
      const type62 = data.standards['62_day_combined'].by_cancer_type[cancerType];
      const type28 = data.standards['28_day_fds'].by_cancer_type[cancerType];
      const type31 = data.standards['31_day_combined'].by_cancer_type[cancerType];

      // Calculate weighted performance for this cancer type
      const totalTreated = (type28?.total_treated || 0) + (type31?.total_treated || 0) + (type62?.total_treated || 0);
      const totalWithinStandard = (type28?.within_standard || 0) + (type31?.within_standard || 0) + (type62?.within_standard || 0);
      const overallPerformance = totalTreated > 0 ? (totalWithinStandard / totalTreated) * 100 : 0;

      return {
        overall_performance: overallPerformance,
        day_62_performance: type62?.performance_pct || 0,
        day_28_performance: type28?.performance_pct || 0,
        total_treated: totalTreated
      };
    }
  };

  const currentCancerData = getCancerTypeData(currentData, selectedCancerType);
  const previousCancerData = previousData ? getCancerTypeData(previousData, selectedCancerType) : null;

  const kpiCards: KPICard[] = [
    {
      title: selectedCancerType === 'all' ? "Overall Cancer Performance" : "Cancer Type Performance",
      value: currentCancerData.overall_performance,
      previousValue: previousCancerData?.overall_performance,
      target: 85,
      format: "percentage",
      description: selectedCancerType === 'all' ? "Weighted average across all standards" : "Weighted performance for selected cancer type",
      icon: Target,
      getStatus: getPerformanceStatus
    },
    {
      title: "62-Day Standard Performance",
      value: currentCancerData.day_62_performance,
      previousValue: previousCancerData?.day_62_performance,
      target: 85,
      format: "percentage",
      description: "Urgent referral to treatment (Target: 85%)",
      icon: Clock,
      getStatus: getPerformanceStatus
    },
    {
      title: "28-Day Faster Diagnosis",
      value: currentCancerData.day_28_performance,
      previousValue: previousCancerData?.day_28_performance,
      target: 75,
      format: "percentage",
      description: "Faster diagnosis standard (Target: 75%)",
      icon: Zap,
      getStatus: getPerformanceStatus
    },
    {
      title: selectedCancerType === 'all' ? "Total Patients Treated" : "Patients Treated (This Type)",
      value: currentCancerData.total_treated,
      previousValue: previousCancerData?.total_treated,
      target: 0,
      format: "number",
      description: selectedCancerType === 'all' ? "Across all cancer pathways" : "For selected cancer type",
      icon: Users,
      getStatus: () => 'no-data' // No performance target for patient count
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'concern': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'no-data': return 'text-slate-600';
      default: return 'text-slate-900';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-100 text-green-700 border-green-200">Above Target</Badge>;
      case 'good': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Near Target</Badge>;
      case 'concern': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">Below Target</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'no-data': return <Badge variant="outline" className="text-slate-500">Volume Metric</Badge>;
      default: return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((kpi) => {
        const status = kpi.value !== undefined && kpi.value !== null
          ? kpi.getStatus(kpi.value, kpi.target)
          : 'no-data';
        const trend = (
          kpi.previousValue !== null &&
          kpi.previousValue !== undefined &&
          kpi.value !== null &&
          kpi.value !== undefined
        ) ? calculateTrend(kpi.value, kpi.previousValue) : null;
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
                  {trend && kpi.format === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={trend.direction} />
                      <span className="text-sm text-slate-600">
                        {trend.change.toFixed(1)}pp
                      </span>
                    </div>
                  )}
                  {trend && kpi.format === 'number' && (
                    <div className="flex items-center gap-1">
                      <TrendIcon direction={trend.direction} />
                      <span className="text-sm text-slate-600">
                        {trend.change.toLocaleString()}
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
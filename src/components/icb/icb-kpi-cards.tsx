'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Clock, Users, AlertTriangle } from 'lucide-react';
import { ICBMetrics } from '@/hooks/useICBData';

interface ICBKPICardsProps {
  icbMetrics: ICBMetrics;
}

export function ICBKPICards({ icbMetrics }: ICBKPICardsProps) {
  const getRTTStatusColor = (compliance: number) => {
    if (compliance >= 92) return 'text-green-600';
    if (compliance >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRTTBadgeVariant = (compliance: number): 'default' | 'secondary' | 'destructive' => {
    if (compliance >= 92) return 'default';
    if (compliance >= 80) return 'secondary';
    return 'destructive';
  };

  const getAEStatusColor = (performance: number) => {
    if (performance >= 95) return 'text-green-600';
    if (performance >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAEBadgeVariant = (performance: number): 'default' | 'secondary' | 'destructive' => {
    if (performance >= 95) return 'default';
    if (performance >= 85) return 'secondary';
    return 'destructive';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Average RTT Compliance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average RTT Compliance</CardTitle>
          <Clock className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getRTTStatusColor(icbMetrics.avgRTTCompliance)}`}>
            {icbMetrics.avgRTTCompliance.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant={getRTTBadgeVariant(icbMetrics.avgRTTCompliance)}>
              Target: 92%
            </Badge>
            {icbMetrics.avgRTTCompliance >= 92 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Across {icbMetrics.trustCount} trusts
          </p>
        </CardContent>
      </Card>

      {/* Total 52+ Week Waiters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total 52+ Week Waiters</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatNumber(icbMetrics.total52WeekBreaches)}
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="destructive">
              Critical
            </Badge>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Patients waiting 52+ weeks
          </p>
        </CardContent>
      </Card>

      {/* Total Waiting List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Waiting List</CardTitle>
          <Users className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {formatNumber(icbMetrics.totalWaitingList)}
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant="outline">
              Incomplete Pathways
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Total patients awaiting treatment
          </p>
        </CardContent>
      </Card>

      {/* Average A&E Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average A&E Performance</CardTitle>
          <Clock className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getAEStatusColor(icbMetrics.avgAEPerformance)}`}>
            {icbMetrics.avgAEPerformance.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2">
            <Badge variant={getAEBadgeVariant(icbMetrics.avgAEPerformance)}>
              Target: 95%
            </Badge>
            {icbMetrics.avgAEPerformance >= 95 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            4-hour wait target performance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
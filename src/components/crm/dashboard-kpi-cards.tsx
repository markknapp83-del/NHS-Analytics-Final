'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Building2, TrendingUp, Target, Percent, ArrowUp, ArrowDown } from 'lucide-react';
import { useDashboardKPIs } from '@/hooks/use-dashboard-kpis';
import { formatCurrency, formatPercentage } from '@/lib/crm-stage-utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  className?: string;
}

function KPICard({ title, value, subtitle, icon, trend, className = '' }: KPICardProps) {
  return (
    <Card className={`${className} hover:shadow-md transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="text-sm text-muted-foreground">{subtitle}</div>

          {trend && (
            <div className="flex items-center gap-1 pt-2">
              {trend.isPositive ? (
                <ArrowUp className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.value} {trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardKPICards() {
  const { kpis, isLoading } = useDashboardKPIs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Four equal-width KPI cards across the top - matching Analytics Overview layout */}
      <KPICard
        title="Active NHS Trusts"
        value={kpis.activeTrusts.count.toString()}
        subtitle="Trusts with active contracts"
        icon={<Building2 className="h-5 w-5 text-primary" />}
        trend={
          kpis.activeTrusts.trend > 0
            ? {
                value: kpis.activeTrusts.trend,
                label: 'new this quarter',
                isPositive: true,
              }
            : undefined
        }
      />

      <KPICard
        title="Open Opportunities"
        value={formatCurrency(kpis.openOpportunities.value)}
        subtitle={`${kpis.openOpportunities.count} active deals in pipeline`}
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
      />

      <KPICard
        title="Monthly Target"
        value={formatCurrency(kpis.monthlyTarget.achieved)}
        subtitle={`Target: ${formatCurrency(kpis.monthlyTarget.target)} (${Math.round(
          kpis.monthlyTarget.percentage
        )}%)`}
        icon={<Target className="h-5 w-5 text-primary" />}
        trend={{
          value: Math.round(kpis.monthlyTarget.percentage),
          label: 'of target',
          isPositive: kpis.monthlyTarget.percentage >= 50,
        }}
      />

      <KPICard
        title="Conversion Rate"
        value={formatPercentage(kpis.conversionRate.rate)}
        subtitle={`${kpis.conversionRate.won} won out of ${kpis.conversionRate.total} closed this quarter`}
        icon={<Percent className="h-5 w-5 text-primary" />}
        trend={
          kpis.conversionRate.total > 0
            ? {
                value: kpis.conversionRate.won,
                label: `opportunities won`,
                isPositive: kpis.conversionRate.rate >= 30,
              }
            : undefined
        }
      />
    </div>
  );
}

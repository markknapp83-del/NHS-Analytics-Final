'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Target, DollarSign, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getMarketActivitySummary } from '@/lib/queries/tender-queries';
import { cn } from '@/lib/utils';

interface MarketActivityCardProps {
  trustCode: string;
}

export function MarketActivityCard({ trustCode }: MarketActivityCardProps) {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['market-activity', trustCode],
    queryFn: () => getMarketActivitySummary(trustCode),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) return <MarketActivitySkeleton />;
  if (error) return <MarketActivityError />;
  if (!data) return <MarketActivitySkeleton />;

  const handleClick = () => {
    router.push(`/tenders?trust=${trustCode}&tab=insourcing`);
  };

  // Determine border color based on insourcing opportunities
  const getBorderClass = () => {
    if (data.insourcingOpportunities >= 4) {
      return 'border-green-500 hover:border-green-600';
    }
    if (data.insourcingOpportunities >= 1) {
      return 'border-blue-500 hover:border-blue-600';
    }
    return 'border-slate-300 hover:border-slate-400';
  };

  // Format currency in millions
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    }
    return `£${value.toFixed(0)}`;
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg border-2',
        getBorderClass(),
        data.insourcingOpportunities >= 4 && 'animate-pulse-border'
      )}
      onClick={handleClick}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600">Market Activity</h3>
          <DollarSign className="h-5 w-5 text-blue-600" />
        </div>

        {/* Active Procurements */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-slate-900">
            {data.totalActiveProcurements}
          </div>
          <div className="text-sm text-slate-500">
            Active Procurements
          </div>
          <div className="text-sm font-medium text-slate-700">
            {formatCurrency(data.totalValue)} Total Value
          </div>
        </div>

        {/* Insourcing Opportunities */}
        <div className={cn(
          'p-3 rounded-lg border-2',
          data.insourcingOpportunities > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-slate-50 border-slate-200'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-slate-700">
              {data.insourcingOpportunities} Insourcing Opportunities
            </span>
          </div>
          <div className="text-sm text-slate-600 ml-6">
            {formatCurrency(data.insourcingValue)} Value
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          {data.trendPercentage >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span className={cn(
            'text-sm font-medium',
            data.trendPercentage >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {data.trendPercentage >= 0 ? '+' : ''}{data.trendPercentage.toFixed(1)}%
          </span>
          <span className="text-sm text-slate-500">vs. last quarter</span>
        </div>

        {/* Call to Action */}
        <div className="text-center pt-2">
          <span className="text-sm text-blue-600 font-medium hover:underline">
            View All Tenders →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketActivitySkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </CardContent>
    </Card>
  );
}

export function MarketActivityError() {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <h3 className="text-sm font-semibold text-red-900">Error Loading Data</h3>
        </div>
        <p className="text-sm text-red-700">
          Failed to load market activity data. Please try again later.
        </p>
      </CardContent>
    </Card>
  );
}

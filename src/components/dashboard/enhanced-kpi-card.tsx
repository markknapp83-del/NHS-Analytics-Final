'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  symbol?: LucideIcon;
  target?: number;
  format?: 'number' | 'percentage' | 'currency';
  description?: string;
  trend?: {
    change: number;
    direction: 'up' | 'down' | 'stable';
    isPositive: boolean;
  } | null;
}

export function EnhancedKPICard({
  title,
  value,
  previousValue,
  symbol: Symbol,
  target,
  format = 'number',
  description,
  trend
}: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `£${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  const getValueColor = () => {
    if (typeof value !== 'number' || !target) return 'text-slate-900';

    const ratio = value / target;
    if (format === 'percentage') {
      if (value >= target) return 'text-green-600';
      if (value >= target * 0.8) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (ratio <= 1) return 'text-green-600';
      if (ratio <= 1.2) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-slate-600';
    return trend.isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {Symbol && <Symbol className="h-5 w-5 text-[#005eb8] transition-transform group-hover:scale-110" />}
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{title}</span>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs font-medium">
                {Math.abs(trend.change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className={`text-3xl font-bold ${getValueColor()}`}>
            {formatValue(value)}
          </div>

          {target && (
            <Badge
              variant={typeof value === 'number' && value >= target ? 'default' : 'secondary'}
              className="text-xs"
            >
              Target: {formatValue(target)}
            </Badge>
          )}

          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
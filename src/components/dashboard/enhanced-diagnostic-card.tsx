import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { DiagnosticService } from '@/types/nhs-data';
import { getBreachLevel, calculateOpportunityScore } from '@/lib/diagnostic-intelligence';
import { cn } from '@/lib/utils';

export function EnhancedDiagnosticCard({
  service,
  data,
  isSelected = false
}: {
  service: DiagnosticService;
  data: DiagnosticService;
  isSelected?: boolean;
}) {
  const breachLevel = getBreachLevel(data.breachRate);
  const opportunityScore = calculateOpportunityScore(data.totalWaiting, data.breachRate);

  // Determine background color based on breach level
  const getBackgroundColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH CONCERN':
        return 'bg-red-50 border-red-200';
      case 'MODERATE':
        return 'bg-amber-50 border-amber-200';
      case 'GOOD':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <Card className={cn(
      "p-4 hover:shadow-md transition-all duration-200",
      getBackgroundColor(breachLevel.label),
      isSelected && "ring-2 ring-[#005eb8]"
    )}>
      <div className="flex items-center gap-4">
        {/* Service Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-lg">{service.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={breachLevel.variant} className="text-xs">
              {breachLevel.label}
            </Badge>
            {opportunityScore > 50 && (
              <Badge variant="outline" className="text-xs">
                🎯 High Opportunity
              </Badge>
            )}
          </div>
        </div>

        {/* Total Waiting */}
        <div className="flex-shrink-0 text-center space-y-1">
          <div className="text-xl font-bold text-slate-800">
            {data.totalWaiting.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600">total waiting</div>
        </div>

        {/* 6+ Week Breaches */}
        <div className="flex-shrink-0 text-center space-y-1">
          <div className="text-xl font-bold text-orange-600">
            {data.sixWeekBreaches.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600">6+ week waits</div>
        </div>

        {/* Breach Rate - Primary Metric */}
        <div className="flex-shrink-0 text-center space-y-1">
          <div className={`text-2xl font-bold ${breachLevel.textColor}`}>
            {data.breachRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-600">breach rate</div>
        </div>

        {/* Selection Indicator */}
        <div className="flex-shrink-0 w-6">
          {isSelected && (
            <CheckCircle className="h-5 w-5 text-[#005eb8]" />
          )}
        </div>
      </div>
    </Card>
  );
}
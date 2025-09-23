import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { InteractiveSpecialtyData } from '@/types/nhs-data';
import { getPerformanceLevel } from '@/lib/specialty-data-processor';
import { cn } from '@/lib/utils';

export function InteractiveSpecialtyCard({
  specialty,
  rank,
  isSelected,
  onClick
}: {
  specialty: InteractiveSpecialtyData;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const performanceLevel = getPerformanceLevel(specialty.percentage);

  // Determine background color based on performance level
  const getBackgroundColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-50 border-red-200';
      case 'Concern': return 'bg-amber-50 border-amber-200';
      case 'Good': return 'bg-green-50 border-green-200';
      case 'Excellent': return 'bg-green-50 border-green-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
        getBackgroundColor(performanceLevel.label),
        isSelected && "ring-2 ring-[#005eb8]"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Rank Number (no colored circle) */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-700">
            {rank}
          </div>
        </div>

        {/* Specialty Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-lg">{specialty.name}</h4>
          <p className="text-sm text-slate-600">Code: {specialty.code}</p>
        </div>

        {/* Performance Metrics */}
        <div className="flex-shrink-0 text-center space-y-1">
          <div className="text-2xl font-bold">{specialty.percentage.toFixed(1)}%</div>
          <Badge variant={performanceLevel.variant}>
            {performanceLevel.label}
          </Badge>
        </div>

        {/* Patient Numbers */}
        <div className="flex-shrink-0 text-right space-y-1">
          <div className="text-sm font-medium">
            {specialty.within18weeks?.toLocaleString()} of {specialty.total?.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">within 18 weeks</div>
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
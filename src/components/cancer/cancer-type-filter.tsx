'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, FilterX } from 'lucide-react';
import { CancerData, CANCER_TYPE_DISPLAY_NAMES } from '@/types/cancer';

interface CancerTypeFilterProps {
  data: CancerData;
  selectedCancerType: string;
  onCancerTypeChange: (cancerType: string) => void;
}

export function CancerTypeFilter({ data, selectedCancerType, onCancerTypeChange }: CancerTypeFilterProps) {
  // Extract all available cancer types with their performance data
  const getAvailableCancerTypes = () => {
    const cancerTypes: Array<{
      key: string;
      name: string;
      totalTreated: number;
      performance62Day: number;
    }> = [];

    // Get cancer types from the 62-day combined standard (most comprehensive data)
    Object.entries(data.standards['62_day_combined'].by_cancer_type).forEach(([key, typeData]) => {
      // Exclude aggregated and invalid entries
      if (!['all_cancers', 'missing_invalid'].includes(key) && typeData.total_treated > 0) {
        cancerTypes.push({
          key,
          name: CANCER_TYPE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          totalTreated: typeData.total_treated,
          performance62Day: typeData.performance_pct
        });
      }
    });

    return cancerTypes.sort((a, b) => b.totalTreated - a.totalTreated); // Sort by volume
  };

  const availableCancerTypes = getAvailableCancerTypes();
  const selectedCancerTypeData = availableCancerTypes.find(c => c.key === selectedCancerType);

  // Check if any filters are active
  const hasActiveFilters = selectedCancerType !== 'all';

  // Clear all filters function
  const clearAllFilters = () => {
    onCancerTypeChange('all');
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border">
      <div className="flex items-center gap-4">
        {/* Cancer Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Cancer Type:</span>
          <Select value={selectedCancerType} onValueChange={onCancerTypeChange}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="All Cancer Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cancer Types</SelectItem>

              {availableCancerTypes.map(cancerType => (
                <SelectItem key={cancerType.key} value={cancerType.key}>
                  <div className="flex items-center justify-between w-full">
                    <span>{cancerType.name}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-slate-500">
                        {cancerType.totalTreated.toLocaleString()} treated
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        cancerType.performance62Day >= 85
                          ? 'bg-green-100 text-green-700'
                          : cancerType.performance62Day >= 70
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {cancerType.performance62Day.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear All Filters Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
          className={`flex items-center gap-2 transition-opacity ${
            hasActiveFilters
              ? 'text-slate-600 hover:text-slate-900 border-slate-300 opacity-100'
              : 'text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
          }`}
        >
          <FilterX className="h-4 w-4" />
          Clear Filter
        </Button>
      </div>

      {/* Active filter badges */}
      <div className="flex items-center gap-2">
        {selectedCancerType !== 'all' && selectedCancerTypeData && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <span>{selectedCancerTypeData.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onCancerTypeChange('all')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {selectedCancerType !== 'all' && selectedCancerTypeData && (
          <div className="text-xs text-slate-500 flex items-center gap-4">
            <span>{selectedCancerTypeData.totalTreated.toLocaleString()} patients treated</span>
            <span>62-day performance:
              <span className={`ml-1 font-semibold ${
                selectedCancerTypeData.performance62Day >= 85
                  ? 'text-green-600'
                  : selectedCancerTypeData.performance62Day >= 70
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}>
                {selectedCancerTypeData.performance62Day.toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
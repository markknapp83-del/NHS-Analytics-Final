'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useNHSData } from '@/hooks/use-nhs-data';

interface AdvancedFiltersProps {
  filters: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
}

export function AdvancedFilters({ filters, onChange }: AdvancedFiltersProps) {
  const { getAllTrusts } = useNHSData();
  const trusts = getAllTrusts();

  const updateFilter = (key: string, value: any) => {
    onChange({
      ...filters,
      [key]: value
    });
  };

  // Get unique ICB names
  const icbNames = Array.from(new Set(trusts.map(t => t.icb).filter(Boolean))).sort();

  return (
    <div className="space-y-4">
      {/* ICB Filter */}
      <div>
        <Label className="text-sm font-medium">Filter by ICB</Label>
        <Select
          value={filters.icb || ''}
          onValueChange={(value) => updateFilter('icb', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All ICBs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All ICBs</SelectItem>
            {icbNames.map(icb => (
              <SelectItem key={icb} value={icb}>
                {icb}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Performance Threshold Filter */}
      <div>
        <Label className="text-sm font-medium">RTT Performance Threshold (%)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.rttMin || ''}
            onChange={(e) => updateFilter('rttMin', e.target.value)}
            className="w-20"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.rttMax || ''}
            onChange={(e) => updateFilter('rttMax', e.target.value)}
            className="w-20"
          />
        </div>
      </div>

      {/* Exclude Zero Values */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Exclude Zero Values</Label>
        <Switch
          checked={filters.excludeZeros || false}
          onCheckedChange={(checked) => updateFilter('excludeZeros', checked)}
        />
      </div>

      {/* Show Outliers Only */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Show Statistical Outliers Only</Label>
        <Switch
          checked={filters.outliersOnly || false}
          onCheckedChange={(checked) => updateFilter('outliersOnly', checked)}
        />
      </div>

      {/* Minimum Sample Size */}
      <div>
        <Label className="text-sm font-medium">Minimum Data Points</Label>
        <Input
          type="number"
          placeholder="3"
          value={filters.minSampleSize || ''}
          onChange={(e) => updateFilter('minSampleSize', e.target.value)}
          className="w-20"
        />
      </div>
    </div>
  );
}
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin } from 'lucide-react';
import { useICBData } from '@/hooks/useICBData';

interface ICBSelectorProps {
  selectedICB: string | null;
  onICBSelect: (icbCode: string) => void;
}

export function ICBSelector({ selectedICB, onICBSelect }: ICBSelectorProps) {
  const { allICBs, isLoading } = useICBData();

  const selectedICBData = allICBs.find(icb => icb.code === selectedICB);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005eb8] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading ICB data...</p>
        </div>
      </div>
    );
  }

  if (selectedICB && selectedICBData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#005eb8]" />
              <div>
                <CardTitle className="text-lg">{selectedICBData.name}</CardTitle>
                <CardDescription>Code: {selectedICBData.code}</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onICBSelect('')}
              className="text-sm"
            >
              Change ICB
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Building2 className="h-3 w-3 mr-1" />
              {selectedICBData.trustCount} NHS Trusts
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Select an Integrated Care Board</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Choose an ICB to view detailed performance analysis, trust breakdowns, and regional benchmarking data.
        </p>
      </div>

      {/* ICB Selector */}
      <div className="max-w-md mx-auto">
        <Select value={selectedICB || ""} onValueChange={onICBSelect}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Select an ICB..." />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {allICBs.map((icb) => (
              <SelectItem key={icb.code} value={icb.code}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{icb.name}</span>
                  <span className="text-xs text-slate-500">
                    Code: {icb.code} • {icb.trustCount} trusts
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ICB Preview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allICBs.slice(0, 8).map((icb) => (
          <Card
            key={icb.code}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onICBSelect(icb.code)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium leading-tight">
                {icb.name.length > 50 ? `${icb.name.substring(0, 50)}...` : icb.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Code: {icb.code}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {icb.trustCount} trusts
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action */}
      <div className="text-center py-6 border-t">
        <p className="text-sm text-slate-600">
          Use the dropdown above to search through all {allICBs.length} ICBs or click on a preview card to get started.
        </p>
      </div>
    </div>
  );
}
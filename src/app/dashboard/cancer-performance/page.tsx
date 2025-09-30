'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { useCancerData } from '@/hooks/use-cancer-data';
import { Activity, AlertTriangle } from 'lucide-react';
import { CancerKPICards } from '@/components/cancer/cancer-kpi-cards';
import { CancerTypeFilter } from '@/components/cancer/cancer-type-filter';
import { CancerStandardsChart } from '@/components/charts/cancer-standards-chart';
import { CancerByTypeChart } from '@/components/charts/cancer-by-type-chart';
import { CancerTrendChart } from '@/components/charts/cancer-trend-chart';
import { CancerBreachesChart } from '@/components/charts/cancer-breaches-chart';
import { CancerPerformanceTable } from '@/components/cancer/cancer-performance-table';

export default function CancerPerformancePage() {
  const [selectedTrust] = useTrustSelection();
  const [selectedCancerType, setSelectedCancerType] = useState<string>('all');
  const { data: cancerData, isLoading, error } = useCancerData(selectedTrust);

  const latestQuarter = useMemo(() => {
    if (!cancerData.length) return null;
    return cancerData[cancerData.length - 1];
  }, [cancerData]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-red-700">Error Loading Cancer Data</h3>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!cancerData.length || !latestQuarter) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Cancer Performance Data Available
            </h3>
            <p className="text-sm text-slate-600">
              This trust has not reported cancer waiting times data for the available quarters.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Cancer data is published every 6 months by NHS England
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatQuarterLabel = (period: string) => {
    const [year, quarter] = period.split('-');
    return `${quarter} ${year}`;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cancer Performance Analysis</h1>
          <p className="text-slate-600">Comprehensive cancer waiting times performance</p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {formatQuarterLabel(latestQuarter.period)}
        </Badge>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="analysis">Cancer Type Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Cancer Type Filter */}
          <CancerTypeFilter
            data={latestQuarter}
            selectedCancerType={selectedCancerType}
            onCancerTypeChange={setSelectedCancerType}
          />

          {/* KPI Cards */}
          <CancerKPICards
            currentData={latestQuarter}
            previousData={cancerData.length > 1 ? cancerData[cancerData.length - 2] : null}
            selectedCancerType={selectedCancerType}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CancerStandardsChart
              data={latestQuarter}
              selectedCancerType={selectedCancerType}
            />
            <CancerByTypeChart
              data={latestQuarter}
              selectedCancerType={selectedCancerType}
              onCancerTypeClick={setSelectedCancerType}
            />
            <CancerTrendChart
              data={cancerData}
              selectedCancerType={selectedCancerType}
            />
            <CancerBreachesChart
              data={latestQuarter}
              selectedCancerType={selectedCancerType}
            />
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Cancer Type Performance Table */}
          <CancerPerformanceTable data={latestQuarter} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
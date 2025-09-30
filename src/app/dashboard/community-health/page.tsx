'use client';

import { useState } from 'react';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { useTrustMetrics } from '@/hooks/useNHSData';
import { CommunityKPICards } from '@/components/community/community-kpi-cards';
import { CommunityServiceFilter, getOriginalServiceKey, getCategoryFromKey } from '@/components/community/community-service-filter';
import { ServicePerformanceTable } from '@/components/community/service-performance-table';
import { CommunityWaitingListChart } from '@/components/charts/community-waiting-list-chart';
import { CommunityWaitBandsChart } from '@/components/charts/community-wait-bands-chart';
import { CommunityTopServicesChart } from '@/components/charts/community-top-services-chart';
import { CommunityBreachesTrendChart } from '@/components/charts/community-breaches-trend-chart';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommunityHealthPage() {
  const [selectedTrust] = useTrustSelection();
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { metrics, isLoading, error } = useTrustMetrics(selectedTrust);

  // Convert prefixed service key to original format for data access
  const getDataAccessKey = (prefixedKey: string) => {
    if (prefixedKey === 'all') return 'all';
    return getOriginalServiceKey(prefixedKey);
  };

  // Get the actual data key for chart components
  const dataServiceKey = getDataAccessKey(selectedService);

  // Helper function to get category filter key for data access
  const getCategoryFilter = (category: string) => {
    if (category === 'Adult') return 'adult_services';
    if (category === 'CYP') return 'cyp_services';
    return 'all';
  };

  const dataCategoryKey = getCategoryFilter(selectedCategory);

  // Filter for only records with community health data
  const communityMetrics = metrics.filter(m => m.community_health_data !== null);
  const latestData = communityMetrics[communityMetrics.length - 1];
  const previousData = communityMetrics[communityMetrics.length - 2];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Community Health Services</h1>
          <p className="text-slate-600">Waiting list analysis and service performance metrics</p>
        </div>

        {/* Loading state */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Community Health Services</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">
                  Failed to Load Community Health Data
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedTrust) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Community Health Services</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Select a Trust
            </h3>
            <p className="text-sm text-slate-600">
              Please select a trust from the dropdown to view community health services data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!latestData || !latestData.community_health_data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Community Health Services</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Community Health Data Available
            </h3>
            <p className="text-sm text-slate-600">
              This trust has not reported community health services data for the selected period.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community Health Services</h1>
          <p className="text-slate-600">Waiting list analysis and service performance metrics</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Latest Data: {new Date(latestData.period).toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
          })}
        </Badge>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="services">Services Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Service Filter */}
          <CommunityServiceFilter
            data={latestData.community_health_data}
            selectedService={selectedService}
            selectedCategory={selectedCategory}
            onServiceChange={setSelectedService}
            onCategoryChange={setSelectedCategory}
          />

          {/* KPI Cards */}
          <CommunityKPICards
            data={latestData.community_health_data}
            previousData={previousData?.community_health_data || undefined}
            selectedService={dataServiceKey}
            selectedCategory={dataCategoryKey}
          />

          {/* Charts Grid (2x2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommunityWaitingListChart
              data={communityMetrics}
              selectedService={dataServiceKey}
              selectedCategory={dataCategoryKey}
            />
            <CommunityWaitBandsChart
              data={latestData.community_health_data}
              selectedService={dataServiceKey}
              selectedCategory={dataCategoryKey}
            />
            <CommunityTopServicesChart
              data={latestData.community_health_data}
              selectedService={dataServiceKey}
              selectedCategory={dataCategoryKey}
              onServiceClick={setSelectedService}
            />
            <CommunityBreachesTrendChart
              data={communityMetrics}
              selectedService={dataServiceKey}
              selectedCategory={dataCategoryKey}
            />
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {/* Service Performance Table */}
          <ServicePerformanceTable
            data={latestData.community_health_data}
            previousData={previousData?.community_health_data || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
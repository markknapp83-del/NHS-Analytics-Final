'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ICBKPICards } from './icb-kpi-cards';
import { TrustBreakdown } from './trust-breakdown';
import { useSelectedICB } from '@/hooks/useICBData';
import { ICBRTTPerformanceChart } from './charts/icb-rtt-performance-chart';
import { ICBWaitingListChart } from './charts/icb-waiting-list-chart';
import { ICBWaitTimeChart } from './charts/icb-wait-time-chart';
import { ICBBreachBreakdownChart } from './charts/icb-breach-breakdown-chart';

interface ICBOverviewTabProps {
  selectedICB: string | null;
  onICBSelect: (icbCode: string) => void;
}

export function ICBOverviewTab({ selectedICB, onICBSelect }: ICBOverviewTabProps) {
  const icbData = useSelectedICB(selectedICB);

  // Show loading state if no ICB data is available yet
  if (!selectedICB) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-600">No ICB Selected</div>
          <div className="text-sm text-slate-500 mt-2">Please select an ICB from the dropdown above</div>
        </div>
      </div>
    );
  }

  if (!icbData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-600">Loading ICB Data...</div>
          <div className="text-sm text-slate-500 mt-2">Please wait while we prepare the dashboard for {selectedICB}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <ICBKPICards icbMetrics={icbData} />

      {/* Sub-tabs for detailed analysis */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="trusts">Trust Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Performance Trends - Real charts with ICB data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <ICBRTTPerformanceChart icbMetrics={icbData} />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <ICBWaitingListChart icbMetrics={icbData} />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <ICBWaitTimeChart icbMetrics={icbData} />
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <ICBBreachBreakdownChart icbMetrics={icbData} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trusts">
          <TrustBreakdown icbMetrics={icbData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
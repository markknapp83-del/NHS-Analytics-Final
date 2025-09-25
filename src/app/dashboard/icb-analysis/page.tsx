'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ICBOverviewTab } from '@/components/icb/icb-overview-tab';
import { ICBRankingsTab } from '@/components/icb/icb-rankings-tab';
import { ICBMapTab } from '@/components/icb/icb-map-tab';
import { useICBSelection } from './layout';

export default function ICBAnalysisPage() {
  const { selectedICB, onICBSelect } = useICBSelection();
  const [activeTab, setActiveTab] = useState('overview');

  const handleICBSelect = (icbCode: string) => {
    onICBSelect(icbCode);
    // Auto-switch to overview tab when ICB is selected
    if (icbCode && activeTab !== 'overview') {
      setActiveTab('overview');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ICB Analysis</h1>
          <p className="text-slate-600">Integrated Care Board performance analysis and regional intelligence</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">ICB Overview</TabsTrigger>
          <TabsTrigger value="rankings">Performance Rankings</TabsTrigger>
          <TabsTrigger value="map">Regional Map</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ICBOverviewTab
            selectedICB={selectedICB}
            onICBSelect={handleICBSelect}
          />
        </TabsContent>

        <TabsContent value="rankings">
          <ICBRankingsTab
            onICBSelect={(icbCode) => {
              handleICBSelect(icbCode);
              setActiveTab('overview');
            }}
          />
        </TabsContent>

        <TabsContent value="map">
          <ICBMapTab onSwitchTab={handleTabChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
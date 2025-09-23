'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNHSData, useTrustMetrics } from '@/hooks/useNHSData';
import { useTrustSelection } from '@/hooks/use-trust-selection';
import { MapPin, Building2, Users, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

export default function ICBAnalysisPage() {
  const { trusts: allTrusts } = useNHSData();
  const [selectedTrust] = useTrustSelection();
  const { metrics: trustData } = useTrustMetrics(selectedTrust);

  // Get ICB information for selected trust
  const currentTrustInfo = allTrusts.find(t => t.code === selectedTrust);
  const currentICB = currentTrustInfo?.icb || 'Unknown ICB';

  // Group trusts by ICB for analysis
  const icbGroups = useMemo(() => {
    const groups = new Map();
    allTrusts.forEach(trust => {
      if (trust.icb) {
        if (!groups.has(trust.icb)) {
          groups.set(trust.icb, []);
        }
        groups.get(trust.icb).push(trust);
      }
    });
    return groups;
  }, [allTrusts]);

  // Calculate performance data for all ICBs
  const icbPerformanceAnalysis = useMemo(() => {
    const latestPeriod = '2025-07-01';
    const icbData = Array.from(icbGroups.entries()).map(([icbName, trusts]) => {
      const trustsData = trusts.map((trust: { code: string, name: string, icb: string }) => {
        const data = getTrustData(trust.code);
        return data.find(d => d.period === latestPeriod);
      }).filter(Boolean);

      if (!trustsData.length) return null;

      const avgRTTCompliance = trustsData.reduce((sum: number, d: any) => sum + (d.trust_total_percent_within_18_weeks || 0), 0) / trustsData.length;

      return {
        name: icbName,
        trustCount: trusts.length,
        avgRTTCompliance,
        totalWaitingList: trustsData.reduce((sum: number, d: any) => sum + (d.trust_total_total_incomplete_pathways || 0), 0),
        total52PlusWaiters: trustsData.reduce((sum: number, d: any) => sum + (d.trust_total_total_52_plus_weeks || 0), 0)
      };
    }).filter(Boolean);

    // Sort by RTT compliance (worst first)
    return icbData.sort((a: any, b: any) => a.avgRTTCompliance - b.avgRTTCompliance);
  }, [icbGroups, getTrustData]);

  // Get performance data for current ICB
  const icbTrusts = icbGroups.get(currentICB) || [];
  const icbPerformanceData = useMemo(() => {
    if (!icbTrusts.length) return null;

    const latestPeriod = '2025-07-01';
    const trustsData = icbTrusts.map((trust: { code: string, name: string, icb: string }) => {
      const data = getTrustData(trust.code);
      return data.find(d => d.period === latestPeriod);
    }).filter(Boolean);

    if (!trustsData.length) return null;

    return {
      avgRTTCompliance: trustsData.reduce((sum: number, d: any) => sum + (d.trust_total_percent_within_18_weeks || 0), 0) / trustsData.length, // Already stored as percentage
      totalWaitingList: trustsData.reduce((sum: number, d: any) => sum + (d.trust_total_total_incomplete_pathways || 0), 0),
      total52PlusWaiters: trustsData.reduce((sum: number, d: any) => sum + (d.trust_total_total_52_plus_weeks || 0), 0),
      trustCount: icbTrusts.length
    };
  }, [icbTrusts, getTrustData]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ICB Regional Analysis</h1>
          <p className="text-slate-600">Integrated Care Board performance analysis and regional benchmarking</p>
        </div>
      </div>

      <Tabs defaultValue="icb-overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="icb-overview">ICB Overview</TabsTrigger>
          <TabsTrigger value="regional-comparison">Regional Comparison</TabsTrigger>
          <TabsTrigger value="trust-rankings">Trust Rankings</TabsTrigger>
          <TabsTrigger value="geographic-analysis">Geographic Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="icb-overview">
          <div className="space-y-6">
            {/* Current ICB Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {currentICB}
                </CardTitle>
                <CardDescription>
                  Performance overview for the current trust's Integrated Care Board
                </CardDescription>
              </CardHeader>
              <CardContent>
                {icbPerformanceData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Trusts in ICB</p>
                      <p className="text-2xl font-bold">{icbPerformanceData.trustCount}</p>
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        NHS Trusts
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Avg RTT Compliance</p>
                      <p className="text-2xl font-bold">
                        {icbPerformanceData.avgRTTCompliance.toFixed(1)}%
                      </p>
                      <Badge variant={icbPerformanceData.avgRTTCompliance >= 92 ? "default" : icbPerformanceData.avgRTTCompliance >= 80 ? "secondary" : "destructive"}>
                        Target: 92%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">Total Waiting List</p>
                      <p className="text-2xl font-bold">
                        {icbPerformanceData.totalWaitingList.toLocaleString()}
                      </p>
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        Patients
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">52+ Week Waiters</p>
                      <p className="text-2xl font-bold text-red-600">
                        {icbPerformanceData.total52PlusWaiters.toLocaleString()}
                      </p>
                      <Badge variant="destructive">
                        Critical
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">No performance data available for this ICB</p>
                )}
              </CardContent>
            </Card>

            {/* ICB Performance Analysis */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">ICB Performance Ranking</h3>
                <Badge variant="secondary" className="text-xs">
                  Ranked by RTT compliance (worst first)
                </Badge>
              </div>

              <div className="space-y-3">
                {icbPerformanceAnalysis.map((icb: any, index: number) => {
                  const getPerformanceLevel = (compliance: number) => {
                    if (compliance >= 92) return { label: 'Good', color: 'bg-green-50 border-green-200' };
                    if (compliance >= 75) return { label: 'Concern', color: 'bg-amber-50 border-amber-200' };
                    return { label: 'Critical', color: 'bg-red-50 border-red-200' };
                  };

                  const performanceLevel = getPerformanceLevel(icb.avgRTTCompliance);
                  const isCurrentICB = icb.name === currentICB;

                  return (
                    <Card
                      key={icb.name}
                      className={`p-4 transition-all duration-200 hover:shadow-md ${performanceLevel.color} ${isCurrentICB ? 'ring-2 ring-[#005eb8]' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank Number */}
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-700">
                            {index + 1}
                          </div>
                        </div>

                        {/* ICB Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-lg">
                            {icb.name.substring(0, 60)}{icb.name.length > 60 ? '...' : ''}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {icb.trustCount} trusts
                            </Badge>
                            {isCurrentICB && (
                              <Badge variant="default" className="text-xs">
                                Current ICB
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* RTT Compliance */}
                        <div className="flex-shrink-0 text-center space-y-1">
                          <div className="text-2xl font-bold text-slate-800">
                            {icb.avgRTTCompliance.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-600">RTT compliance</div>
                        </div>

                        {/* Total Waiting */}
                        <div className="flex-shrink-0 text-center space-y-1">
                          <div className="text-xl font-bold text-slate-800">
                            {icb.totalWaitingList.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">total waiting</div>
                        </div>

                        {/* 52+ Week Waiters */}
                        <div className="flex-shrink-0 text-center space-y-1">
                          <div className="text-xl font-bold text-red-600">
                            {icb.total52PlusWaiters.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">52+ week waiters</div>
                        </div>

                        {/* Performance Badge */}
                        <div className="flex-shrink-0">
                          <Badge variant={
                            performanceLevel.label === 'Good' ? 'default' :
                            performanceLevel.label === 'Concern' ? 'secondary' : 'destructive'
                          }>
                            {performanceLevel.label}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regional-comparison">
          <Card>
            <CardHeader>
              <CardTitle>Regional Comparison</CardTitle>
              <CardDescription>Coming soon - Compare performance across different ICBs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Regional Comparison Dashboard</h3>
                <p className="text-slate-600">
                  This feature will show comparative performance metrics across different ICBs
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trust-rankings">
          <Card>
            <CardHeader>
              <CardTitle>Trust Rankings</CardTitle>
              <CardDescription>Coming soon - Performance rankings within ICBs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Trust Rankings Dashboard</h3>
                <p className="text-slate-600">
                  This feature will rank trusts by performance within their ICB
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic-analysis">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Analysis</CardTitle>
              <CardDescription>Coming soon - Geographic performance visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Geographic Analysis Dashboard</h3>
                <p className="text-slate-600">
                  This feature will show performance data on a geographic map
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
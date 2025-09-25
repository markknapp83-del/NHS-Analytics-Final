'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { ICBMetrics } from '@/hooks/useICBData';
import { useTrustSelection } from '@/hooks/use-trust-selection';

interface TrustBreakdownProps {
  icbMetrics: ICBMetrics;
}

export function TrustBreakdown({ icbMetrics }: TrustBreakdownProps) {
  const [, setSelectedTrust] = useTrustSelection();
  const [sortBy, setSortBy] = useState<'rtt' | 'ae' | 'waiting' | 'name'>('rtt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'rtt' | 'ae' | 'waiting' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedTrusts = [...icbMetrics.trusts].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'rtt':
        comparison = a.latestRTT - b.latestRTT;
        break;
      case 'ae':
        comparison = a.latestAE - b.latestAE;
        break;
      case 'waiting':
        comparison = a.waitingList - b.waitingList;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getRTTStatusColor = (rtt: number) => {
    if (rtt >= 92) return 'text-green-600';
    if (rtt >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAEStatusColor = (ae: number) => {
    if (ae >= 95) return 'text-green-600';
    if (ae >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (rtt: number): 'default' | 'secondary' | 'destructive' => {
    if (rtt >= 92) return 'default';
    if (rtt >= 80) return 'secondary';
    return 'destructive';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const handleTrustSelect = (trustCode: string) => {
    setSelectedTrust(trustCode);
    // Navigate to trust analysis - this would typically use router.push
    console.log('Navigate to trust analysis for:', trustCode);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Trust Performance Breakdown
            </CardTitle>
            <CardDescription>
              Individual trust performance within {icbMetrics.name}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {icbMetrics.trustCount} NHS Trusts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="performance">Performance View</TabsTrigger>
            <TabsTrigger value="ranking">Rankings</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            {/* Sort Controls */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === 'rtt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('rtt')}
                className="text-xs"
              >
                RTT {sortBy === 'rtt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'ae' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('ae')}
                className="text-xs"
              >
                A&E {sortBy === 'ae' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'waiting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('waiting')}
                className="text-xs"
              >
                Waiting List {sortBy === 'waiting' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('name')}
                className="text-xs"
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </div>

            {/* Trust Cards */}
            <div className="space-y-3">
              {sortedTrusts.map((trust, index) => (
                <Card
                  key={trust.code}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleTrustSelect(trust.code)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    {sortBy !== 'name' && (
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-700 bg-slate-100 rounded">
                        {index + 1}
                      </div>
                    )}

                    {/* Trust Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm leading-tight">
                        {trust.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Code: {trust.code}
                      </p>
                    </div>

                    {/* RTT Performance */}
                    <div className="flex-shrink-0 text-center space-y-1">
                      <div className={`text-lg font-bold ${getRTTStatusColor(trust.latestRTT)}`}>
                        {trust.latestRTT.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-600">RTT</div>
                    </div>

                    {/* A&E Performance */}
                    <div className="flex-shrink-0 text-center space-y-1">
                      <div className={`text-lg font-bold ${getAEStatusColor(trust.latestAE)}`}>
                        {trust.latestAE.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-600">A&E</div>
                    </div>

                    {/* Waiting List */}
                    <div className="flex-shrink-0 text-center space-y-1">
                      <div className="text-lg font-bold text-slate-800">
                        {formatNumber(trust.waitingList)}
                      </div>
                      <div className="text-xs text-slate-600">waiting</div>
                    </div>

                    {/* Performance Badge */}
                    <div className="flex-shrink-0">
                      <Badge variant={getPerformanceBadge(trust.latestRTT)}>
                        {trust.latestRTT >= 92 ? 'Good' : trust.latestRTT >= 80 ? 'Concern' : 'Critical'}
                      </Badge>
                    </div>

                    {/* External Link */}
                    <div className="flex-shrink-0">
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ranking" className="space-y-4">
            {/* Performance Rankings */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">RTT Performance Rankings</h3>
              <div className="space-y-2">
                {[...icbMetrics.trusts]
                  .sort((a, b) => b.latestRTT - a.latestRTT)
                  .slice(0, 5)
                  .map((trust, index) => (
                  <div key={trust.code} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-white rounded">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{trust.name}</span>
                    </div>
                    <div className={`font-bold ${getRTTStatusColor(trust.latestRTT)}`}>
                      {trust.latestRTT.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">A&E Performance Rankings</h3>
              <div className="space-y-2">
                {[...icbMetrics.trusts]
                  .sort((a, b) => b.latestAE - a.latestAE)
                  .slice(0, 5)
                  .map((trust, index) => (
                  <div key={trust.code} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-bold bg-white rounded">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{trust.name}</span>
                    </div>
                    <div className={`font-bold ${getAEStatusColor(trust.latestAE)}`}>
                      {trust.latestAE.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
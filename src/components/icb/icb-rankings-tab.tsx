'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, TrendingDown, Search, Medal, Trophy, Award } from 'lucide-react';
import { useICBData, ICBMetrics } from '@/hooks/useICBData';

interface ICBRankingsTabProps {
  onICBSelect: (icbCode: string) => void;
}

export function ICBRankingsTab({ onICBSelect }: ICBRankingsTabProps) {
  const { icbMetrics, isLoading } = useICBData();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rtt' | 'waiting' | 'breaches' | 'ae' | 'name' | 'trusts'>('rtt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'rtt' | 'waiting' | 'breaches' | 'ae' | 'name' | 'trusts') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredAndSortedICBs = useMemo(() => {
    let filtered = icbMetrics.filter(icb =>
      icb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icb.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'rtt':
          comparison = a.avgRTTCompliance - b.avgRTTCompliance;
          break;
        case 'waiting':
          comparison = a.totalWaitingList - b.totalWaitingList;
          break;
        case 'breaches':
          comparison = a.total52WeekBreaches - b.total52WeekBreaches;
          break;
        case 'ae':
          comparison = a.avgAEPerformance - b.avgAEPerformance;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'trusts':
          comparison = a.trustCount - b.trustCount;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [icbMetrics, searchTerm, sortBy, sortOrder]);

  const getPerformanceScore = (icb: ICBMetrics): number => {
    // Composite performance score (0-100)
    const rttScore = Math.min(icb.avgRTTCompliance, 100);
    const aeScore = Math.min(icb.avgAEPerformance, 100);
    const breachPenalty = Math.min((icb.total52WeekBreaches / icb.totalWaitingList) * 100, 50);

    return Math.max(0, (rttScore * 0.5 + aeScore * 0.3) - breachPenalty * 0.2);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-50 border-green-200', badge: 'default' };
    if (score >= 60) return { label: 'Good', color: 'bg-blue-50 border-blue-200', badge: 'secondary' };
    if (score >= 40) return { label: 'Concern', color: 'bg-amber-50 border-amber-200', badge: 'secondary' };
    return { label: 'Critical', color: 'bg-red-50 border-red-200', badge: 'destructive' };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005eb8] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading ICB rankings...</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const topPerformer = [...icbMetrics].sort((a, b) => b.avgRTTCompliance - a.avgRTTCompliance)[0];
  const worstPerformer = [...icbMetrics].sort((a, b) => a.avgRTTCompliance - b.avgRTTCompliance)[0];
  const nationalAvgRTT = icbMetrics.reduce((sum, icb) => sum + icb.avgRTTCompliance, 0) / icbMetrics.length;
  const nationalAvgAE = icbMetrics.reduce((sum, icb) => sum + icb.avgAEPerformance, 0) / icbMetrics.length;

  return (
    <div className="space-y-6">
      {/* Summary Statistics Panel */}
      <Card>
        <CardHeader>
          <CardTitle>National ICB Performance Summary</CardTitle>
          <CardDescription>Key insights from all {icbMetrics.length} Integrated Care Boards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">Best RTT Performance</p>
              <p className="text-xl font-bold text-green-600">{topPerformer?.avgRTTCompliance.toFixed(1)}%</p>
              <p className="text-xs text-slate-500">{topPerformer?.name.substring(0, 30)}...</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">Worst RTT Performance</p>
              <p className="text-xl font-bold text-red-600">{worstPerformer?.avgRTTCompliance.toFixed(1)}%</p>
              <p className="text-xs text-slate-500">{worstPerformer?.name.substring(0, 30)}...</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">National Avg RTT</p>
              <p className="text-xl font-bold text-slate-800">{nationalAvgRTT.toFixed(1)}%</p>
              <Badge variant="outline">Across all ICBs</Badge>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">National Avg A&E</p>
              <p className="text-xl font-bold text-slate-800">{nationalAvgAE.toFixed(1)}%</p>
              <Badge variant="outline">4-hour target</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Sort Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search ICBs by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortBy === 'rtt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('rtt')}
              >
                RTT {sortBy === 'rtt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'ae' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('ae')}
              >
                A&E {sortBy === 'ae' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'waiting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('waiting')}
              >
                Waiting {sortBy === 'waiting' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                variant={sortBy === 'breaches' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('breaches')}
              >
                Breaches {sortBy === 'breaches' && (sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ICB Rankings Table */}
      <div className="space-y-3">
        {filteredAndSortedICBs.map((icb, index) => {
          const performanceScore = getPerformanceScore(icb);
          const performanceLevel = getPerformanceLevel(performanceScore);
          const rankIcon = getRankIcon(index);

          return (
            <Card
              key={icb.code}
              className={`p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${performanceLevel.color}`}
              onClick={() => onICBSelect(icb.code)}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {rankIcon}
                  <div className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-700">
                    {index + 1}
                  </div>
                </div>

                {/* ICB Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg leading-tight">
                    {icb.name.substring(0, 50)}{icb.name.length > 50 ? '...' : ''}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {icb.code}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {icb.trustCount} trusts
                    </Badge>
                  </div>
                </div>

                {/* RTT Performance */}
                <div className="flex-shrink-0 text-center space-y-1">
                  <div className={`text-xl font-bold ${icb.avgRTTCompliance >= 92 ? 'text-green-600' : 'text-red-600'}`}>
                    {icb.avgRTTCompliance.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-600">RTT</div>
                  {icb.avgRTTCompliance >= 92 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mx-auto" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mx-auto" />
                  )}
                </div>

                {/* A&E Performance */}
                <div className="flex-shrink-0 text-center space-y-1">
                  <div className={`text-xl font-bold ${icb.avgAEPerformance >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                    {icb.avgAEPerformance.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-600">A&E</div>
                </div>

                {/* Total Waiting */}
                <div className="flex-shrink-0 text-center space-y-1">
                  <div className="text-lg font-bold text-slate-800">
                    {formatNumber(icb.totalWaitingList)}
                  </div>
                  <div className="text-xs text-slate-600">waiting</div>
                </div>

                {/* 52+ Week Breaches */}
                <div className="flex-shrink-0 text-center space-y-1">
                  <div className="text-lg font-bold text-red-600">
                    {formatNumber(icb.total52WeekBreaches)}
                  </div>
                  <div className="text-xs text-slate-600">52+ weeks</div>
                </div>

                {/* Performance Score */}
                <div className="flex-shrink-0 text-center space-y-1">
                  <div className="text-lg font-bold text-slate-800">
                    {performanceScore.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-600">score</div>
                </div>

                {/* Performance Badge */}
                <div className="flex-shrink-0">
                  <Badge variant={performanceLevel.badge as any}>
                    {performanceLevel.label}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Results Summary */}
      <div className="text-center py-4 text-sm text-slate-600">
        Showing {filteredAndSortedICBs.length} of {icbMetrics.length} ICBs
        {searchTerm && ` matching "${searchTerm}"`}
      </div>
    </div>
  );
}
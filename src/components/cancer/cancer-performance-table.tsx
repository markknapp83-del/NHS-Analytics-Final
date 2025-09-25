'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CancerData, CANCER_TYPE_DISPLAY_NAMES, CancerPerformanceRow } from '@/types/cancer';
import { Search, Activity, AlertTriangle } from 'lucide-react';

interface CancerPerformanceTableProps {
  data: CancerData;
}

export function CancerPerformanceTable({ data }: CancerPerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'breaches' | '28day' | '31day' | '62day'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'treated' | 'suspected'>('all');

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Transform cancer data into table rows
  const cancerRows: CancerPerformanceRow[] = useMemo(() => {
    const rows: CancerPerformanceRow[] = [];

    // Get all cancer types across all standards
    const cancerTypes = new Set([
      ...Object.keys(data.standards['28_day_fds'].by_cancer_type || {}),
      ...Object.keys(data.standards['31_day_combined'].by_cancer_type || {}),
      ...Object.keys(data.standards['62_day_combined'].by_cancer_type || {})
    ]);

    cancerTypes.forEach(type => {
      const fds28 = data.standards['28_day_fds'].by_cancer_type[type];
      const day31 = data.standards['31_day_combined'].by_cancer_type[type];
      const day62 = data.standards['62_day_combined'].by_cancer_type[type];

      const totalTreated = (fds28?.total_treated || 0) + (day31?.total_treated || 0) + (day62?.total_treated || 0);
      const totalBreaches = (fds28?.breaches || 0) + (day31?.breaches || 0) + (day62?.breaches || 0);

      // Only include cancer types with actual patients treated
      if (totalTreated === 0) return;

      // Identify worst performing standard
      const performances = [
        { name: '28-day FDS', perf: fds28?.performance_pct || 100 },
        { name: '31-day', perf: day31?.performance_pct || 100 },
        { name: '62-day', perf: day62?.performance_pct || 100 }
      ];
      const worstStandard = performances.sort((a, b) => a.perf - b.perf)[0].name;

      const row: CancerPerformanceRow = {
        cancerType: type,
        displayName: CANCER_TYPE_DISPLAY_NAMES[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        category: type.startsWith('suspected_') ? 'suspected' : 'treated',

        fds_28_treated: fds28?.total_treated || null,
        fds_28_performance: fds28?.performance_pct || null,
        fds_28_breaches: fds28?.breaches || null,

        day_31_treated: day31?.total_treated || 0,
        day_31_performance: day31?.performance_pct || 0,
        day_31_breaches: day31?.breaches || 0,

        day_62_treated: day62?.total_treated || 0,
        day_62_performance: day62?.performance_pct || 0,
        day_62_breaches: day62?.breaches || 0,

        total_treated_all_standards: totalTreated,
        total_breaches_all_standards: totalBreaches,
        worst_standard: worstStandard
      };

      rows.push(row);
    });

    return rows;
  }, [data]);

  const filteredAndSortedRows = useMemo(() => {
    let filtered = cancerRows.filter(row => {
      const matchesSearch = row.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || row.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'total':
          comparison = a.total_treated_all_standards - b.total_treated_all_standards;
          break;
        case 'breaches':
          comparison = a.total_breaches_all_standards - b.total_breaches_all_standards;
          break;
        case '28day':
          comparison = (a.fds_28_performance || 0) - (b.fds_28_performance || 0);
          break;
        case '31day':
          comparison = a.day_31_performance - b.day_31_performance;
          break;
        case '62day':
          comparison = a.day_62_performance - b.day_62_performance;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [cancerRows, searchTerm, selectedCategory, sortBy, sortOrder]);

  const getPerformanceColor = (performance: number | null, target: number) => {
    if (performance === null || performance === undefined) return 'text-slate-400';
    if (performance >= target) return 'text-green-600';
    if (performance >= target - 5) return 'text-blue-600';
    if (performance >= target - 10) return 'text-amber-600';
    return 'text-red-600';
  };

  const getWorstStandardBadge = (standard: string) => {
    switch (standard) {
      case '28-day FDS':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">28-day FDS</Badge>;
      case '31-day':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">31-day</Badge>;
      case '62-day':
        return <Badge variant="destructive">62-day</Badge>;
      default:
        return <Badge variant="outline">{standard}</Badge>;
    }
  };

  const treatedRows = filteredAndSortedRows.filter(r => r.category === 'treated');
  const suspectedRows = filteredAndSortedRows.filter(r => r.category === 'suspected');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">
            Cancer Type Performance Analysis
          </CardTitle>
          <CardDescription>
            Detailed performance breakdown by cancer type across all waiting time standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search cancer types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All Types
              </Button>
              <Button
                variant={selectedCategory === 'treated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('treated')}
              >
                Treated Cancer ({treatedRows.length})
              </Button>
              <Button
                variant={selectedCategory === 'suspected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('suspected')}
              >
                Suspected Cancer ({suspectedRows.length})
              </Button>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={sortBy === 'total' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('total')}
            >
              Total Treated {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === 'breaches' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('breaches')}
            >
              Total Breaches {sortBy === 'breaches' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortBy === '62day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('62day')}
            >
              62-day Performance {sortBy === '62day' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Treated Cancer Types Section */}
      {(selectedCategory === 'all' || selectedCategory === 'treated') && treatedRows.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Treated Cancer Types ({treatedRows.length} types)
          </h3>
          {treatedRows.map((row) => (
            <Card key={row.cancerType} className="transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h4 className="font-medium text-slate-900">{row.displayName}</h4>
                  <div className="flex items-center gap-2">
                    {getWorstStandardBadge(row.worst_standard)}
                    <Badge variant="outline" className="text-xs">
                      {row.total_treated_all_standards.toLocaleString()} treated
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">28-day FDS</p>
                    <p className={`font-semibold ${getPerformanceColor(row.fds_28_performance, 75)}`}>
                      {row.fds_28_performance !== null ? `${row.fds_28_performance.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.fds_28_treated !== null ? `${row.fds_28_treated.toLocaleString()} treated` : 'No data'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">31-day Combined</p>
                    <p className={`font-semibold ${getPerformanceColor(row.day_31_performance, 96)}`}>
                      {row.day_31_performance.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.day_31_treated.toLocaleString()} treated
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">62-day Combined</p>
                    <p className={`font-semibold ${getPerformanceColor(row.day_62_performance, 85)}`}>
                      {row.day_62_performance.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.day_62_treated.toLocaleString()} treated
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">Total Breaches</p>
                    <p className={`font-semibold ${row.total_breaches_all_standards > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.total_breaches_all_standards.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">Overall Rate</p>
                    <p className="font-semibold text-slate-900">
                      {((row.total_treated_all_standards - row.total_breaches_all_standards) / row.total_treated_all_standards * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suspected Cancer Types Section */}
      {(selectedCategory === 'all' || selectedCategory === 'suspected') && suspectedRows.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Suspected Cancer Pathways ({suspectedRows.length} pathways)
          </h3>
          {suspectedRows.map((row) => (
            <Card key={row.cancerType} className="transition-all duration-200 hover:shadow-md bg-amber-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h4 className="font-medium text-slate-900">{row.displayName}</h4>
                  <div className="flex items-center gap-2">
                    {getWorstStandardBadge(row.worst_standard)}
                    <Badge variant="outline" className="text-xs">
                      {row.total_treated_all_standards.toLocaleString()} patients
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">28-day FDS</p>
                    <p className={`font-semibold ${getPerformanceColor(row.fds_28_performance, 75)}`}>
                      {row.fds_28_performance !== null ? `${row.fds_28_performance.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.fds_28_treated !== null ? `${row.fds_28_treated.toLocaleString()} patients` : 'No data'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">31-day Combined</p>
                    <p className={`font-semibold ${getPerformanceColor(row.day_31_performance, 96)}`}>
                      {row.day_31_performance > 0 ? `${row.day_31_performance.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.day_31_treated > 0 ? `${row.day_31_treated.toLocaleString()} patients` : 'No data'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">62-day Combined</p>
                    <p className={`font-semibold ${getPerformanceColor(row.day_62_performance, 85)}`}>
                      {row.day_62_performance > 0 ? `${row.day_62_performance.toFixed(1)}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.day_62_treated > 0 ? `${row.day_62_treated.toLocaleString()} patients` : 'No data'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">Total Breaches</p>
                    <p className={`font-semibold ${row.total_breaches_all_standards > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.total_breaches_all_standards.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-600">Overall Rate</p>
                    <p className="font-semibold text-slate-900">
                      {row.total_treated_all_standards > 0
                        ? ((row.total_treated_all_standards - row.total_breaches_all_standards) / row.total_treated_all_standards * 100).toFixed(1)
                        : 0
                      }%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results State */}
      {filteredAndSortedRows.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Cancer Types Found
            </h3>
            <p className="text-sm text-slate-600">
              Try adjusting your search terms or filters to see more results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
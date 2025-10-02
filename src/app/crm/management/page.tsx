'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Activity,
  Phone,
  Mail,
  FileText,
  Users,
  AlertTriangle,
  Download,
  ArrowUpDown,
  Building2,
} from 'lucide-react';

interface TrustCoverage {
  trust_code: string;
  trust_name: string;
  icb_name: string;
  account_owner: string | null;
  account_stage: string | null;
  last_contact_date: string | null;
  days_since_contact: number | null;
  active_opportunities: number;
  pipeline_value: number;
  contact_count: number;
  activities_last_30_days: number;
  coverage_status: string;
}

interface PipelineAnalytics {
  trust_code: string;
  trust_name: string;
  total_opportunities: number;
  total_pipeline_value: number;
  weighted_pipeline_value: number;
  opportunities_by_stage: Record<string, number>;
}

interface Activity {
  id: string;
  activity_type: string;
  activity_date: string;
  created_by: string;
  trust_code: string;
}

interface Opportunity {
  id: string;
  opportunity_owner: string;
  stage: string;
  estimated_value: number;
  probability: number;
  close_date: string;
  trust_code: string;
}

interface RepPerformance {
  rep_name: string;
  pipeline_value: number;
  num_opportunities: number;
  activities_30_days: number;
  activities_7_days: number;
  active_trusts: number;
  avg_days_since_contact: number;
}

type SortField = 'trust_name' | 'account_owner' | 'account_stage' | 'last_contact_date' |
  'days_since_contact' | 'active_opportunities' | 'pipeline_value' | 'activities_last_30_days';

type SortDirection = 'asc' | 'desc';

export default function ManagementDashboardPage() {
  const { isSystemAdmin, isLoading } = useAuth();
  const router = useRouter();

  const [trustCoverage, setTrustCoverage] = useState<TrustCoverage[]>([]);
  const [pipelineAnalytics, setPipelineAnalytics] = useState<PipelineAnalytics[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [icbFilter, setIcbFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('trust_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    // Redirect non-admins
    if (!isLoading && !isSystemAdmin) {
      router.push('/crm/accounts');
    }
  }, [isSystemAdmin, isLoading, router]);

  useEffect(() => {
    if (isSystemAdmin) {
      fetchData();
    }
  }, [isSystemAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [coverageRes, pipelineRes, activitiesRes, opportunitiesRes] = await Promise.all([
        fetch('/api/crm/reports?type=trust-coverage'),
        fetch('/api/crm/reports?type=pipeline-analytics'),
        fetch('/api/crm/activities'),
        fetch('/api/crm/opportunities'),
      ]);

      const [coverageData, pipelineData, activitiesData, opportunitiesData] = await Promise.all([
        coverageRes.json(),
        pipelineRes.json(),
        activitiesRes.json(),
        opportunitiesRes.json(),
      ]);

      if (coverageData.data) setTrustCoverage(coverageData.data);
      if (pipelineData.data) setPipelineAnalytics(pipelineData.data);
      if (activitiesData.data) setActivities(activitiesData.data);
      if (opportunitiesData.data) setOpportunities(opportunitiesData.data);
    } catch (error) {
      console.error('Error fetching management data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate key metrics
  const totalPipelineValue = useMemo(() => {
    return opportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);
  }, [opportunities]);

  const activeOpportunities = useMemo(() => {
    return opportunities.filter(opp =>
      opp.stage !== 'Closed Won' && opp.stage !== 'Closed Lost'
    ).length;
  }, [opportunities]);

  const weightedPipelineValue = useMemo(() => {
    return opportunities.reduce((sum, opp) => {
      if (opp.stage !== 'Closed Won' && opp.stage !== 'Closed Lost') {
        return sum + (opp.estimated_value || 0) * (opp.probability || 0) / 100;
      }
      return sum;
    }, 0);
  }, [opportunities]);

  const expectedClosesThisQuarter = useMemo(() => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);

    return opportunities.filter(opp => {
      if (!opp.close_date || opp.stage === 'Closed Lost') return false;
      const closeDate = new Date(opp.close_date);
      return closeDate >= quarterStart && closeDate <= quarterEnd;
    }).length;
  }, [opportunities]);

  // Calculate activity metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activitiesLast30Days = useMemo(() => {
    return activities.filter(act =>
      new Date(act.activity_date) >= thirtyDaysAgo
    );
  }, [activities]);

  const activityBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {
      Call: 0,
      Meeting: 0,
      Email: 0,
      Proposal: 0,
    };

    activitiesLast30Days.forEach(act => {
      if (act.activity_type in breakdown) {
        breakdown[act.activity_type]++;
      }
    });

    return breakdown;
  }, [activitiesLast30Days]);

  // Calculate rep performance
  const repPerformance = useMemo(() => {
    const reps: Record<string, RepPerformance> = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Initialize reps from opportunities
    opportunities.forEach(opp => {
      const rep = opp.opportunity_owner || 'Unassigned';
      if (!reps[rep]) {
        reps[rep] = {
          rep_name: rep,
          pipeline_value: 0,
          num_opportunities: 0,
          activities_30_days: 0,
          activities_7_days: 0,
          active_trusts: 0,
          avg_days_since_contact: 0,
        };
      }

      if (opp.stage !== 'Closed Won' && opp.stage !== 'Closed Lost') {
        reps[rep].pipeline_value += opp.estimated_value || 0;
        reps[rep].num_opportunities++;
      }
    });

    // Add activity counts
    activities.forEach(act => {
      const rep = act.created_by || 'Unassigned';
      if (!reps[rep]) {
        reps[rep] = {
          rep_name: rep,
          pipeline_value: 0,
          num_opportunities: 0,
          activities_30_days: 0,
          activities_7_days: 0,
          active_trusts: 0,
          avg_days_since_contact: 0,
        };
      }

      const actDate = new Date(act.activity_date);
      if (actDate >= thirtyDaysAgo) {
        reps[rep].activities_30_days++;
      }
      if (actDate >= sevenDaysAgo) {
        reps[rep].activities_7_days++;
      }
    });

    // Calculate active trusts and avg days since contact
    trustCoverage.forEach(trust => {
      const rep = trust.account_owner || 'Unassigned';
      if (reps[rep] && trust.account_owner) {
        reps[rep].active_trusts++;
        if (trust.days_since_contact !== null) {
          reps[rep].avg_days_since_contact += trust.days_since_contact;
        }
      }
    });

    // Calculate averages
    Object.values(reps).forEach(rep => {
      if (rep.active_trusts > 0) {
        rep.avg_days_since_contact = Math.round(rep.avg_days_since_contact / rep.active_trusts);
      }
    });

    return Object.values(reps).sort((a, b) => b.pipeline_value - a.pipeline_value);
  }, [opportunities, activities, trustCoverage]);

  // Calculate trust coverage health
  const coverageHealth = useMemo(() => {
    const totalTrusts = trustCoverage.length;
    const contactedThisMonth = trustCoverage.filter(t =>
      t.days_since_contact !== null && t.days_since_contact <= 30
    ).length;
    const notContacted30Plus = trustCoverage.filter(t =>
      t.days_since_contact !== null && t.days_since_contact > 30 && t.days_since_contact <= 60
    ).length;
    const notContacted60Plus = trustCoverage.filter(t =>
      t.days_since_contact === null || t.days_since_contact > 60
    ).length;

    const totalDays = trustCoverage.reduce((sum, t) =>
      sum + (t.days_since_contact || 0), 0
    );
    const avgDaysSinceContact = totalTrusts > 0 ? Math.round(totalDays / totalTrusts) : 0;

    return {
      totalTrusts,
      contactedThisMonth,
      notContacted30Plus,
      notContacted60Plus,
      avgDaysSinceContact,
    };
  }, [trustCoverage]);

  // Filter and sort trust coverage matrix
  const filteredTrustCoverage = useMemo(() => {
    let filtered = trustCoverage.filter(trust => {
      const matchesSearch =
        trust.trust_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trust.trust_code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRep = repFilter === 'all' || trust.account_owner === repFilter;
      const matchesIcb = icbFilter === 'all' || trust.icb_name === icbFilter;
      const matchesStatus = statusFilter === 'all' || trust.coverage_status === statusFilter;
      const matchesStage = stageFilter === 'all' || trust.account_stage === stageFilter;

      return matchesSearch && matchesRep && matchesIcb && matchesStatus && matchesStage;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nulls
      if (aVal === null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [trustCoverage, searchTerm, repFilter, icbFilter, statusFilter, stageFilter, sortField, sortDirection]);

  // Get unique values for filters
  const uniqueReps = useMemo(() =>
    Array.from(new Set(trustCoverage.map(t => t.account_owner).filter(Boolean))) as string[],
    [trustCoverage]
  );

  const uniqueIcbs = useMemo(() =>
    Array.from(new Set(trustCoverage.map(t => t.icb_name))),
    [trustCoverage]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getCoverageStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; label: string; icon: string }> = {
      active: { variant: 'default', label: 'Active', icon: '🟢' },
      at_risk: { variant: 'secondary', label: 'At Risk', icon: '🟡' },
      neglected: { variant: 'destructive', label: 'Neglected', icon: '🔴' },
      critical: { variant: 'destructive', label: 'Critical', icon: '⚫' },
      never_contacted: { variant: 'outline', label: 'Never Contacted', icon: '⚪' },
    };

    const config = variants[status] || variants.never_contacted;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <span>{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Trust Name',
      'Trust Code',
      'ICB',
      'Account Owner',
      'Account Stage',
      'Last Contact Date',
      'Days Since Contact',
      'Status',
      'Opportunities',
      'Pipeline Value',
      'Contacts',
      'Activities (30d)',
    ];

    const rows = filteredTrustCoverage.map(trust => [
      trust.trust_name,
      trust.trust_code,
      trust.icb_name,
      trust.account_owner || '',
      trust.account_stage || '',
      trust.last_contact_date || '',
      trust.days_since_contact?.toString() || '',
      trust.coverage_status,
      trust.active_opportunities.toString(),
      trust.pipeline_value.toFixed(2),
      trust.contact_count.toString(),
      trust.activities_last_30_days.toString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trust-coverage-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading management dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isSystemAdmin) {
    return null;
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Management Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Team performance overview and trust coverage analytics
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{(totalPipelineValue / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOpportunities}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Open pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{(weightedPipelineValue / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Probability-adjusted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Closes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expectedClosesThisQuarter}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Team Activity Summary (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activitiesLast30Days.length}</p>
                <p className="text-xs text-muted-foreground">Total Activities</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activityBreakdown.Call}</p>
                <p className="text-xs text-muted-foreground">Calls</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activityBreakdown.Meeting}</p>
                <p className="text-xs text-muted-foreground">Meetings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{activityBreakdown.Email}</p>
                <p className="text-xs text-muted-foreground">Emails</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{activityBreakdown.Proposal}</p>
                <p className="text-xs text-muted-foreground">Proposals</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rep Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rep Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep Name</TableHead>
                <TableHead className="text-right">Pipeline Value</TableHead>
                <TableHead className="text-right">Opportunities</TableHead>
                <TableHead className="text-right">Activities (30d)</TableHead>
                <TableHead className="text-right">Activities (7d)</TableHead>
                <TableHead className="text-right">Active Trusts</TableHead>
                <TableHead className="text-right">Avg Days Since Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repPerformance.map((rep) => (
                <TableRow key={rep.rep_name}>
                  <TableCell className="font-medium">{rep.rep_name}</TableCell>
                  <TableCell className="text-right">
                    £{(rep.pipeline_value / 1000).toFixed(0)}K
                  </TableCell>
                  <TableCell className="text-right">{rep.num_opportunities}</TableCell>
                  <TableCell className="text-right">{rep.activities_30_days}</TableCell>
                  <TableCell className="text-right">{rep.activities_7_days}</TableCell>
                  <TableCell className="text-right">{rep.active_trusts}</TableCell>
                  <TableCell className="text-right">
                    {rep.avg_days_since_contact > 0 ? rep.avg_days_since_contact : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Trust Coverage Health */}
      <Card>
        <CardHeader>
          <CardTitle>Trust Coverage Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Trusts Contacted This Month</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{coverageHealth.contactedThisMonth}</p>
                <p className="text-muted-foreground">/ {coverageHealth.totalTrusts}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {((coverageHealth.contactedThisMonth / coverageHealth.totalTrusts) * 100).toFixed(1)}% coverage
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <p className="text-sm font-medium">Attention Needed</p>
              </div>
              <p className="text-3xl font-bold">{coverageHealth.notContacted30Plus}</p>
              <p className="text-xs text-muted-foreground">
                Not contacted in 30-60 days
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Critical</p>
              </div>
              <p className="text-3xl font-bold">{coverageHealth.notContacted60Plus}</p>
              <p className="text-xs text-muted-foreground">
                Not contacted in 60+ days
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Average Days Since Contact</p>
              <p className="text-3xl font-bold">{coverageHealth.avgDaysSinceContact}</p>
              <p className="text-xs text-muted-foreground">
                All trusts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Coverage Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trust Coverage Matrix</CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Input
                placeholder="Search trusts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {uniqueReps.map(rep => (
                  <SelectItem key={rep} value={rep}>{rep}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={icbFilter} onValueChange={setIcbFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All ICBs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ICBs</SelectItem>
                {uniqueIcbs.map(icb => (
                  <SelectItem key={icb} value={icb}>{icb}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">🟢 Active</SelectItem>
                <SelectItem value="at_risk">🟡 At Risk</SelectItem>
                <SelectItem value="neglected">🔴 Neglected</SelectItem>
                <SelectItem value="critical">⚫ Critical</SelectItem>
                <SelectItem value="never_contacted">⚪ Never Contacted</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Partnership">Partnership</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Summary */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>🟢 Active:</span>
              <span className="font-semibold">
                {trustCoverage.filter(t => t.coverage_status === 'active').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡 At Risk:</span>
              <span className="font-semibold">
                {trustCoverage.filter(t => t.coverage_status === 'at_risk').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴 Neglected:</span>
              <span className="font-semibold">
                {trustCoverage.filter(t => t.coverage_status === 'neglected').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>⚫ Critical:</span>
              <span className="font-semibold">
                {trustCoverage.filter(t => t.coverage_status === 'critical').length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('trust_name')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Trust
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>ICB</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('account_owner')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Account Owner
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('account_stage')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Stage
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('last_contact_date')}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Last Contact
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('days_since_contact')}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Days
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('active_opportunities')}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Opps
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('pipeline_value')}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Value
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => handleSort('activities_last_30_days')}
                      className="flex items-center gap-1 hover:text-foreground ml-auto"
                    >
                      Activities (30d)
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrustCoverage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No trusts found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrustCoverage.map((trust) => (
                    <TableRow key={trust.trust_code}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{trust.trust_name}</p>
                          <p className="text-xs text-muted-foreground">{trust.trust_code}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{trust.icb_name}</TableCell>
                      <TableCell>{trust.account_owner || '-'}</TableCell>
                      <TableCell>
                        {trust.account_stage ? (
                          <Badge variant="outline">{trust.account_stage}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {trust.last_contact_date
                          ? new Date(trust.last_contact_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {trust.days_since_contact !== null ? trust.days_since_contact : '-'}
                      </TableCell>
                      <TableCell>
                        {getCoverageStatusBadge(trust.coverage_status)}
                      </TableCell>
                      <TableCell className="text-right">{trust.active_opportunities}</TableCell>
                      <TableCell className="text-right">
                        {trust.pipeline_value > 0
                          ? `£${(trust.pipeline_value / 1000).toFixed(0)}K`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">{trust.contact_count}</TableCell>
                      <TableCell className="text-right">{trust.activities_last_30_days}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredTrustCoverage.length} of {trustCoverage.length} trusts
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

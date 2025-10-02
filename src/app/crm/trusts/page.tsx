'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
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
import { Building2, Search, AlertCircle, TrendingUp, Users, Phone } from 'lucide-react';
import Link from 'next/link';

interface TrustAccount {
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

export default function MyAccountsPage() {
  const { user, isSystemAdmin } = useAuth();
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [coverageFilter, setCoverageFilter] = useState<string>('all');

  useEffect(() => {
    fetchAccounts();
  }, [user?.email, isSystemAdmin]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // If not admin, filter by current user's accounts
      if (!isSystemAdmin && user?.email) {
        params.append('account_owner', user.email);
      }

      const response = await fetch(`/api/crm/accounts?${params}`);
      const result = await response.json();

      if (result.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch =
      account.trust_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.trust_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || account.account_stage === stageFilter;
    const matchesCoverage = coverageFilter === 'all' || account.coverage_status === coverageFilter;

    return matchesSearch && matchesStage && matchesCoverage;
  });

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

  const getStageColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      prospect: 'bg-gray-100 text-gray-800',
      contacted: 'bg-blue-100 text-blue-800',
      engaged: 'bg-green-100 text-green-800',
      active_client: 'bg-emerald-100 text-emerald-800',
      churned: 'bg-red-100 text-red-800',
    };
    return colors[stage || 'prospect'] || colors.prospect;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005eb8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isSystemAdmin ? 'All Accounts' : 'My Accounts'}
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredAccounts.length} of {accounts.length} NHS trusts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search trusts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="engaged">Engaged</SelectItem>
            <SelectItem value="active_client">Active Client</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={coverageFilter} onValueChange={setCoverageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active (&lt;14d)</SelectItem>
            <SelectItem value="at_risk">At Risk (14-30d)</SelectItem>
            <SelectItem value="neglected">Neglected (30-60d)</SelectItem>
            <SelectItem value="critical">Critical (60+d)</SelectItem>
            <SelectItem value="never_contacted">Never Contacted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((account) => (
          <Link
            key={account.trust_code}
            href={`/crm/trusts/${account.trust_code}`}
            className="block"
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg line-clamp-2">
                      {account.trust_name}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {account.trust_code} • {account.icb_name}
                    </p>
                  </div>
                  <Building2 className="h-5 w-5 text-[#005eb8] shrink-0" />
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  {account.account_stage && (
                    <Badge className={getStageColor(account.account_stage)}>
                      {account.account_stage.replace('_', ' ')}
                    </Badge>
                  )}
                  {getCoverageStatusBadge(account.coverage_status)}
                </div>

                {/* Last Contact */}
                {account.last_contact_date ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      Last contact: {account.days_since_contact}d ago
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>No contact recorded</span>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3" />
                      <span>Opportunities</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {account.active_opportunities}
                    </p>
                    <p className="text-xs text-gray-500">
                      £{(account.pipeline_value / 1000).toFixed(0)}k
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>Contacts</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {account.contact_count}
                    </p>
                    <p className="text-xs text-gray-500">
                      {account.activities_last_30_days} activities
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No accounts found</h3>
          <p className="text-gray-600 mt-1">
            {searchTerm || stageFilter !== 'all' || coverageFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No accounts have been assigned to you yet'}
          </p>
        </div>
      )}
    </div>
  );
}

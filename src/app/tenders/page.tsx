'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ExternalLink, Building2, Calendar, DollarSign, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';

interface Tender {
  id: string;
  contracts_finder_id: string;
  ocid: string | null;
  title: string;
  description: string | null;
  status: string | null;
  buyer_organisation_name: string;
  trust_code: string | null;
  icb_code: string | null;
  contract_value_min: number | null;
  contract_value_max: number | null;
  published_date: string;
  classification: 'insourcing_opportunity' | 'framework' | 'discard';
  classification_reason: string;
  classification_confidence: number;
  is_framework: boolean;
  framework_name: string | null;
  matched_entity_type: 'trust' | 'icb' | null;
  contracts_finder_url: string | null;
}

interface Trust {
  code: string;
  name: string;
}

interface ICB {
  icb_code: string;
  icb_name: string;
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [icbs, setICBs] = useState<ICB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'opportunities' | 'frameworks' | 'all'>('opportunities');
  const [selectedTrust, setSelectedTrust] = useState<string>('all');
  const [selectedICB, setSelectedICB] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<'trust' | 'icb' | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [activeTab, selectedTrust, selectedICB, selectedEntityType, tenders]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load tenders
      const { data: tendersData, error: tendersError } = await supabase
        .from('tenders')
        .select('*')
        .order('published_date', { ascending: false });

      if (tendersError) throw tendersError;

      setTenders(tendersData || []);

      // Load trusts
      const { data: trustsData, error: trustsError } = await supabase.rpc('get_distinct_trusts');
      if (trustsError) throw trustsError;

      const trustsList: Trust[] = ((trustsData as any[]) || []).map((row: any) => ({
        code: row.trust_code,
        name: row.trust_name
      }));
      setTrusts(trustsList);

      // Load ICBs
      const { data: icbsData, error: icbsError } = await supabase
        .from('icbs')
        .select('icb_code, icb_name')
        .order('icb_name');

      if (icbsError) throw icbsError;
      setICBs(icbsData || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tenders];

    // Filter by tab
    switch (activeTab) {
      case 'opportunities':
        filtered = filtered.filter(t => t.classification === 'insourcing_opportunity');
        break;
      case 'frameworks':
        filtered = filtered.filter(t => t.is_framework === true);
        break;
      // 'all' - no classification filtering
    }

    // Filter by entity type
    if (selectedEntityType !== 'all') {
      filtered = filtered.filter(t => t.matched_entity_type === selectedEntityType);
    }

    // Filter by trust
    if (selectedTrust !== 'all') {
      filtered = filtered.filter(t => t.trust_code === selectedTrust);
    }

    // Filter by ICB
    if (selectedICB !== 'all') {
      filtered = filtered.filter(t => t.icb_code === selectedICB);
    }

    setFilteredTenders(filtered);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}K`;
    return `£${value.toFixed(0)}`;
  };

  const getConfidenceBadgeVariant = (confidence: number) => {
    if (confidence >= 90) return 'default';
    if (confidence >= 80) return 'secondary';
    return 'outline';
  };

  const stats = {
    opportunities: tenders.filter(t => t.classification === 'insourcing_opportunity').length,
    frameworks: tenders.filter(t => t.is_framework).length,
    total: tenders.length
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading tenders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">NHS Tenders</h1>
            <p className="text-muted-foreground">
              Insourcing opportunities and frameworks from Contracts Finder
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/tenders/all">
              <Button variant="outline">
                View All Tenders ({stats.total})
              </Button>
            </Link>
            <Link href="/tenders/review">
              <Button variant="outline">
                Review Discarded
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.opportunities}</div>
              <p className="text-sm text-muted-foreground">Insourcing Opportunities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.frameworks}</div>
              <p className="text-sm text-muted-foreground">Frameworks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Tenders</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Entity Type</label>
              <Select value={selectedEntityType} onValueChange={(v) => setSelectedEntityType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="trust">NHS Trusts</SelectItem>
                  <SelectItem value="icb">ICBs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">NHS Trust</label>
              <Select value={selectedTrust} onValueChange={setSelectedTrust} disabled={selectedEntityType === 'icb'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trusts</SelectItem>
                  {trusts.map(trust => (
                    <SelectItem key={trust.code} value={trust.code}>
                      {trust.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">ICB</label>
              <Select value={selectedICB} onValueChange={setSelectedICB} disabled={selectedEntityType === 'trust'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ICBs</SelectItem>
                  {icbs.map(icb => (
                    <SelectItem key={icb.icb_code} value={icb.icb_code}>
                      {icb.icb_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="opportunities">
            Opportunities ({stats.opportunities})
          </TabsTrigger>
          <TabsTrigger value="frameworks">
            Frameworks ({stats.frameworks})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Tenders ({stats.total})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tenders List */}
      {filteredTenders.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No tenders found for selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTenders.map(tender => {
            const trustOrICB = tender.matched_entity_type === 'trust'
              ? trusts.find(t => t.code === tender.trust_code)?.name
              : icbs.find(i => i.icb_code === tender.icb_code)?.icb_name;

            return (
              <Card key={tender.id}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tender.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building2 className="h-4 w-4" />
                        {tender.buyer_organisation_name}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {tender.classification === 'insourcing_opportunity' && (
                        <Badge className="bg-green-600">Opportunity</Badge>
                      )}
                      {tender.is_framework && (
                        <Badge className="bg-blue-600">Framework</Badge>
                      )}
                      {tender.matched_entity_type && (
                        <Badge variant="outline">
                          {tender.matched_entity_type === 'trust' ? 'Trust' : 'ICB'}
                        </Badge>
                      )}
                      <Badge variant={getConfidenceBadgeVariant(tender.classification_confidence)}>
                        {tender.classification_confidence}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {tender.description || 'No description available'}
                  </p>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span>Published</span>
                      </div>
                      <div className="font-medium">
                        {new Date(tender.published_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Value</span>
                      </div>
                      <div className="font-medium">
                        {tender.contract_value_max
                          ? `${formatCurrency(tender.contract_value_min)} - ${formatCurrency(tender.contract_value_max)}`
                          : formatCurrency(tender.contract_value_min)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Award className="h-4 w-4" />
                        <span>Status</span>
                      </div>
                      <div className="font-medium">{tender.status || 'Unknown'}</div>
                    </div>
                    {trustOrICB && (
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Building2 className="h-4 w-4" />
                          <span>Matched To</span>
                        </div>
                        <div className="font-medium text-xs">{trustOrICB}</div>
                      </div>
                    )}
                  </div>

                  {/* Classification Details */}
                  <div className="bg-muted p-3 rounded mb-4">
                    <p className="text-sm font-medium mb-1">Classification:</p>
                    <p className="text-sm">{tender.classification_reason}</p>
                    {tender.is_framework && tender.framework_name && (
                      <p className="text-sm mt-1">
                        <span className="font-medium">Framework:</span> {tender.framework_name}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {tender.contracts_finder_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={tender.contracts_finder_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Contracts Finder
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination hint */}
      {filteredTenders.length > 50 && (
        <div className="text-center text-sm text-muted-foreground mt-6">
          Showing {filteredTenders.length} tenders
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Search, Filter, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

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
  classification: 'insourcing_opportunity' | 'framework' | 'discard' | null;
  classification_reason: string | null;
  classification_confidence: number | null;
  is_framework: boolean | null;
  framework_name: string | null;
  matched_entity_type: 'trust' | 'icb' | null;
  contracts_finder_url: string | null;
  buyer_search_text: string | null;
}

export default function AllTendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [matchedFilter, setMatchedFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAllTenders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, classificationFilter, confidenceFilter, matchedFilter, tenders]);

  const loadAllTenders = async () => {
    try {
      setLoading(true);

      // Load ALL tenders from database - no limit
      const { data, error: fetchError } = await supabase
        .from('tenders')
        .select('*')
        .order('published_date', { ascending: false });

      if (fetchError) throw fetchError;

      setTenders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenders');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tenders];

    // Search filter (title, description, buyer)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.title?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.buyer_organisation_name?.toLowerCase().includes(term) ||
        t.classification_reason?.toLowerCase().includes(term)
      );
    }

    // Classification filter
    if (classificationFilter !== 'all') {
      filtered = filtered.filter(t => t.classification === classificationFilter);
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(t => {
        if (!t.classification_confidence) return false;
        switch (confidenceFilter) {
          case 'high': return t.classification_confidence >= 90;
          case 'medium': return t.classification_confidence >= 70 && t.classification_confidence < 90;
          case 'low': return t.classification_confidence < 70;
          default: return true;
        }
      });
    }

    // Matched filter
    if (matchedFilter !== 'all') {
      switch (matchedFilter) {
        case 'matched':
          filtered = filtered.filter(t => t.trust_code || t.icb_code);
          break;
        case 'unmatched':
          filtered = filtered.filter(t => !t.trust_code && !t.icb_code);
          break;
        case 'trust':
          filtered = filtered.filter(t => t.matched_entity_type === 'trust');
          break;
        case 'icb':
          filtered = filtered.filter(t => t.matched_entity_type === 'icb');
          break;
      }
    }

    setFilteredTenders(filtered);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}K`;
    return `£${value.toFixed(0)}`;
  };

  const getClassificationBadge = (classification: string | null) => {
    switch (classification) {
      case 'insourcing_opportunity':
        return <Badge className="bg-green-600">Opportunity</Badge>;
      case 'framework':
        return <Badge className="bg-blue-600">Framework</Badge>;
      case 'discard':
        return <Badge variant="secondary">Discarded</Badge>;
      default:
        return <Badge variant="outline">Unclassified</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;

    const variant = confidence >= 90 ? 'default' : confidence >= 70 ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{confidence}%</Badge>;
  };

  const stats = {
    total: tenders.length,
    opportunities: tenders.filter(t => t.classification === 'insourcing_opportunity').length,
    frameworks: tenders.filter(t => t.is_framework).length,
    discarded: tenders.filter(t => t.classification === 'discard').length,
    matched: tenders.filter(t => t.trust_code || t.icb_code).length,
    unmatched: tenders.filter(t => !t.trust_code && !t.icb_code).length,
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading all tenders...</div>
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
    <div className="container mx-auto p-6 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">All Tenders - Complete Dataset</h1>
        <p className="text-muted-foreground">
          Review all {tenders.length} tenders with classification results for manual refinement
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-green-600">{stats.opportunities}</div>
            <p className="text-xs text-muted-foreground">Opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-blue-600">{stats.frameworks}</div>
            <p className="text-xs text-muted-foreground">Frameworks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-gray-600">{stats.discarded}</div>
            <p className="text-xs text-muted-foreground">Discarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-purple-600">{stats.matched}</div>
            <p className="text-xs text-muted-foreground">Matched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xl font-bold text-orange-600">{stats.unmatched}</div>
            <p className="text-xs text-muted-foreground">Unmatched</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Classification</label>
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({stats.total})</SelectItem>
                  <SelectItem value="insourcing_opportunity">Opportunities ({stats.opportunities})</SelectItem>
                  <SelectItem value="framework">Frameworks ({stats.frameworks})</SelectItem>
                  <SelectItem value="discard">Discarded ({stats.discarded})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Confidence</label>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High (≥90%)</SelectItem>
                  <SelectItem value="medium">Medium (70-89%)</SelectItem>
                  <SelectItem value="low">Low (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Match Status</label>
              <Select value={matchedFilter} onValueChange={setMatchedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="matched">Matched ({stats.matched})</SelectItem>
                  <SelectItem value="unmatched">Unmatched ({stats.unmatched})</SelectItem>
                  <SelectItem value="trust">Trust Match</SelectItem>
                  <SelectItem value="icb">ICB Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title, buyer, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Showing {filteredTenders.length} of {stats.total} tenders</span>
            {(searchTerm || classificationFilter !== 'all' || confidenceFilter !== 'all' || matchedFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setClassificationFilter('all');
                  setConfidenceFilter('all');
                  setMatchedFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tenders List */}
      <div className="space-y-3">
        {filteredTenders.map(tender => {
          const isExpanded = expandedId === tender.id;

          return (
            <Card key={tender.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold">{tender.title}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {tender.buyer_organisation_name} • {new Date(tender.published_date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end items-start">
                    {getClassificationBadge(tender.classification)}
                    {getConfidenceBadge(tender.classification_confidence)}
                    {tender.matched_entity_type && (
                      <Badge variant="outline" className="capitalize">
                        {tender.matched_entity_type}
                      </Badge>
                    )}
                    {(tender.trust_code || tender.icb_code) && (
                      <Badge variant="outline" className="bg-green-50">
                        Matched
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Compact View */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tender.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Value: {formatCurrency(tender.contract_value_max || tender.contract_value_min)}</span>
                    <span>Status: {tender.status || 'Unknown'}</span>
                    {tender.trust_code && <span>Trust: {tender.trust_code}</span>}
                    {tender.icb_code && <span>ICB: {tender.icb_code}</span>}
                  </div>

                  {/* Classification Reason (always visible for review) */}
                  {tender.classification_reason && (
                    <div className="bg-muted p-2 rounded text-xs">
                      <span className="font-medium">Classification: </span>
                      {tender.classification_reason}
                    </div>
                  )}

                  {/* Expand/Collapse Button */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : tender.id)}
                      className="text-xs"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show Full Details
                        </>
                      )}
                    </Button>
                    {tender.contracts_finder_url && (
                      <Button variant="ghost" size="sm" asChild className="text-xs">
                        <a href={tender.contracts_finder_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Contracts Finder
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      <div>
                        <h4 className="text-sm font-semibold mb-1">Full Description</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {tender.description || 'No description available'}
                        </p>
                      </div>

                      {tender.buyer_search_text && (
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Search Text (for matching)</h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            {tender.buyer_search_text}
                          </pre>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium">OCID:</span> {tender.ocid || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Contracts Finder ID:</span> {tender.contracts_finder_id}
                        </div>
                        {tender.framework_name && (
                          <div className="col-span-2">
                            <span className="font-medium">Framework:</span> {tender.framework_name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTenders.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No tenders found matching your filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

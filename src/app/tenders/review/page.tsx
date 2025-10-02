'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, MessageSquare, AlertCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

interface DiscardedTender {
  id: string;
  contracts_finder_id: string;
  ocid: string | null;
  title: string | null;
  description: string | null;
  buyer_organisation_name: string | null;
  published_date: string | null;
  discard_reason: string;
  discard_confidence: number;
  search_text: string;
  reviewed: boolean;
  should_include: boolean | null;
  reviewer_notes: string | null;
  created_at: string;
}

export default function DiscardedTendersReviewPage() {
  const [discarded, setDiscarded] = useState<DiscardedTender[]>([]);
  const [filteredDiscarded, setFilteredDiscarded] = useState<DiscardedTender[]>([]);
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'flagged'>('unreviewed');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<{ id: string; notes: string } | null>(null);

  useEffect(() => {
    loadDiscardedTenders();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, searchTerm, discarded]);

  const loadDiscardedTenders = async () => {
    try {
      setLoading(true);

      // Fetch all records in batches (Supabase has a 1000 record limit per query)
      const batchSize = 1000;
      let allData: DiscardedTender[] = [];
      let start = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('discarded_tenders')
          .select('*')
          .order('discard_confidence', { ascending: true })
          .range(start, start + batchSize - 1);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          start += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setDiscarded(allData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discarded tenders');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...discarded];

    // Apply status filter
    switch (filter) {
      case 'unreviewed':
        filtered = filtered.filter(d => !d.reviewed);
        break;
      case 'flagged':
        filtered = filtered.filter(d => d.should_include === true);
        break;
      // 'all' - no filtering
    }

    // Apply text search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.title?.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower) ||
        d.buyer_organisation_name?.toLowerCase().includes(searchLower) ||
        d.discard_reason?.toLowerCase().includes(searchLower) ||
        d.search_text?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDiscarded(filtered);
  };

  const markAsInclude = async (id: string, currentValue: boolean | null) => {
    try {
      const newValue = !currentValue;

      // @ts-expect-error - Supabase type inference issue
      const { error } = await supabase.from('discarded_tenders').update({ should_include: newValue, reviewed: true }).eq('id', id);

      if (error) throw error;

      // Update local state
      setDiscarded(prev => prev.map(t =>
        t.id === id ? { ...t, should_include: newValue, reviewed: true } : t
      ));
    } catch (err) {
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const markAsReviewed = async (id: string) => {
    try {
      // @ts-expect-error - Supabase type inference issue
      const { error } = await supabase.from('discarded_tenders').update({ reviewed: true }).eq('id', id);

      if (error) throw error;

      // Update local state
      setDiscarded(prev => prev.map(t =>
        t.id === id ? { ...t, reviewed: true } : t
      ));
    } catch (err) {
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      // @ts-expect-error - Supabase type inference issue
      const { error } = await supabase.from('discarded_tenders').update({ reviewer_notes: notes, reviewed: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setDiscarded(prev => prev.map(t =>
        t.id === id ? { ...t, reviewer_notes: notes, reviewed: true } : t
      ));

      setActiveNote(null);
    } catch (err) {
      alert(`Failed to save notes: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stats = {
    total: discarded.length,
    unreviewed: discarded.filter(d => !d.reviewed).length,
    flagged: discarded.filter(d => d.should_include === true).length
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading discarded tenders...</div>
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
        <h1 className="text-3xl font-bold mb-2">Discarded Tenders Review</h1>
        <p className="text-muted-foreground">
          Review tenders that were discarded by the classification system.
          Flag any that should have been included to improve filtering.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Discarded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.unreviewed}</div>
            <p className="text-sm text-muted-foreground">Unreviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.flagged}</div>
            <p className="text-sm text-muted-foreground">Should Include (False Negatives)</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, description, buyer, or discard reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="unreviewed">
            Unreviewed ({stats.unreviewed})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Discarded ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="flagged">
            Should Include ({stats.flagged})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Discarded Tenders List */}
      {filteredDiscarded.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No tenders found for selected filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDiscarded.map(tender => (
            <Card key={tender.id} className={tender.should_include ? 'border-red-300' : undefined}>
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tender.title || 'Untitled'}</CardTitle>
                    <CardDescription>
                      {tender.buyer_organisation_name || 'Unknown buyer'} •
                      Published {tender.published_date ? new Date(tender.published_date).toLocaleDateString() : 'Unknown date'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Badge variant={
                      tender.discard_confidence > 90 ? 'default' :
                      tender.discard_confidence > 80 ? 'secondary' : 'outline'
                    }>
                      {tender.discard_confidence}% confidence
                    </Badge>
                    {tender.should_include && (
                      <Badge variant="destructive">Should Include</Badge>
                    )}
                    {tender.reviewed && !tender.should_include && (
                      <Badge variant="secondary">Reviewed</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {tender.description || 'No description available'}
                </p>

                {/* Discard Details */}
                <div className="bg-muted p-3 rounded mb-4">
                  <p className="text-sm font-medium mb-1">Discard Reason:</p>
                  <p className="text-sm">{tender.discard_reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {tender.discard_confidence}%
                  </p>
                </div>

                {/* Reviewer Notes */}
                {tender.reviewer_notes && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4">
                    <p className="text-sm font-medium mb-1">Reviewer Notes:</p>
                    <p className="text-sm">{tender.reviewer_notes}</p>
                  </div>
                )}

                {/* Active Notes Editor */}
                {activeNote?.id === tender.id && (
                  <div className="mb-4">
                    <Textarea
                      placeholder="Add reviewer notes..."
                      value={activeNote.notes}
                      onChange={(e) => setActiveNote({ ...activeNote, notes: e.target.value })}
                      className="mb-2"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNotes(tender.id, activeNote.notes)}>
                        Save Notes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveNote(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Search Text (for debugging) */}
                <details className="text-sm mb-4">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View full search text
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {tender.search_text}
                  </pre>
                </details>

                {/* Review Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={tender.should_include ? 'default' : 'outline'}
                    onClick={() => markAsInclude(tender.id, tender.should_include)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {tender.should_include ? 'Marked as Should Include' : 'Mark as Should Include'}
                  </Button>
                  {!tender.reviewed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsReviewed(tender.id)}
                    >
                      Mark Reviewed
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveNote({ id: tender.id, notes: tender.reviewer_notes || '' })}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {tender.reviewer_notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

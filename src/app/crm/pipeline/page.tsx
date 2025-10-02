'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp,
  Search,
  Filter,
  Plus,
  Eye,
  Calendar,
  Clock,
  DollarSign,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Opportunity {
  id: string;
  trust_code: string;
  trust_name?: string;
  opportunity_name: string;
  service_line: string | null;
  stage: string;
  probability: number;
  estimated_value: number | null;
  expected_close_date: string | null;
  opportunity_owner: string | null;
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  id: string;
  title: string;
  probability: number;
  color: string;
  opportunities: Opportunity[];
}

const SERVICE_LINES = [
  'General Surgery',
  'Trauma & Orthopaedics',
  'Urology',
  'ENT',
  'Ophthalmology',
  'Diagnostics - MRI',
  'Diagnostics - CT',
  'Diagnostics - Ultrasound',
  'Other',
];

const OPPORTUNITY_SOURCES = [
  'analytics_insight',
  'cold_outreach',
  'referral',
  'inbound',
];

export default function PipelinePage() {
  const { user, isAdministrator } = useAuth();
  const [stages, setStages] = useState<PipelineStage[]>([
    { id: 'identification', title: 'Identification', probability: 30, color: 'bg-gray-100', opportunities: [] },
    { id: 'discovery', title: 'Discovery', probability: 50, color: 'bg-blue-100', opportunities: [] },
    { id: 'proposal', title: 'Proposal', probability: 70, color: 'bg-purple-100', opportunities: [] },
    { id: 'negotiation', title: 'Negotiation', probability: 90, color: 'bg-green-100', opportunities: [] },
    { id: 'closed_won', title: 'Closed Won', probability: 100, color: 'bg-emerald-100', opportunities: [] },
    { id: 'closed_lost', title: 'Closed Lost', probability: 0, color: 'bg-red-100', opportunities: [] },
  ]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showClosedLost, setShowClosedLost] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [trustFilter, setTrustFilter] = useState<string>('all');
  const [serviceLineFilter, setServiceLineFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [trusts, setTrusts] = useState<{ trust_code: string; trust_name: string }[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  // Form state for creating opportunity
  const [formData, setFormData] = useState({
    opportunity_name: '',
    trust_code: '',
    service_line: '',
    stage: 'identification',
    probability: 30,
    estimated_value: '',
    contract_length_months: '',
    expected_close_date: '',
    opportunity_source: 'cold_outreach',
    performance_driver: '',
    competitive_intel: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchOpportunities();
    fetchTrusts();
  }, [user?.email, isAdministrator]);

  const fetchTrusts = async () => {
    try {
      const response = await fetch('/api/crm/accounts');
      const result = await response.json();
      if (result.data) {
        setTrusts(result.data.map((acc: any) => ({
          trust_code: acc.trust_code,
          trust_name: acc.trust_name,
        })));
      }
    } catch (error) {
      console.error('Error fetching trusts:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // If not admin, filter by current user's opportunities
      if (!isAdministrator && user?.email) {
        params.append('opportunity_owner', user.email);
      }

      const response = await fetch(`/api/crm/opportunities?${params}`);
      const result = await response.json();

      if (result.data) {
        // Group opportunities by stage
        const stageMap: Record<string, Opportunity[]> = {
          identification: [],
          discovery: [],
          proposal: [],
          negotiation: [],
          closed_won: [],
          closed_lost: [],
        };

        const ownerSet = new Set<string>();

        result.data.forEach((opp: Opportunity) => {
          if (stageMap[opp.stage]) {
            stageMap[opp.stage].push(opp);
          }
          if (opp.opportunity_owner) {
            ownerSet.add(opp.opportunity_owner);
          }
        });

        setOwners(Array.from(ownerSet));

        setStages((prev) =>
          prev.map((stage) => ({
            ...stage,
            opportunities: stageMap[stage.id] || [],
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const opportunityId = active.id as string;
    const newStageId = over.id as string;

    // Find the opportunity
    let opportunity: Opportunity | null = null;
    let currentStageId: string | null = null;

    for (const stage of stages) {
      const found = stage.opportunities.find((opp) => opp.id === opportunityId);
      if (found) {
        opportunity = found;
        currentStageId = stage.id;
        break;
      }
    }

    if (!opportunity || currentStageId === newStageId) {
      setActiveId(null);
      return;
    }

    // Find the new stage to get the probability
    const newStage = stages.find((s) => s.id === newStageId);
    if (!newStage) {
      setActiveId(null);
      return;
    }

    // Optimistically update UI
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === currentStageId) {
          return {
            ...stage,
            opportunities: stage.opportunities.filter((opp) => opp.id !== opportunityId),
          };
        }
        if (stage.id === newStageId) {
          return {
            ...stage,
            opportunities: [...stage.opportunities, { ...opportunity, stage: newStageId, probability: newStage.probability }],
          };
        }
        return stage;
      })
    );

    // Update on server
    try {
      await fetch(`/api/crm/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStageId,
          probability: newStage.probability,
        }),
      });
    } catch (error) {
      console.error('Error updating opportunity:', error);
      // Revert on error
      fetchOpportunities();
    }

    setActiveId(null);
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
          contract_length_months: formData.contract_length_months ? parseInt(formData.contract_length_months) : null,
          opportunity_owner: user?.email,
        }),
      });

      const result = await response.json();

      if (result.data) {
        setIsCreateSheetOpen(false);
        setFormData({
          opportunity_name: '',
          trust_code: '',
          service_line: '',
          stage: 'identification',
          probability: 30,
          estimated_value: '',
          contract_length_months: '',
          expected_close_date: '',
          opportunity_source: 'cold_outreach',
          performance_driver: '',
          competitive_intel: '',
        });
        fetchOpportunities();
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
    }
  };

  // Filter opportunities
  const filteredStages = stages.map((stage) => {
    let filtered = stage.opportunities;

    if (searchTerm) {
      filtered = filtered.filter(
        (opp) =>
          opp.opportunity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (opp.trust_name && opp.trust_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (trustFilter !== 'all') {
      filtered = filtered.filter((opp) => opp.trust_code === trustFilter);
    }

    if (serviceLineFilter !== 'all') {
      filtered = filtered.filter((opp) => opp.service_line === serviceLineFilter);
    }

    if (ownerFilter !== 'all') {
      filtered = filtered.filter((opp) => opp.opportunity_owner === ownerFilter);
    }

    return {
      ...stage,
      opportunities: filtered,
    };
  });

  // Calculate pipeline metrics
  const calculateStageValue = (opportunities: Opportunity[]) => {
    return opportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);
  };

  const calculateWeightedValue = (opportunities: Opportunity[], probability: number) => {
    return opportunities.reduce((sum, opp) => {
      const value = opp.estimated_value || 0;
      return sum + (value * probability) / 100;
    }, 0);
  };

  const totalWeightedPipeline = filteredStages
    .filter((s) => !['closed_won', 'closed_lost'].includes(s.id))
    .reduce((sum, stage) => sum + calculateWeightedValue(stage.opportunities, stage.probability), 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}k`;
    }
    return `£${value.toFixed(0)}`;
  };

  const getDaysInStage = (updatedAt: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005eb8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  const visibleStages = showClosedLost ? filteredStages : filteredStages.filter((s) => s.id !== 'closed_lost');
  const activeOpportunity = activeId
    ? stages.flatMap((s) => s.opportunities).find((o) => o.id === activeId)
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Opportunity Pipeline</h1>
          <p className="text-gray-600 mt-1">
            Total Weighted Pipeline: <span className="font-semibold text-[#005eb8]">{formatCurrency(totalWeightedPipeline)}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClosedLost(!showClosedLost)}
          >
            {showClosedLost ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Closed Lost
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Closed Lost
              </>
            )}
          </Button>

          <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Opportunity
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create New Opportunity</SheetTitle>
                <SheetDescription>
                  Add a new opportunity to your pipeline
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleCreateOpportunity} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="opportunity_name">Opportunity Name *</Label>
                  <Input
                    id="opportunity_name"
                    value={formData.opportunity_name}
                    onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
                    placeholder="e.g., Orthopaedic Surgery Insourcing"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trust_code">Trust *</Label>
                  <Select
                    value={formData.trust_code}
                    onValueChange={(value) => setFormData({ ...formData, trust_code: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trust" />
                    </SelectTrigger>
                    <SelectContent>
                      {trusts.map((trust) => (
                        <SelectItem key={trust.trust_code} value={trust.trust_code}>
                          {trust.trust_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_line">Service Line</Label>
                  <Select
                    value={formData.service_line}
                    onValueChange={(value) => setFormData({ ...formData, service_line: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service line" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_LINES.map((line) => (
                        <SelectItem key={line} value={line}>
                          {line}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage *</Label>
                    <Select
                      value={formData.stage}
                      onValueChange={(value) => {
                        const stageProb = stages.find((s) => s.id === value)?.probability || 30;
                        setFormData({ ...formData, stage: value, probability: stageProb });
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.filter((s) => !['closed_won', 'closed_lost'].includes(s.id)).map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimated_value">Estimated Value (£)</Label>
                    <Input
                      id="estimated_value"
                      type="number"
                      min="0"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract_length_months">Contract Length (months)</Label>
                    <Input
                      id="contract_length_months"
                      type="number"
                      min="0"
                      value={formData.contract_length_months}
                      onChange={(e) => setFormData({ ...formData, contract_length_months: e.target.value })}
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Expected Close Date</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opportunity_source">Opportunity Source</Label>
                  <Select
                    value={formData.opportunity_source}
                    onValueChange={(value) => setFormData({ ...formData, opportunity_source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPPORTUNITY_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="performance_driver">Performance Driver</Label>
                  <Textarea
                    id="performance_driver"
                    value={formData.performance_driver}
                    onChange={(e) => setFormData({ ...formData, performance_driver: e.target.value })}
                    placeholder="What performance issue is driving this opportunity?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="competitive_intel">Competitive Intelligence</Label>
                  <Textarea
                    id="competitive_intel"
                    value={formData.competitive_intel}
                    onChange={(e) => setFormData({ ...formData, competitive_intel: e.target.value })}
                    placeholder="What do we know about competitors?"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Create Opportunity
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateSheetOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={trustFilter} onValueChange={setTrustFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Trusts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trusts</SelectItem>
                {trusts.map((trust) => (
                  <SelectItem key={trust.trust_code} value={trust.trust_code}>
                    {trust.trust_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={serviceLineFilter} onValueChange={setServiceLineFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Service Line" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Service Lines</SelectItem>
                {SERVICE_LINES.map((line) => (
                  <SelectItem key={line} value={line}>
                    {line}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdministrator && (
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(searchTerm || trustFilter !== 'all' || serviceLineFilter !== 'all' || ownerFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setTrustFilter('all');
                  setServiceLineFilter('all');
                  setOwnerFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleStages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              stageValue={calculateStageValue(stage.opportunities)}
              weightedValue={calculateWeightedValue(stage.opportunities, stage.probability)}
              formatCurrency={formatCurrency}
              getDaysInStage={getDaysInStage}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && activeOpportunity ? (
            <OpportunityCard
              opportunity={activeOpportunity}
              getDaysInStage={getDaysInStage}
              formatCurrency={formatCurrency}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface KanbanColumnProps {
  stage: PipelineStage;
  stageValue: number;
  weightedValue: number;
  formatCurrency: (value: number) => string;
  getDaysInStage: (updatedAt: string) => number;
}

function KanbanColumn({ stage, stageValue, weightedValue, formatCurrency, getDaysInStage }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 space-y-3"
    >
      {/* Column Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{stage.title}</h3>
          <Badge variant="outline">{stage.opportunities.length}</Badge>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Total Value:</span>
            <span className="font-medium">{formatCurrency(stageValue)}</span>
          </div>
          {!['closed_won', 'closed_lost'].includes(stage.id) && (
            <div className="flex justify-between">
              <span>Weighted ({stage.probability}%):</span>
              <span className="font-medium text-[#005eb8]">{formatCurrency(weightedValue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Opportunity Cards */}
      <div className="space-y-2 min-h-[200px]">
        {stage.opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            getDaysInStage={getDaysInStage}
            formatCurrency={formatCurrency}
          />
        ))}

        {stage.opportunities.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No opportunities
          </div>
        )}
      </div>
    </div>
  );
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  getDaysInStage: (updatedAt: string) => number;
  formatCurrency: (value: number) => string;
  isDragging?: boolean;
}

function OpportunityCard({ opportunity, getDaysInStage, formatCurrency, isDragging = false }: OpportunityCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: opportunity.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-move hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50 rotate-3' : ''
      }`}
    >
      <CardContent className="p-4 space-y-2">
        {/* Trust Name */}
        {opportunity.trust_name && (
          <p className="text-xs font-medium text-gray-500 truncate">
            {opportunity.trust_name}
          </p>
        )}

        {/* Opportunity Name */}
        <h4 className="font-semibold text-gray-900 line-clamp-2">
          {opportunity.opportunity_name}
        </h4>

        {/* Service Line */}
        {opportunity.service_line && (
          <Badge variant="outline" className="text-xs">
            {opportunity.service_line}
          </Badge>
        )}

        {/* Value & Probability */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-700">
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">
              {opportunity.estimated_value ? formatCurrency(opportunity.estimated_value) : 'No value'}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {opportunity.probability}%
          </Badge>
        </div>

        {/* Expected Close Date */}
        {opportunity.expected_close_date && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>Close: {new Date(opportunity.expected_close_date).toLocaleDateString()}</span>
          </div>
        )}

        {/* Days in Stage */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Clock className="h-3 w-3" />
          <span>{getDaysInStage(opportunity.updated_at)} days in stage</span>
        </div>

        {/* View Details */}
        <Link
          href={`/crm/accounts/${opportunity.trust_code}`}
          className="flex items-center gap-1 text-xs text-[#005eb8] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="h-3 w-3" />
          View account
        </Link>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { supabaseAuth } from '@/lib/supabase-auth';
import { getStageBadgeClass, getStageLabel, formatCurrency } from '@/lib/crm-stage-utils';
import Link from 'next/link';

interface Opportunity {
  id: string;
  trust_code: string;
  trust_name: string;
  opportunity_name: string;
  service_line: string | null;
  stage: string;
  estimated_value: number | null;
}

export function DashboardTopOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopOpportunities = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabaseAuth.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setOpportunities([]);
        return;
      }

      const { data, error } = await supabaseAuth
        .from('opportunities')
        .select('id, trust_code, opportunity_name, service_line, stage, estimated_value')
        .eq('opportunity_owner', userEmail)
        .not('stage', 'in', '("closed_won","closed_lost")')
        .order('estimated_value', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;

      // Fetch trust names
      // @ts-expect-error - Supabase type inference issue
      const trustCodes = [...new Set(data?.map((o) => o.trust_code))];
      const trustsMap = new Map();

      if (trustCodes.length > 0) {
        const { data: trusts } = await supabaseAuth
          .from('trust_metrics')
          .select('trust_code, trust_name')
          .in('trust_code', trustCodes);
        // @ts-expect-error - Supabase type inference issue
        trusts?.forEach((t) => trustsMap.set(t.trust_code, t.trust_name));
      }

      const mappedOpportunities = (data || []).map((opp: any) => ({
        ...opp,
        trust_name: trustsMap.get(opp.trust_code) || opp.trust_code,
      }));

      setOpportunities(mappedOpportunities);
    } catch (err) {
      console.error('Error fetching top opportunities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopOpportunities();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Top Opportunities
          </CardTitle>
          <Link
            href="/crm/opportunities"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No open opportunities</p>
            <p className="text-xs">Create your first opportunity to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <Link
                key={opp.id}
                href={`/crm/trusts/${opp.trust_code}`}
                className="block p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm leading-tight truncate">
                        {opp.trust_name}
                      </h4>
                      <Badge className={getStageBadgeClass(opp.stage)}>
                        {getStageLabel(opp.stage)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {opp.opportunity_name}
                    </p>
                    {opp.service_line && (
                      <p className="text-xs text-muted-foreground mt-1">{opp.service_line}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(opp.estimated_value)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

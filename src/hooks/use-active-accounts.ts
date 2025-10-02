import { useState, useEffect } from 'react';
import { supabaseAuth } from '@/lib/supabase-auth';

interface Opportunity {
  id: string;
  opportunity_name: string;
  stage: string;
  estimated_value: number | null;
  owner_name?: string;
  owner_email?: string;
}

interface ActiveAccount {
  trust_code: string;
  trust_name: string;
  icb_name: string;
  account_stage: string | null;
  last_contact_date: string | null;
  days_since_contact: number | null;
  contact_status: string;
  my_opportunities: Opportunity[];
  other_opportunities: Array<{
    id: string;
    opportunity_name: string;
    stage: string;
    owner_name: string;
  }>;
  my_opportunity_count: number;
  my_pipeline_value: number;
  other_opportunity_count: number;
}

export function useActiveAccounts() {
  const [accounts, setAccounts] = useState<ActiveAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveAccounts = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabaseAuth.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setAccounts([]);
        return;
      }

      // Get accounts where I have opportunities or recent activity
      const { data: myOpportunities, error: oppsError } = await supabaseAuth
        .from('opportunities')
        .select(`
          id,
          trust_code,
          opportunity_name,
          stage,
          estimated_value,
          opportunity_owner
        `)
        .eq('opportunity_owner', userEmail)
        .not('stage', 'in', '("closed_won","closed_lost")');

      if (oppsError) throw oppsError;

      // Get unique trust codes where I have opportunities
      // @ts-expect-error - Supabase type inference issue
      const trustCodes = Array.from(new Set((myOpportunities || []).map(o => o.trust_code)));

      if (trustCodes.length === 0) {
        setAccounts([]);
        setIsLoading(false);
        return;
      }

      // Fetch account and trust details
      const { data: accountsData, error: accountsError } = await supabaseAuth
        .from('accounts')
        .select(`
          trust_code,
          account_stage,
          last_contact_date
        `)
        .in('trust_code', trustCodes);

      if (accountsError) throw accountsError;

      // Fetch trust details
      const { data: trustsData, error: trustsError } = await supabaseAuth
        .from('trust_metrics')
        .select('trust_code, trust_name, icb_name')
        .in('trust_code', trustCodes);

      if (trustsError) throw trustsError;

      // Get other people's opportunities for visibility
      const { data: otherOpportunities, error: otherOppsError } = await supabaseAuth
        .from('opportunities')
        .select('id, trust_code, opportunity_name, stage, opportunity_owner')
        .in('trust_code', trustCodes)
        .neq('opportunity_owner', userEmail)
        .not('stage', 'in', '("closed_won","closed_lost")');

      if (otherOppsError) console.error('Error fetching other opportunities:', otherOppsError);

      // Fetch user profiles for opportunity owners
      // @ts-expect-error - Supabase type inference issue
      const ownerEmails = [...new Set((otherOpportunities || []).map(o => o.opportunity_owner).filter(Boolean))];
      const profilesMap = new Map();
      if (ownerEmails.length > 0) {
        const { data: profiles } = await supabaseAuth
          .from('user_profiles')
          .select('id, full_name')
          .in('id', ownerEmails);
        // @ts-expect-error - Supabase type inference issue
        profiles?.forEach(p => profilesMap.set(p.id, p.full_name));
      }

      // Combine data
      const accountsMap = new Map(
        // @ts-expect-error - Supabase type inference issue
        (accountsData || []).map(a => [a.trust_code, a])
      );

      const trustsMap = new Map(
        // @ts-expect-error - Supabase type inference issue
        (trustsData || []).map(t => [t.trust_code, t])
      );

      const combinedAccounts: ActiveAccount[] = trustCodes.map(trustCode => {
        const account = accountsMap.get(trustCode);
        const trust = trustsMap.get(trustCode);
        // @ts-expect-error - Supabase type inference issue
        const myOpps = (myOpportunities || []).filter(o => o.trust_code === trustCode);
        // @ts-expect-error - Supabase type inference issue
        const otherOpps = (otherOpportunities || []).filter(o => o.trust_code === trustCode);

        // @ts-expect-error - Supabase type inference issue
        const lastContactDate = account?.last_contact_date;
        const daysSinceContact = lastContactDate
          ? Math.floor((Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        let contactStatus = 'never_contacted';
        if (daysSinceContact !== null) {
          if (daysSinceContact < 14) contactStatus = 'active';
          else if (daysSinceContact < 30) contactStatus = 'at_risk';
          else if (daysSinceContact < 60) contactStatus = 'neglected';
          else contactStatus = 'critical';
        }

        // @ts-expect-error - Supabase type inference issue
        const pipelineValue = myOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

        // @ts-expect-error - Supabase type inference issue
        const trustName = trust?.trust_name || trustCode;
        // @ts-expect-error - Supabase type inference issue
        const icbName = trust?.icb_name || '';
        // @ts-expect-error - Supabase type inference issue
        const accountStage = account?.account_stage || null;

        return {
          trust_code: trustCode,
          trust_name: trustName,
          icb_name: icbName,
          account_stage: accountStage,
          last_contact_date: lastContactDate || null,
          days_since_contact: daysSinceContact,
          contact_status: contactStatus,
          my_opportunities: myOpps,
          other_opportunities: otherOpps.map((o: any) => ({
            id: o.id,
            opportunity_name: o.opportunity_name,
            stage: o.stage,
            owner_name: profilesMap.get(o.opportunity_owner) || o.opportunity_owner,
          })),
          my_opportunity_count: myOpps.length,
          my_pipeline_value: pipelineValue,
          other_opportunity_count: otherOpps.length,
        };
      });

      // Sort by last contact date (nulls last)
      combinedAccounts.sort((a, b) => {
        if (!a.last_contact_date && !b.last_contact_date) return 0;
        if (!a.last_contact_date) return 1;
        if (!b.last_contact_date) return -1;
        return new Date(b.last_contact_date).getTime() - new Date(a.last_contact_date).getTime();
      });

      setAccounts(combinedAccounts);
    } catch (err) {
      console.error('Error fetching active accounts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch active accounts'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveAccounts();
  }, []);

  return {
    accounts,
    isLoading,
    error,
    refetch: fetchActiveAccounts,
  };
}

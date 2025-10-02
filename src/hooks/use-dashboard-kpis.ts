import { useState, useEffect } from 'react';
import { supabaseAuth } from '@/lib/supabase-auth';

interface DashboardKPIs {
  activeTrusts: {
    count: number;
    trend: number; // new this quarter
  };
  openOpportunities: {
    value: number;
    count: number;
  };
  monthlyTarget: {
    target: number;
    achieved: number;
    percentage: number;
  };
  conversionRate: {
    rate: number;
    won: number;
    total: number;
  };
}

export function useDashboardKPIs() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    activeTrusts: { count: 0, trend: 0 },
    openOpportunities: { value: 0, count: 0 },
    monthlyTarget: { target: 0, achieved: 0, percentage: 0 },
    conversionRate: { rate: 0, won: 0, total: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchKPIs = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabaseAuth.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      // Get date ranges
      const now = new Date();
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Active NHS Trusts (trusts with active_client stage)
      const { data: activeAccounts, error: accountsError } = await supabaseAuth
        .from('accounts')
        .select('trust_code, account_stage, created_at')
        .eq('account_stage', 'active_client');

      if (accountsError) throw accountsError;

      const activeTrustsCount = activeAccounts?.length || 0;
      const newThisQuarter = activeAccounts?.filter(
        // @ts-expect-error - Supabase type inference issue
        a => new Date(a.created_at) >= startOfQuarter
      ).length || 0;

      // 2. Open Opportunities (non-closed, my opportunities)
      const { data: openOpps, error: oppsError } = await supabaseAuth
        .from('opportunities')
        .select('id, estimated_value')
        .eq('opportunity_owner', userEmail)
        .not('stage', 'in', '("closed_won","closed_lost")');

      if (oppsError) throw oppsError;

      // @ts-expect-error - Supabase type inference issue
      const openOppsValue = openOpps?.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) || 0;
      const openOppsCount = openOpps?.length || 0;

      // 3. Monthly Target - Calculate from opportunities closed this month
      const { data: closedThisMonth, error: monthError } = await supabaseAuth
        .from('opportunities')
        .select('estimated_value, stage')
        .eq('opportunity_owner', userEmail)
        .eq('stage', 'closed_won')
        .gte('actual_close_date', startOfMonth.toISOString());

      if (monthError) throw monthError;

      const achievedThisMonth = closedThisMonth?.reduce(
        // @ts-expect-error - Supabase type inference issue
        (sum, opp) => sum + (opp.estimated_value || 0), 0
      ) || 0;

      // Target is placeholder - could be stored in user_profiles or calculated
      // For now, set target as 3x current open pipeline or minimum of 500K
      const monthlyTargetValue = Math.max(500000, openOppsValue * 0.3);
      const targetPercentage = monthlyTargetValue > 0
        ? (achievedThisMonth / monthlyTargetValue) * 100
        : 0;

      // 4. Conversion Rate This Quarter
      const { data: quarterOpps, error: quarterError } = await supabaseAuth
        .from('opportunities')
        .select('stage')
        .eq('opportunity_owner', userEmail)
        .gte('created_at', startOfQuarter.toISOString())
        .in('stage', ['closed_won', 'closed_lost']);

      if (quarterError) throw quarterError;

      const quarterTotal = quarterOpps?.length || 0;
      // @ts-expect-error - Supabase type inference issue
      const quarterWon = quarterOpps?.filter(o => o.stage === 'closed_won').length || 0;
      const conversionRateValue = quarterTotal > 0 ? (quarterWon / quarterTotal) * 100 : 0;

      setKpis({
        activeTrusts: {
          count: activeTrustsCount,
          trend: newThisQuarter,
        },
        openOpportunities: {
          value: openOppsValue,
          count: openOppsCount,
        },
        monthlyTarget: {
          target: monthlyTargetValue,
          achieved: achievedThisMonth,
          percentage: targetPercentage,
        },
        conversionRate: {
          rate: conversionRateValue,
          won: quarterWon,
          total: quarterTotal,
        },
      });
    } catch (err) {
      console.error('Error fetching dashboard KPIs:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  return {
    kpis,
    isLoading,
    error,
    refetch: fetchKPIs,
  };
}

import { supabase } from '@/lib/supabase-client';

// Type definitions for tender queries
export interface MarketActivitySummary {
  totalActiveProcurements: number;
  totalValue: number;
  insourcingOpportunities: number;
  insourcingValue: number;
  trendPercentage: number;
}

export interface ProcurementTimelineItem {
  id: string;
  published_date: string;
  title: string;
  value: number | null;
  status: string;
  classification: string | null;
  is_framework: boolean | null;
  contracts_finder_url: string | null;
}

export interface SupplierData {
  name: string;
  totalValue: number;
  contractCount: number;
  contracts: Array<{
    title: string;
    value: number | null;
    awardDate: string | null;
  }>;
}

/**
 * Get market activity summary for a trust
 * Compares last 3 months vs previous 3 months for trend calculation
 */
export async function getMarketActivitySummary(trustCode: string): Promise<MarketActivitySummary> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Get current period (last 3 months)
  const { data: currentPeriod, error: currentError } = await supabase
    .from('tenders')
    .select('contract_value_min, contract_value_max, classification')
    .eq('trust_code', trustCode)
    .eq('status', 'open')
    .gte('published_date', threeMonthsAgo.toISOString());

  if (currentError) {
    console.error('[getMarketActivitySummary] Error fetching current period:', currentError);
    throw currentError;
  }

  // Get previous period (3-6 months ago)
  const { data: previousPeriod, error: previousError } = await supabase
    .from('tenders')
    .select('contract_value_min, contract_value_max')
    .eq('trust_code', trustCode)
    .gte('published_date', sixMonthsAgo.toISOString())
    .lt('published_date', threeMonthsAgo.toISOString());

  if (previousError) {
    console.error('[getMarketActivitySummary] Error fetching previous period:', previousError);
    // Non-fatal - continue without trend data
  }

  // Calculate metrics - use average of min/max for value estimates
  const calculateValue = (tender: any) => {
    const min = tender.contract_value_min || 0;
    const max = tender.contract_value_max || 0;
    return (min + max) / 2;
  };

  const totalActive = currentPeriod?.length || 0;
  const totalValue = currentPeriod?.reduce((sum, t) => sum + calculateValue(t), 0) || 0;
  const insourcingCount = (currentPeriod as any[])?.filter((t: any) => t.classification === 'insourcing_opportunity').length || 0;
  const insourcingValue = (currentPeriod as any[])
    ?.filter((t: any) => t.classification === 'insourcing_opportunity')
    .reduce((sum, t) => sum + calculateValue(t), 0) || 0;

  const previousCount = previousPeriod?.length || 0;
  const trend = previousCount > 0
    ? ((totalActive - previousCount) / previousCount) * 100
    : 0;

  return {
    totalActiveProcurements: totalActive,
    totalValue,
    insourcingOpportunities: insourcingCount,
    insourcingValue,
    trendPercentage: trend
  };
}

/**
 * Get procurement timeline for a trust within a date range
 * Returns all tenders published within the specified period
 */
export async function getProcurementTimeline(
  trustCode: string,
  dateRange: { start: string; end: string }
): Promise<ProcurementTimelineItem[]> {
  const { data, error } = await supabase
    .from('tenders')
    .select('id, published_date, title, contract_value_min, contract_value_max, status, classification, is_framework, tender_url')
    .eq('trust_code', trustCode)
    .gte('published_date', dateRange.start)
    .lte('published_date', dateRange.end)
    .order('published_date', { ascending: true });

  if (error) {
    console.error('[getProcurementTimeline] Error:', error);
    throw error;
  }

  // Transform data to include calculated value and map tender_url to contracts_finder_url
  return ((data as any[]) || []).map((tender: any) => ({
    id: tender.id,
    published_date: tender.published_date,
    title: tender.title,
    value: ((tender.contract_value_min || 0) + (tender.contract_value_max || 0)) / 2,
    status: tender.status,
    classification: tender.classification,
    is_framework: tender.is_framework,
    contracts_finder_url: tender.tender_url
  }));
}

/**
 * Get top suppliers by contract value for a trust
 * NOTE: Current database schema does not include supplier/award information
 * This function returns an empty array until the schema is updated
 */
export async function getTopSuppliers(trustCode: string, limit: number = 5): Promise<SupplierData[]> {
  // The tenders table does not currently have awarded_supplier or award_date columns
  // Return empty array to allow the component to show its empty state
  console.log('[getTopSuppliers] Supplier data not available in current schema');
  return [];
}

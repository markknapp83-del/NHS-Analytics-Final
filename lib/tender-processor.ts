// /lib/tender-processor.ts

import { supabase } from '../src/lib/supabase-client';
import { getTrustMapper } from './trust-mapper';
import type { ParsedTender } from './contracts-finder-client';

interface ProcessedTender {
  contracts_finder_id: string;
  ocid: string | null;
  title: string;
  description: string;
  status: string;
  buyer_organisation_name: string;
  buyer_organisation_id: string | null;
  trust_code: string | null;
  icb_code: string | null;
  buyer_contact_name: string | null;
  buyer_contact_email: string | null;
  buyer_contact_phone: string | null;
  contract_value_min: number | null;
  contract_value_max: number | null;
  currency: string;
  contract_type: string | null;
  cpv_codes: string[] | null;
  service_category: string | null;
  published_date: string;
  deadline_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_duration_months: number | null;
  tender_url: string | null;
  documents: string[] | null;
  source: string;
  data_source_url: string | null;
  last_fetched_at: string;
}

export class TenderProcessor {
  private trustMapper: any;

  constructor() {
  }

  async initialize(): Promise<void> {
    this.trustMapper = await getTrustMapper();
  }

  /**
   * Process and enrich a single tender from CSV data
   */
  async processTender(parsedTender: ParsedTender): Promise<ProcessedTender> {
    // Map buyer to trust code
    const trustMapping = await this.trustMapper.mapBuyerToTrust(parsedTender.buyer.name);

    // Categorize tender based on title and description
    const category = await this.categorizeTender(parsedTender.title, parsedTender.description);

    // Calculate contract duration if dates available
    let durationMonths: number | null = null;
    if (parsedTender.startDate && parsedTender.endDate) {
      const start = new Date(parsedTender.startDate);
      const end = new Date(parsedTender.endDate);
      durationMonths = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    }

    const processed: ProcessedTender = {
      contracts_finder_id: parsedTender.id,
      ocid: null, // CSV doesn't provide OCID
      title: parsedTender.title,
      description: parsedTender.description || '',
      status: parsedTender.status || 'open',
      buyer_organisation_name: parsedTender.buyer.name,
      buyer_organisation_id: null, // CSV doesn't provide org ID
      trust_code: trustMapping?.trust_code || null,
      icb_code: trustMapping?.icb_code || null,
      buyer_contact_name: parsedTender.buyer.contactName || null,
      buyer_contact_email: parsedTender.buyer.contactEmail || null,
      buyer_contact_phone: parsedTender.buyer.contactPhone || null,
      contract_value_min: parsedTender.value.amountMin,
      contract_value_max: parsedTender.value.amountMax,
      currency: parsedTender.value.currency,
      contract_type: parsedTender.contractType || null,
      cpv_codes: parsedTender.cpvCodes.length > 0 ? parsedTender.cpvCodes : null,
      service_category: category,
      published_date: parsedTender.publishedDate,
      deadline_date: parsedTender.closingDate,
      contract_start_date: parsedTender.startDate,
      contract_end_date: parsedTender.endDate,
      contract_duration_months: durationMonths,
      tender_url: parsedTender.links[0] || null,
      documents: parsedTender.links.length > 0 ? parsedTender.links : null,
      source: 'contracts_finder_csv',
      data_source_url: `https://www.contractsfinder.service.gov.uk/notice/${parsedTender.id}`,
      last_fetched_at: new Date().toISOString(),
    };

    return processed;
  }

  /**
   * Categorize tender based on content
   */
  private async categorizeTender(title: string, description: string): Promise<string | null> {
    const text = `${title} ${description}`.toLowerCase();

    // Fetch categories from database
    const { data: categories } = await supabase
      .from('tender_categories')
      .select('category_name, keywords');

    if (!categories || categories.length === 0) return null;

    // Score each category
    let bestCategory: string | null = null;
    let bestScore = 0;

    for (const category of categories as any[]) {
      const keywords: string[] = category.keywords || [];
      let score = 0;

      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          score++;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category.category_name;
      }
    }

    return bestScore > 0 ? bestCategory : 'Other Healthcare Services';
  }

  /**
   * Batch process multiple tenders
   */
  async processBatch(parsedTenders: ParsedTender[]): Promise<ProcessedTender[]> {
    if (!this.trustMapper) {
      await this.initialize();
    }

    const processed: ProcessedTender[] = [];

    for (const parsedTender of parsedTenders) {
      try {
        const tender = await this.processTender(parsedTender);
        processed.push(tender);
      } catch (error) {
        console.error(`Failed to process tender ${parsedTender.id}:`, error);
      }
    }

    return processed;
  }

  /**
   * Upsert tenders to database
   */
  async saveTenders(tenders: ProcessedTender[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const tender of tenders) {
      const { data: existing } = await supabase
        .from('tenders')
        .select('id')
        .eq('contracts_finder_id', tender.contracts_finder_id)
        .single();

      if (existing) {
        // Update existing tender
        // @ts-expect-error - Type inference issue with Supabase update
        const { error } = await supabase.from('tenders').update({ ...tender, updated_at: new Date().toISOString() }).eq('contracts_finder_id', tender.contracts_finder_id);

        if (!error) updated++;
      } else {
        // Insert new tender
        // @ts-expect-error - Type inference issue with Supabase insert
        const { error } = await supabase.from('tenders').insert(tender);

        if (!error) inserted++;
      }
    }

    return { inserted, updated };
  }
}

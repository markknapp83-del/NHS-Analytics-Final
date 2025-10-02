// /lib/trust-mapper.ts

import { supabase } from '../src/lib/supabase-client';
import Fuse from 'fuse.js';

interface Trust {
  trust_code: string;
  trust_name: string;
  icb_code: string;
  icb_name: string;
}

interface TrustMapping {
  trust_code: string;
  trust_name: string;
  icb_code: string;
  confidence_score: number;
  mapping_method: 'exact_match' | 'fuzzy_match' | 'keyword_match' | 'manual';
}

export class TrustMapper {
  private trusts: Trust[] = [];
  private fuse: Fuse<Trust> | null = null;
  private mappingCache: Map<string, TrustMapping> = new Map();

  /**
   * Initialize mapper with trust list from database
   * Uses RPC function to avoid Supabase record limits
   */
  async initialize(): Promise<void> {
    // CRITICAL: Use RPC function for server-side DISTINCT query
    // This avoids hitting Supabase's record limit (1000 rows)
    // Direct select queries only fetch ~1000 rows, which yields ~57 unique trusts after deduplication
    // RPC function performs DISTINCT on server side and returns all 167 trusts
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_trusts') as { data: any[] | null, error: any };

    if (rpcError) {
      throw new Error(`Failed to load trusts via RPC: ${rpcError.message}`);
    }

    console.log(`[TrustMapper] Fetched ${rpcData?.length || 0} unique trusts from database`);

    // Transform RPC result to our Trust interface
    this.trusts = (rpcData || []).map((row: any) => ({
      trust_code: row.trust_code,
      trust_name: row.trust_name,
      icb_code: row.icb_code || '',
      icb_name: row.icb_name || ''
    }));

    console.log(`[TrustMapper] Loaded ${this.trusts.length} trusts for mapping`);
    if (this.trusts.length > 0) {
      console.log(`[TrustMapper] Sample trusts:`, this.trusts.slice(0, 3).map(t => t.trust_name));
    }

    // Initialize fuzzy search
    this.fuse = new Fuse(this.trusts, {
      keys: ['trust_name'],
      threshold: 0.3,
      includeScore: true,
    });

    console.log(`[TrustMapper] Trust mapper initialized with ${this.trusts.length} trusts`);
  }

  /**
   * Map a buyer organisation name to a trust code
   */
  async mapBuyerToTrust(buyerName: string): Promise<TrustMapping | null> {
    if (!this.fuse) {
      await this.initialize();
    }

    // Check cache first
    const cached = this.mappingCache.get(buyerName.toLowerCase());
    if (cached) {
      return cached;
    }

    // Normalize buyer name
    const normalized = this.normalizeName(buyerName);

    // Strategy 1: Exact match
    const exactMatch = this.trusts.find(
      t => this.normalizeName(t.trust_name) === normalized
    );
    if (exactMatch) {
      const mapping: TrustMapping = {
        trust_code: exactMatch.trust_code,
        trust_name: exactMatch.trust_name,
        icb_code: exactMatch.icb_code,
        confidence_score: 1.0,
        mapping_method: 'exact_match',
      };
      this.mappingCache.set(buyerName.toLowerCase(), mapping);
      return mapping;
    }

    // Strategy 2: Fuzzy match using Fuse.js
    const fuzzyResults = this.fuse!.search(buyerName);
    if (fuzzyResults.length > 0 && fuzzyResults[0].score! < 0.3) {
      const match = fuzzyResults[0].item;
      const mapping: TrustMapping = {
        trust_code: match.trust_code,
        trust_name: match.trust_name,
        icb_code: match.icb_code,
        confidence_score: 1 - fuzzyResults[0].score!,
        mapping_method: 'fuzzy_match',
      };
      this.mappingCache.set(buyerName.toLowerCase(), mapping);
      return mapping;
    }

    // Strategy 3: Keyword-based matching
    const keywordMatch = this.findKeywordMatch(buyerName);
    if (keywordMatch) {
      this.mappingCache.set(buyerName.toLowerCase(), keywordMatch);
      return keywordMatch;
    }

    // No match found
    console.warn(`No trust mapping found for: ${buyerName}`);
    return null;
  }

  /**
   * Normalize organization name for comparison
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(nhs|trust|foundation|ft|university hospitals?|hospitals?)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Find trust using keyword patterns
   */
  private findKeywordMatch(buyerName: string): TrustMapping | null {
    const normalized = buyerName.toLowerCase();

    // Look for location-based keywords in both buyer name and trust names
    for (const trust of this.trusts) {
      const trustNameLower = trust.trust_name.toLowerCase();

      // Extract location names (words before "NHS" or "Trust")
      const buyerLocation = this.extractLocation(normalized);
      const trustLocation = this.extractLocation(trustNameLower);

      if (buyerLocation && trustLocation && buyerLocation === trustLocation) {
        return {
          trust_code: trust.trust_code,
          trust_name: trust.trust_name,
          icb_code: trust.icb_code,
          confidence_score: 0.7,
          mapping_method: 'keyword_match',
        };
      }
    }

    return null;
  }

  /**
   * Extract primary location identifier from organization name
   */
  private extractLocation(name: string): string | null {
    const patterns = [
      /^([a-z\s]+?)\s+(?:nhs|trust|foundation|university)/i,
      /^([a-z\s]+?)\s+and\s+/i,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Batch map multiple buyer names
   */
  async mapMultipleBuyers(buyerNames: string[]): Promise<Map<string, TrustMapping | null>> {
    const results = new Map<string, TrustMapping | null>();

    for (const buyerName of buyerNames) {
      const mapping = await this.mapBuyerToTrust(buyerName);
      results.set(buyerName, mapping);
    }

    return results;
  }

  /**
   * Get mapping statistics
   */
  getMappingStats(): {
    totalCached: number;
    exactMatches: number;
    fuzzyMatches: number;
    keywordMatches: number;
  } {
    const stats = {
      totalCached: this.mappingCache.size,
      exactMatches: 0,
      fuzzyMatches: 0,
      keywordMatches: 0,
    };

    this.mappingCache.forEach(mapping => {
      switch (mapping.mapping_method) {
        case 'exact_match':
          stats.exactMatches++;
          break;
        case 'fuzzy_match':
          stats.fuzzyMatches++;
          break;
        case 'keyword_match':
          stats.keywordMatches++;
          break;
      }
    });

    return stats;
  }
}

// Singleton instance
let trustMapperInstance: TrustMapper | null = null;

export async function getTrustMapper(): Promise<TrustMapper> {
  if (!trustMapperInstance) {
    trustMapperInstance = new TrustMapper();
    await trustMapperInstance.initialize();
  }
  return trustMapperInstance;
}

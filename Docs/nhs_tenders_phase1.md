# NHS Tenders Integration - Phase 1 Implementation Plan

## Project Overview
Integrate UK Government Contracts Finder API to capture all NHS tender opportunities and display them in the NHS Analytics dashboard. This is Phase 1 of a larger initiative to build a comprehensive opportunity scoring system.

## Project Context
- **Location**: `C:\Users\Mark\Projects\NHS Data Analytics v5`
- **Existing Database**: Supabase PostgreSQL with 271-column NHS trust dataset
- **Technology Stack**: Next.js 14, TypeScript, Supabase, Papa Parse
- **Data Coverage**: 151 NHS trusts with 12 months RTT performance data

## Strategic Vision (Future Phases)
This implementation is foundational for:
- **Phase 2**: Opportunity scoring algorithm combining tender + RTT data
- **Phase 3**: UI redesign with tenders as prominent feature alongside RTT
- **End Goal**: Create market-leading insourcing opportunity intelligence platform

## Phase 1 Objectives
**Keep it simple - prove the concept:**
1. Pull ALL NHS tenders from Contracts Finder API
2. Store tender data in Supabase database
3. Display tenders on basic page with trust selector
4. Enable filtering and searching
5. Validate data quality and coverage

---

## Task 1: Contracts Finder Public Data Access Research (2 hours) ✅ COMPLETED

### Task 1.1: Public CSV Export Discovery & Testing
```bash
# Claude Code Task: Validate public CSV export capabilities
# Action: Test CSV download endpoints and document data structure
# Output: api_documentation.md, sample_responses.json
```

**✅ COMPLETED - Key Findings:**
- **Public Access Confirmed**: No OAuth required for CSV exports
- **Endpoint URL**: `https://www.contractsfinder.service.gov.uk/Search/GetCsvFile`
- **Initial Dataset**: ~849 NHS tenders found in last 90 days
- **Data Quality**: 100% populated for basic fields, 60% for contract values

**Available Query Parameters:**
```
?keyword=NHS+Trust          # Search term
&published=90               # Days back (e.g., 90 = last 90 days)
&location=                  # Optional location filter
&valueFrom=25000           # Minimum contract value
&valueTo=                  # Maximum contract value
```

### Task 1.2: CSV Data Structure Documentation
```bash
# Claude Code Task: Document CSV fields and NHS identification strategy
# Action: Parse sample CSV data and validate all 42 fields
# Output: Complete field documentation with examples
```

**✅ COMPLETED - CSV Structure (42 fields):**

**Core Identification:**
- `Id` - Unique Contracts Finder ID
- `Title` - Tender title
- `Description` - Full tender description
- `Status` - open/closed/awarded/cancelled

**Buyer Information:**
- `Organisation Name` - Buyer organization (for trust mapping)
- `Postcode` - Location data
- `Region` - Geographic region
- `Contact Name`, `Contact Email`, `Contact Telephone`

**Contract Details:**
- `Value Low` - Minimum contract value
- `Value High` - Maximum contract value  
- `Contract Type` - Goods/Services/Works
- `Suitable for SME` - Boolean flag
- `Suitable for VCO` - Boolean flag

**Timeline:**
- `Published Date` - When tender was published
- `Closing Date` - Application deadline
- `Start Date` - Contract start date
- `End Date` - Contract end date

**Classification:**
- `CPV Codes` - Common Procurement Vocabulary codes
- `Awarded Date` - If already awarded
- `Suppliers` - Winning suppliers (if awarded)

**Links:**
- `Links` - URLs to tender documents and details

**NHS Identification Strategy:**
Multiple keyword patterns tested:
- `keyword=NHS+Trust` → 849 results ✅
- `keyword=NHS` → Broader results (includes non-trust NHS bodies)
- `keyword=National+Health+Service` → Alternative search
- Post-filter using trust names from our 151-trust database ✅

**Deliverables:**
- [x] ✅ Public CSV access validated and working
- [x] ✅ Sample CSV data downloaded and parsed (849 tenders)
- [x] ✅ All 42 CSV fields documented with examples
- [x] ✅ NHS tender identification strategy validated
- [x] ✅ Data quality assessed (100% basic fields, 60% values)
- [x] ✅ No authentication required - immediate implementation possible

---

## Task 2: Database Schema Design (1 hour) ✅ COMPLETED

### Task 2.1: Tenders Table Schema
```bash
# Claude Code Task: Design Supabase schema for tender data
# Action: Create comprehensive tender storage structure
# Output: supabase/migrations/create_tenders_table.sql
```

**Tenders Table Schema:**
```sql
-- Main tenders table
CREATE TABLE tenders (
    -- Primary identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contracts_finder_id VARCHAR(255) UNIQUE NOT NULL, -- CF unique identifier
    ocid VARCHAR(255), -- Open Contracting ID (if available)
    
    -- Basic tender information
    title TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50), -- 'open', 'closed', 'awarded', 'cancelled'
    
    -- Buyer information
    buyer_organisation_name TEXT NOT NULL,
    buyer_organisation_id VARCHAR(255),
    trust_code VARCHAR(10), -- Mapped to our trust_metrics.trust_code
    icb_code VARCHAR(10), -- Geographic grouping
    buyer_contact_name VARCHAR(255),
    buyer_contact_email VARCHAR(255),
    buyer_contact_phone VARCHAR(50),
    
    -- Contract details
    contract_value_min DECIMAL(15,2),
    contract_value_max DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'GBP',
    contract_type VARCHAR(100), -- 'Goods', 'Services', 'Works'
    
    -- Classification
    cpv_codes JSONB, -- Common Procurement Vocabulary codes
    service_category VARCHAR(255), -- Our categorization: 'Surgery', 'Diagnostics', etc.
    
    -- Timeline
    published_date TIMESTAMP WITH TIME ZONE NOT NULL,
    deadline_date TIMESTAMP WITH TIME ZONE,
    contract_start_date DATE,
    contract_end_date DATE,
    contract_duration_months INTEGER,
    
    -- Links and documents
    tender_url TEXT,
    documents JSONB, -- Array of document URLs and descriptions
    
    -- Source metadata
    source VARCHAR(50) DEFAULT 'contracts_finder',
    data_source_url TEXT,
    
    -- Processing metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            coalesce(title, '') || ' ' || 
            coalesce(description, '') || ' ' ||
            coalesce(buyer_organisation_name, '')
        )
    ) STORED
);

-- Indexes for performance
CREATE INDEX idx_tenders_trust_code ON tenders(trust_code);
CREATE INDEX idx_tenders_published_date ON tenders(published_date DESC);
CREATE INDEX idx_tenders_deadline ON tenders(deadline_date);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_buyer_org ON tenders(buyer_organisation_name);
CREATE INDEX idx_tenders_contract_value ON tenders(contract_value_max);
CREATE INDEX idx_tenders_search ON tenders USING GIN(search_vector);
CREATE INDEX idx_tenders_cpv ON tenders USING GIN(cpv_codes);

-- Trust mapping helper table
CREATE TABLE trust_tender_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_organisation_name TEXT NOT NULL,
    trust_code VARCHAR(10) NOT NULL,
    trust_name TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00 mapping confidence
    mapping_method VARCHAR(50), -- 'exact_match', 'fuzzy_match', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(buyer_organisation_name, trust_code)
);

-- Tender categories for our service classification
CREATE TABLE tender_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    category_description TEXT,
    cpv_codes_pattern JSONB, -- CPV codes that map to this category
    keywords JSONB, -- Keywords that suggest this category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Populate initial categories
INSERT INTO tender_categories (category_name, category_description, keywords) VALUES
('Surgery & Theatre Services', 'Surgical procedures, theatre staffing, surgical equipment', '["surgery", "surgical", "theatre", "operating", "anaesthesia", "orthopaedic", "cardiothoracic"]'),
('Diagnostic Services', 'MRI, CT, ultrasound, pathology, radiology services', '["diagnostic", "radiology", "imaging", "MRI", "CT scan", "ultrasound", "pathology", "x-ray"]'),
('Outpatient Services', 'Outpatient clinics, consultation services', '["outpatient", "clinic", "consultation", "appointment"]'),
('Emergency Services', 'A&E services, urgent care', '["emergency", "A&E", "urgent care", "emergency department"]'),
('Medical Equipment', 'Medical devices, equipment procurement', '["equipment", "medical devices", "apparatus", "machinery"]'),
('Clinical Staffing', 'Doctor, nurse, clinical staff recruitment', '["staffing", "recruitment", "locum", "nursing", "medical staff", "clinical staff"]'),
('Primary Care Services', 'GP services, community health', '["primary care", "GP", "general practice", "community health"]'),
('Mental Health Services', 'Mental health and psychiatric services', '["mental health", "psychiatric", "psychology", "CAMHS"]'),
('Other Healthcare Services', 'Miscellaneous healthcare services', '[]');
```

**Deliverables:**
- [x] ✅ Supabase migration script created
- [x] ✅ Tables created in database
- [x] ✅ Indexes optimized for query patterns
- [x] ✅ Initial tender categories populated
- [x] ✅ Trust mapping table ready for population

---

## Task 3: Data Extraction Pipeline (6 hours)

### Task 3.1: CSV Download Client
```bash
# Claude Code Task: Build TypeScript client for CSV download and parsing
# Action: Create simple HTTP client with CSV parsing using Papa Parse
# Output: /lib/contracts-finder-client.ts
```

**CSV Client Implementation:**
```typescript
// /lib/contracts-finder-client.ts

import Papa from 'papaparse';

interface CSVDownloadParams {
  keyword?: string;
  published?: number; // Days back (e.g., 90 for last 90 days)
  location?: string;
  valueFrom?: number;
  valueTo?: number;
}

interface RawContractsFinderTender {
  // Core fields from CSV
  Id: string;
  Title: string;
  Description: string;
  Status: string;
  'Organisation Name': string;
  Postcode: string;
  Region: string;
  'Contact Name': string;
  'Contact Email': string;
  'Contact Telephone': string;
  'Value Low': string;
  'Value High': string;
  'Contract Type': string;
  'Suitable for SME': string;
  'Suitable for VCO': string;
  'Published Date': string;
  'Closing Date': string;
  'Start Date': string;
  'End Date': string;
  'CPV Codes': string;
  Links: string;
  [key: string]: string; // Allow for additional fields
}

interface ParsedTender {
  id: string;
  title: string;
  description: string;
  status: string;
  buyer: {
    name: string;
    postcode: string;
    region: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  };
  value: {
    amountMin: number | null;
    amountMax: number | null;
    currency: string;
  };
  contractType: string;
  publishedDate: string;
  closingDate: string | null;
  startDate: string | null;
  endDate: string | null;
  cpvCodes: string[];
  links: string[];
  suitableForSME: boolean;
  suitableForVCO: boolean;
}

export class ContractsFinderClient {
  private baseUrl = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile';

  /**
   * Download CSV file from Contracts Finder
   */
  async downloadCSV(params: CSVDownloadParams = {}): Promise<string> {
    const queryParams = new URLSearchParams();
    
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.published) queryParams.append('published', params.published.toString());
    if (params.location) queryParams.append('location', params.location);
    if (params.valueFrom) queryParams.append('valueFrom', params.valueFrom.toString());
    if (params.valueTo) queryParams.append('valueTo', params.valueTo.toString());

    const url = `${this.baseUrl}?${queryParams}`;
    
    console.log(`Downloading CSV from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error(`CSV download failed: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Parse CSV text into structured tender objects
   */
  parseCSV(csvText: string): RawContractsFinderTender[] {
    const result = Papa.parse<RawContractsFinderTender>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors);
    }

    return result.data;
  }

  /**
   * Transform raw CSV data into our internal format
   */
  transformTender(raw: RawContractsFinderTender): ParsedTender {
    return {
      id: raw.Id,
      title: raw.Title || '',
      description: raw.Description || '',
      status: raw.Status?.toLowerCase() || 'unknown',
      buyer: {
        name: raw['Organisation Name'] || '',
        postcode: raw.Postcode || '',
        region: raw.Region || '',
        contactName: raw['Contact Name'] || '',
        contactEmail: raw['Contact Email'] || '',
        contactPhone: raw['Contact Telephone'] || '',
      },
      value: {
        amountMin: this.parseValue(raw['Value Low']),
        amountMax: this.parseValue(raw['Value High']),
        currency: 'GBP',
      },
      contractType: raw['Contract Type'] || '',
      publishedDate: raw['Published Date'] || '',
      closingDate: raw['Closing Date'] || null,
      startDate: raw['Start Date'] || null,
      endDate: raw['End Date'] || null,
      cpvCodes: this.parseCPVCodes(raw['CPV Codes']),
      links: this.parseLinks(raw.Links),
      suitableForSME: raw['Suitable for SME']?.toLowerCase() === 'true',
      suitableForVCO: raw['Suitable for VCO']?.toLowerCase() === 'true',
    };
  }

  /**
   * Parse monetary value from string (handles £, commas, etc.)
   */
  private parseValue(valueStr: string): number | null {
    if (!valueStr) return null;
    
    // Remove £, commas, spaces
    const cleaned = valueStr.replace(/[£,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse CPV codes (comma-separated string)
   */
  private parseCPVCodes(cpvStr: string): string[] {
    if (!cpvStr) return [];
    return cpvStr.split(',').map(code => code.trim()).filter(Boolean);
  }

  /**
   * Parse links (pipe-separated URLs)
   */
  private parseLinks(linksStr: string): string[] {
    if (!linksStr) return [];
    return linksStr.split('|').map(link => link.trim()).filter(Boolean);
  }

  /**
   * Download and parse NHS tenders in one call
   */
  async getNHSTenders(daysBack: number = 90): Promise<ParsedTender[]> {
    console.log(`Fetching NHS tenders from last ${daysBack} days...`);
    
    // Download CSV
    const csvText = await this.downloadCSV({
      keyword: 'NHS Trust',
      published: daysBack,
      valueFrom: 25000, // £25k threshold
    });

    // Parse CSV
    const rawTenders = this.parseCSV(csvText);
    console.log(`Found ${rawTenders.length} tenders in CSV`);

    // Transform to our format
    const parsed = rawTenders.map(raw => this.transformTender(raw));
    
    return parsed;
  }

  /**
   * Download all NHS tenders with multiple keyword searches
   */
  async getAllNHSTenders(daysBack: number = 90): Promise<ParsedTender[]> {
    const allTenders = new Map<string, ParsedTender>();

    // Search with multiple keywords to maximize coverage
    const keywords = [
      'NHS Trust',
      'NHS Foundation Trust',
      'National Health Service',
    ];

    for (const keyword of keywords) {
      console.log(`Searching with keyword: "${keyword}"`);
      
      const csvText = await this.downloadCSV({
        keyword,
        published: daysBack,
        valueFrom: 25000,
      });

      const rawTenders = this.parseCSV(csvText);
      const parsed = rawTenders.map(raw => this.transformTender(raw));

      // Deduplicate by ID
      parsed.forEach(tender => {
        allTenders.set(tender.id, tender);
      });

      // Rate limiting - be polite to the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Total unique NHS tenders: ${allTenders.size}`);
    return Array.from(allTenders.values());
  }

  /**
   * Download tenders for specific date range
   */
  async getTendersByDateRange(startDate: Date, endDate: Date): Promise<ParsedTender[]> {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return this.getNHSTenders(daysDiff);
  }
}

// Singleton instance
export function createContractsFinderClient(): ContractsFinderClient {
  return new ContractsFinderClient();
}
```

### Task 3.2: Trust Mapping Logic
```bash
# Claude Code Task: Build intelligent trust code mapping
# Action: Map Contracts Finder buyer names to our trust codes
# Output: /lib/trust-mapper.ts
```

**Trust Mapping Implementation:**
```typescript
// /lib/trust-mapper.ts

import { createClient } from '@/lib/supabase/client';
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
   */
  async initialize(): Promise<void> {
    const supabase = createClient();
    
    // Get unique trusts from trust_metrics table
    const { data, error } = await supabase
      .from('trust_metrics')
      .select('trust_code, trust_name, icb_code, icb_name')
      .order('trust_name');

    if (error) {
      throw new Error(`Failed to load trusts: ${error.message}`);
    }

    // Deduplicate trusts
    const trustMap = new Map<string, Trust>();
    data?.forEach(row => {
      if (!trustMap.has(row.trust_code)) {
        trustMap.set(row.trust_code, {
          trust_code: row.trust_code,
          trust_name: row.trust_name,
          icb_code: row.icb_code || '',
          icb_name: row.icb_name || '',
        });
      }
    });

    this.trusts = Array.from(trustMap.values());

    // Initialize fuzzy search
    this.fuse = new Fuse(this.trusts, {
      keys: ['trust_name'],
      threshold: 0.3,
      includeScore: true,
    });

    console.log(`Trust mapper initialized with ${this.trusts.length} trusts`);
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
```

### Task 3.3: Tender Data Processor
```bash
# Claude Code Task: Build tender data transformation pipeline
# Action: Convert CSV data to database format with enrichment
# Output: /lib/tender-processor.ts
```

**Data Processing Implementation:**
```typescript
// /lib/tender-processor.ts

import { createClient } from '@/lib/supabase/client';
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
  private supabase: any;

  constructor() {
    this.supabase = createClient();
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
    const { data: categories } = await this.supabase
      .from('tender_categories')
      .select('category_name, keywords');

    if (!categories) return null;

    // Score each category
    let bestCategory: string | null = null;
    let bestScore = 0;

    for (const category of categories) {
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
      const { data: existing } = await this.supabase
        .from('tenders')
        .select('id')
        .eq('contracts_finder_id', tender.contracts_finder_id)
        .single();

      if (existing) {
        // Update existing tender
        const { error } = await this.supabase
          .from('tenders')
          .update({
            ...tender,
            updated_at: new Date().toISOString(),
          })
          .eq('contracts_finder_id', tender.contracts_finder_id);

        if (!error) updated++;
      } else {
        // Insert new tender
        const { error } = await this.supabase
          .from('tenders')
          .insert(tender);

        if (!error) inserted++;
      }
    }

    return { inserted, updated };
  }
}
```

### Task 3.4: Automated Sync Script
```bash
# Claude Code Task: Build scheduled tender sync process using CSV download
# Action: Create script to regularly fetch and update tenders from public CSV
# Output: /scripts/sync-tenders.ts
```

**Sync Script Implementation:**
```typescript
// /scripts/sync-tenders.ts

import { createContractsFinderClient } from '@/lib/contracts-finder-client';
import { TenderProcessor } from '@/lib/tender-processor';

interface SyncStats {
  startTime: Date;
  endTime: Date;
  tendersFound: number;
  tendersProcessed: number;
  tendersInserted: number;
  tendersUpdated: number;
  errors: string[];
}

async function syncTenders(daysBack: number = 90): Promise<SyncStats> {
  const stats: SyncStats = {
    startTime: new Date(),
    endTime: new Date(),
    tendersFound: 0,
    tendersProcessed: 0,
    tendersInserted: 0,
    tendersUpdated: 0,
    errors: [],
  };

  try {
    console.log(`Starting tender sync for last ${daysBack} days...`);

    // Initialize CSV client (no authentication needed)
    const client = createContractsFinderClient();
    console.log('✓ CSV client initialized');

    // Initialize processor
    const processor = new TenderProcessor();
    await processor.initialize();
    console.log('✓ Tender processor initialized');

    // Fetch NHS tenders from CSV
    console.log('Downloading NHS tenders CSV...');
    const parsedTenders = await client.getAllNHSTenders(daysBack);

    stats.tendersFound = parsedTenders.length;
    console.log(`✓ Found ${stats.tendersFound} NHS tenders`);

    // Process tenders
    console.log('Processing tenders...');
    const processedTenders = await processor.processBatch(parsedTenders);
    stats.tendersProcessed = processedTenders.length;
    console.log(`✓ Processed ${stats.tendersProcessed} tenders`);

    // Save to database
    console.log('Saving to database...');
    const { inserted, updated } = await processor.saveTenders(processedTenders);
    stats.tendersInserted = inserted;
    stats.tendersUpdated = updated;
    console.log(`✓ Inserted: ${inserted}, Updated: ${updated}`);

  } catch (error) {
    console.error('Sync failed:', error);
    stats.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  stats.endTime = new Date();
  const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
  console.log(`\nSync completed in ${duration}s`);
  console.log('Stats:', JSON.stringify(stats, null, 2));

  return stats;
}

// Run if executed directly
if (require.main === module) {
  const daysBack = parseInt(process.argv[2] || '90');
  syncTenders(daysBack)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { syncTenders };
```

**Package.json Script:**
```json
{
  "scripts": {
    "sync-tenders": "tsx scripts/sync-tenders.ts",
    "sync-tenders-weekly": "tsx scripts/sync-tenders.ts 7",
    "sync-tenders-monthly": "tsx scripts/sync-tenders.ts 30",
    "sync-tenders-full": "tsx scripts/sync-tenders.ts 90"
  }
}
```

**Deliverables:**
- [ ] CSV download client implemented (no OAuth needed)
- [ ] Trust mapping logic working with fuzzy matching
- [ ] Tender processor with categorization
- [ ] Sync script for automated updates via CSV
- [ ] Error handling and logging throughout
- [ ] Initial sync completed with validation

---

## Task 4: Simple Display Page (3 hours)

### Task 4.1: Tenders Page Component
```bash
# Claude Code Task: Create basic tenders listing page
# Action: Build Next.js page with trust selector and tender cards
# Output: /app/tenders/page.tsx
```

**Page Implementation:**
```typescript
// /app/tenders/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Calendar, Pound, Building2, Search } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface Tender {
  id: string;
  title: string;
  description: string;
  status: string;
  buyer_organisation_name: string;
  trust_code: string | null;
  trust_name: string | null;
  contract_value_min: number | null;
  contract_value_max: number | null;
  service_category: string | null;
  published_date: string;
  deadline_date: string | null;
  tender_url: string | null;
}

interface Trust {
  trust_code: string;
  trust_name: string;
}

export default function TendersPage() {
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [selectedTrust, setSelectedTrust] = useState<string>('all');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  // Load trusts on mount
  useEffect(() => {
    loadTrusts();
  }, []);

  // Load tenders when trust selection changes
  useEffect(() => {
    loadTenders();
  }, [selectedTrust]);

  async function loadTrusts() {
    const { data } = await supabase
      .from('trust_metrics')
      .select('trust_code, trust_name')
      .order('trust_name');

    if (data) {
      // Deduplicate trusts
      const uniqueTrusts = Array.from(
        new Map(data.map(t => [t.trust_code, t])).values()
      );
      setTrusts(uniqueTrusts);
    }
  }

  async function loadTenders() {
    setLoading(true);

    let query = supabase
      .from('tenders')
      .select('*')
      .order('published_date', { ascending: false });

    if (selectedTrust !== 'all') {
      query = query.eq('trust_code', selectedTrust);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to load tenders:', error);
    } else {
      setTenders(data || []);
    }

    setLoading(false);
  }

  // Filter tenders by search query
  const filteredTenders = tenders.filter(tender => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      tender.title.toLowerCase().includes(search) ||
      tender.description?.toLowerCase().includes(search) ||
      tender.buyer_organisation_name.toLowerCase().includes(search) ||
      tender.service_category?.toLowerCase().includes(search)
    );
  });

  // Separate active and closed tenders
  const activeTenders = filteredTenders.filter(t => 
    t.status === 'open' && (!t.deadline_date || !isPast(new Date(t.deadline_date)))
  );
  const closedTenders = filteredTenders.filter(t => 
    t.status !== 'open' || (t.deadline_date && isPast(new Date(t.deadline_date)))
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">NHS Tender Opportunities</h1>
        <p className="text-muted-foreground">
          Browse active tender opportunities across NHS trusts in England
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Select value={selectedTrust} onValueChange={setSelectedTrust}>
          <SelectTrigger className="w-full sm:w-[400px]">
            <SelectValue placeholder="Select NHS Trust" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All NHS Trusts ({tenders.length} tenders)</SelectItem>
            {trusts.map(trust => (
              <SelectItem key={trust.trust_code} value={trust.trust_code}>
                {trust.trust_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{activeTenders.length}</div>
            <p className="text-sm text-muted-foreground">Active Opportunities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{closedTenders.length}</div>
            <p className="text-sm text-muted-foreground">Closed Tenders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              £{calculateTotalValue(activeTenders)}M
            </div>
            <p className="text-sm text-muted-foreground">Total Value (Est.)</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading tenders...</p>
        </div>
      )}

      {/* Active Tenders */}
      {!loading && activeTenders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Active Opportunities ({activeTenders.length})
          </h2>
          <div className="grid gap-4">
            {activeTenders.map(tender => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        </div>
      )}

      {/* Closed Tenders */}
      {!loading && closedTenders.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Recently Closed ({closedTenders.length})
          </h2>
          <div className="grid gap-4">
            {closedTenders.map(tender => (
              <TenderCard key={tender.id} tender={tender} isExpired />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTenders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tenders found</h3>
            <p className="text-muted-foreground">
              {selectedTrust === 'all' 
                ? 'No tenders available matching your search'
                : 'No tenders available for this trust'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TenderCard({ tender, isExpired = false }: { tender: Tender; isExpired?: boolean }) {
  const daysUntilDeadline = tender.deadline_date
    ? formatDistanceToNow(new Date(tender.deadline_date), { addSuffix: true })
    : null;

  return (
    <Card className={isExpired ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{tender.title}</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                {tender.buyer_organisation_name}
                {tender.trust_code && (
                  <Badge variant="outline" className="ml-2">
                    {tender.trust_code}
                  </Badge>
                )}
              </div>
            </CardDescription>
          </div>
          {!isExpired && tender.tender_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={tender.tender_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Tender
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {tender.description}
        </p>

        <div className="flex flex-wrap gap-4 text-sm">
          {tender.service_category && (
            <Badge variant="secondary">{tender.service_category}</Badge>
          )}

          {(tender.contract_value_max || tender.contract_value_min) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Pound className="h-4 w-4" />
              {formatContractValue(tender.contract_value_min, tender.contract_value_max)}
            </div>
          )}

          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Published {formatDistanceToNow(new Date(tender.published_date), { addSuffix: true })}
          </div>

          {tender.deadline_date && (
            <div className={`flex items-center gap-1 ${isExpired ? 'text-muted-foreground' : 'text-orange-600 font-medium'}`}>
              <Calendar className="h-4 w-4" />
              {isExpired ? 'Closed' : `Closes ${daysUntilDeadline}`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatContractValue(min: number | null, max: number | null): string {
  if (max) {
    return `£${(max / 1000000).toFixed(1)}M`;
  } else if (min) {
    return `£${(min / 1000000).toFixed(1)}M`;
  }
  return 'Value TBC';
}

function calculateTotalValue(tenders: Tender[]): string {
  const total = tenders.reduce((sum, tender) => {
    const value = tender.contract_value_max || tender.contract_value_min || 0;
    return sum + value;
  }, 0);
  return (total / 1000000).toFixed(1);
}
```

**Deliverables:**
- [ ] Tenders page implemented with trust selector
- [ ] Tender cards showing key information
- [ ] Active/closed tender separation
- [ ] Search functionality
- [ ] Summary statistics
- [ ] Mobile-responsive design
- [ ] Links to official tender pages

---

## Task 5: Testing & Validation (2 hours)

### Task 5.1: End-to-End Testing
```bash
# Claude Code Task: Comprehensive testing of tender pipeline
# Action: Validate API → Database → UI flow
# Output: testing_report.md
```

**Testing Checklist:**

**API Integration:**
- [ ] OAuth authentication successful
- [ ] Search API returns NHS tenders
- [ ] CSV export downloads successfully
- [ ] Pagination works correctly
- [ ] Rate limiting respected
- [ ] Error handling works

**Data Processing:**
- [ ] Trust mapping achieves >80% accuracy
- [ ] Tender categorization working
- [ ] All required fields populated
- [ ] Duplicate detection prevents re-insertion
- [ ] Database constraints enforced

**Trust Mapping Validation:**
- [ ] Exact matches work (e.g., "Cambridge University Hospitals NHS FT")
- [ ] Fuzzy matches work (e.g., "Cambridge Uni Hospitals" → RGT)
- [ ] Unmapped buyers logged for review
- [ ] Mapping confidence scores reasonable

**UI Display:**
- [ ] Trust selector shows all 151 trusts
- [ ] Tender cards display correctly
- [ ] Search filtering works
- [ ] Active/closed separation accurate
- [ ] External links open correctly
- [ ] Mobile responsive

**Data Quality:**
- [ ] Tenders visible for multiple trusts
- [ ] Contract values display correctly
- [ ] Dates formatted properly
- [ ] Categories assigned appropriately
- [ ] No data corruption

### Task 5.2: Initial Data Sync & Validation
```bash
# Run initial sync for last 90 days
npm run sync-tenders 90

# Verify results
# Expected: 50-200+ NHS tenders depending on time of year
```

**Validation Queries:**
```sql
-- Check total tenders imported
SELECT COUNT(*) as total_tenders FROM tenders;

-- Check tenders by trust mapping status
SELECT 
  COUNT(*) as total,
  COUNT(trust_code) as mapped,
  COUNT(*) - COUNT(trust_code) as unmapped
FROM tenders;

-- Check tenders by category
SELECT 
  service_category,
  COUNT(*) as count
FROM tenders
GROUP BY service_category
ORDER BY count DESC;

-- Check tenders by status
SELECT 
  status,
  COUNT(*) as count
FROM tenders
GROUP BY status;

-- List unmapped buyer organizations (need manual review)
SELECT DISTINCT 
  buyer_organisation_name
FROM tenders
WHERE trust_code IS NULL
ORDER BY buyer_organisation_name;
```

**Deliverables:**
- [ ] Testing report with all checks passed
- [ ] Data quality metrics documented
- [ ] Unmapped trusts identified for manual mapping
- [ ] Performance benchmarks recorded
- [ ] Known issues documented

---

## Success Criteria

### Technical Success
- [ ] Contracts Finder API integration working
- [ ] OAuth authentication stable
- [ ] Database schema deployed
- [ ] Tenders table populated with data
- [ ] Trust mapping achieving >75% accuracy
- [ ] UI displaying tenders correctly
- [ ] Search and filtering functional

### Data Success
- [ ] Minimum 50 NHS tenders imported
- [ ] At least 20 different NHS trusts represented
- [ ] Contract values captured where available
- [ ] Deadlines and dates accurate
- [ ] Categories assigned to tenders
- [ ] External links working

### User Experience Success
- [ ] Page loads in <3 seconds
- [ ] Trust selector responsive
- [ ] Tender cards readable and informative
- [ ] Search provides instant results
- [ ] Mobile-friendly layout
- [ ] Links open in new tabs

---

## Environment Setup

### Required Environment Variables
```env
# NO API CREDENTIALS REQUIRED FOR PHASE 1! 🎉
# CSV download is public and requires no authentication

# Existing Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://fsopilxzaaukmcqcskqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Required NPM Packages
```json
{
  "dependencies": {
    "papaparse": "^5.4.1",
    "@types/papaparse": "^5.3.14",
    "fuse.js": "^7.0.0",
    "date-fns": "^3.0.0"
  }
}
```

**Key Simplifications:**
- ❌ No OAuth credentials needed
- ❌ No API registration process
- ❌ No authentication token management
- ✅ Simple HTTP GET requests
- ✅ Immediate implementation possible

---

## File Structure After Completion

```
NHS Data Analytics v5/
├── .env.local (NO changes needed - CSV is public!)
├── lib/
│   ├── contracts-finder-client.ts (NEW - CSV download client)
│   ├── trust-mapper.ts (NEW)
│   └── tender-processor.ts (NEW)
├── scripts/
│   └── sync-tenders.ts (NEW)
├── app/
│   └── tenders/
│       └── page.tsx (NEW)
├── supabase/
│   └── migrations/
│       └── create_tenders_tables.sql (NEW)
└── docs/
    ├── api_documentation.md (NEW - ✅ COMPLETED by Claude Code)
    ├── sample_responses.json (NEW - ✅ COMPLETED by Claude Code)
    ├── testing_report.md (NEW)
    └── tender_integration_guide.md (NEW)
```

---

## Next Steps (Phase 2 - Future Work)

**After Phase 1 is complete and validated:**

1. **Opportunity Scoring Algorithm**
   - Combine RTT performance data with tender availability
   - Score = f(RTT_delays, tender_relevance, contract_value, trust_capacity)
   - Machine learning potential for bid win prediction

2. **UI Redesign**
   - Integrate tenders into main dashboard
   - Add "Opportunity Score" to trust cards
   - Create dedicated "Opportunities" tab
   - Smart alerts for high-value, high-urgency tenders

3. **Advanced Features**
   - Bid tracking workflow
   - Tender history analysis
   - Competitive intelligence
   - Email alerts for new relevant tenders
   - Tender document parsing and analysis

4. **Analytics Enhancement**
   - Tender frequency by trust
   - Tender value trending
   - Service category demand analysis
   - Correlation: Poor RTT → More tenders
   - Win rate tracking (if we win bids)

---

## Claude Code Execution Instructions

### Phase 1A: ✅ CSV Access Research - COMPLETED
```bash
# Task 1 completed by Claude Code
# Validated public CSV access
# Documented 849 NHS tenders available
# No authentication required
```

### Phase 1B: Database Schema
```bash
claude-code execute --task="database-schema-design"
--context="Tender storage with trust mapping, CSV data source"
--deliverables="Migration script, tables created, indexes optimized"
```

### Phase 1C: Data Pipeline
```bash
claude-code execute --task="tender-processing-pipeline"
--context="CSV download to database with enrichment, no OAuth"
--deliverables="CSV client, processor, mapper, sync script"
```

### Phase 1D: UI Development
```bash
claude-code execute --task="tenders-display-page"
--context="Simple trust selector + tender cards"
--deliverables="Functional page in Next.js app"
```

### Phase 1E: Testing & Validation
```bash
claude-code execute --task="end-to-end-testing"
--context="Validate complete tender pipeline from CSV"
--deliverables="Test report, initial data sync with 849 tenders"
```

---

## Critical Notes for Claude Code

1. **No Authentication Required**: ✅ CSV download is public - skip all OAuth code
2. **Trust Mapping**: Fuzzy matching critical - expect ~75-85% accuracy initially
3. **Rate Limiting**: Be polite - 1 second delay between keyword searches
4. **Error Handling**: CSV parsing may fail - implement robust retry logic
5. **Data Quality**: Some tenders won't have all fields - handle nulls gracefully
6. **Performance**: Initial dataset ~849 tenders - optimize queries for growth
7. **Manual Review**: Some trust mappings will need manual correction - that's expected
8. **CSV Parsing**: Use Papa Parse with proper configuration for reliable results
9. **Multiple Keywords**: Search with multiple NHS keywords to maximize coverage
10. **Deduplication**: Same tender may appear in multiple keyword searches - deduplicate by ID

---

## Estimated Timeline

- **Task 1** (CSV Access Research): ✅ **2 hours - COMPLETED**
- **Task 2** (Database): 1 hour  
- **Task 3** (Data Pipeline): **4 hours** (reduced from 6 - no OAuth complexity)
- **Task 4** (UI Page): 3 hours
- **Task 5** (Testing): 2 hours

**Total: 12 hours** (approximately 1.5 working days) - reduced from 14 hours due to CSV simplification

---

## End State

**What we'll have after Phase 1:**
- Complete tender data pipeline from Contracts Finder API
- Database storing all NHS tender opportunities
- Basic but functional tenders page
- Foundation for advanced opportunity scoring (Phase 2)
- Proof of concept for integrating external procurement data

**What we WON'T have yet:**
- Opportunity scoring algorithm (Phase 2)
- UI redesign with prominent tender placement (Phase 2)
- Bid tracking workflow (Phase 3)
- Advanced analytics (Phase 3)

This is intentional - **prove the concept, then enhance**.

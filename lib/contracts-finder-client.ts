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

export interface ParsedTender {
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

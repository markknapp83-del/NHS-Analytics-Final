// /lib/enhanced-contracts-finder-client.ts
// Enhanced multi-search download system for Phase 1C

import Papa from 'papaparse';
import type { ParsedTender } from './contracts-finder-client';

interface DownloadConfig {
  name: string;
  description: string;
  url: string;
  params: Record<string, string>;
  expectedResults: number;
}

interface RawContractsFinderTender {
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
  [key: string]: string;
}

export interface DownloadStats {
  searchName: string;
  csvSize: number;
  rawCount: number;
  uniqueCount: number;
  duplicateCount: number;
  downloadTime: number;
}

export class EnhancedContractsFinderClient {
  private baseUrl = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile';

  /**
   * Download configurations for comprehensive NHS tender coverage
   */
  private getDownloadConfigs(): DownloadConfig[] {
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setFullYear(today.getFullYear() - 1);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    return [
      {
        name: 'active_nhs_opportunities',
        description: 'Active NHS opportunities (early engagement, future, open)',
        url: this.baseUrl,
        params: {
          keyword: 'NHS',
          published: '365', // Last 12 months
        },
        expectedResults: 500,
      },
      {
        name: 'awarded_nhs_contracts',
        description: 'Awarded NHS contracts (competitive intelligence)',
        url: this.baseUrl,
        params: {
          keyword: 'NHS',
          published: '365',
        },
        expectedResults: 500,
      },
      {
        name: 'nhs_trust_opportunities',
        description: 'NHS Trust specific opportunities',
        url: this.baseUrl,
        params: {
          keyword: 'NHS Trust',
          published: '365',
        },
        expectedResults: 300,
      },
      {
        name: 'nhs_foundation_trust',
        description: 'NHS Foundation Trust opportunities',
        url: this.baseUrl,
        params: {
          keyword: 'NHS Foundation Trust',
          published: '365',
        },
        expectedResults: 200,
      },
      {
        name: 'healthcare_services',
        description: 'Broader healthcare services',
        url: this.baseUrl,
        params: {
          keyword: 'health OR medical OR clinical',
          published: '365',
        },
        expectedResults: 300,
      },
    ];
  }

  /**
   * Download CSV from a single configuration
   */
  private async downloadCSV(url: string, params: Record<string, string>): Promise<string> {
    const queryParams = new URLSearchParams(params);
    const fullUrl = `${url}?${queryParams}`;

    const response = await fetch(fullUrl, {
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
   * Parse CSV text into raw tender objects
   */
  private parseCSV(csvText: string): RawContractsFinderTender[] {
    const result = Papa.parse<RawContractsFinderTender>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors.slice(0, 5));
    }

    return result.data;
  }

  /**
   * Transform raw CSV data into our internal format
   */
  private transformTender(raw: RawContractsFinderTender): ParsedTender {
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
   * Parse monetary value from string
   */
  private parseValue(valueStr: string): number | null {
    if (!valueStr) return null;
    const cleaned = valueStr.replace(/[£,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse CPV codes (comma-separated)
   */
  private parseCPVCodes(cpvStr: string): string[] {
    if (!cpvStr) return [];
    return cpvStr.split(',').map(code => code.trim()).filter(Boolean);
  }

  /**
   * Parse links (pipe-separated)
   */
  private parseLinks(linksStr: string): string[] {
    if (!linksStr) return [];
    return linksStr.split('|').map(link => link.trim()).filter(Boolean);
  }

  /**
   * Download all NHS tenders from multiple searches with deduplication
   */
  async downloadAllTenders(): Promise<{ tenders: ParsedTender[]; stats: DownloadStats[] }> {
    console.log('🚀 Starting comprehensive NHS tender download...\n');

    const allTenders = new Map<string, ParsedTender>();
    const allStats: DownloadStats[] = [];
    const configs = this.getDownloadConfigs();

    for (const config of configs) {
      const startTime = Date.now();

      console.log(`📥 Downloading: ${config.description}`);
      console.log(`   Search: ${config.name}`);

      try {
        // Download CSV
        const csvText = await this.downloadCSV(config.url, config.params);
        const csvSize = csvText.length;

        // Parse CSV
        const rawTenders = this.parseCSV(csvText);
        const rawCount = rawTenders.length;

        // Transform to parsed tenders
        const parsed = rawTenders.map(raw => this.transformTender(raw));

        // Track duplicates before deduplication
        const beforeSize = allTenders.size;

        // Deduplicate by ID
        parsed.forEach(tender => {
          if (tender.id) {
            allTenders.set(tender.id, tender);
          }
        });

        const afterSize = allTenders.size;
        const uniqueCount = afterSize - beforeSize;
        const duplicateCount = rawCount - uniqueCount;
        const downloadTime = Date.now() - startTime;

        const stats: DownloadStats = {
          searchName: config.name,
          csvSize,
          rawCount,
          uniqueCount,
          duplicateCount,
          downloadTime,
        };

        allStats.push(stats);

        console.log(`   ✓ Found ${rawCount} tenders`);
        console.log(`   ✓ New unique: ${uniqueCount}`);
        console.log(`   ✓ Duplicates skipped: ${duplicateCount}`);
        console.log(`   ✓ Time: ${(downloadTime / 1000).toFixed(1)}s\n`);

        // Rate limiting - be polite to the server
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`   ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);

        allStats.push({
          searchName: config.name,
          csvSize: 0,
          rawCount: 0,
          uniqueCount: 0,
          duplicateCount: 0,
          downloadTime: Date.now() - startTime,
        });
      }
    }

    console.log(`\n✅ Download complete!`);
    console.log(`   Total unique tenders: ${allTenders.size}\n`);

    return {
      tenders: Array.from(allTenders.values()),
      stats: allStats,
    };
  }

  /**
   * Generate download summary report
   */
  generateDownloadSummary(stats: DownloadStats[]): string {
    const totalRaw = stats.reduce((sum, s) => sum + s.rawCount, 0);
    const totalUnique = stats.reduce((sum, s) => sum + s.uniqueCount, 0);
    const totalDuplicates = stats.reduce((sum, s) => sum + s.duplicateCount, 0);
    const totalTime = stats.reduce((sum, s) => sum + s.downloadTime, 0);
    const totalSize = stats.reduce((sum, s) => sum + s.csvSize, 0);

    let report = '\n';
    report += '═══════════════════════════════════════════════════════════\n';
    report += '                  DOWNLOAD SUMMARY\n';
    report += '═══════════════════════════════════════════════════════════\n\n';

    stats.forEach(stat => {
      report += `📥 ${stat.searchName}\n`;
      report += `   Raw: ${stat.rawCount} | Unique: ${stat.uniqueCount} | Duplicates: ${stat.duplicateCount}\n`;
      report += `   Time: ${(stat.downloadTime / 1000).toFixed(1)}s | Size: ${(stat.csvSize / 1024).toFixed(0)}KB\n\n`;
    });

    report += '───────────────────────────────────────────────────────────\n';
    report += `Total Raw Tenders:      ${totalRaw}\n`;
    report += `Total Unique Tenders:   ${totalUnique}\n`;
    report += `Total Duplicates:       ${totalDuplicates}\n`;
    report += `Deduplication Rate:     ${((totalDuplicates / totalRaw) * 100).toFixed(1)}%\n`;
    report += `Total Download Size:    ${(totalSize / 1024 / 1024).toFixed(1)}MB\n`;
    report += `Total Time:             ${(totalTime / 1000).toFixed(1)}s\n`;
    report += '═══════════════════════════════════════════════════════════\n';

    return report;
  }
}

// Singleton instance
export function createEnhancedContractsFinderClient(): EnhancedContractsFinderClient {
  return new EnhancedContractsFinderClient();
}

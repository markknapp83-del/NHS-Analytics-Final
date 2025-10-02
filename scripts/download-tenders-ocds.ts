// /scripts/download-tenders-ocds.ts
// Download and parse NHS tenders from OCDS JSON data (12-month period)

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

import * as fs from 'fs';
import * as zlib from 'zlib';
import * as readline from 'readline';
import { promisify } from 'util';
import type { ParsedTender } from '../lib/contracts-finder-client';

const exec = promisify(require('child_process').exec);

interface OCDSRelease {
  ocid: string;
  id: string;
  date: string;
  tag: string[];
  buyer?: {
    id: string;
    name: string;
    address?: {
      postalCode?: string;
      region?: string;
      countryName?: string;
    };
    contactPoint?: {
      name?: string;
      email?: string;
      telephone?: string;
    };
  };
  tender?: {
    id: string;
    title?: string;
    description?: string;
    status?: string;
    value?: {
      amount?: number;
      currency?: string;
    };
    items?: Array<{
      id: string;
      classification?: {
        id?: string;
        scheme?: string;
      };
    }>;
    tenderPeriod?: {
      endDate?: string;
    };
    contractPeriod?: {
      startDate?: string;
      endDate?: string;
    };
    suitability?: {
      sme?: boolean;
      vcse?: boolean;
    };
  };
  awards?: Array<{
    id: string;
    date?: string;
    value?: {
      amount?: number;
      currency?: string;
    };
    status?: string;
    contractPeriod?: {
      startDate?: string;
      endDate?: string;
    };
  }>;
}

interface DownloadStats {
  totalRecords: number;
  nhsRecords: number;
  parsedTenders: number;
  errors: number;
  startTime: number;
  endTime: number;
}

export class OCDSTenderDownloader {
  private dataDir = '/tmp/contracts-finder-data';
  private stats: DownloadStats = {
    totalRecords: 0,
    nhsRecords: 0,
    parsedTenders: 0,
    errors: 0,
    startTime: 0,
    endTime: 0,
  };

  /**
   * Download OCDS JSON files for 2024 and 2025
   */
  async downloadOCDSFiles(): Promise<void> {
    console.log('📥 Downloading OCDS JSON data...\n');

    // Create data directory
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const files = [
      { year: '2024', url: 'https://data.open-contracting.org/en/publication/128/download?name=2024.jsonl.gz', size: '47MB' },
      { year: '2025', url: 'https://data.open-contracting.org/en/publication/128/download?name=2025.jsonl.gz', size: '23MB' },
    ];

    for (const file of files) {
      const filePath = `${this.dataDir}/${file.year}.jsonl.gz`;

      // Check if file already exists
      if (fs.existsSync(filePath)) {
        console.log(`✓ ${file.year} data already downloaded (${file.size})`);
        continue;
      }

      console.log(`Downloading ${file.year} data (${file.size})...`);
      await exec(`curl -L -o "${filePath}" "${file.url}"`);
      console.log(`✓ ${file.year} data downloaded\n`);
    }

    console.log('✅ All OCDS files ready\n');
  }

  /**
   * Parse a single OCDS release and convert to ParsedTender
   */
  private parseOCDSRelease(release: OCDSRelease): ParsedTender | null {
    try {
      // Must have tender section
      if (!release.tender) {
        return null;
      }

      const tender = release.tender;
      const buyer = release.buyer;
      const award = release.awards?.[0]; // Take first award if exists

      // Extract contract value (from tender or award)
      let valueMin: number | null = null;
      let valueMax: number | null = null;

      if (tender.value?.amount) {
        valueMin = tender.value.amount;
        valueMax = tender.value.amount;
      } else if (award?.value?.amount) {
        valueMin = award.value.amount;
        valueMax = award.value.amount;
      }

      // Determine status
      let status = 'unknown';
      if (tender.status === 'complete' && award?.status === 'active') {
        status = 'awarded';
      } else if (tender.status === 'active') {
        status = 'open';
      } else if (tender.status === 'complete') {
        status = 'closed';
      }

      // Extract CPV codes from items
      const cpvCodes: string[] = [];
      if (tender.items) {
        tender.items.forEach(item => {
          if (item.classification?.id) {
            cpvCodes.push(item.classification.id);
          }
        });
      }

      // Extract dates
      const publishedDate = release.date.split('T')[0];
      const closingDate = tender.tenderPeriod?.endDate?.split('T')[0] || null;
      const startDate = (tender.contractPeriod?.startDate || award?.contractPeriod?.startDate)?.split('T')[0] || null;
      const endDate = (tender.contractPeriod?.endDate || award?.contractPeriod?.endDate)?.split('T')[0] || null;

      const parsedTender: ParsedTender = {
        id: release.ocid || tender.id,
        title: tender.title || 'Untitled',
        description: tender.description || '',
        status,
        buyer: {
          name: buyer?.name || 'Unknown',
          postcode: buyer?.address?.postalCode || '',
          region: buyer?.address?.region || '',
          contactName: buyer?.contactPoint?.name || '',
          contactEmail: buyer?.contactPoint?.email || '',
          contactPhone: buyer?.contactPoint?.telephone || '',
        },
        value: {
          amountMin: valueMin,
          amountMax: valueMax,
          currency: tender.value?.currency || award?.value?.currency || 'GBP',
        },
        contractType: 'Services', // OCDS doesn't specify this clearly
        publishedDate,
        closingDate,
        startDate,
        endDate,
        cpvCodes,
        links: [`https://www.contractsfinder.service.gov.uk/notice/${tender.id}`],
        suitableForSME: tender.suitability?.sme || false,
        suitableForVCO: tender.suitability?.vcse || false,
      };

      return parsedTender;
    } catch (error) {
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Check if record is NHS-related
   */
  private isNHSRelated(release: OCDSRelease): boolean {
    const searchText = JSON.stringify(release).toLowerCase();
    return searchText.includes('nhs') ||
           searchText.includes('national health service') ||
           searchText.includes('health trust') ||
           searchText.includes('foundation trust');
  }

  /**
   * Filter tenders for 12-month period (Oct 2024 - Oct 2025)
   */
  private isWithin12Months(publishedDate: string): boolean {
    const date = new Date(publishedDate);
    const startDate = new Date('2024-10-01');
    const endDate = new Date('2025-10-01');
    return date >= startDate && date <= endDate;
  }

  /**
   * Parse OCDS JSONL file and extract NHS tenders
   */
  async parseOCDSFile(year: string): Promise<ParsedTender[]> {
    const filePath = `${this.dataDir}/${year}.jsonl.gz`;
    const tenders: ParsedTender[] = [];

    console.log(`📖 Parsing ${year} data...`);

    return new Promise((resolve, reject) => {
      const gunzip = zlib.createGunzip();
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream.pipe(gunzip),
        crlfDelay: Infinity,
      });

      let lineCount = 0;
      let nhsCount = 0;

      rl.on('line', (line) => {
        try {
          lineCount++;
          this.stats.totalRecords++;

          const release: OCDSRelease = JSON.parse(line);

          // Filter for NHS-related tenders
          if (!this.isNHSRelated(release)) {
            return;
          }

          nhsCount++;
          this.stats.nhsRecords++;

          // Filter for 12-month period
          if (!this.isWithin12Months(release.date)) {
            return;
          }

          // Parse to our format
          const tender = this.parseOCDSRelease(release);
          if (tender) {
            tenders.push(tender);
            this.stats.parsedTenders++;
          }

          // Progress indicator
          if (lineCount % 10000 === 0) {
            process.stdout.write(`\r   Processed ${lineCount.toLocaleString()} records, found ${nhsCount.toLocaleString()} NHS tenders...`);
          }
        } catch (error) {
          this.stats.errors++;
        }
      });

      rl.on('close', () => {
        console.log(`\r   ✓ Processed ${lineCount.toLocaleString()} records, found ${nhsCount.toLocaleString()} NHS tenders`);
        console.log(`   ✓ Extracted ${tenders.length.toLocaleString()} tenders from 12-month period\n`);
        resolve(tenders);
      });

      rl.on('error', reject);
    });
  }

  /**
   * Download and parse all NHS tenders from 12-month period
   */
  async downloadAll12MonthTenders(): Promise<ParsedTender[]> {
    this.stats.startTime = Date.now();

    console.log('🚀 Starting 12-Month NHS Tender Download (OCDS Data)\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Download files if needed
    await this.downloadOCDSFiles();

    // Parse both years
    const tenders2024 = await this.parseOCDSFile('2024');
    const tenders2025 = await this.parseOCDSFile('2025');

    // Combine and deduplicate
    const allTenders = new Map<string, ParsedTender>();
    [...tenders2024, ...tenders2025].forEach(tender => {
      allTenders.set(tender.id, tender);
    });

    const uniqueTenders = Array.from(allTenders.values());

    this.stats.endTime = Date.now();

    // Print summary
    this.printSummary(uniqueTenders);

    return uniqueTenders;
  }

  /**
   * Print download summary
   */
  private printSummary(tenders: ParsedTender[]): void {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                  DOWNLOAD SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total OCDS Records Processed:    ${this.stats.totalRecords.toLocaleString()}`);
    console.log(`NHS-Related Records Found:       ${this.stats.nhsRecords.toLocaleString()}`);
    console.log(`12-Month Period Tenders:         ${this.stats.parsedTenders.toLocaleString()}`);
    console.log(`Unique Tenders (Deduplicated):   ${tenders.length.toLocaleString()}`);
    console.log(`Parsing Errors:                  ${this.stats.errors}`);
    console.log(`Processing Time:                 ${duration.toFixed(1)}s\n`);

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    tenders.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    console.log('Status Breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count.toLocaleString()} (${((count / tenders.length) * 100).toFixed(1)}%)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }
}

// Run if executed directly
if (require.main === module) {
  const downloader = new OCDSTenderDownloader();

  downloader.downloadAll12MonthTenders()
    .then((tenders) => {
      console.log('✅ Download complete!');
      console.log(`\nNext step: Run classification with: npm run classify-tenders\n`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Download failed:', error);
      process.exit(1);
    });
}

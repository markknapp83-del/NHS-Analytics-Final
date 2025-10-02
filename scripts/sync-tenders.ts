// /scripts/sync-tenders.ts

// Load environment variables FIRST before any other imports
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

import { createContractsFinderClient } from '../lib/contracts-finder-client';
import { TenderProcessor } from '../lib/tender-processor';

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

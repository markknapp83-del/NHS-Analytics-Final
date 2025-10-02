// /scripts/test-pipeline.ts
// Quick test of the tender pipeline components

// Load environment variables FIRST before any other imports
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

import { createContractsFinderClient } from '../lib/contracts-finder-client';
import { getTrustMapper } from '../lib/trust-mapper';
import { TenderProcessor } from '../lib/tender-processor';

async function testPipeline() {
  console.log('=== Testing Tender Pipeline Components ===\n');

  try {
    // Test 1: CSV Client
    console.log('1. Testing CSV Download Client...');
    const client = createContractsFinderClient();
    const tenders = await client.getNHSTenders(7); // Last 7 days only
    console.log(`✓ Downloaded ${tenders.length} tenders from last 7 days`);

    if (tenders.length > 0) {
      const sample = tenders[0];
      console.log(`  Sample tender: "${sample.title.substring(0, 60)}..."`);
      console.log(`  Buyer: ${sample.buyer.name}`);
      console.log(`  Value: £${sample.value.amountMax || sample.value.amountMin || 'TBC'}`);
    }

    // Test 2: Trust Mapper
    console.log('\n2. Testing Trust Mapper...');
    const mapper = await getTrustMapper();
    console.log(`✓ Loaded trust mapper`);

    // Test mapping with a few sample buyer names
    if (tenders.length > 0) {
      const sampleBuyers = tenders.slice(0, 3).map(t => t.buyer.name);
      console.log(`  Testing mapping for ${sampleBuyers.length} buyers...`);

      for (const buyer of sampleBuyers) {
        const mapping = await mapper.mapBuyerToTrust(buyer);
        if (mapping) {
          console.log(`  ✓ "${buyer}" → ${mapping.trust_code} (${mapping.mapping_method}, confidence: ${mapping.confidence_score.toFixed(2)})`);
        } else {
          console.log(`  ✗ "${buyer}" → No mapping found`);
        }
      }

      const stats = mapper.getMappingStats();
      console.log(`  Mapping stats:`, stats);
    }

    // Test 3: Tender Processor
    console.log('\n3. Testing Tender Processor...');
    const processor = new TenderProcessor();
    await processor.initialize();
    console.log(`✓ Initialized processor`);

    if (tenders.length > 0) {
      const processed = await processor.processBatch(tenders.slice(0, 5));
      console.log(`✓ Processed ${processed.length} tenders`);

      if (processed.length > 0) {
        const sample = processed[0];
        console.log(`  Sample processed tender:`);
        console.log(`    Title: ${sample.title.substring(0, 60)}...`);
        console.log(`    Trust Code: ${sample.trust_code || 'Not mapped'}`);
        console.log(`    Category: ${sample.service_category || 'Not categorized'}`);
      }
    }

    console.log('\n=== All Tests Passed! ===');
    console.log('\nPipeline is ready. You can now run:');
    console.log('  npm run sync-tenders-weekly    (last 7 days)');
    console.log('  npm run sync-tenders-monthly   (last 30 days)');
    console.log('  npm run sync-tenders-full      (last 90 days)');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run test
testPipeline()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

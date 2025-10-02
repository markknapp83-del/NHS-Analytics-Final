// /scripts/test-phase1c.ts
// Test script for Phase 1C: Download and Classification

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

import { downloadAllTenders } from './download-all-tenders';
import { getTenderClassifier } from '../lib/tender-classifier';
import type { ParsedTender } from '../lib/contracts-finder-client';
import type { ClassificationResult } from '../lib/tender-classifier';

interface ClassifiedTender extends ParsedTender {
  classification: ClassificationResult;
}

async function testPhase1C() {
  console.log('🚀 Testing Phase 1C: Enhanced Download & Classification\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // STEP 1: Download tenders (uses sample data if live API fails)
    console.log('STEP 1: Downloading NHS Tenders...\n');
    const useSampleData = true; // Use sample data for reliable testing
    const tenders = await downloadAllTenders(useSampleData);

    console.log(`✅ Loaded ${tenders.length} tenders for classification\n`);

    if (tenders.length === 0) {
      console.log('⚠️  No tenders available. Exiting.');
      return;
    }

    // STEP 2: Initialize classifier
    console.log('\nSTEP 2: Initializing Classification Engine...\n');
    const classifier = await getTenderClassifier();
    console.log('✓ Classifier initialized\n');

    // STEP 3: Classify tenders
    console.log('STEP 3: Classifying Tenders...\n');
    const classificationStart = Date.now();

    const classifiedTenders: ClassifiedTender[] = [];
    const insourcingOpportunities: ClassifiedTender[] = [];
    const frameworks: ClassifiedTender[] = [];
    const discarded: ClassifiedTender[] = [];

    // Process all tenders (sample data is small)
    const testSample = tenders;
    console.log(`Processing ${testSample.length} tenders...\n`);

    for (const tender of testSample) {
      const classification = await classifier.classify(tender);
      const classifiedTender: ClassifiedTender = {
        ...tender,
        classification
      };

      classifiedTenders.push(classifiedTender);

      switch (classification.classification) {
        case 'insourcing_opportunity':
          insourcingOpportunities.push(classifiedTender);
          break;
        case 'framework':
          frameworks.push(classifiedTender);
          break;
        case 'discard':
          discarded.push(classifiedTender);
          break;
      }
    }

    const classificationTime = Date.now() - classificationStart;

    // STEP 4: Display results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                  CLASSIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`Total Tenders Classified:    ${classifiedTenders.length}`);
    console.log(`Classification Time:         ${(classificationTime / 1000).toFixed(1)}s`);
    console.log(`Average Time per Tender:     ${(classificationTime / classifiedTenders.length).toFixed(0)}ms\n`);

    console.log('───────────────────────────────────────────────────────────');
    console.log(`✅ Insourcing Opportunities:  ${insourcingOpportunities.length} (${Math.round(insourcingOpportunities.length / classifiedTenders.length * 100)}%)`);
    console.log(`   └─ Matched to Trust:       ${insourcingOpportunities.filter(t => t.classification.matched_entity_type === 'trust').length}`);
    console.log(`   └─ Matched to ICB:         ${insourcingOpportunities.filter(t => t.classification.matched_entity_type === 'icb').length}`);
    console.log();

    console.log(`📋 Frameworks Identified:     ${frameworks.length} (${Math.round(frameworks.length / classifiedTenders.length * 100)}%)`);
    console.log();

    console.log(`🗑️  Discarded (Non-Match):    ${discarded.length} (${Math.round(discarded.length / classifiedTenders.length * 100)}%)`);
    console.log('───────────────────────────────────────────────────────────\n');

    // STEP 5: Show sample results
    console.log('SAMPLE INSOURCING OPPORTUNITIES:\n');
    insourcingOpportunities.slice(0, 5).forEach((tender, i) => {
      console.log(`${i + 1}. ${tender.title}`);
      console.log(`   Buyer: ${tender.buyer.name}`);
      console.log(`   Match: ${tender.classification.reason}`);
      console.log(`   Trust: ${tender.classification.matched_trust_name || 'N/A'}`);
      console.log(`   ICB: ${tender.classification.matched_icb_name || 'N/A'}`);
      console.log(`   Confidence: ${tender.classification.confidence}%`);
      console.log();
    });

    console.log('\nSAMPLE FRAMEWORKS:\n');
    frameworks.slice(0, 3).forEach((tender, i) => {
      console.log(`${i + 1}. ${tender.title}`);
      console.log(`   Framework: ${tender.classification.framework_name}`);
      console.log(`   Buyer: ${tender.buyer.name}`);
      console.log();
    });

    console.log('\nSAMPLE DISCARDED:\n');
    discarded.slice(0, 5).forEach((tender, i) => {
      console.log(`${i + 1}. ${tender.title}`);
      console.log(`   Buyer: ${tender.buyer.name}`);
      console.log(`   Reason: ${tender.classification.reason}`);
      console.log(`   Confidence: ${tender.classification.confidence}%`);
      console.log();
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Next Steps:');
    console.log('1. Review insourcing opportunities above');
    console.log('2. Check framework identification accuracy');
    console.log('3. Review discarded tenders for false negatives');
    console.log('4. Adjust classification parameters if needed');
    console.log('5. Run full processing with: npm run process-tenders-phase1c\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testPhase1C()
    .then(() => {
      console.log('✓ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testPhase1C };

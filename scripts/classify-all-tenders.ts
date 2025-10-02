// /scripts/classify-all-tenders.ts
// Classify all 12-month tenders and generate comprehensive report

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

import { OCDSTenderDownloader } from './download-tenders-ocds';
import { getTenderClassifier } from '../lib/tender-classifier';
import type { ParsedTender } from '../lib/contracts-finder-client';
import type { ClassificationResult } from '../lib/tender-classifier';
import * as fs from 'fs';

interface ClassifiedTender extends ParsedTender {
  classification: ClassificationResult;
}

interface ClassificationStats {
  total: number;
  insourcingOpportunities: number;
  frameworks: number;
  discarded: number;
  trustMatches: number;
  icbMatches: number;
  noMatch: number;
}

async function classifyAllTenders() {
  console.log('🚀 NHS Tender Classification - Full 12-Month Dataset\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // STEP 1: Download tenders
  console.log('STEP 1: Downloading NHS Tenders from OCDS...\n');
  const downloader = new OCDSTenderDownloader();
  const tenders = await downloader.downloadAll12MonthTenders();

  if (tenders.length === 0) {
    console.log('⚠️  No tenders downloaded. Exiting.');
    return;
  }

  // STEP 2: Initialize classifier
  console.log('STEP 2: Initializing Classification Engine...\n');
  const classifier = await getTenderClassifier();
  console.log('✓ Classifier initialized\n');

  // STEP 3: Classify all tenders
  console.log(`STEP 3: Classifying ${tenders.length.toLocaleString()} Tenders...\n`);

  const classifiedTenders: ClassifiedTender[] = [];
  const insourcingOpportunities: ClassifiedTender[] = [];
  const frameworks: ClassifiedTender[] = [];
  const discarded: ClassifiedTender[] = [];

  let processed = 0;
  const total = tenders.length;

  for (const tender of tenders) {
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

    processed++;
    if (processed % 500 === 0) {
      const percent = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${processed.toLocaleString()}/${total.toLocaleString()} (${percent}%) - Found ${insourcingOpportunities.length} opportunities...`);
    }
  }

  console.log(`\r   ✓ Classified all ${processed.toLocaleString()} tenders\n`);

  const classificationTime = Date.now() - startTime;

  // STEP 4: Calculate statistics
  const stats: ClassificationStats = {
    total: classifiedTenders.length,
    insourcingOpportunities: insourcingOpportunities.length,
    frameworks: frameworks.length,
    discarded: discarded.length,
    trustMatches: insourcingOpportunities.filter(t => t.classification.matched_entity_type === 'trust').length,
    icbMatches: insourcingOpportunities.filter(t => t.classification.matched_entity_type === 'icb').length,
    noMatch: insourcingOpportunities.filter(t => !t.classification.matched_entity_type).length,
  };

  // STEP 5: Display results
  printComprehensiveReport(stats, insourcingOpportunities, frameworks, discarded, classificationTime);

  // STEP 6: Save results to JSON files
  console.log('\nSTEP 4: Saving Classification Results...\n');
  const outputDir = './data/classification-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    `${outputDir}/insourcing-opportunities.json`,
    JSON.stringify(insourcingOpportunities, null, 2)
  );
  console.log(`✓ Saved ${insourcingOpportunities.length} insourcing opportunities`);

  fs.writeFileSync(
    `${outputDir}/frameworks.json`,
    JSON.stringify(frameworks, null, 2)
  );
  console.log(`✓ Saved ${frameworks.length} frameworks`);

  fs.writeFileSync(
    `${outputDir}/discarded.json`,
    JSON.stringify(discarded, null, 2)
  );
  console.log(`✓ Saved ${discarded.length} discarded tenders`);

  fs.writeFileSync(
    `${outputDir}/classification-stats.json`,
    JSON.stringify(stats, null, 2)
  );
  console.log(`✓ Saved classification statistics\n`);

  // STEP 7: Generate sample reports
  generateSampleReports(insourcingOpportunities, frameworks, discarded);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                   CLASSIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

function printComprehensiveReport(
  stats: ClassificationStats,
  insourcing: ClassifiedTender[],
  frameworks: ClassifiedTender[],
  discarded: ClassifiedTender[],
  time: number
) {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('              COMPREHENSIVE CLASSIFICATION REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Total Tenders Classified:     ${stats.total.toLocaleString()}`);
  console.log(`Classification Time:          ${(time / 1000).toFixed(1)}s`);
  console.log(`Average Time per Tender:      ${(time / stats.total).toFixed(0)}ms\n`);

  console.log('───────────────────────────────────────────────────────────');
  console.log(`✅ INSOURCING OPPORTUNITIES:   ${stats.insourcingOpportunities.toLocaleString()} (${((stats.insourcingOpportunities / stats.total) * 100).toFixed(1)}%)`);
  console.log(`   └─ Matched to Trust:        ${stats.trustMatches.toLocaleString()}`);
  console.log(`   └─ Matched to ICB:          ${stats.icbMatches.toLocaleString()}`);
  console.log(`   └─ No Trust/ICB Match:      ${stats.noMatch.toLocaleString()}`);
  console.log();

  console.log(`📋 FRAMEWORKS IDENTIFIED:      ${stats.frameworks.toLocaleString()} (${((stats.frameworks / stats.total) * 100).toFixed(1)}%)`);
  console.log();

  console.log(`🗑️  DISCARDED (Non-Match):     ${stats.discarded.toLocaleString()} (${((stats.discarded / stats.total) * 100).toFixed(1)}%)`);
  console.log('───────────────────────────────────────────────────────────\n');

  // Top trusts
  const trustCounts = new Map<string, number>();
  insourcing.forEach(t => {
    if (t.classification.matched_trust_name) {
      const count = trustCounts.get(t.classification.matched_trust_name) || 0;
      trustCounts.set(t.classification.matched_trust_name, count + 1);
    }
  });

  const topTrusts = Array.from(trustCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('TOP 10 TRUSTS BY OPPORTUNITY COUNT:');
  topTrusts.forEach(([trust, count], i) => {
    console.log(`  ${i + 1}. ${trust}: ${count} opportunities`);
  });
  console.log();

  // Discard reasons
  const discardReasons = new Map<string, number>();
  discarded.forEach(t => {
    const reason = t.classification.reason.split(':')[0]; // Get category
    const count = discardReasons.get(reason) || 0;
    discardReasons.set(reason, count + 1);
  });

  const topReasons = Array.from(discardReasons.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('TOP 10 DISCARD REASONS:');
  topReasons.forEach(([reason, count], i) => {
    console.log(`  ${i + 1}. ${reason}: ${count.toLocaleString()}`);
  });
  console.log();
}

function generateSampleReports(
  insourcing: ClassifiedTender[],
  frameworks: ClassifiedTender[],
  discarded: ClassifiedTender[]
) {
  console.log('SAMPLE INSOURCING OPPORTUNITIES (Top 10 by Value):\n');

  const topByValue = insourcing
    .filter(t => t.value.amountMax !== null)
    .sort((a, b) => (b.value.amountMax || 0) - (a.value.amountMax || 0))
    .slice(0, 10);

  topByValue.forEach((tender, i) => {
    console.log(`${i + 1}. ${tender.title}`);
    console.log(`   Trust: ${tender.classification.matched_trust_name || 'N/A'}`);
    console.log(`   Value: £${(tender.value.amountMax || 0).toLocaleString()}`);
    console.log(`   Status: ${tender.status}`);
    console.log();
  });

  console.log('\nSAMPLE FRAMEWORKS (First 5):\n');
  frameworks.slice(0, 5).forEach((tender, i) => {
    console.log(`${i + 1}. ${tender.title}`);
    console.log(`   Framework: ${tender.classification.framework_name}`);
    console.log(`   Buyer: ${tender.buyer.name}`);
    console.log();
  });
}

// Run if executed directly
if (require.main === module) {
  classifyAllTenders()
    .then(() => {
      console.log('✓ Classification completed successfully');
      console.log('\nNext steps:');
      console.log('1. Review ./data/classification-results/ directory');
      console.log('2. Import insourcing-opportunities.json to database');
      console.log('3. Review false negatives in discarded.json\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

export { classifyAllTenders };

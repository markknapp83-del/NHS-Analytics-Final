#!/usr/bin/env ts-node
/**
 * Reclassify existing opportunities with updated classifier logic
 * This will re-run the classifier on tenders currently marked as 'insourcing_opportunity'
 * to filter out non-insourcing services (equipment, vehicles, facilities, etc.)
 */

import { createClient } from '@supabase/supabase-js';
import { getTenderClassifier } from '../lib/tender-classifier';
import type { ParsedTender } from '../lib/contracts-finder-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ReclassificationStats {
  total_processed: number;
  still_opportunities: number;
  reclassified_to_discard: number;
  by_category: Record<string, number>;
}

async function reclassifyOpportunities() {
  console.log('🔄 Starting reclassification of existing opportunities...\n');

  // Step 1: Load all current opportunities
  console.log('📥 Loading current opportunities from database...');
  const { data: opportunities, error: loadError } = await supabase
    .from('tenders')
    .select('*')
    .eq('classification', 'insourcing_opportunity')
    .order('published_date', { ascending: false });

  if (loadError) {
    console.error('❌ Failed to load opportunities:', loadError);
    process.exit(1);
  }

  console.log(`✅ Loaded ${opportunities?.length || 0} existing opportunities\n`);

  if (!opportunities || opportunities.length === 0) {
    console.log('No opportunities to reclassify.');
    return;
  }

  // Step 2: Initialize classifier
  console.log('🔧 Initializing classifier with updated logic...');
  const classifier = await getTenderClassifier();
  console.log('✅ Classifier initialized\n');

  // Step 3: Re-classify each opportunity
  console.log('🔍 Re-classifying opportunities...\n');

  const stats: ReclassificationStats = {
    total_processed: 0,
    still_opportunities: 0,
    reclassified_to_discard: 0,
    by_category: {}
  };

  const reclassified: any[] = [];
  const stillValid: any[] = [];

  for (const opp of opportunities) {
    stats.total_processed++;

    // Convert database record to ParsedTender format
    const tender: any = {
      id: opp.ocid || opp.contracts_finder_id,
      ocid: opp.ocid,
      title: opp.title,
      description: opp.description || '',
      buyer: {
        name: opp.buyer_organisation_name,
        postcode: '',
        region: '',
        contactName: '',
        contactEmail: '',
        contactPhone: ''
      },
      status: opp.status || 'unknown',
      publishedDate: opp.published_date,
      contractValue: {
        min: opp.contract_value_min,
        max: opp.contract_value_max,
        currency: 'GBP'
      },
      cpvCodes: [],
      contractsFinderUrl: opp.contracts_finder_url || ''
    };

    // Re-classify
    const newClassification = await classifier.classify(tender);

    if (newClassification.classification === 'insourcing_opportunity') {
      stats.still_opportunities++;
      stillValid.push({
        id: opp.id,
        title: opp.title,
        old_reason: opp.classification_reason,
        new_reason: newClassification.reason
      });
    } else {
      stats.reclassified_to_discard++;

      // Track by category
      const category = newClassification.reason;
      stats.by_category[category] = (stats.by_category[category] || 0) + 1;

      reclassified.push({
        id: opp.id,
        title: opp.title,
        old_classification: 'insourcing_opportunity',
        new_classification: newClassification.classification,
        reason: newClassification.reason,
        confidence: newClassification.confidence,
        matched_trust_code: newClassification.matched_trust_code,
        matched_icb_code: newClassification.matched_icb_code
      });
    }

    // Progress indicator
    if (stats.total_processed % 50 === 0) {
      console.log(`   Processed ${stats.total_processed}/${opportunities.length}...`);
    }
  }

  console.log(`\n✅ Reclassification complete!\n`);

  // Step 4: Display results
  console.log('📊 RECLASSIFICATION RESULTS\n');
  console.log(`Total Processed:           ${stats.total_processed}`);
  console.log(`Still Opportunities:       ${stats.still_opportunities} (${((stats.still_opportunities / stats.total_processed) * 100).toFixed(1)}%)`);
  console.log(`Reclassified to Discard:   ${stats.reclassified_to_discard} (${((stats.reclassified_to_discard / stats.total_processed) * 100).toFixed(1)}%)`);
  console.log('');

  if (stats.reclassified_to_discard > 0) {
    console.log('📋 BREAKDOWN BY CATEGORY:\n');
    const categories = Object.entries(stats.by_category)
      .sort((a, b) => b[1] - a[1]);

    categories.forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
    console.log('');
  }

  // Step 5: Ask for confirmation to update database
  console.log('💾 UPDATE DATABASE?\n');
  console.log('This will:');
  console.log(`  - Move ${stats.reclassified_to_discard} records to 'discard' classification`);
  console.log(`  - Keep ${stats.still_opportunities} as 'insourcing_opportunity'`);
  console.log('');
  console.log('Press Ctrl+C to cancel, or press Enter to proceed...');

  // Wait for user input
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  // Step 6: Update database
  console.log('\n💾 Updating database...\n');

  let updateCount = 0;
  let errorCount = 0;

  for (const item of reclassified) {
    const { error } = await supabase
      .from('tenders')
      .update({
        classification: 'discard',
        classification_reason: item.reason,
        classification_confidence: item.confidence
      })
      .eq('id', item.id);

    if (error) {
      console.error(`   ❌ Failed to update ${item.id}:`, error.message);
      errorCount++;
    } else {
      updateCount++;
    }

    if (updateCount % 50 === 0) {
      console.log(`   Updated ${updateCount}/${reclassified.length}...`);
    }
  }

  console.log(`\n✅ Database updated!`);
  console.log(`   Successfully updated: ${updateCount}`);
  console.log(`   Errors: ${errorCount}\n`);

  // Step 7: Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    reclassified_items: reclassified.map(item => ({
      id: item.id,
      title: item.title,
      reason: item.reason,
      matched_trust: item.matched_trust_code,
      matched_icb: item.matched_icb_code
    })),
    still_valid_items: stillValid.map(item => ({
      id: item.id,
      title: item.title
    }))
  };

  const fs = require('fs');
  const reportPath = path.join(__dirname, '../Data/classification-results/reclassification-report.json');

  // Ensure directory exists
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  // Final summary
  console.log('🎉 RECLASSIFICATION COMPLETE\n');
  console.log('Final Results:');
  console.log(`  - True Insourcing Opportunities: ${stats.still_opportunities}`);
  console.log(`  - Filtered Out (Non-insourcing):  ${stats.reclassified_to_discard}`);
  console.log('');
  console.log('The opportunity count has been refined to show only clinical staffing and service delivery opportunities.');
  console.log('Equipment, vehicles, facilities, and general supplies have been removed.');
  console.log('');

  process.exit(0);
}

// Run the reclassification
reclassifyOpportunities().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

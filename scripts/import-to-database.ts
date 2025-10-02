#!/usr/bin/env tsx

/**
 * Phase 1C Task 4: Import Classified Tenders to Database
 *
 * Imports classification results from JSON files into Supabase:
 * - Insourcing opportunities → tenders table
 * - Frameworks → frameworks table
 * - Discarded tenders → discarded_tenders table
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const DATA_DIR = path.join(process.cwd(), 'Data', 'classification-results');

const FILES = {
  opportunities: path.join(DATA_DIR, 'insourcing-opportunities.json'),
  frameworks: path.join(DATA_DIR, 'frameworks.json'),
  discarded: path.join(DATA_DIR, 'discarded.json'),
};

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Type Definitions
// ============================================================================

interface ClassifiedTender {
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
  classification: 'insourcing_opportunity' | 'framework' | 'discard';
  reason: string;
  confidence: number;
  matched_trust_code?: string;
  matched_trust_name?: string;
  matched_icb_code?: string;
  matched_icb_name?: string;
  matched_entity_type?: 'trust' | 'icb';
  is_framework?: boolean;
  framework_name?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function loadJsonFile(filePath: string): any[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function calculateContractDuration(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.round(diffDays / 30); // Convert to months
}

// ============================================================================
// Import Insourcing Opportunities
// ============================================================================

async function importOpportunities(opportunities: ClassifiedTender[]) {
  console.log(`\n📥 Importing ${opportunities.length} insourcing opportunities...`);

  const records = opportunities.map(tender => {
    // Handle nested classification object (from classify-all-tenders.ts output)
    const classification = (tender as any).classification?.classification || tender.classification;
    const reason = (tender as any).classification?.reason || tender.reason;
    const confidence = (tender as any).classification?.confidence || tender.confidence;
    const matched_trust_code = (tender as any).classification?.matched_trust_code || tender.matched_trust_code;
    const matched_icb_code = (tender as any).classification?.matched_icb_code || tender.matched_icb_code;
    const matched_entity_type = (tender as any).classification?.matched_entity_type || tender.matched_entity_type;
    const is_framework = (tender as any).classification?.is_framework || tender.is_framework;
    const framework_name = (tender as any).classification?.framework_name || tender.framework_name;

    return {
      contracts_finder_id: tender.id,
      ocid: tender.id,
      title: tender.title,
      description: tender.description,
      status: tender.status,
      buyer_organisation_name: tender.buyer.name,
      trust_code: matched_trust_code || null,
      icb_code: matched_icb_code || null,
      buyer_contact_name: tender.buyer.contactName || null,
      buyer_contact_email: tender.buyer.contactEmail || null,
      buyer_contact_phone: tender.buyer.contactPhone || null,
      contract_value_min: tender.value.amountMin,
      contract_value_max: tender.value.amountMax,
      currency: tender.value.currency,
      contract_type: tender.contractType,
      cpv_codes: tender.cpvCodes,
      published_date: tender.publishedDate,
      deadline_date: tender.closingDate,
      contract_start_date: tender.startDate,
      contract_end_date: tender.endDate,
      contract_duration_months: calculateContractDuration(tender.startDate, tender.endDate),
      tender_url: tender.links[0] || null,
      source: 'contracts_finder_ocds',
      classification: classification,
      classification_reason: reason,
      classification_confidence: confidence,
      is_framework: is_framework || false,
      framework_name: framework_name || null,
      matched_entity_type: matched_entity_type || null,
      buyer_search_text: `${tender.buyer.name} ${tender.title} ${tender.description}`.substring(0, 5000),
      last_fetched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Import in batches of 100
  const BATCH_SIZE = 100;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('tenders')
      .upsert(batch, {
        onConflict: 'contracts_finder_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
      process.stdout.write(`   ✓ Imported ${imported}/${records.length} opportunities\r`);
    }
  }

  console.log(`\n   ✅ Successfully imported ${imported} opportunities (${errors} errors)`);
  return { imported, errors };
}

// ============================================================================
// Import Frameworks
// ============================================================================

async function importFrameworks(frameworks: ClassifiedTender[]) {
  console.log(`\n📋 Importing ${frameworks.length} frameworks...`);

  // Group frameworks by name
  const frameworkMap = new Map<string, any>();

  for (const tender of frameworks) {
    // Handle nested classification object
    const framework_name = (tender as any).classification?.framework_name || tender.framework_name;
    const frameworkName = framework_name || 'Unknown Framework';

    if (!frameworkMap.has(frameworkName)) {
      frameworkMap.set(frameworkName, {
        framework_name: frameworkName,
        description: tender.description?.substring(0, 500) || null,
        managing_organization: tender.buyer.name,
        framework_type: tender.contractType || 'Unknown',
        is_member: false,
        contracts_finder_references: [tender.id],
        first_seen_date: tender.publishedDate?.split('T')[0] || null,
        last_seen_date: tender.publishedDate?.split('T')[0] || null,
      });
    } else {
      // Add this tender reference to existing framework
      const existing = frameworkMap.get(frameworkName);
      existing.contracts_finder_references.push(tender.id);

      // Update last_seen_date if newer
      if (tender.publishedDate) {
        const tenderDate = tender.publishedDate.split('T')[0];
        if (tenderDate > existing.last_seen_date) {
          existing.last_seen_date = tenderDate;
        }
        if (tenderDate < existing.first_seen_date) {
          existing.first_seen_date = tenderDate;
        }
      }
    }
  }

  const records = Array.from(frameworkMap.values()).map(fw => ({
    ...fw,
    contracts_finder_references: JSON.stringify(fw.contracts_finder_references),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('frameworks')
    .upsert(records, {
      onConflict: 'framework_name',
      ignoreDuplicates: false
    });

  if (error) {
    console.error('   ❌ Error importing frameworks:', error.message);
    return { imported: 0, errors: records.length };
  }

  console.log(`   ✅ Successfully imported ${records.length} unique frameworks`);
  return { imported: records.length, errors: 0 };
}

// ============================================================================
// Import Discarded Tenders
// ============================================================================

async function importDiscarded(discarded: ClassifiedTender[]) {
  console.log(`\n🗑️  Importing ${discarded.length} discarded tenders...`);

  const records = discarded.map(tender => {
    // Handle nested classification object
    const reason = (tender as any).classification?.reason || tender.reason;
    const confidence = (tender as any).classification?.confidence || tender.confidence;

    return {
      contracts_finder_id: tender.id,
      ocid: tender.id,
      title: tender.title,
      description: tender.description?.substring(0, 5000) || null,
      buyer_organisation_name: tender.buyer.name,
      published_date: tender.publishedDate?.split('T')[0] || null,
      discard_reason: reason,
      discard_confidence: confidence,
      search_text: `${tender.buyer.name} ${tender.title} ${tender.description}`.substring(0, 5000),
      reviewed: false,
      created_at: new Date().toISOString(),
    };
  });

  // Import in batches of 500 (larger batches for discarded as they're simpler)
  const BATCH_SIZE = 500;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('discarded_tenders')
      .upsert(batch, {
        onConflict: 'contracts_finder_id',
        ignoreDuplicates: true // Skip duplicates for discarded
      });

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
      process.stdout.write(`   ✓ Imported ${imported}/${records.length} discarded tenders\r`);
    }
  }

  console.log(`\n   ✅ Successfully imported ${imported} discarded tenders (${errors} errors)`);
  return { imported, errors };
}

// ============================================================================
// Main Import Function
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Phase 1C Task 4: Import Classified Tenders to Database  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Load JSON files
  console.log('\n📂 Loading classification results...');
  const opportunities = loadJsonFile(FILES.opportunities);
  const frameworks = loadJsonFile(FILES.frameworks);
  const discarded = loadJsonFile(FILES.discarded);

  console.log(`   ✓ Opportunities: ${opportunities.length}`);
  console.log(`   ✓ Frameworks: ${frameworks.length}`);
  console.log(`   ✓ Discarded: ${discarded.length}`);
  console.log(`   ✓ Total: ${opportunities.length + frameworks.length + discarded.length}`);

  // Import data
  const stats = {
    opportunities: await importOpportunities(opportunities),
    frameworks: await importFrameworks(frameworks),
    discarded: await importDiscarded(discarded),
  };

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     IMPORT SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Insourcing Opportunities: ${stats.opportunities.imported} imported, ${stats.opportunities.errors} errors`);
  console.log(`📋 Frameworks: ${stats.frameworks.imported} imported, ${stats.frameworks.errors} errors`);
  console.log(`🗑️  Discarded Tenders: ${stats.discarded.imported} imported, ${stats.discarded.errors} errors`);
  console.log(`\n⏱️  Total time: ${totalTime} seconds`);
  console.log('\n✅ Import complete!');

  // Next steps
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                       NEXT STEPS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n1. Verify data in Supabase dashboard');
  console.log('2. Run validation queries to check data quality');
  console.log('3. Review frameworks table for accuracy');
  console.log('4. Spot-check discarded tenders for false negatives');
  console.log('5. Update frontend to display insourcing opportunities\n');
}

// ============================================================================
// Execute
// ============================================================================

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

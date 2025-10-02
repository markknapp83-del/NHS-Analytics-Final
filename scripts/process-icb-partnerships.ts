/**
 * Process ICB Partnership Data from Excel File
 *
 * Processes the downloaded ICB partnership Excel file and updates trust_metrics
 * Prerequisites: npm install xlsx
 * Run: npx tsx scripts/process-icb-partnerships.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TrustICBMapping {
  trustCode: string;
  trustName: string;
  icbCode: string;
  icbName: string;
}

async function parseExcelFile(filePath: string): Promise<TrustICBMapping[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log('📄 Reading Excel file...');
  const workbook = XLSX.readFile(filePath);

  // Use the "ICB Partners" sheet
  const sheetName = 'ICB Partners';
  const worksheet = workbook.Sheets[sheetName];

  // Read as array of arrays to handle the structure better
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  console.log(`✅ Found ${data.length} rows in ${sheetName} sheet\n`);

  const mappings: TrustICBMapping[] = [];
  const seenMappings = new Set<string>();

  // Headers are at row 4 (index 4):
  // Col 0: NHS England Region
  // Col 1: ODS ICB Code
  // Col 3: ICB Name
  // Col 8: NHS Trusts
  // Col 9: ODS Trust Code

  // Data starts at row 5 (index 5)
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const icbCode = (row[1] || '').toString().trim();
    const icbName = (row[3] || '').toString().trim();
    const trustName = (row[8] || '').toString().trim();
    const trustCode = (row[9] || '').toString().trim();

    if (trustCode && icbCode && trustName && icbName) {
      const key = `${trustCode}:${icbCode}`;

      // Avoid duplicates
      if (!seenMappings.has(key)) {
        mappings.push({
          trustCode: trustCode,
          trustName: trustName,
          icbCode: icbCode,
          icbName: icbName
        });
        seenMappings.add(key);
      }
    }
  }

  return mappings;
}

async function updateTrustICBMappings(mappings: TrustICBMapping[]) {
  console.log(`\n🔧 Updating ${mappings.length} trust-ICB mappings...\n`);

  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  for (const mapping of mappings) {
    // Update all records for this trust
    const { data, error } = await supabase
      .from('trust_metrics')
      .update({
        icb_code: mapping.icbCode,
        icb_name: mapping.icbName
      })
      .eq('trust_code', mapping.trustCode)
      .select('trust_code');

    if (error) {
      console.error(`❌ Error updating ${mapping.trustCode}:`, error.message);
      errorCount++;
    } else if (!data || data.length === 0) {
      console.log(`⚠️  Trust not found in database: ${mapping.trustCode} - ${mapping.trustName}`);
      notFoundCount++;
    } else {
      console.log(`✅ Updated ${mapping.trustCode} -> ${mapping.icbCode} (${data.length} records)`);
      successCount++;
    }
  }

  console.log(`\n📊 Update Summary:`);
  console.log(`  ✅ Successfully updated: ${successCount} trusts`);
  console.log(`  ⚠️  Not found in database: ${notFoundCount} trusts`);
  console.log(`  ❌ Errors: ${errorCount}`);
}

async function validateUpdates() {
  console.log('\n🔍 Validating updates...\n');

  const { data: trustData, error: trustError } = await supabase
    .from('trust_metrics')
    .select('trust_code, trust_name, icb_code, icb_name')
    .order('trust_name');

  if (trustError) {
    console.error('❌ Error fetching validation data:', trustError);
    return;
  }

  // Get unique trusts
  const uniqueTrusts = new Map();
  trustData?.forEach(t => {
    if (!uniqueTrusts.has(t.trust_code)) {
      uniqueTrusts.set(t.trust_code, t);
    }
  });

  const trusts = Array.from(uniqueTrusts.values());
  const withICB = trusts.filter((t: any) => t.icb_code);
  const withoutICB = trusts.filter((t: any) => !t.icb_code);

  console.log(`✅ Trusts with ICB mapping: ${withICB.length}`);
  console.log(`⚠️  Trusts without ICB mapping: ${withoutICB.length}\n`);

  if (withoutICB.length > 0) {
    console.log('Remaining trusts without ICB:');
    withoutICB.slice(0, 10).forEach((t: any) => {
      console.log(`  ${t.trust_code} - ${t.trust_name}`);
    });
    if (withoutICB.length > 10) {
      console.log(`  ... and ${withoutICB.length - 10} more`);
    }
  }
}

async function main() {
  console.log('🏥 ICB Partnership Data Processing Tool\n');

  const excelPath = path.join(__dirname, 'icb-partners.xlsx');

  try {
    // Parse Excel file
    const mappings = await parseExcelFile(excelPath);
    console.log(`\n✅ Parsed ${mappings.length} trust-ICB mappings from Excel\n`);

    // Show sample mappings
    console.log('Sample mappings (first 5):');
    mappings.slice(0, 5).forEach(m => {
      console.log(`  ${m.trustCode} -> ${m.icbCode}: ${m.trustName}`);
    });

    // Update database
    await updateTrustICBMappings(mappings);

    // Validate
    await validateUpdates();

    console.log('\n✅ ICB partnership data processing complete!');

  } catch (error) {
    console.error('❌ Error:', error);

    if ((error as any).message?.includes('File not found')) {
      console.log('\n📋 File not found. Please download it first:');
      console.log('Run: npx tsx scripts/download-icb-partnerships.ts');
      console.log('\nOr manually download from:');
      console.log('https://digital.nhs.uk/services/organisation-data-service/data-search-and-export/csv-downloads/other-nhs-organisations');
    }

    if ((error as any).message?.includes('Cannot find module \'xlsx\'')) {
      console.log('\n📋 Missing xlsx package. Install it:');
      console.log('npm install xlsx');
    }

    process.exit(1);
  }
}

main();

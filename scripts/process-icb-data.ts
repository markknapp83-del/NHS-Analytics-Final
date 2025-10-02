/**
 * Process ICB Data from ODS Export
 *
 * Instructions:
 * 1. Visit https://www.odsdatasearchandexport.nhs.uk/
 * 2. Search for Organisation Type = "Integrated Care Board"
 * 3. Export results to CSV
 * 4. Save as 'icb-export.csv' in the scripts/ directory
 * 5. Run: npx tsx scripts/process-icb-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ICBData {
  icb_code: string;
  icb_name: string;
  ods_code: string;
  status: string;
  postcode?: string;
  address?: string;
}

async function parseCSV(filePath: string): Promise<ICBData[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  console.log(`📄 CSV Headers: ${headers.join(', ')}`);

  const icbs: ICBData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    // Map ODS fields to our schema
    const icb: ICBData = {
      icb_code: row['Organisation Code'] || row['Code'] || '',
      icb_name: row['Organisation Name'] || row['Name'] || '',
      ods_code: row['Organisation Code'] || row['Code'] || '',
      status: row['Status'] || 'Active',
      postcode: row['Postcode'] || undefined,
      address: row['Address'] || undefined
    };

    if (icb.icb_code && icb.icb_name) {
      icbs.push(icb);
    }
  }

  return icbs;
}

async function createICBTable() {
  console.log('📊 Creating ICB reference table...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS icbs (
      icb_code VARCHAR(10) PRIMARY KEY,
      icb_name TEXT NOT NULL,
      ods_code VARCHAR(10) UNIQUE,
      region VARCHAR(100),
      status VARCHAR(20) DEFAULT 'Active',
      postcode VARCHAR(10),
      address TEXT,
      effective_from DATE,
      geographic_coverage TEXT,
      population_estimate INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_icbs_ods_code ON icbs(ods_code);
    CREATE INDEX IF NOT EXISTS idx_icbs_status ON icbs(status);
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

  if (error) {
    console.error('❌ Error creating ICB table:', error);
    throw error;
  }

  console.log('✅ ICB table created successfully');
}

async function insertICBs(icbs: ICBData[]) {
  console.log(`📥 Inserting ${icbs.length} ICBs...`);

  for (const icb of icbs) {
    const { error } = await supabase
      .from('icbs')
      .upsert({
        icb_code: icb.icb_code,
        icb_name: icb.icb_name.toUpperCase(),
        ods_code: icb.ods_code,
        status: icb.status,
        postcode: icb.postcode,
        address: icb.address,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'icb_code'
      });

    if (error) {
      console.error(`❌ Error inserting ICB ${icb.icb_code}:`, error);
    } else {
      console.log(`✅ Inserted/Updated: ${icb.icb_code} - ${icb.icb_name}`);
    }
  }

  console.log(`✅ Inserted ${icbs.length} ICBs`);
}

async function analyzeCurrentMapping() {
  console.log('\n📊 Analyzing current ICB mapping in trust_metrics...');

  const { data, error } = await supabase
    .from('trust_metrics')
    .select('trust_code, trust_name, icb_code, icb_name')
    .order('trust_name');

  if (error) {
    console.error('❌ Error fetching trust metrics:', error);
    return;
  }

  const trustsWithICB = data?.filter(t => t.icb_code) || [];
  const trustsWithoutICB = data?.filter(t => !t.icb_code) || [];

  // Get unique trusts
  const uniqueTrustsWithICB = new Set(trustsWithICB.map(t => t.trust_code));
  const uniqueTrustsWithoutICB = new Set(trustsWithoutICB.map(t => t.trust_code));

  console.log(`✅ Trusts with ICB mapping: ${uniqueTrustsWithICB.size}`);
  console.log(`⚠️  Trusts without ICB mapping: ${uniqueTrustsWithoutICB.size}`);

  if (uniqueTrustsWithoutICB.size > 0) {
    console.log('\nTrusts missing ICB mapping:');
    const missingTrusts = Array.from(uniqueTrustsWithoutICB)
      .map(code => {
        const trust = data?.find(t => t.trust_code === code);
        return `${code} - ${trust?.trust_name}`;
      })
      .slice(0, 10);

    missingTrusts.forEach(t => console.log(`  - ${t}`));
    if (uniqueTrustsWithoutICB.size > 10) {
      console.log(`  ... and ${uniqueTrustsWithoutICB.size - 10} more`);
    }
  }
}

async function main() {
  console.log('🏥 ICB Data Processing Tool\n');

  const csvPath = path.join(__dirname, 'icb-export.csv');

  if (!fs.existsSync(csvPath)) {
    console.log('❌ ICB export CSV not found!');
    console.log('\n📋 Instructions:');
    console.log('1. Visit https://www.odsdatasearchandexport.nhs.uk/');
    console.log('2. Search for Organisation Type = "Integrated Care Board"');
    console.log('3. Export results to CSV');
    console.log(`4. Save as: ${csvPath}`);
    console.log('5. Run this script again');
    process.exit(1);
  }

  try {
    // Parse CSV
    const icbs = await parseCSV(csvPath);
    console.log(`✅ Parsed ${icbs.length} ICBs from CSV\n`);

    // Create table
    await createICBTable();

    // Insert ICBs
    await insertICBs(icbs);

    // Analyze current mapping
    await analyzeCurrentMapping();

    console.log('\n✅ ICB data processing complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the ICBs in Supabase');
    console.log('2. Map remaining trusts to ICBs using ODS relationships');
    console.log('3. Run trust mapping update script');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

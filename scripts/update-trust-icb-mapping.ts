/**
 * Update Trust-to-ICB Mappings
 *
 * This script analyzes and updates ICB mappings in trust_metrics table
 * Run: npx tsx scripts/update-trust-icb-mapping.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Manual mappings for trusts that may be missing ICB data
const MANUAL_MAPPINGS: Record<string, { icb_code: string; icb_name: string }> = {
  // Add any manual mappings here based on ODS data
  // Format: 'TRUST_CODE': { icb_code: 'ICB_CODE', icb_name: 'ICB_NAME' }
};

async function analyzeMappingGaps() {
  console.log('🔍 Analyzing ICB mapping gaps...\n');

  // Get all unique trusts
  const { data: trustData, error: trustError } = await supabase
    .from('trust_metrics')
    .select('trust_code, trust_name, icb_code, icb_name')
    .order('trust_name');

  if (trustError) {
    console.error('❌ Error fetching trust data:', trustError);
    return;
  }

  // Deduplicate by trust_code
  const uniqueTrusts = new Map();
  trustData?.forEach(t => {
    if (!uniqueTrusts.has(t.trust_code)) {
      uniqueTrusts.set(t.trust_code, t);
    }
  });

  const trusts = Array.from(uniqueTrusts.values());
  const withICB = trusts.filter(t => t.icb_code);
  const withoutICB = trusts.filter(t => !t.icb_code);

  console.log(`✅ Trusts with ICB: ${withICB.length}`);
  console.log(`⚠️  Trusts without ICB: ${withoutICB.length}\n`);

  if (withoutICB.length > 0) {
    console.log('Trusts missing ICB mapping:');
    withoutICB.forEach(t => {
      console.log(`  ${t.trust_code} - ${t.trust_name}`);
    });
  }

  return { withICB, withoutICB, allTrusts: trusts };
}

async function validateICBReferences() {
  console.log('\n🔍 Validating ICB references...\n');

  // Get all ICBs from reference table
  const { data: icbData, error: icbError } = await supabase
    .from('icbs')
    .select('icb_code, icb_name');

  if (icbError) {
    console.error('❌ Error fetching ICBs:', icbError);
    return;
  }

  console.log(`📊 ICB Reference Table: ${icbData?.length} ICBs`);

  // Get unique ICBs from trust_metrics
  const { data: trustMetricsICBs, error: tmError } = await supabase.rpc(
    'exec_sql',
    {
      sql: `
        SELECT DISTINCT icb_code, icb_name
        FROM trust_metrics
        WHERE icb_code IS NOT NULL
        ORDER BY icb_code
      `
    }
  );

  if (tmError) {
    console.error('❌ Error fetching trust_metrics ICBs:', tmError);
    return;
  }

  // Check for ICBs in trust_metrics that aren't in icbs table
  const icbCodes = new Set(icbData?.map(i => i.icb_code) || []);
  const missingFromReference = trustMetricsICBs?.filter(
    (tm: any) => !icbCodes.has(tm.icb_code)
  ) || [];

  if (missingFromReference.length > 0) {
    console.log('\n⚠️  ICBs in trust_metrics but not in icbs reference table:');
    missingFromReference.forEach((icb: any) => {
      console.log(`  ${icb.icb_code} - ${icb.icb_name}`);
    });
  } else {
    console.log('✅ All ICBs in trust_metrics exist in reference table');
  }
}

async function updateMissingMappings() {
  console.log('\n🔧 Updating missing ICB mappings...\n');

  let updateCount = 0;

  for (const [trustCode, mapping] of Object.entries(MANUAL_MAPPINGS)) {
    const { error } = await supabase
      .from('trust_metrics')
      .update({
        icb_code: mapping.icb_code,
        icb_name: mapping.icb_name
      })
      .eq('trust_code', trustCode);

    if (error) {
      console.error(`❌ Error updating ${trustCode}:`, error);
    } else {
      console.log(`✅ Updated ${trustCode} -> ${mapping.icb_code}`);
      updateCount++;
    }
  }

  if (updateCount === 0) {
    console.log('ℹ️  No manual mappings to apply');
  } else {
    console.log(`\n✅ Updated ${updateCount} trust mappings`);
  }
}

async function generateICBStats() {
  console.log('\n📊 ICB Statistics...\n');

  const { data, error } = await supabase.rpc(
    'exec_sql',
    {
      sql: `
        SELECT
          icb_code,
          icb_name,
          COUNT(DISTINCT trust_code) as trust_count
        FROM trust_metrics
        WHERE icb_code IS NOT NULL
        GROUP BY icb_code, icb_name
        ORDER BY trust_count DESC, icb_name
      `
    }
  );

  if (error) {
    console.error('❌ Error generating stats:', error);
    return;
  }

  console.log('ICB Distribution (trusts per ICB):');
  data?.forEach((row: any) => {
    console.log(`  ${row.icb_code} - ${row.trust_count} trusts - ${row.icb_name}`);
  });
}

async function main() {
  console.log('🏥 Trust-to-ICB Mapping Update Tool\n');

  try {
    // Step 1: Analyze gaps
    await analyzeMappingGaps();

    // Step 2: Validate ICB references
    await validateICBReferences();

    // Step 3: Update missing mappings
    await updateMissingMappings();

    // Step 4: Generate statistics
    await generateICBStats();

    console.log('\n✅ Analysis complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Review trusts without ICB mappings above');
    console.log('2. Look up missing mappings in ODS at https://www.odsdatasearchandexport.nhs.uk/');
    console.log('3. Add manual mappings to MANUAL_MAPPINGS in this script');
    console.log('4. Re-run this script to apply updates');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

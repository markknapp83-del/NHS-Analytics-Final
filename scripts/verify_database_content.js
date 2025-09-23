const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function verifyDatabaseContent() {
  console.log('🔍 Verifying database content...');

  // Load credentials from .env file
  const envContent = fs.readFileSync('../hooks/.env', 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
      }
    }
  });

  const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get total record count
    const { data: allRecords, error: countError } = await supabase
      .from('trust_metrics')
      .select('*')
      .limit(10);

    if (countError) {
      throw new Error(`Database query failed: ${countError.message}`);
    }

    console.log(`📊 Found ${allRecords.length} records (showing first 10)`);

    // Display sample records
    allRecords.slice(0, 5).forEach((record, idx) => {
      console.log(`\n📋 Record ${idx + 1}:`);
      console.log(`  Trust Code: ${record.trust_code}`);
      console.log(`  Trust Name: ${record.trust_name}`);
      console.log(`  Period: ${record.period}`);
      console.log(`  Data Type: ${record.data_type}`);

      // Show RTT data sample
      if (record.rtt_data && typeof record.rtt_data === 'object') {
        console.log(`  RTT Data Structure:`);
        if (record.rtt_data.trust_total) {
          const trustTotal = record.rtt_data.trust_total;
          console.log(`    Trust Total Pathways: ${trustTotal.total_incomplete_pathways || 'null'}`);
          console.log(`    Within 18 Weeks %: ${trustTotal.percent_within_18_weeks || 'null'}`);
        }
        if (record.rtt_data.specialties) {
          const specialtyCount = Object.keys(record.rtt_data.specialties).length;
          console.log(`    Specialties Count: ${specialtyCount}`);
        }
      } else {
        console.log(`  RTT Data: ${record.rtt_data}`);
      }

      // Show A&E data sample
      if (record.ae_data && typeof record.ae_data === 'object') {
        console.log(`  A&E Data Structure:`);
        console.log(`    Total Attendances: ${record.ae_data.attendances_total || 'null'}`);
        console.log(`    4hr Performance %: ${record.ae_data['4hr_performance_pct'] || 'null'}`);
      } else {
        console.log(`  A&E Data: ${record.ae_data}`);
      }

      // Show ICB info
      console.log(`  ICB Code: ${record.icb_code || 'null'}`);
    });

    // Summary statistics
    const summary = await analyzeDatabaseContent(supabase);
    console.log('\n📊 Database Content Analysis:');
    console.log('===============================');
    console.log(summary);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function analyzeDatabaseContent(supabase) {
  try {
    // Get all records for analysis
    const { data: records, error } = await supabase
      .from('trust_metrics')
      .select('*');

    if (error) throw error;

    const analysis = {
      total_records: records.length,
      unique_trusts: new Set(records.map(r => r.trust_code)).size,
      unique_periods: new Set(records.map(r => r.period)).size,
      records_with_rtt_data: records.filter(r => r.rtt_data && typeof r.rtt_data === 'object' && Object.keys(r.rtt_data).length > 0).length,
      records_with_ae_data: records.filter(r => r.ae_data && typeof r.ae_data === 'object' && Object.keys(r.ae_data).length > 0).length,
      records_with_diagnostics: records.filter(r => r.diagnostics_data && typeof r.diagnostics_data === 'object' && Object.keys(r.diagnostics_data).length > 0).length,
      records_with_icb: records.filter(r => r.icb_code).length
    };

    analysis.data_quality = {
      rtt_population_rate: Math.round(analysis.records_with_rtt_data / analysis.total_records * 100),
      ae_population_rate: Math.round(analysis.records_with_ae_data / analysis.total_records * 100),
      diagnostics_population_rate: Math.round(analysis.records_with_diagnostics / analysis.total_records * 100),
      icb_population_rate: Math.round(analysis.records_with_icb / analysis.total_records * 100)
    };

    return analysis;

  } catch (error) {
    return { error: error.message };
  }
}

// Run verification
if (require.main === module) {
  verifyDatabaseContent()
    .then(() => {
      console.log('\n✅ Database verification completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Verification failed:', error.message);
      process.exit(1);
    });
}
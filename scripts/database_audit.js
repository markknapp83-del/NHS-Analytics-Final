const { createClient } = require('@supabase/supabase-js');

// Database audit script for Phase 1.1
async function performDatabaseAudit() {
  console.log('=== NHS Analytics Database Audit ===\n');

  // Note: Supabase credentials would normally be in environment variables
  // For this audit, we'll need to configure these
  const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

  if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_KEY') {
    console.log('❌ Supabase credentials not configured');
    console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    console.log('Or update this script with your Supabase project credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔍 Checking trust_metrics table structure...\n');

    // Query 1: Check actual JSONB content structure
    console.log('1. ANALYZING JSONB CONTENT STRUCTURE');
    console.log('=====================================');
    const { data: sampleData, error: sampleError } = await supabase
      .from('trust_metrics')
      .select('trust_code, rtt_data, ae_data, diagnostics_data')
      .not('rtt_data', 'is', null)
      .limit(5);

    if (sampleError) {
      console.log('❌ Error querying sample data:', sampleError.message);
    } else {
      console.log(`📊 Sample records found: ${sampleData?.length || 0}`);
      if (sampleData && sampleData.length > 0) {
        sampleData.forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          console.log(`Trust Code: ${record.trust_code}`);
          console.log(`RTT Data Type: ${typeof record.rtt_data}`);
          console.log(`RTT Data Content: ${JSON.stringify(record.rtt_data).substring(0, 100)}...`);
          console.log(`A&E Data Type: ${typeof record.ae_data}`);
          console.log(`Diagnostics Data Type: ${typeof record.diagnostics_data}`);
        });
      }
    }

    // Query 2: Analyze data completeness
    console.log('\n\n2. DATA COMPLETENESS ANALYSIS');
    console.log('==============================');
    const { data: completenessData, error: completenessError } = await supabase
      .rpc('analyze_data_completeness');

    if (completenessError) {
      // Fallback to manual count if RPC doesn't exist
      console.log('🔍 Running manual completeness analysis...');
      const { count: totalCount } = await supabase
        .from('trust_metrics')
        .select('*', { count: 'exact', head: true });

      const { count: rttCount } = await supabase
        .from('trust_metrics')
        .select('*', { count: 'exact', head: true })
        .not('rtt_data', 'is', null);

      const { count: aeCount } = await supabase
        .from('trust_metrics')
        .select('*', { count: 'exact', head: true })
        .not('ae_data', 'is', null);

      const { count: diagnosticsCount } = await supabase
        .from('trust_metrics')
        .select('*', { count: 'exact', head: true })
        .not('diagnostics_data', 'is', null);

      const { count: icbCount } = await supabase
        .from('trust_metrics')
        .select('*', { count: 'exact', head: true })
        .not('icb_code', 'is', null);

      console.log(`📈 Total Records: ${totalCount}`);
      console.log(`📈 RTT Data Populated: ${rttCount} (${((rttCount/totalCount)*100).toFixed(1)}%)`);
      console.log(`📈 A&E Data Populated: ${aeCount} (${((aeCount/totalCount)*100).toFixed(1)}%)`);
      console.log(`📈 Diagnostics Data Populated: ${diagnosticsCount} (${((diagnosticsCount/totalCount)*100).toFixed(1)}%)`);
      console.log(`📈 ICB Code Populated: ${icbCount} (${((icbCount/totalCount)*100).toFixed(1)}%)`);
    } else {
      console.log('📊 Completeness data:', completenessData);
    }

    // Query 3: Check for data type issues
    console.log('\n\n3. DATA TYPE ANALYSIS');
    console.log('=====================');
    const { data: typeData, error: typeError } = await supabase
      .from('trust_metrics')
      .select('trust_code, period, rtt_data, ae_data')
      .limit(10);

    if (typeError) {
      console.log('❌ Error querying type data:', typeError.message);
    } else {
      console.log(`📊 Type analysis records: ${typeData?.length || 0}`);
      if (typeData && typeData.length > 0) {
        typeData.forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          console.log(`Trust: ${record.trust_code} | Period: ${record.period}`);
          console.log(`RTT Data Type: ${typeof record.rtt_data} | Content: ${record.rtt_data === null ? 'NULL' : (typeof record.rtt_data === 'string' ? record.rtt_data.substring(0, 50) : 'OBJECT')}`);
          console.log(`A&E Data Type: ${typeof record.ae_data} | Content: ${record.ae_data === null ? 'NULL' : (typeof record.ae_data === 'string' ? record.ae_data.substring(0, 50) : 'OBJECT')}`);
        });
      }
    }

    // Query 4: Check table schema
    console.log('\n\n4. TABLE SCHEMA ANALYSIS');
    console.log('========================');
    const { data: schemaData, error: schemaError } = await supabase
      .from('trust_metrics')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.log('❌ Error querying schema:', schemaError.message);
    } else if (schemaData && schemaData.length > 0) {
      console.log('📋 Available columns:');
      Object.keys(schemaData[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof schemaData[0][column]}`);
      });
    }

  } catch (error) {
    console.log('❌ Database audit failed:', error.message);
  }

  console.log('\n=== Audit Complete ===');
}

// Run the audit
performDatabaseAudit();
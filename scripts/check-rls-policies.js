const { createClient } = require('@supabase/supabase-js');

// Use credentials from environment
const SUPABASE_URL = 'https://fsopilxzaaukmcqcskqm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk5MzYzNywiZXhwIjoyMDczNTY5NjM3fQ.mDtWXZo-U4lyM-A73qCICQRDP5qOw7nc9ZOF2YcDagg';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ';

async function checkRLSPolicies() {
  console.log('🔍 Examining Current RLS Policy Configuration...\n');

  // Create admin client with service role
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Create anon client for testing
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // Step 1: Check if RLS is enabled
    console.log('1️⃣ Checking RLS status...');
    const { data: rlsStatus, error: rlsError } = await adminClient
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'trust_metrics');

    if (rlsError) {
      console.log('❌ Failed to check RLS status:', rlsError.message);
    } else if (rlsStatus && rlsStatus.length > 0) {
      console.log('✅ RLS Status:', rlsStatus[0].rowsecurity ? 'ENABLED' : 'DISABLED');
    }

    // Step 2: Check existing policies
    console.log('\n2️⃣ Examining current policies...');
    const { data: policies, error: policyError } = await adminClient
      .from('pg_policies')
      .select('policyname, cmd, roles, qual, with_check')
      .eq('tablename', 'trust_metrics');

    if (policyError) {
      console.log('❌ Failed to fetch policies:', policyError.message);
    } else if (policies && policies.length > 0) {
      console.log(`✅ Found ${policies.length} policies:`);
      policies.forEach((policy, index) => {
        console.log(`   ${index + 1}. "${policy.policyname}"`);
        console.log(`      Command: ${policy.cmd}`);
        console.log(`      Roles: ${policy.roles}`);
        console.log(`      Using: ${policy.qual || 'N/A'}`);
        console.log(`      With Check: ${policy.with_check || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No policies found!');
    }

    // Step 3: Test actual database operations
    console.log('3️⃣ Testing database operations with anon key...\n');

    // Test SELECT
    console.log('   Testing SELECT...');
    const { data: selectData, error: selectError } = await anonClient
      .from('trust_metrics')
      .select('trust_code, trust_name')
      .limit(1);

    if (selectError) {
      console.log('   ❌ SELECT failed:', selectError.message);
    } else {
      console.log('   ✅ SELECT works:', selectData?.length || 0, 'records');
    }

    // Test INSERT
    console.log('   Testing INSERT...');
    const { error: insertError } = await anonClient
      .from('trust_metrics')
      .insert({
        trust_code: 'TST',
        trust_name: 'Test',
        period: '2024-01-01',
        icb_code: 'ICB',
        icb_name: 'Test ICB',
        data_type: 'test',
        rtt_data: {},
        ae_data: {},
        diagnostics_data: {},
        capacity_data: {}
      });

    if (insertError) {
      console.log('   ✅ INSERT blocked:', insertError.message);
      if (insertError.message.includes('row-level security')) {
        console.log('       🎯 Blocked by RLS policy');
      } else {
        console.log('       ⚠️  Blocked by other constraint');
      }
    } else {
      console.log('   ❌ INSERT succeeded - NOT SECURE!');
    }

    // Test UPDATE
    console.log('   Testing UPDATE...');
    const { error: updateError } = await anonClient
      .from('trust_metrics')
      .update({ trust_name: 'Modified Name' })
      .eq('trust_code', 'R1H');

    if (updateError) {
      console.log('   ✅ UPDATE blocked:', updateError.message);
      if (updateError.message.includes('row-level security')) {
        console.log('       🎯 Blocked by RLS policy');
      } else {
        console.log('       ⚠️  Blocked by other constraint');
      }
    } else {
      console.log('   ❌ UPDATE succeeded - NOT SECURE!');
    }

    // Test DELETE
    console.log('   Testing DELETE...');
    const { error: deleteError } = await anonClient
      .from('trust_metrics')
      .delete()
      .eq('trust_code', 'NONEXISTENT');

    if (deleteError) {
      console.log('   ✅ DELETE blocked:', deleteError.message);
      if (deleteError.message.includes('row-level security')) {
        console.log('       🎯 Blocked by RLS policy');
      } else {
        console.log('       ⚠️  Blocked by other constraint');
      }
    } else {
      console.log('   ❌ DELETE succeeded - NOT SECURE!');
    }

    console.log('\n🎯 SECURITY ANALYSIS:');
    console.log('=====================');

    if (policies && policies.length > 0) {
      const hasSelectPolicy = policies.some(p => p.cmd === 'SELECT');
      const hasInsertPolicy = policies.some(p => p.cmd === 'INSERT' || p.cmd === 'ALL');
      const hasUpdatePolicy = policies.some(p => p.cmd === 'UPDATE' || p.cmd === 'ALL');
      const hasDeletePolicy = policies.some(p => p.cmd === 'DELETE' || p.cmd === 'ALL');

      console.log('SELECT policy:', hasSelectPolicy ? '✅ Present' : '❌ Missing');
      console.log('INSERT policy:', hasInsertPolicy ? '✅ Present' : '❌ Missing');
      console.log('UPDATE policy:', hasUpdatePolicy ? '✅ Present' : '❌ Missing');
      console.log('DELETE policy:', hasDeletePolicy ? '✅ Present' : '❌ Missing');

      // Check for problematic policies
      const problematicPolicies = policies.filter(p =>
        p.roles.includes('anon') &&
        (p.cmd === 'ALL' || p.cmd === 'UPDATE' || p.cmd === 'DELETE') &&
        (!p.qual || p.qual === 'true' || !p.qual.includes('false'))
      );

      if (problematicPolicies.length > 0) {
        console.log('\n⚠️  POTENTIAL ISSUES FOUND:');
        problematicPolicies.forEach(policy => {
          console.log(`   • "${policy.policyname}" may be too permissive`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Policy check failed:', error.message);
  }
}

checkRLSPolicies();
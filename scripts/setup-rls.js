const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './hooks/.env' });

async function setupRLS() {
  console.log('🔒 Setting up Row Level Security for NHS Analytics Tool...\n');

  // Use service role key for admin operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('📋 Manual Setup Required - SQL Commands to Run:');
  console.log('==========================================\n');

  const projectRef = process.env.SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)[1];
  console.log(`🔗 Go to: https://app.supabase.com/project/${projectRef}/sql\n`);

  console.log('📝 Copy and paste these SQL commands:\n');
  console.log('-- 1. Enable Row Level Security');
  console.log('ALTER TABLE trust_metrics ENABLE ROW LEVEL SECURITY;\n');

  console.log('-- 2. Create read-only policy for anonymous users');
  console.log('CREATE POLICY "Public read access for NHS data" ON trust_metrics');
  console.log('FOR SELECT TO anon USING (true);\n');

  console.log('-- 3. Block all write operations for anonymous users');
  console.log('CREATE POLICY "No public modifications allowed" ON trust_metrics');
  console.log('FOR ALL TO anon USING (false) WITH CHECK (false);\n');

  console.log('-- 4. Verify RLS is enabled');
  console.log('SELECT schemaname, tablename, rowsecurity');
  console.log('FROM pg_tables WHERE tablename = \'trust_metrics\';\n');

  console.log('-- 5. Verify policies were created');
  console.log('SELECT schemaname, tablename, policyname, roles, cmd');
  console.log('FROM pg_policies WHERE tablename = \'trust_metrics\';\n');

  // Test current database access
  try {
    console.log('🧪 Testing current database access...');
    const { data, error } = await supabase
      .from('trust_metrics')
      .select('trust_code, trust_name')
      .limit(1);

    if (error) {
      console.log('❌ Database access test failed:', error.message);
    } else {
      console.log('✅ Database connection working');
      console.log(`   Found ${data?.length || 0} records`);
    }

    // Test insert (should fail once RLS is set up)
    console.log('\n🔒 Testing INSERT operation...');
    const { error: insertError } = await supabase
      .from('trust_metrics')
      .insert({ trust_code: 'TST', trust_name: 'Test' });

    if (insertError) {
      console.log('✅ INSERT blocked:', insertError.message);
      if (insertError.message.includes('row-level security') ||
          insertError.message.includes('permission denied')) {
        console.log('   🎯 RLS is already working!');
      } else {
        console.log('   ⚠️  Blocked by other constraints, RLS may not be active');
      }
    } else {
      console.log('❌ INSERT succeeded - RLS needs to be configured!');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

setupRLS();
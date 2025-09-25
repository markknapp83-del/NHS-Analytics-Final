const https = require('https');

const SUPABASE_URL = 'https://fsopilxzaaukmcqcskqm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk5MzYzNywiZXhwIjoyMDczNTY5NjM3fQ.mDtWXZo-U4lyM-A73qCICQRDP5qOw7nc9ZOF2YcDagg';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });

    const options = {
      hostname: 'fsopilxzaaukmcqcskqm.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ data: result, status: res.statusCode });
        } catch (error) {
          resolve({ data, status: res.statusCode, raw: true });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies to Block UPDATE and DELETE...\n');

  const policies = [
    {
      name: 'Drop problematic ALL policy',
      sql: 'DROP POLICY IF EXISTS "No public modifications allowed" ON trust_metrics;'
    },
    {
      name: 'Create INSERT blocking policy',
      sql: 'CREATE POLICY "Block anon inserts" ON trust_metrics FOR INSERT TO anon WITH CHECK (false);'
    },
    {
      name: 'Create UPDATE blocking policy',
      sql: 'CREATE POLICY "Block anon updates" ON trust_metrics FOR UPDATE TO anon USING (false);'
    },
    {
      name: 'Create DELETE blocking policy',
      sql: 'CREATE POLICY "Block anon deletes" ON trust_metrics FOR DELETE TO anon USING (false);'
    }
  ];

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    console.log(`${i + 1}️⃣ ${policy.name}...`);

    try {
      const result = await executeSQL(policy.sql);
      if (result.status === 200 || result.status === 201) {
        console.log('   ✅ Success');
      } else {
        console.log('   ⚠️  Response:', result.status, result.data);
      }
    } catch (error) {
      console.log('   ❌ Failed:', error.message);
    }
  }

  // Test the policies
  console.log('\n🧪 Testing fixed policies...');
  console.log('Manual test required - run the security test again.');
  console.log('\nExpected results after fix:');
  console.log('✅ SELECT: Should work (read access)');
  console.log('❌ INSERT: Should be blocked by RLS');
  console.log('❌ UPDATE: Should be blocked by RLS');
  console.log('❌ DELETE: Should be blocked by RLS');
}

async function manualPolicyInstructions() {
  console.log('📋 MANUAL FIX INSTRUCTIONS');
  console.log('=========================\n');

  console.log('If the automated fix doesn\'t work, please run these SQL commands manually in Supabase SQL Editor:\n');

  console.log('-- 1. Remove the problematic policy');
  console.log('DROP POLICY IF EXISTS "No public modifications allowed" ON trust_metrics;\n');

  console.log('-- 2. Create specific blocking policies');
  console.log('CREATE POLICY "Block anon inserts" ON trust_metrics FOR INSERT TO anon WITH CHECK (false);');
  console.log('CREATE POLICY "Block anon updates" ON trust_metrics FOR UPDATE TO anon USING (false);');
  console.log('CREATE POLICY "Block anon deletes" ON trust_metrics FOR DELETE TO anon USING (false);\n');

  console.log('-- 3. Verify policies (should show 4 policies total)');
  console.log('SELECT policyname, cmd FROM pg_policies WHERE tablename = \'trust_metrics\';\n');

  console.log('After running these commands, you should have:');
  console.log('- "Public read access for NHS data" (SELECT)');
  console.log('- "Block anon inserts" (INSERT)');
  console.log('- "Block anon updates" (UPDATE)');
  console.log('- "Block anon deletes" (DELETE)');
}

fixRLSPolicies().then(() => {
  console.log('\n');
  manualPolicyInstructions();
}).catch((error) => {
  console.error('❌ Fix attempt failed:', error.message);
  console.log('\n');
  manualPolicyInstructions();
});
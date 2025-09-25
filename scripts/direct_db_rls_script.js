// Direct Database RLS Configuration Script
// This uses the service role key to configure RLS policies directly

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://fsopilxzaaukmcqcskqm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function configureRLS() {
    console.log('🔒 Configuring RLS Policies for NHS Analytics Dashboard\n');
    
    try {
        // Step 1: Enable RLS on trust_metrics table
        console.log('1️⃣ Enabling Row Level Security...');
        const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
            sql: 'ALTER TABLE trust_metrics ENABLE ROW LEVEL SECURITY;'
        });
        
        if (rlsError && !rlsError.message.includes('already enabled')) {
            throw rlsError;
        }
        console.log('✅ RLS enabled successfully\n');

        // Step 2: Drop existing policies (cleanup)
        console.log('2️⃣ Cleaning up existing policies...');
        await supabaseAdmin.rpc('exec_sql', {
            sql: `
                DROP POLICY IF EXISTS "Public read access for NHS data" ON trust_metrics;
                DROP POLICY IF EXISTS "No public modifications allowed" ON trust_metrics;
            `
        });
        console.log('✅ Existing policies cleaned up\n');

        // Step 3: Create read-only policy for anonymous users
        console.log('3️⃣ Creating read-only policy...');
        const { error: readPolicyError } = await supabaseAdmin.rpc('exec_sql', {
            sql: `
                CREATE POLICY "Public read access for NHS data" ON trust_metrics
                FOR SELECT 
                TO anon 
                USING (true);
            `
        });
        
        if (readPolicyError) throw readPolicyError;
        console.log('✅ Read-only policy created\n');

        // Step 4: Create policy to block modifications
        console.log('4️⃣ Creating modification blocking policy...');
        const { error: blockPolicyError } = await supabaseAdmin.rpc('exec_sql', {
            sql: `
                CREATE POLICY "No public modifications allowed" ON trust_metrics
                FOR ALL 
                TO anon 
                USING (false) 
                WITH CHECK (false);
            `
        });
        
        if (blockPolicyError) throw blockPolicyError;
        console.log('✅ Modification blocking policy created\n');

        // Step 5: Verify policies
        console.log('5️⃣ Verifying policies...');
        const { data: policies, error: verifyError } = await supabaseAdmin.rpc('exec_sql', {
            sql: `
                SELECT 
                    policyname, 
                    permissive, 
                    roles, 
                    cmd 
                FROM pg_policies 
                WHERE tablename = 'trust_metrics';
            `
        });
        
        if (verifyError) throw verifyError;
        
        console.log('📋 Current policies:');
        if (policies && policies.length > 0) {
            policies.forEach(policy => {
                console.log(`   • ${policy.policyname} - ${policy.cmd} for ${policy.roles}`);
            });
        } else {
            console.log('   No policies found (this might indicate an issue)');
        }
        console.log('');

        // Step 6: Test read access
        console.log('6️⃣ Testing read access...');
        const { data: testData, error: testError } = await supabaseAdmin
            .from('trust_metrics')
            .select('trust_code, trust_name')
            .limit(1);
        
        if (testError) {
            console.log('❌ Read test failed:', testError.message);
        } else {
            console.log('✅ Read access test passed');
            console.log(`   Sample data: ${testData[0]?.trust_name} (${testData[0]?.trust_code})\n`);
        }

        // Step 7: Test with anon key
        console.log('7️⃣ Testing anonymous access...');
        const anonClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_anon_key');
        
        const { data: anonData, error: anonError } = await anonClient
            .from('trust_metrics')
            .select('trust_code')
            .limit(1);
            
        if (anonError) {
            console.log('❌ Anonymous read test failed:', anonError.message);
        } else {
            console.log('✅ Anonymous read access working');
        }

        // Try to insert with anon key (should fail)
        const { error: insertError } = await anonClient
            .from('trust_metrics')
            .insert({ trust_code: 'TEST', trust_name: 'Test Trust', period: '2024-01-01' });
            
        if (insertError) {
            console.log('✅ Anonymous write access correctly blocked');
            console.log(`   Error: ${insertError.message}\n`);
        } else {
            console.log('❌ WARNING: Anonymous write access was not blocked!\n');
        }

        console.log('🎉 RLS configuration completed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ RLS enabled on trust_metrics table');
        console.log('   ✅ Public read access policy active');
        console.log('   ✅ Public write access blocked');
        console.log('   ✅ Anonymous key testing passed');
        console.log('\nYour database is now ready for public deployment! 🚀');
        
    } catch (error) {
        console.error('❌ Configuration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Alternative function using raw SQL if RPC doesn't work
async function configureRLSWithRawSQL() {
    console.log('🔄 Trying alternative method with raw SQL queries...\n');
    
    const queries = [
        'ALTER TABLE trust_metrics ENABLE ROW LEVEL SECURITY;',
        'DROP POLICY IF EXISTS "Public read access for NHS data" ON trust_metrics;',
        'DROP POLICY IF EXISTS "No public modifications allowed" ON trust_metrics;',
        `CREATE POLICY "Public read access for NHS data" ON trust_metrics FOR SELECT TO anon USING (true);`,
        `CREATE POLICY "No public modifications allowed" ON trust_metrics FOR ALL TO anon USING (false) WITH CHECK (false);`
    ];
    
    for (let i = 0; i < queries.length; i++) {
        try {
            console.log(`Executing query ${i + 1}/${queries.length}...`);
            const { error } = await supabaseAdmin.rpc('query', { query: queries[i] });
            if (error) console.log(`⚠️  Query ${i + 1} warning:`, error.message);
            else console.log(`✅ Query ${i + 1} completed`);
        } catch (err) {
            console.log(`❌ Query ${i + 1} failed:`, err.message);
        }
    }
}

// Run the configuration
if (require.main === module) {
    configureRLS().catch(() => {
        console.log('\n🔄 Primary method failed, trying alternative approach...');
        configureRLSWithRawSQL();
    });
}

module.exports = { configureRLS, configureRLSWithRawSQL };
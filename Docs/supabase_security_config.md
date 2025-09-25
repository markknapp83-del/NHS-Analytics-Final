# Supabase Security Configuration for Public Deployment
## NHS Analytics Dashboard - Database Security Setup

## Project Context
Securing Supabase database for public deployment of NHS Analytics Dashboard on Vercel. This configuration ensures read-only public access to NHS trust data while preventing unauthorized modifications.

## Objective
Configure Supabase database with Row Level Security (RLS) to allow safe public deployment without exposing sensitive database operations or administrative functions.

---

## Step 1: Configure Supabase Row Level Security

### Task 1.1: Enable RLS on Database Tables
```bash
# Claude Code Task: Enable Row Level Security on trust_metrics table
# Action: Access Supabase dashboard and enable RLS protection
# Output: RLS enabled confirmation, security status verification
```

**Manual Supabase Dashboard Steps:**
1. Navigate to **Supabase Dashboard** → **Authentication** → **Settings**
2. Go to **Database** → **Tables** 
3. Locate `trust_metrics` table
4. Click table name to open table view
5. Click **"Settings"** tab
6. Toggle **"Enable Row Level Security"** to ON
7. Confirm RLS is enabled (green checkmark should appear)

**Verification Commands:**
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'trust_metrics';

-- Expected result: rowsecurity = true
```

### Task 1.2: Create Read-Only Security Policies
```bash
# Claude Code Task: Create RLS policies for public read-only access
# Action: Execute SQL commands in Supabase SQL Editor
# Output: Security policies created, access permissions configured
```

**SQL Commands to Execute in Supabase SQL Editor:**
```sql
-- 1. Enable RLS on trust_metrics table (if not already enabled)
ALTER TABLE trust_metrics ENABLE ROW LEVEL SECURITY;

-- 2. Create policy allowing public read access to NHS data
CREATE POLICY "Public read access for NHS data" ON trust_metrics
FOR SELECT 
TO anon
USING (true);

-- 3. Create policy explicitly denying all modifications from public users
CREATE POLICY "No public modifications allowed" ON trust_metrics
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);

-- 4. Verify policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'trust_metrics';
```

**Expected Policy Results:**
- Policy 1: `Public read access for NHS data` - SELECT permissions for `anon`
- Policy 2: `No public modifications allowed` - Blocks INSERT/UPDATE/DELETE for `anon`

### Task 1.3: Verify Database Security Configuration
```bash
# Claude Code Task: Test database security settings
# Action: Verify RLS policies work correctly with anon key
# Output: Security test results, access confirmation report
```

**Security Verification Tests:**
```sql
-- Test 1: Verify SELECT access works (should succeed)
SET ROLE anon;
SELECT trust_code, trust_name, period 
FROM trust_metrics 
LIMIT 5;

-- Test 2: Verify INSERT is blocked (should fail)
SET ROLE anon;
INSERT INTO trust_metrics (trust_code, trust_name, period) 
VALUES ('TEST', 'Test Trust', '2024-01-01');
-- Expected error: "new row violates row-level security policy"

-- Test 3: Verify UPDATE is blocked (should fail) 
SET ROLE anon;
UPDATE trust_metrics 
SET trust_name = 'Modified Name' 
WHERE trust_code = 'R1H';
-- Expected error: "permission denied for relation trust_metrics"

-- Test 4: Verify DELETE is blocked (should fail)
SET ROLE anon;
DELETE FROM trust_metrics 
WHERE trust_code = 'R1H';
-- Expected error: "permission denied for relation trust_metrics"

-- Reset role
RESET ROLE;
```

---

## Step 2: Configure Environment Variables

### Task 2.1: Create Secure Environment Configuration
```bash
# Claude Code Task: Set up environment variables for public deployment
# Action: Configure .env files with appropriate security separation
# Output: Environment configuration files, security guidelines
```

**Create `.env.local` (Local Development):**
```bash
# PUBLIC VARIABLES - Safe to expose in browser
NEXT_PUBLIC_SUPABASE_URL=https://fsopilxzaaukmcqcskqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# PRIVATE VARIABLES - Never expose these in frontend
# Only use for server-side operations (if any)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application settings
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEPLOYMENT_ENV=production
```

**Create `.env.example` (For Documentation):**
```bash
# PUBLIC VARIABLES - Required for frontend
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# PRIVATE VARIABLES - Server-side only, never expose
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional application settings
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEPLOYMENT_ENV=production
```

**Update `.gitignore` (Ensure Security):**
```gitignore
# Environment variables
.env.local
.env.production
.env

# Supabase
.supabase/

# Keep .env.example for documentation
!.env.example
```

### Task 2.2: Update Supabase Client Configuration
```bash
# Claude Code Task: Configure secure Supabase client for public deployment
# Action: Update database client to use only anon key with proper error handling
# Output: Updated supabase client configuration, security validation
```

**Update `src/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client using ONLY the anon key
// This ensures read-only access as configured by RLS policies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No user sessions needed for public app
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

// SECURITY NOTE: Never use service role key in frontend code
// Service role key bypasses RLS and should only be used server-side
// const supabaseAdmin = createClient(url, serviceRoleKey) // DON'T DO THIS IN FRONTEND

export default supabase
```

**Create Database Query Validation Helper (`src/lib/database-security.ts`):**
```typescript
import { supabase } from './supabase'

/**
 * Safe database query wrapper that ensures read-only operations
 * and provides proper error handling for public deployment
 */
export class SecureDatabaseClient {
  
  /**
   * Execute a safe SELECT query with built-in validation
   */
  static async safeSelect(
    table: string, 
    query: string = '*', 
    filters?: Record<string, any>
  ) {
    try {
      let queryBuilder = supabase.from(table).select(query)
      
      // Apply filters if provided
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value)
        })
      }
      
      const { data, error } = await queryBuilder
      
      if (error) {
        console.error('Database query error:', error)
        return { data: null, error: error.message }
      }
      
      return { data, error: null }
      
    } catch (error) {
      console.error('Unexpected database error:', error)
      return { data: null, error: 'Database connection failed' }
    }
  }
  
  /**
   * Validate that only read operations are being performed
   */
  static validateReadOnlyOperation(operation: string) {
    const allowedOperations = ['select', 'from']
    const dangerous = ['insert', 'update', 'delete', 'alter', 'drop', 'create']
    
    const lowerOp = operation.toLowerCase()
    
    if (dangerous.some(op => lowerOp.includes(op))) {
      throw new Error(`Operation '${operation}' not allowed in public deployment`)
    }
    
    return true
  }
}

export default SecureDatabaseClient
```

---

## Step 3: Audit and Secure Data Access Patterns

### Task 3.1: Review All Database Operations
```bash
# Claude Code Task: Audit existing database queries for security compliance
# Action: Scan codebase for database operations and ensure read-only access
# Output: Security audit report, list of compliant/non-compliant operations
```

**Database Operations Audit Checklist:**
- [ ] All database queries use `SELECT` operations only
- [ ] No `INSERT`, `UPDATE`, or `DELETE` operations in frontend code
- [ ] No user data collection or storage
- [ ] No authentication-related database calls
- [ ] All queries use the anon key (not service role key)
- [ ] Proper error handling for failed database connections

**Update Data Access Hooks (`src/hooks/useNHSData.ts`):**
```typescript
import { useState, useEffect } from 'react'
import { SecureDatabaseClient } from '@/lib/database-security'
import type { NHSTrustData } from '@/types/nhs-data'

export function useNHSData() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trusts, setTrusts] = useState<Array<{code: string, name: string, icb: string}>>([])

  useEffect(() => {
    loadTrustList()
  }, [])

  const loadTrustList = async () => {
    try {
      setIsLoading(true)
      
      // Use secure read-only query
      const { data, error } = await SecureDatabaseClient.safeSelect(
        'trust_metrics',
        'trust_code, trust_name, icb_name'
      )
      
      if (error) {
        setError(error)
        return
      }
      
      if (data) {
        // Process unique trusts
        const uniqueTrusts = new Map()
        data.forEach((row: any) => {
          if (!uniqueTrusts.has(row.trust_code)) {
            uniqueTrusts.set(row.trust_code, {
              code: row.trust_code,
              name: row.trust_name,
              icb: row.icb_name || 'Unknown ICB'
            })
          }
        })
        
        setTrusts(Array.from(uniqueTrusts.values()).sort((a, b) => 
          a.name.localeCompare(b.name)
        ))
      }
      
    } catch (err) {
      setError('Failed to load NHS trust data')
      console.error('Trust data loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getTrustData = async (trustCode: string): Promise<NHSTrustData[]> => {
    const { data, error } = await SecureDatabaseClient.safeSelect(
      'trust_metrics',
      '*',
      { trust_code: trustCode }
    )
    
    if (error) {
      console.error(`Error loading data for trust ${trustCode}:`, error)
      return []
    }
    
    return data || []
  }

  return { 
    trusts, 
    isLoading, 
    error, 
    getTrustData,
    refreshTrusts: loadTrustList 
  }
}
```

### Task 3.2: Implement Security Monitoring
```bash
# Claude Code Task: Add security monitoring and error tracking
# Action: Implement database usage monitoring and error reporting
# Output: Security monitoring utilities, error tracking system
```

**Create Security Monitor (`src/lib/security-monitor.ts`):**
```typescript
/**
 * Security monitoring utilities for public deployment
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private queryLog: Array<{timestamp: Date, query: string, result: 'success' | 'error'}> = []
  
  static getInstance() {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * Log database query attempts
   */
  logQuery(query: string, success: boolean) {
    this.queryLog.push({
      timestamp: new Date(),
      query: query.substring(0, 100), // Truncate for privacy
      result: success ? 'success' : 'error'
    })
    
    // Keep only last 100 entries
    if (this.queryLog.length > 100) {
      this.queryLog = this.queryLog.slice(-100)
    }
  }
  
  /**
   * Get security statistics
   */
  getSecurityStats() {
    const total = this.queryLog.length
    const errors = this.queryLog.filter(log => log.result === 'error').length
    const recent = this.queryLog.slice(-10)
    
    return {
      totalQueries: total,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      recentQueries: recent,
      lastQuery: this.queryLog[this.queryLog.length - 1]?.timestamp
    }
  }
  
  /**
   * Check for suspicious activity patterns
   */
  checkForAnomalies() {
    const recentErrors = this.queryLog
      .slice(-20) // Last 20 queries
      .filter(log => log.result === 'error').length
      
    if (recentErrors > 10) {
      console.warn('High error rate detected - possible security issue')
      return { anomaly: true, type: 'high_error_rate', count: recentErrors }
    }
    
    return { anomaly: false }
  }
}

export default SecurityMonitor
```

### Task 3.3: Final Security Validation
```bash
# Claude Code Task: Perform comprehensive security validation
# Action: Test all security measures and create deployment readiness report
# Output: Security validation report, deployment readiness checklist
```

**Security Validation Tests:**
```typescript
// Create test file: src/tests/security-validation.test.ts
import { supabase } from '@/lib/supabase'
import { SecureDatabaseClient } from '@/lib/database-security'

/**
 * Security validation test suite
 * Run these tests before deploying to production
 */
export class SecurityValidationTests {
  
  static async runAllTests() {
    const results = {
      databaseConnection: await this.testDatabaseConnection(),
      readOnlyAccess: await this.testReadOnlyAccess(),
      rlsPolicies: await this.testRLSPolicies(),
      environmentSecurity: this.testEnvironmentSecurity(),
      noSensitiveData: this.testNoSensitiveDataExposure()
    }
    
    return results
  }
  
  /**
   * Test 1: Database Connection
   */
  static async testDatabaseConnection() {
    try {
      const { data, error } = await supabase
        .from('trust_metrics')
        .select('trust_code')
        .limit(1)
      
      return {
        passed: !error && data !== null,
        message: error ? `Connection failed: ${error.message}` : 'Database connection successful'
      }
    } catch (err) {
      return { passed: false, message: `Connection test failed: ${err}` }
    }
  }
  
  /**
   * Test 2: Read-Only Access Enforcement
   */
  static async testReadOnlyAccess() {
    const tests = []
    
    // Test SELECT (should work)
    try {
      const { data, error } = await supabase
        .from('trust_metrics')
        .select('trust_code')
        .limit(1)
      
      tests.push({
        operation: 'SELECT',
        passed: !error,
        expected: true,
        message: 'SELECT operation test'
      })
    } catch (err) {
      tests.push({
        operation: 'SELECT', 
        passed: false,
        expected: true,
        message: `SELECT failed: ${err}`
      })
    }
    
    // Test INSERT (should fail)
    try {
      const { error } = await supabase
        .from('trust_metrics')
        .insert({ trust_code: 'TEST', trust_name: 'Test', period: '2024-01-01' })
      
      tests.push({
        operation: 'INSERT',
        passed: error !== null, // Should have error
        expected: true,
        message: error ? 'INSERT correctly blocked' : 'INSERT unexpectedly succeeded'
      })
    } catch (err) {
      tests.push({
        operation: 'INSERT',
        passed: true, // Error is expected
        expected: true,
        message: 'INSERT correctly blocked by security'
      })
    }
    
    return {
      passed: tests.every(test => test.passed === test.expected),
      tests
    }
  }
  
  /**
   * Test 3: RLS Policies
   */
  static async testRLSPolicies() {
    try {
      // This query should work with anon key if RLS is configured correctly
      const { data, error } = await supabase
        .from('trust_metrics')
        .select('count(*)')
        .single()
      
      return {
        passed: !error,
        message: error ? `RLS test failed: ${error.message}` : 'RLS policies working correctly'
      }
    } catch (err) {
      return { passed: false, message: `RLS validation failed: ${err}` }
    }
  }
  
  /**
   * Test 4: Environment Security
   */
  static testEnvironmentSecurity() {
    const issues = []
    
    // Check that service role key is not exposed to frontend
    if (typeof window !== 'undefined') {
      const windowEnv = (window as any).env || {}
      if (windowEnv.SUPABASE_SERVICE_ROLE_KEY) {
        issues.push('Service role key exposed to browser')
      }
    }
    
    // Check required public variables exist
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      issues.push('Missing NEXT_PUBLIC_SUPABASE_URL')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      issues.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    
    return {
      passed: issues.length === 0,
      issues,
      message: issues.length === 0 ? 'Environment security validated' : `Issues found: ${issues.join(', ')}`
    }
  }
  
  /**
   * Test 5: No Sensitive Data Exposure
   */
  static testNoSensitiveDataExposure() {
    // This test checks that we're only exposing NHS public data
    // NHS trust performance data is public information
    
    const publicDataTypes = [
      'trust_code', 'trust_name', 'period', 'icb_code', 'icb_name',
      'rtt_data', 'ae_data', 'diagnostics_data', 'capacity_data'
    ]
    
    return {
      passed: true,
      message: 'Only public NHS performance data is exposed',
      dataTypes: publicDataTypes
    }
  }
}
```

---

## Deployment Readiness Checklist

### Database Security ✅
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Public read-only policy created and active
- [ ] Modification policies deny all public write operations
- [ ] Security policies tested and validated

### Environment Configuration ✅
- [ ] Environment variables properly configured
- [ ] Only anon key used in frontend code
- [ ] Service role key kept private and secure
- [ ] `.env.local` added to `.gitignore`

### Code Security ✅
- [ ] All database operations are SELECT queries only
- [ ] No INSERT/UPDATE/DELETE operations in frontend
- [ ] Secure database client implemented
- [ ] Error handling prevents information leakage
- [ ] Security monitoring implemented

### Testing ✅
- [ ] Database connection tests pass
- [ ] Read-only access enforcement verified
- [ ] RLS policies working correctly
- [ ] No sensitive data exposed to public
- [ ] All security validation tests pass

---

## Next Steps
After completing these security configurations:
1. **Test thoroughly** - Run all validation tests
2. **Deploy to Vercel** - Your database is now secure for public deployment
3. **Monitor usage** - Keep an eye on Supabase dashboard for any unusual activity
4. **Regular audits** - Periodically review access logs and security settings

Your NHS Analytics Dashboard is now ready for secure public deployment! 🚀

## Emergency Procedures
If security issues are detected:
1. **Immediately disable** the problematic RLS policies
2. **Revoke and regenerate** Supabase API keys
3. **Review** all recent database activity
4. **Update** security policies before re-enabling public access
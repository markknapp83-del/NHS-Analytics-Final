# NHS Analytics v5 - Claude Context

## Project Overview
Build a Next.js dashboard for NHS trust analytics using real Supabase database data. Recreate the proven dashboard design with 5 tabs: Overview, RTT Deep Dive, Operational, Capacity, and Benchmarking.

## Data Source & Database
- **EXCLUSIVE Data Source**: Supabase PostgreSQL database (NO CSV files)
- **Database Credentials**: Located in `hooks/.env` file
- **Database Structure**: JSONB fields for RTT, A&E, diagnostics, and capacity data
- **Connection**: Uses `@/lib/supabase-client.ts` with caching and performance monitoring

## CRITICAL: Percentage Data Formatting Issue
**ALWAYS be aware of inconsistent percentage formats in the database:**

### The Problem
- **Trust Total Percentages**: Stored as actual percentages (48.04 = 48.04%)
- **Specialty-Specific Percentages**: Stored as decimals (0.43 = 43%)

### Solution Pattern
When working with `percent_within_18_weeks` or similar percentage fields:
```typescript
// For specialty data - multiply by 100
const specialtyValue = record.rtt_data.specialties[specialty].percent_within_18_weeks * 100;

// For trust totals - use as-is
const trustTotalValue = record.rtt_data.trust_total.percent_within_18_weeks;
```

### Files to Check When Adding Percentage Display
- Chart components in `src/components/charts/`
- KPI card components
- Any data transformation utilities
- Chart data generators

## CRITICAL: Trust Selector Loading Issue (RECURRING)
**This issue has occurred 3+ times. Follow this checklist when trust selector shows incomplete data:**

### Symptoms
- Trust selector dropdown only shows trusts A-L (cutting off around "Lancashire Teaching Hospitals")
- Console shows fewer than 151 trusts loaded (e.g., "Returning 57 unique trusts")
- Data appears to load but trust list is incomplete

### Root Cause
The `getAllTrusts()` function in `src/lib/supabase-client.ts` is hitting Supabase's record limit (typically 1000 records). Since trusts are stored denormalized across multiple rows, fetching 1000 records only yields ~57 unique trusts after client-side deduplication.

### Correct Solution
**ALWAYS use the `get_distinct_trusts` RPC function** - it performs server-side DISTINCT query in PostgreSQL without pagination limits:

```typescript
// CORRECT - Uses RPC function
const { data: rpcData, error: rpcError } = await this.client.rpc('get_distinct_trusts') as { data: any[] | null, error: any };

const result: Trust[] = rpcData.map((row: any) => ({
  code: row.trust_code,
  name: row.trust_name,
  icb_code: row.icb_code,
  icb_name: row.icb_name
}));
```

### WRONG Approaches (Do Not Use)
```typescript
// WRONG - Client-side deduplication hits record limits
const { data } = await this.client
  .from('trust_metrics')
  .select('trust_code, trust_name, icb_code, icb_name')
  .limit(5000); // Still hits Supabase max limits

// Then client-side dedup - inefficient and incomplete
```

### Diagnostic Steps
1. **Check console logs** - Look for `[getAllTrusts] Returning X unique trusts`
2. **Add debug counter** to trust selector: `<div>Showing {filteredTrusts.length} trusts</div>`
3. **If count < 151**: The RPC function is not being used properly
4. **Verify RPC exists**: Query `information_schema.routines` for `get_distinct_trusts`

### Prevention
- Never remove the RPC function call from `getAllTrusts()`
- RPC function definition is in database: `get_distinct_trusts()`
- Returns all distinct trusts efficiently server-side
- No pagination needed

## Tech Stack
- **Framework**: Next.js 14 with TypeScript
- **Database**: Supabase PostgreSQL with JSONB fields
- **UI**: ShadCN/UI components with Tailwind CSS
- **Charts**: Recharts library
- **Data Fetching**: Custom hooks with Supabase client

## Critical Guidelines
- Always validate data exists before rendering components
- Use Supabase client hooks from `@/hooks/useNHSData.ts`
- Handle JSONB data structure properly (rtt_data.trust_total vs rtt_data.specialties[])
- Implement graceful error handling for missing data
- Build incrementally and test with real database data at each step
- **NEVER assume percentage format** - always check if conversion is needed

## Success Criteria
- All 5 dashboard tabs functional with real NHS database data
- Professional appearance suitable for client presentations
- Sub-3-second load times with smooth interactions
- Trust selector dropdown showing all 151 NHS trusts from database
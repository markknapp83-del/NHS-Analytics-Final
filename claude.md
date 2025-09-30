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
# NHS Analytics v5 - Claude Context

## Project Overview
Build a Next.js dashboard for NHS trust analytics using real CSV data. Recreate the proven dashboard design with 5 tabs: Overview, RTT Deep Dive, Operational, Capacity, and Benchmarking.

## Key Requirements
- **Data Source**: `data/unified_monthly_data_enhanced.csv` (271 columns, 1,816 records, 151 NHS trusts)
- **NO Sample Data**: All components must use real CSV data only
- **Design**: Trust selector in main header (not sidebar), slim sidebar navigation
- **Tech Stack**: Next.js 14, TypeScript, ShadCN/UI, Tailwind CSS, Papa Parse, Recharts

## Critical Guidelines
- Always validate data exists before rendering components
- Use Papa Parse for CSV loading with caching
- Match provided dashboard images exactly
- Implement graceful error handling for missing data
- Build incrementally and test with real data at each step

## Success Criteria
- All 5 dashboard tabs functional with real NHS data
- Professional appearance suitable for client presentations
- Sub-3-second load times with smooth interactions
- Trust selector dropdown showing all 151 NHS trusts
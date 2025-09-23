# NHS Data Analytics Scripts

This directory contains all the data processing, analysis, and database population scripts for the NHS Data Analytics Tool.

## Core Components

### Data Transformation Pipeline
- **`data_transformer.js`** - Core NHS data transformation engine (CSV → JSONB)
- **`validation_engine.js`** - Comprehensive data validation with permissive mode
- **`transform_csv_to_supabase.js`** - Complete transformation pipeline orchestration

### Database Operations
- **`populate_database.js`** - Main database population script (Phase I Task 1.4)
- **`check_database_state.js`** - Database state analysis and verification
- **`complete_missing_trusts.js`** - Process missing trusts with relaxed validation
- **`optimize_for_trust_coverage.js`** - Optimize database for maximum trust coverage

### Analysis & Investigation
- **`missing_trusts_analysis.js`** - Analyze why trusts are missing from database
- **`csv_analysis.js`** - Initial CSV structure analysis
- **`csv_jsonb_mapping_complete.js`** - Generate complete CSV to JSONB mapping
- **`database_audit.js`** - Database audit and investigation framework

### Testing & Validation
- **`demo_transformation.js`** - Standalone transformation demo (no database required)
- **`test_transformation.js`** - Test transformation logic without database
- **`verify_database_content.js`** - Verify database content and structure

## Usage Examples

### Run Database Population
```bash
# From project root
node scripts/populate_database.js

# With credentials
node scripts/populate_database.js "supabase_url" "supabase_key"

# Clear and repopulate
node scripts/populate_database.js --clear
```

### Check Database State
```bash
node scripts/check_database_state.js
```

### Optimize for Trust Coverage
```bash
node scripts/optimize_for_trust_coverage.js
```

### Run Analysis
```bash
node scripts/missing_trusts_analysis.js
node scripts/demo_transformation.js
```

## Configuration

Scripts automatically load configuration from:
1. Environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
2. `../hooks/.env` file
3. `../supabase-config.json` file
4. Command line arguments

## Data Files

Scripts reference:
- `../Data/unified_monthly_data_enhanced.csv` - Source NHS data (271 columns, 1,816 records)
- `../transformation_strategy.json` - Column mapping configuration

## Success Criteria

All scripts work together to achieve:
- ✅ **151 NHS trusts** represented in database
- ✅ **100% transformation success** with permissive validation
- ✅ **Complete JSONB population** (no "EMPTY" fields)
- ✅ **Data quality maintained** while accepting partial data

## Notes

- Scripts are optimized for Supabase database storage constraints
- Permissive validation mode allows partial data rather than rejecting entire trusts
- All paths are relative to project root directory
- Scripts can be run independently or as part of the complete pipeline
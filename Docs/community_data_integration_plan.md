# Community Health Data Integration Plan

## Project Overview
Integrate 12 months of NHS Community Health Services data into existing Supabase database, adding comprehensive community health waiting list intelligence to the NHS Analytics Dashboard.

## Project Context
- **Database**: Existing Supabase PostgreSQL with `trust_metrics` table
- **Target Column**: `community_data` (JSONB) - already exists, currently empty
- **Data Source**: 12 monthly Excel files (Community Health Services Waiting Lists)
- **Time Period**: 12 months of historical data to backfill
- **Trust Alignment**: Only include trusts that exist in current RTT dataset

## Data Structure Analysis

### Source Data Characteristics
- **Excel Structure**: 8 tables per monthly file (Table 4, 4a-4g)
- **Organization Types**: National, Region, ICB, Provider (145 total)
- **NHS Trusts**: 120 providers with R-codes (e.g., R1H, RGT, RCF)
- **Non-NHS Providers**: 25 CICs and private providers (to be excluded)
- **Service Categories**: 47 total services
  - 30 Adult (A) services
  - 17 Children & Young People (CYP) services

### Service Types Breakdown

**Adult Services (30):**
1. Adult safeguarding*
2. Audiology
3. Clinical support to social care, care homes and domiciliary care
4. Community nursing services
5. Home oxygen assessment services
6. Intermediate care and reablement
7. Musculoskeletal service
8. Neurorehabilitation (multi-disciplinary)
9. Nursing and Therapy support for LTCs: Continence/colostomy
10. Nursing and Therapy support for LTCs: Diabetes
11. Nursing and Therapy support for LTCs: Falls
12. Nursing and Therapy support for LTCs: Heart failure
13. Nursing and Therapy support for LTCs: Lymphoedema
14. Nursing and Therapy support for LTCs: MND
15. Nursing and Therapy support for LTCs: MS
16. Nursing and Therapy support for LTCs: Respiratory/COPD
17. Nursing and Therapy support for LTCs: Stroke
18. Nursing and Therapy support for LTCs: TB
19. Nursing and Therapy support for LTCs: Tissue viability
20. Podiatry and podiatric surgery
21. Rehabilitation bed-based care
22. Rehabilitation services (integrated)
23. Therapy interventions: Dietetics
24. Therapy interventions: Occupational therapy
25. Therapy interventions: Orthotics
26. Therapy interventions: Physiotherapy
27. Therapy interventions: Speech and language
28. Urgent Community Response/Rapid Response team
29. Weight management and obesity services
30. Wheelchair, orthotics, prosthetics and equipment

**CYP Services (17):**
1. Antenatal, new-born and children screening and immunisation services
2. Audiology
3. Child health information service
4. Community nursing services (planned care and rapid response teams)
5. Community paediatric service
6. Looked after children teams*
7. New-born hearing screening
8. Nursing and Therapy teams support for long term conditions
9. Rapid Response Services
10. Safeguarding*
11. Therapy interventions: Dietetics
12. Therapy interventions: Occupational therapy
13. Therapy interventions: Orthotics
14. Therapy interventions: Physiotherapy
15. Therapy interventions: Speech and language
16. Vision screening
17. Wheelchair, orthotics, prosthetics and equipment

*Note: Some services (Adult safeguarding, CYP Looked after children, CYP Safeguarding) only published at national level

### Wait Time Bands (8 metrics per service)
- **Table 4**: Total waiting list
- **Table 4a**: 0-1 weeks (0-7 days)
- **Table 4b**: 1-2 weeks (8-14 days)
- **Table 4c**: 2-4 weeks (15-28 days)
- **Table 4d**: 4-12 weeks (29-84 days)
- **Table 4e**: 12-18 weeks (85-126 days)
- **Table 4f**: 18-52 weeks (127-364 days)
- **Table 4g**: 52+ weeks (365+ days)

## Database Schema

### Existing Structure
```sql
-- trust_metrics table (already exists)
CREATE TABLE trust_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_code VARCHAR(3) NOT NULL,
    trust_name VARCHAR(255) NOT NULL,
    period DATE NOT NULL,
    data_type VARCHAR(20) NOT NULL,
    
    icb_code VARCHAR(10),
    icb_name VARCHAR(255),
    
    rtt_data JSONB,
    ae_data JSONB,
    diagnostics_data JSONB,
    community_data JSONB,  -- TARGET COLUMN
    capacity_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(trust_code, period, data_type)
);
```

### Target JSONB Structure
```json
{
  "community_data": {
    "adult_services": {
      "audiology": {
        "total_waiting": 1250,
        "wait_0_1_weeks": 150,
        "wait_1_2_weeks": 200,
        "wait_2_4_weeks": 250,
        "wait_4_12_weeks": 400,
        "wait_12_18_weeks": 150,
        "wait_18_52_weeks": 80,
        "wait_52_plus_weeks": 20
      },
      "msk_service": {
        "total_waiting": 15000,
        "wait_0_1_weeks": 2000,
        "wait_1_2_weeks": 2500,
        "wait_2_4_weeks": 3000,
        "wait_4_12_weeks": 4500,
        "wait_12_18_weeks": 2000,
        "wait_18_52_weeks": 800,
        "wait_52_plus_weeks": 200
      },
      "podiatry": { /* ... */ },
      "physiotherapy": { /* ... */ }
      // ... all adult services with data
    },
    "cyp_services": {
      "audiology": { /* ... */ },
      "community_paediatrics": { /* ... */ },
      "speech_therapy": { /* ... */ }
      // ... all CYP services with data
    },
    "metadata": {
      "services_reported": 28,
      "total_waiting_all_services": 45670,
      "services_with_52plus_breaches": 12,
      "last_updated": "2024-11-01"
    }
  }
}
```

### Service Name Mapping (Excel → Database Keys)
**Adult Services:**
```python
adult_service_mapping = {
    "(A) Adult safeguarding": "adult_safeguarding",
    "(A) Audiology": "audiology",
    "(A) Clinical support to social care, care homes and domiciliary care": "clinical_support_social_care",
    "(A) Community nursing services": "community_nursing",
    "(A) Home oxygen assessment services": "home_oxygen",
    "(A) Intermediate care and reablement": "intermediate_care_reablement",
    "(A) Musculoskeletal service": "msk_service",
    "(A) Neurorehabilitation (multi-disciplinary)": "neurorehabilitation",
    "(A) Nursing and Therapy support for LTCs: Continence/ colostomy": "ltc_continence",
    "(A) Nursing and Therapy support for LTCs: Diabetes": "ltc_diabetes",
    "(A) Nursing and Therapy support for LTCs: Falls": "ltc_falls",
    "(A) Nursing and Therapy support for LTCs: Heart failure": "ltc_heart_failure",
    "(A) Nursing and Therapy support for LTCs: Lymphoedema": "ltc_lymphoedema",
    "(A) Nursing and Therapy support for LTCs: MND": "ltc_mnd",
    "(A) Nursing and Therapy support for LTCs: MS": "ltc_ms",
    "(A) Nursing and Therapy support for LTCs: Respiratory/COPD": "ltc_respiratory",
    "(A) Nursing and Therapy support for LTCs: Stroke": "ltc_stroke",
    "(A) Nursing and Therapy support for LTCs: TB": "ltc_tb",
    "(A) Nursing and Therapy support for LTCs: Tissue viability": "ltc_tissue_viability",
    "(A) Podiatry and podiatric surgery": "podiatry",
    "(A) Rehabilitation bed-based care": "rehab_bed_based",
    "(A) Rehabilitation services (integrated)": "rehab_integrated",
    "(A) Therapy interventions: Dietetics": "therapy_dietetics",
    "(A) Therapy interventions: Occupational therapy": "therapy_ot",
    "(A) Therapy interventions: Orthotics": "therapy_orthotics",
    "(A) Therapy interventions: Physiotherapy": "therapy_physiotherapy",
    "(A) Therapy interventions: Speech and language": "therapy_speech_language",
    "(A) Urgent Community Response/Rapid Response team": "urgent_community_response",
    "(A) Weight management and obesity services": "weight_management",
    "(A) Wheelchair, orthotics, prosthetics and equipment": "wheelchair_equipment"
}
```

**CYP Services:**
```python
cyp_service_mapping = {
    "(CYP) Antenatal, new-born and children screening and immunisation services": "antenatal_screening",
    "(CYP) Audiology": "audiology",
    "(CYP) Child health information service": "child_health_info",
    "(CYP) Community nursing services (planned care and rapid response teams)": "community_nursing",
    "(CYP) Community paediatric service": "community_paediatrics",
    "(CYP) Looked after children teams": "looked_after_children",
    "(CYP) New-born hearing screening": "newborn_hearing",
    "(CYP) Nursing and Therapy teams support for long term conditions": "ltc_support",
    "(CYP) Rapid Response Services": "rapid_response",
    "(CYP) Safeguarding": "safeguarding",
    "(CYP) Therapy interventions: Dietetics": "therapy_dietetics",
    "(CYP) Therapy interventions: Occupational therapy": "therapy_ot",
    "(CYP) Therapy interventions: Orthotics": "therapy_orthotics",
    "(CYP) Therapy interventions: Physiotherapy": "therapy_physiotherapy",
    "(CYP) Therapy interventions: Speech and language": "therapy_speech_language",
    "(CYP) Vision screening": "vision_screening",
    "(CYP) Wheelchair, orthotics, prosthetics and equipment": "wheelchair_equipment"
}
```

## Implementation Plan

### Phase 1: Trust Code Mapping & Validation (30 minutes)

**Objective**: Establish trust code mapping between community data and existing database

**Tasks:**
1. Query Supabase for all unique trust codes in `trust_metrics` table
2. Extract all Provider rows with R-codes from community data
3. Create mapping table for trust codes
4. Identify any trusts in community data that don't exist in RTT data (exclude these)
5. Generate validation report showing trust coverage

**Deliverables:**
- `trust_mapping.json` - Cross-reference of trust codes
- `trust_coverage_report.md` - Coverage analysis
- Filtered list of trusts to process

### Phase 2: Single Month Data Processing Pipeline (1-2 hours)

**Objective**: Build and test ETL pipeline with one month of data

**Tasks:**
1. **Excel Processing**:
   - Read all 8 tables (Table 4, 4a-4g) from single Excel file
   - Extract Provider rows only (filter by Organisation Type = 'Provider')
   - Filter to R-code trusts that exist in database
   
2. **Data Consolidation**:
   - For each trust, combine data from 8 tables into single record
   - Map service names to database keys
   - Handle null/missing values (omit from JSONB if null)
   - Calculate metadata (total services, total waiting, breach counts)

3. **JSONB Construction**:
   - Build nested structure with adult_services and cyp_services
   - Include all 8 wait time metrics per service
   - Add metadata section

4. **Database Update**:
   - Update existing trust_metrics records for the month
   - Use Supabase client with UPDATE statement
   - Handle errors and log results

**Deliverables:**
- `community_data_processor.py` - Core ETL script
- `test_data_sample.json` - Sample JSONB output for validation
- `single_month_processing_log.txt` - Processing results

### Phase 3: 12-Month Historical Backfill (2-3 hours)

**Objective**: Process all 12 months of community data and update database

**Tasks:**
1. **Batch Processing**:
   - Loop through all 12 monthly Excel files
   - Extract period date from filename or sheet metadata
   - Process each month using Phase 2 pipeline
   
2. **Temporal Alignment**:
   - Match community data month to existing period in database
   - Handle any date format variations
   - Ensure all 12 months are covered

3. **Batch Database Updates**:
   - Update records in batches (e.g., 50 trusts at a time)
   - Include progress logging and error handling
   - Implement retry logic for failed updates
   - Create backup before starting

4. **Data Validation**:
   - Verify all trusts updated for all 12 months
   - Check JSONB structure integrity
   - Validate data completeness
   - Generate coverage matrix (trusts × months)

**Deliverables:**
- `batch_processor.py` - 12-month batch processing script
- `backfill_results.json` - Complete processing results
- `coverage_matrix.csv` - Trust × Month coverage report
- `data_validation_report.md` - Comprehensive validation

### Phase 4: Data Quality Validation (1 hour)

**Objective**: Ensure data integrity and completeness

**Tasks:**
1. **Database Queries**:
   - Query sample of updated records
   - Verify JSONB structure
   - Check for any empty community_data fields
   
2. **Statistical Validation**:
   - Calculate total patients waiting across all services
   - Identify trusts with highest/lowest service coverage
   - Analyze 52+ week breach patterns
   - Compare trends across 12 months

3. **Cross-Reference Checks**:
   - Verify trust codes match RTT data
   - Ensure period dates align correctly
   - Check for any orphaned or duplicate records

**Deliverables:**
- `validation_queries.sql` - Database validation queries
- `data_quality_report.md` - Quality metrics and findings
- `sample_records.json` - Representative data samples

## Technical Specifications

### Python Dependencies
```python
# requirements.txt
openpyxl>=3.1.2
pandas>=2.0.0
python-dotenv>=1.0.0
supabase>=2.0.0
```

### Environment Variables
```bash
# .env
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_KEY=[your-service-role-key]
```

### Data Processing Functions
```python
def extract_provider_data(excel_file: str, trust_codes: list) -> dict:
    """Extract provider-level data from Excel file for specified trusts"""
    
def consolidate_wait_time_bands(table4_data: dict, table4a_g_data: list) -> dict:
    """Combine data from 8 tables into single service structure"""
    
def build_community_jsonb(trust_code: str, service_data: dict) -> dict:
    """Construct nested JSONB structure for database"""
    
def update_trust_metrics(trust_code: str, period: str, community_data: dict):
    """Update community_data field in trust_metrics table"""
```

### Database Update Strategy
```sql
-- Update existing records (preferred approach)
UPDATE trust_metrics 
SET 
    community_data = $1::jsonb,
    updated_at = NOW()
WHERE 
    trust_code = $2 
    AND period = $3 
    AND data_type = 'monthly';
```

### Error Handling
```python
# Implement robust error handling
try:
    # Process data
    result = process_community_data(excel_file, trust_code)
    
    # Update database
    update_trust_metrics(trust_code, period, result)
    
except TrustNotFoundError:
    log.warning(f"Trust {trust_code} not in RTT database, skipping")
    
except DataValidationError as e:
    log.error(f"Invalid data for {trust_code}: {e}")
    
except DatabaseError as e:
    log.critical(f"Database update failed: {e}")
    # Implement retry logic
```

## Data Handling Rules

### Null Value Treatment
- **Omit from JSONB**: If a trust doesn't provide a service, don't include it in JSONB
- **Zero vs Null**: Distinguish between "0 patients waiting" (include) and "service not reported" (omit)
- **Metadata tracking**: Count number of services actually reported

### Trust Filtering Rules
1. **Include**: Only trusts with R-codes that exist in current `trust_metrics` table
2. **Exclude**: All non-R code providers (CICs, private companies)
3. **Exclude**: ICB, Region, and National aggregated rows
4. **Action**: Generate list of excluded trusts for reference

### Service Coverage
- Not all trusts provide all 47 services
- Some services only published at national level (safeguarding services)
- **Strategy**: Include all services that have data, regardless of coverage
- **Tracking**: Metadata includes count of services reported per trust

### Wait Time Band Logic
```python
# Each service should have up to 8 wait time metrics
wait_time_structure = {
    "total_waiting": None,        # From Table 4
    "wait_0_1_weeks": None,       # From Table 4a
    "wait_1_2_weeks": None,       # From Table 4b
    "wait_2_4_weeks": None,       # From Table 4c
    "wait_4_12_weeks": None,      # From Table 4d
    "wait_12_18_weeks": None,     # From Table 4e
    "wait_18_52_weeks": None,     # From Table 4f
    "wait_52_plus_weeks": None    # From Table 4g
}

# Validation: sum of bands should equal total_waiting
# Flag discrepancies for review
```

## Success Criteria

### Functional Requirements
- [ ] All 12 months of data processed successfully
- [ ] Only trusts in existing RTT dataset included
- [ ] All 47 services captured (where data exists)
- [ ] All 8 wait time bands populated per service
- [ ] JSONB structure consistent and queryable
- [ ] No data corruption in existing database records

### Data Quality Metrics
- [ ] 100% of target trusts updated for 12 months
- [ ] JSONB structure validation passes for all records
- [ ] No empty community_data fields (except where trust has no community data)
- [ ] Wait time band totals validate correctly
- [ ] Service name mapping 100% accurate

### Performance Targets
- [ ] Single month processing: < 2 minutes
- [ ] 12-month backfill: < 30 minutes total
- [ ] Database update queries: < 500ms each
- [ ] Final dataset size: manageable within Supabase limits

## Validation Queries

### Post-Implementation Checks
```sql
-- Check how many trusts have community data
SELECT 
    COUNT(DISTINCT trust_code) as trusts_with_community_data,
    COUNT(*) as total_records
FROM trust_metrics 
WHERE community_data IS NOT NULL 
    AND community_data != '{}'::jsonb;

-- Get service coverage statistics
SELECT 
    trust_code,
    trust_name,
    period,
    community_data->'metadata'->>'services_reported' as services_count,
    community_data->'metadata'->>'total_waiting_all_services' as total_waiting
FROM trust_metrics 
WHERE community_data IS NOT NULL
ORDER BY period DESC, trust_code;

-- Sample a few records to verify structure
SELECT 
    trust_code,
    period,
    jsonb_pretty(community_data) as community_data_formatted
FROM trust_metrics 
WHERE trust_code = 'RGT' 
    AND community_data IS NOT NULL
LIMIT 1;

-- Check for any adult services with high waiting lists
SELECT 
    trust_code,
    trust_name,
    period,
    service_name,
    (value->>'total_waiting')::int as total_waiting,
    (value->>'wait_52_plus_weeks')::int as breaches_52plus
FROM trust_metrics,
    jsonb_each(community_data->'adult_services') as service(service_name, value)
WHERE community_data IS NOT NULL
    AND (value->>'total_waiting')::int > 5000
ORDER BY total_waiting DESC;
```

## Risk Mitigation

### Data Quality Risks
- **Inconsistent trust codes**: Mitigated by trust mapping in Phase 1
- **Excel format changes**: Validate table structure before processing
- **Missing months**: Log any gaps in 12-month coverage
- **Null value ambiguity**: Clear rules for zero vs. unreported

### Technical Risks
- **Database performance**: Batch updates in reasonable chunks
- **JSONB size limits**: Monitor record sizes during processing
- **Concurrent updates**: Use proper transaction handling
- **Rollback capability**: Create backup before batch processing

### Business Risks
- **Data interpretation**: Document any data quality issues found
- **Service mapping accuracy**: Validate service name conversions
- **Coverage gaps**: Report trusts with limited service data
- **Temporal alignment**: Ensure dates match existing records

## Next Steps After Integration

1. **Frontend Development**: Update dashboard to display community health data
2. **Analytics Enhancement**: Add community health metrics to analytics workbench
3. **Automation**: Set up monthly ETL for ongoing community data updates
4. **ICB Aggregation**: Calculate ICB-level metrics from trust data
5. **Correlation Analysis**: Link community health performance with RTT outcomes

## File Deliverables

```
community_integration/
├── scripts/
│   ├── trust_mapping.py          # Phase 1: Trust code mapping
│   ├── community_processor.py    # Phase 2: Single month processor
│   ├── batch_backfill.py         # Phase 3: 12-month backfill
│   └── data_validation.py        # Phase 4: Validation checks
├── outputs/
│   ├── trust_mapping.json
│   ├── trust_coverage_report.md
│   ├── single_month_sample.json
│   ├── backfill_results.json
│   ├── coverage_matrix.csv
│   └── data_quality_report.md
├── sql/
│   └── validation_queries.sql
└── logs/
    ├── processing_log.txt
    └── error_log.txt
```

## Claude Code Execution Commands

```bash
# Phase 1: Trust Mapping
claude-code execute --task="trust-code-mapping" 
    --context="Map community data trusts to existing RTT trusts"

# Phase 2: Single Month Processing
claude-code execute --task="single-month-processor" 
    --input="November-2024-community-health.xlsx"
    --validate="jsonb-structure"

# Phase 3: 12-Month Backfill
claude-code execute --task="12-month-backfill" 
    --input-directory="community-health-files/"
    --target="supabase-trust_metrics"

# Phase 4: Validation
claude-code execute --task="data-validation" 
    --checks="completeness,integrity,structure"
```

---

## Summary

This plan provides a comprehensive approach to integrating 12 months of community health services data into your existing Supabase database. The nested JSONB structure offers flexibility while maintaining query performance, and the phased implementation ensures data quality throughout the process. The focus on trust-level data alignment ensures seamless integration with your existing RTT and operational metrics, creating a truly comprehensive NHS trust intelligence platform.
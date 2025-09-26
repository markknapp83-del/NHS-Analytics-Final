# NHS Analytics Tool v6 - Complete Database Refresh Plan

## Mission Critical: Restore Data Integrity to Production Standards

**Current Status:** 57% confidence (CRITICAL - unacceptable for production)  
**Target Status:** 80%+ confidence (acceptable for production deployment)  
**Root Cause:** Mixed data formats from pre/post percentage handling fixes  
**Solution:** Complete database refresh with corrected data processors

---

## Executive Summary

The database contains records processed with inconsistent formats. Recent percentage handling fixes improved the code but created a mismatch with existing data. A complete refresh ensures all 164,442+ records use consistent formats.

**Timeline:** 4-6 hours total  
**Risk Level:** Medium (backup strategy mitigates data loss risk)  
**Success Criteria:** Confidence level ≥80%, pipeline traceability ≥90%

---

## Phase 1: Pre-Migration Safety (30 minutes)

### 1.1 Database Backup
```bash
# Create timestamped backup directory
BACKUP_DIR="database_backups/refresh_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Export current trust_metrics table
# Document: Record count, structure, sample data
```

**Validation Checklist:**
- [ ] Backup file created successfully
- [ ] Backup file size reasonable (check MB/GB)
- [ ] Can read backup file without errors
- [ ] Record current counts: Total records, cancer records, trust count

### 1.2 Source Data Verification
```bash
# Verify all source files present and accessible
```

**Required Files:**
- [ ] 3 Cancer Performance Excel files (164,442 total records)
- [ ] 12 months RTT data files (~1,816 expected records)
- [ ] A&E performance files (12 months)
- [ ] Diagnostics data files
- [ ] Community health files (if applicable)

**Document:**
- File paths and names
- File sizes and last modified dates
- Expected record counts per file

---

## Phase 2: Database Preparation (15 minutes)

### 2.1 Truncate Trust Metrics Table
```python
# Connect to Supabase
from supabase import create_client
import os

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

# CRITICAL: Verify backup completed before proceeding
# Truncate table (preserves structure, removes data)
supabase.table('trust_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
```

**Validation Checklist:**
- [ ] Backup verified before truncation
- [ ] Table structure preserved (columns, types, constraints)
- [ ] All records removed (count = 0)
- [ ] Indexes and foreign keys intact

---

## Phase 3: Data Reprocessing (2-3 hours)

### 3.1 Process Cancer Data (First Priority)
```bash
# Run cancer processor with fixed percentage handling
python3 cancer_data_processor.py --mode full_refresh

# Expected: 437+ records across 157 trusts
# Format: Percentages as decimals (0.852 not 85.2)
```

**Validation After Processing:**
- [ ] No processing errors or exceptions
- [ ] Record count matches expectations (~437)
- [ ] Trust count correct (~157 trusts)
- [ ] Sample percentage values in decimal format (0.0-1.0 range)
- [ ] JSONB structure valid for cancer_data field

### 3.2 Process RTT Data
```bash
# Run RTT processor with corrected _clean_numeric_value method
python3 data-pipeline/rtt_processor.py --mode full_refresh

# Expected: ~1,816 records (156 trusts × 12 months)
# Critical: "85.2%" → 0.852 conversion working correctly
```

**Validation Points:**
- [ ] All 156 trusts processed successfully
- [ ] 12 months of data for each trust
- [ ] Specialty percentages in decimal format
- [ ] Trust total percentages consistent with specialty data
- [ ] No mathematical inconsistencies

### 3.3 Process A&E Data
```bash
# Run A&E processor with percentage handling fixes
python3 data-pipeline/ae_processor.py --mode full_refresh

# Critical: 4-hour performance as decimal (0.752 not 75.2%)
```

**Validation Points:**
- [ ] ae_4hr_performance_pct values in 0.0-1.0 range
- [ ] All trusts have A&E data where applicable
- [ ] No negative values or outliers
- [ ] Emergency admissions data complete

### 3.4 Process Diagnostics Data
```bash
# Run diagnostics processor
python3 data-pipeline/diagnostics_processor.py --mode full_refresh

# Expected: 15 diagnostic test types × metrics
```

**Validation Points:**
- [ ] All 15 diagnostic types processed
- [ ] Waiting time metrics consistent
- [ ] 6-week and 13-week breach data present
- [ ] No format inconsistencies

### 3.5 Process Community Health Data (Optional)
```bash
# If community health data available
python3 data-pipeline/community_health_processor.py --mode full_refresh

# Expected: 414 columns across 9 services
```

**Validation Points:**
- [ ] All 9 service categories processed
- [ ] Data formats consistent across categories
- [ ] Trust mapping correct

---

## Phase 4: Database Loading (30 minutes)

### 4.1 Bulk Insert Processed Data
```python
# Load all processed data using batch insertion
# Monitor for errors, constraint violations, or duplicates
```

**Loading Sequence:**
1. Cancer data (base layer)
2. RTT data (primary metrics)
3. A&E data (operational context)
4. Diagnostics data (waiting times)
5. Community health data (comprehensive view)

**Validation Checklist:**
- [ ] Total record count: 2,249+ records
- [ ] No insertion errors or rollbacks
- [ ] No duplicate trust_code + period combinations
- [ ] All JSONB fields populated correctly

### 4.2 Data Verification Queries
```sql
-- Verify record counts
SELECT COUNT(*) as total_records FROM trust_metrics;
SELECT COUNT(*) as cancer_records FROM trust_metrics WHERE cancer_data IS NOT NULL;
SELECT COUNT(DISTINCT trust_code) as unique_trusts FROM trust_metrics;

-- Spot check percentage formats (should be 0.0-1.0)
SELECT 
    trust_code,
    rtt_data->'trust_total'->>'percent_within_18_weeks' as rtt_percentage,
    ae_data->>'four_hour_performance_pct' as ae_percentage
FROM trust_metrics
LIMIT 10;

-- Verify period formats
SELECT DISTINCT period, COUNT(*) as count 
FROM trust_metrics 
GROUP BY period 
ORDER BY period;
```

**Expected Results:**
- [ ] Total records ≥ 2,249
- [ ] Cancer records ≥ 437 (19%+ coverage)
- [ ] Unique trusts ≥ 157
- [ ] Percentages in 0.0-1.0 range (not 0-100)
- [ ] Periods in YYYY-MM-DD format

---

## Phase 5: Validation Testing (1 hour)

### 5.1 Run Complete Integrity Test Suite
```bash
# Execute all 6 test phases
python3 data-integrity-tests/phase1_cancer_raw_data_validation.py
python3 data-integrity-tests/phase2_cancer_processing_accuracy.py
python3 data-integrity-tests/phase3_cancer_database_integrity.py
python3 data-integrity-tests/phase4_cancer_frontend_accuracy.py
python3 data-integrity-tests/phase5_cancer_visual_display_accuracy.py
python3 data-integrity-tests/phase6_cancer_end_to_end_validation.py
```

**Target Success Criteria:**

| Phase | Target Score | Critical Metrics |
|-------|-------------|------------------|
| Phase 1 | 100% | No JSON errors, all files processed |
| Phase 2 | 100% | Transformation accuracy, trust preservation >95% |
| Phase 3 | 95%+ | Database integrity, cancer coverage 100% |
| Phase 4 | 100% | Frontend accuracy, TypeScript errors resolved |
| Phase 5 | 100% | Visual display, component logic complete |
| Phase 6 | 80%+ | **Pipeline traceability ≥90%, confidence ≥80%** |

### 5.2 Pipeline Traceability Validation

**Critical Test: End-to-End Data Flow**
1. Select 3 sample trusts (high, medium, low performers)
2. Trace cancer data: Raw Excel → Processor → Database → API → Frontend
3. Verify percentage values identical at each stage
4. Confirm format consistency (decimal throughout)

**Validation Steps:**
```python
# Example traceability test
sample_trust = "RGT"  # Cambridge University Hospitals

# Step 1: Check raw Excel value
excel_value = "85.2%"  # From original file

# Step 2: Verify processed value
processed_value = 0.852  # After processor

# Step 3: Check database value
db_value = supabase.table('trust_metrics').select('cancer_data').eq('trust_code', sample_trust).execute()
# Should be: 0.852

# Step 4: Verify frontend display
# Should show: "85.2%" (formatted from 0.852)
```

**Success Criteria:**
- [ ] Values trace correctly through all stages
- [ ] No data loss or transformation errors
- [ ] Percentage format consistent (stored as decimal, displayed as percentage)
- [ ] Frontend displays match source data

---

## Phase 6: Post-Migration Verification (30 minutes)

### 6.1 Generate Final Integrity Report
```bash
# Generate comprehensive report
python3 generate_integrity_report.py --output-dir reports/post_refresh_$(date +%Y%m%d)
```

**Report Review Checklist:**
- [ ] Overall confidence level ≥80%
- [ ] Pipeline traceability ≥90%
- [ ] Zero critical issues
- [ ] All high-priority issues resolved
- [ ] Data quality scores >95%

### 6.2 Comparison with Previous Reports

| Metric | Pre-Refresh (Sept 25) | Target Post-Refresh |
|--------|----------------------|---------------------|
| Confidence Level | 57% (Critical) | ≥80% (Acceptable) |
| Pipeline Traceability | 0% (Failed) | ≥90% (Passing) |
| Cancer Data Coverage | 43.7% | 100% (all 437 records) |
| Period Validation | 0% (Failed) | 100% (Passing) |
| TypeScript Errors | 1 Critical | 0 Errors |

### 6.3 Frontend Smoke Testing
```bash
# Start development server
npm run dev

# Test key functionality:
# - Trust selector dropdown works
# - Cancer performance charts display correctly
# - KPI cards show proper percentages
# - No console errors
# - Data loads within 3 seconds
```

**Manual Test Checklist:**
- [ ] Dashboard loads without errors
- [ ] Trust selection works correctly
- [ ] Cancer data displays on frontend
- [ ] Percentages formatted correctly (85.2% not 0.852)
- [ ] Charts render with correct data
- [ ] No TypeScript compilation errors

---

## Success Metrics

### Must Achieve (Production Blocking):
- ✅ **Confidence Level:** ≥80%
- ✅ **Pipeline Traceability:** ≥90%
- ✅ **Zero Critical Issues**
- ✅ **Cancer Data Coverage:** 100% of processed records

### Should Achieve (Quality Targets):
- ✅ **Data Quality:** >95% across all phases
- ✅ **Trust Preservation:** >95% in processing
- ✅ **Frontend Functionality:** 100% (no TypeScript errors)
- ✅ **Load Time:** <3 seconds for dashboard

### Nice to Have (Stretch Goals):
- ✅ **Confidence Level:** ≥90%
- ✅ **Period Validation:** 100%
- ✅ **Component Logic:** 100% completion

---

## Rollback Procedure (If Needed)

**If refresh fails or creates new critical issues:**

1. **Stop all processing immediately**
2. **Restore from backup:**
   ```bash
   # Restore backup file to database
   # Instructions specific to your backup format
   ```
3. **Verify restoration:**
   - Check record counts match pre-refresh
   - Verify data integrity
   - Test basic dashboard functionality
4. **Document failure:**
   - What went wrong
   - Which phase failed
   - Error messages and logs
5. **Analyze root cause before retry**

---

## Post-Completion Tasks

### Immediate (Within 24 hours):
- [ ] Document final confidence level achieved
- [ ] Archive all test reports
- [ ] Update system documentation
- [ ] Notify stakeholders of completion

### Short-term (Within 1 week):
- [ ] Implement continuous monitoring
- [ ] Schedule regular integrity tests (weekly)
- [ ] Create automated alerts for data quality drops
- [ ] Document lessons learned

### Long-term (Ongoing):
- [ ] Monthly comprehensive integrity tests
- [ ] Quarterly review of data processing logic
- [ ] Continuous improvement based on test results

---

## Key Files and Locations

**Processors:**
- `cancer_data_processor.py` - Cancer data processing
- `data-pipeline/rtt_processor.py` - RTT data processing
- `data-pipeline/ae_processor.py` - A&E data processing
- `data-pipeline/diagnostics_processor.py` - Diagnostics processing

**Test Suite:**
- `data-integrity-tests/phase1_cancer_raw_data_validation.py`
- `data-integrity-tests/phase2_cancer_processing_accuracy.py`
- `data-integrity-tests/phase3_cancer_database_integrity.py`
- `data-integrity-tests/phase4_cancer_frontend_accuracy.py`
- `data-integrity-tests/phase5_cancer_visual_display_accuracy.py`
- `data-integrity-tests/phase6_cancer_end_to_end_validation.py`

**Configuration:**
- `.env` - Database credentials
- `supabase/config.toml` - Supabase configuration

**Outputs:**
- `database_backups/` - Backup files
- `reports/` - Integrity test reports
- `data-integrity-tests/` - Test results

---

## Critical Reminders

1. **ALWAYS verify backup before truncating database**
2. **Process data in order:** Cancer → RTT → A&E → Diagnostics
3. **Validate after each processing step** before proceeding
4. **Monitor percentage formats** throughout (decimal storage, percentage display)
5. **Test pipeline traceability** before declaring success
6. **Document everything** for future reference

---

## Expected Outcomes

**If successful:**
- Confidence level restored to 80%+ (production acceptable)
- Pipeline traceability >90% (data flow verified)
- All 164,442+ records processed with consistent formats
- Frontend displays data correctly
- System ready for production deployment

**Timeline:**
- Phase 1-2: 45 minutes (safety and preparation)
- Phase 3: 2-3 hours (data reprocessing)
- Phase 4: 30 minutes (database loading)
- Phase 5-6: 90 minutes (validation and verification)
- **Total: 4-6 hours**

---

## Contact and Support

If issues arise during execution:
1. Stop immediately and document the issue
2. Check backup integrity before any rollback
3. Review error logs and test outputs
4. Consult this plan's rollback procedure
5. Do not proceed if confidence level remains <70%

**This is a critical operation. Take time to do it correctly rather than rushing.**
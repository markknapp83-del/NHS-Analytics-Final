# Comprehensive Data Integrity Test Suite - All Data Sources

## Project Overview

**Objective:** Create complete data integrity validation across entire NHS Analytics Dashboard pipeline, covering all data categories from source files through database to frontend display.

**Current Status:** Cancer data validated at 98% confidence. RTT, A&E, diagnostics, and capacity data require comprehensive validation.

**Success Criteria:** Achieve 80%+ confidence across all data sources, confirming data accuracy from raw files → database → frontend → visual display.

---

## Context

- **System:** NHS Analytics Dashboard v5 with Supabase PostgreSQL
- **Database Records:** 2,249 total records
- **Data Categories:** RTT, A&E, Diagnostics, Cancer (validated), Capacity
- **Critical Issue:** Only cancer data (19.4% of system) has been validated. Remaining 80.6% needs comprehensive testing.

---

## Data Sources to Validate

### 1. RTT (Referral to Treatment) Data
- **Source Files:** 12 monthly Excel files `Incomplete-Provider-[Month][Year].xlsx`
- **Expected Records:** ~1,816 (156 trusts × 12 months)
- **Database Field:** `rtt_data` JSONB
- **Columns:** 160 total (20 specialties × 8 metrics)
- **Critical Metrics:**
  - `percent_within_18_weeks` (compliance measure)
  - `total_incomplete_pathways` (volume)
  - `total_52_plus_weeks` (breach count)
  - Trust-level totals
- **Known Issues:** Percentage format inconsistencies (decimal vs percentage)

### 2. A&E (Accident & Emergency) Data
- **Source Files:** 12 monthly A&E performance files
- **Expected Records:** ~1,816 (156 trusts × 12 months)
- **Database Field:** `ae_data` JSONB
- **Columns:** 5 core metrics
- **Critical Metrics:**
  - `ae_4hr_performance_pct` (95% target)
  - `ae_attendances_total`
  - `ae_emergency_admissions_total`
  - `ae_12hr_wait_admissions`
- **Known Issues:** Percentage handling, many "undefined%" values reported

### 3. Diagnostics Data
- **Source Files:** Diagnostic waiting times files
- **Expected Records:** ~1,816
- **Database Field:** `diagnostics_data` JSONB
- **Columns:** 90 total (15 test types × 6 metrics)
- **Test Types:** MRI, CT, Ultrasound, Endoscopy types, etc.
- **Critical Metrics:**
  - `total_waiting`
  - `6week_breaches`
  - `13week_breaches`

### 4. Cancer Data (Reference Only)
- **Status:** Already validated at 98% confidence
- **Records:** 437
- **Source Files:** 3 cancer performance Excel files
- **Database Field:** `cancer_data` JSONB
- **Note:** Include in comprehensive report but reference existing validation

### 5. Capacity Data
- **Source Files:** Virtual wards and capacity files
- **Expected Records:** ~450
- **Database Field:** `capacity_data` JSONB
- **Critical Metrics:**
  - `virtual_ward_capacity`
  - `virtual_ward_occupancy_rate`
  - `avg_daily_discharges`

---

## Test Suite Architecture

### Phase 1: Raw Source Data Validation
**Objective:** Validate all source files are complete, accessible, and high-quality

**Tests to Implement:**

#### 1.1 File Discovery & Accessibility
```python
For each data source (RTT, A&E, Diagnostics, Capacity):
- Locate all expected files in data directory
- Verify file count matches expectations (e.g., 12 RTT files)
- Check file sizes are reasonable (not 0 bytes, not corrupted)
- Validate last modified dates are recent
- Test files can be opened and read
```

#### 1.2 Data Quality Assessment
```python
For each source file:
- Count total rows
- Calculate completeness: % non-null values per column
- Detect duplicates: any duplicate trust+period combinations
- Value range validation:
  - No negative values where inappropriate
  - Percentages in 0-100 range (or 0-1 if decimal)
  - Dates in valid format
- Trust code validation: match against official NHS trust list
```

#### 1.3 Schema Compliance
```python
For each file:
- Verify column headers match expected schema
- Check data types per column
- Identify required fields and verify populated
- Document any schema deviations
```

#### 1.4 Cross-File Consistency
```python
Across all files of same type:
- Same trust codes appear consistently
- Trust names don't vary for same code
- Temporal continuity: no missing months
- Column structure consistent across months
```

**Expected Outputs:**
- `phase1_rtt_validation_report.json`
- `phase1_ae_validation_report.json`
- `phase1_diagnostics_validation_report.json`
- `phase1_capacity_validation_report.json`
- Summary report with overall quality scores

**Success Criteria:**
- All expected files found: 100%
- Data completeness: >95%
- Schema compliance: 100%
- No critical data quality issues

---

### Phase 2: Processing Accuracy Validation
**Objective:** Validate data processors correctly transform source data

**Tests to Implement:**

#### 2.1 RTT Processor Validation
```python
# Test rtt_processor.py accuracy

Sample Selection:
- Select 50 random trusts from source files
- Select 3 random months per trust
- Process through rtt_processor.py

Calculation Accuracy Tests:
1. Percentage Calculations
   - Formula: (within_18_weeks / total_pathways) × 100
   - Verify: calculated % matches source file %
   - Check format: Is output 0.852 (decimal) or 85.2 (percentage)?
   
2. Specialty Aggregations
   - Sum all specialty incomplete pathways
   - Compare to trust total incomplete pathways
   - Must match exactly

3. Trust-Level Totals
   - Sum: within_18_weeks + over_18_weeks = total_pathways
   - Verify: 52+ weeks subset of over_18_weeks
   - Check: No mathematical inconsistencies

Data Transformation Tests:
- Input: Excel cell value "85.2%" 
- Expected output: ??? (document current behavior)
- Input: Excel cell value "1234"
- Expected output: 1234 (integer preserved)
- Input: Suppressed value "*"
- Expected output: null

Trust Preservation:
- Count: unique trusts in source files
- Count: unique trusts in processed output
- Calculate: preservation rate
- Target: >95%
```

#### 2.2 A&E Processor Validation
```python
# Test ae_processor.py accuracy

Sample: 50 trusts × 3 months

Tests:
1. 4-hour Performance Calculation
   - Formula: (within_4hrs / total_attendances) × 100
   - Verify against source data
   - Check percentage format

2. Emergency Admissions
   - Verify counts match source
   - Check breakdowns by type

3. 12-hour Waits
   - Verify breach counts accurate
   - Cross-reference with source

Format Tests:
- Percentage as decimal vs percentage
- Null handling for missing data
```

#### 2.3 Diagnostics Processor Validation
```python
# Test diagnostics processor

Sample: 50 trusts × 3 months × 3 test types

Tests:
1. Waiting List Calculations
   - Total waiting matches source
   - 6-week breaches accurate
   - 13-week breaches accurate

2. All 15 Test Types
   - Verify each test type processed
   - Check metrics per type
   - Validate structure

3. Data Completeness
   - How many test types per trust?
   - Are some systematically missing?
```

#### 2.4 Capacity Processor Validation
```python
# Test capacity processor

Sample: All records with capacity data

Tests:
1. Virtual Ward Metrics
   - Capacity values reasonable
   - Occupancy rate: 0-100% or 0-1?
   - Cross-check with source

2. Discharge Metrics
   - Average daily discharges match
   - No negative values
```

**Expected Outputs:**
- `phase2_rtt_processing_report.json`
- `phase2_ae_processing_report.json`
- `phase2_diagnostics_processing_report.json`
- `phase2_capacity_processing_report.json`
- Accuracy scores per processor
- Format documentation: how percentages stored

**Success Criteria:**
- Transformation accuracy: >95%
- Calculation accuracy: 100%
- Trust preservation: >95%
- Format consistency: documented and validated

---

### Phase 3: Database Integrity Validation
**Objective:** Validate database accurately stores processed data

**Tests to Implement:**

#### 3.1 Record Count Validation
```python
Database Queries:
- Total records: SELECT COUNT(*) FROM trust_metrics
  - Expected: 2,249
  
- RTT records: SELECT COUNT(*) FROM trust_metrics WHERE rtt_data IS NOT NULL
  - Expected: ~1,816
  
- A&E records: SELECT COUNT(*) FROM trust_metrics WHERE ae_data IS NOT NULL
  - Expected: ~1,816
  
- Diagnostics records: SELECT COUNT(*) FROM trust_metrics WHERE diagnostics_data IS NOT NULL
  - Expected: ~1,816
  
- Cancer records: SELECT COUNT(*) FROM trust_metrics WHERE cancer_data IS NOT NULL
  - Expected: 437 (known)
  
- Capacity records: SELECT COUNT(*) FROM trust_metrics WHERE capacity_data IS NOT NULL
  - Expected: ~450

Report any significant deviations
```

#### 3.2 JSONB Structure Validation
```python
Sample: 100 random records

For each record:
1. RTT Data Structure
   - Verify 20 specialty objects present
   - Check each specialty has 8 metrics
   - Validate trust_total object exists
   - Verify nested structure depth

2. A&E Data Structure
   - Check 5 core metrics present
   - Validate metric names correct
   - Verify data types

3. Diagnostics Data Structure
   - Check up to 15 test type objects
   - Verify 6 metrics per test type
   - Document which test types present

4. Capacity Data Structure
   - Verify expected fields present
   - Check data types
```

#### 3.3 End-to-End Data Accuracy
```python
Critical Test: Trace specific values from source to database

Select 10 test cases:
- Trust: RGT (Cambridge)
- Period: 2024-08-01
- Metric: RTT General Surgery percent_within_18_weeks

Process:
1. Open source Excel file for Aug 2024
2. Locate RGT row, General Surgery column
3. Record exact value from Excel: __________
4. Query database:
   SELECT rtt_data->'general_surgery'->>'percent_within_18_weeks'
   FROM trust_metrics
   WHERE trust_code='RGT' AND period='2024-08-01'
5. Compare values - MUST MATCH EXACTLY

Repeat for:
- 10 RTT metrics across different trusts/periods
- 10 A&E metrics
- 10 Diagnostics metrics
- 5 Capacity metrics

Document any mismatches
```

#### 3.4 Mathematical Consistency
```python
For 100 random records with RTT data:

Test: Trust Total Calculations
- Extract: within_18_weeks
- Extract: over_18_weeks  
- Extract: total_pathways
- Verify: within + over = total
- Calculate percentage: (within/total) × 100
- Compare to stored percent_within_18_weeks
- Must match within 0.1%

Test: Specialty Sums
- Sum all specialty total_pathways
- Compare to trust_total_pathways
- Must match exactly

Test: Breach Subsets
- 52+ weeks should be ≤ over_18_weeks
- 65+ weeks should be ≤ 52+ weeks
- 78+ weeks should be ≤ 65+ weeks
```

#### 3.5 Temporal Coverage
```python
For each trust in database:
- Count months of RTT data present
- Count months of A&E data present
- Count months of diagnostics present
- Identify missing months
- Report coverage %

Expected:
- 12 months per trust (Aug 2024 - Jul 2025)
- Some variation acceptable for capacity data

Period Format Validation:
- All periods in YYYY-MM-DD format
- Dates are first of month
- Date range: 2024-08-01 to 2025-07-01
```

**Expected Outputs:**
- `phase3_database_integrity_report.json`
- Coverage matrix: trusts × data types × months
- JSONB structure validation results
- End-to-end accuracy: X/35 matches confirmed
- Mathematical consistency: % pass rate
- Temporal coverage report

**Success Criteria:**
- Record counts within 5% of expected
- JSONB structure: 100% compliant
- End-to-end accuracy: >90% exact matches
- Mathematical consistency: >95%
- Temporal coverage: >90% of expected months

---

### Phase 4: Database Query Accuracy
**Objective:** Validate database queries return correct, complete data

**Tests to Implement:**

#### 4.1 Basic Query Tests
```python
Test queries that frontend will use:

1. Single Trust Data
   Query: SELECT * FROM trust_metrics WHERE trust_code = 'RGT'
   Expected: 12 records (one per month)
   Validate: Each record has expected data fields

2. Latest Period Data
   Query: SELECT * FROM trust_metrics 
          WHERE period = (SELECT MAX(period) FROM trust_metrics)
   Expected: ~156 records (one per trust)
   Validate: All trusts represented

3. Filtered by Data Type
   Query: SELECT * FROM trust_metrics WHERE rtt_data IS NOT NULL
   Expected: ~1,816 records
   Validate: Count matches expectation

4. Time Range Query
   Query: SELECT * FROM trust_metrics 
          WHERE period BETWEEN '2024-08-01' AND '2024-12-01'
   Expected: 5 months × ~156 trusts = ~780 records
   Validate: Count and date range
```

#### 4.2 JSONB Query Tests
```python
Test nested JSONB data extraction:

1. Extract Nested Value
   Query: SELECT trust_code, period,
          rtt_data->'general_surgery'->>'percent_within_18_weeks' as gs_performance
          FROM trust_metrics
          WHERE rtt_data IS NOT NULL
          LIMIT 10
   Validate: Values extracted correctly, proper data types

2. Filter by JSONB Value
   Query: SELECT trust_code, period
          FROM trust_metrics
          WHERE (rtt_data->>'trust_total_percent_within_18_weeks')::float < 0.70
   Validate: Returns trusts with <70% compliance

3. Multiple JSONB Fields
   Query: SELECT trust_code,
          rtt_data->>'trust_total_percent_within_18_weeks' as rtt_perf,
          ae_data->>'four_hour_performance_pct' as ae_perf
          FROM trust_metrics
          WHERE period = '2024-08-01'
   Validate: Both fields extracted correctly

4. Array Operations (if applicable)
   Query: Extract all specialty names from rtt_data
   Validate: Returns expected 20 specialties
```

#### 4.3 Aggregation Query Tests
```python
Test calculations across multiple records:

1. Average Performance
   Query: Calculate average RTT performance across all trusts for latest month
   Expected: Result between 0-100 (or 0-1 depending on format)
   Validate: Against manual calculation from sample

2. Trust Ranking
   Query: Rank trusts by RTT performance for latest period
   Expected: Ordered list of trusts
   Validate: Top and bottom performers make sense

3. Time-Series Aggregation
   Query: Monthly average performance for one trust over 12 months
   Expected: 12 data points
   Validate: Trend matches expectations
```

#### 4.4 Performance Tests
```python
Measure query execution time:

1. Single Trust Load (typical dashboard query)
   - Query all data for one trust
   - Target: < 500ms
   - Record: actual time

2. Multi-Trust Comparison
   - Query data for 10 trusts
   - Target: < 2 seconds
   - Record: actual time

3. Complex Aggregation
   - Calculate statistics across all trusts
   - Target: < 5 seconds
   - Record: actual time

4. JSONB Nested Query
   - Extract and filter by nested values
   - Target: < 1 second
   - Record: actual time
```

**Expected Outputs:**
- `phase4_query_accuracy_report.json`
- Query test results: pass/fail per query
- Performance metrics: response times
- JSONB extraction validation results

**Success Criteria:**
- Basic queries: 100% accurate
- JSONB queries: 100% successful extraction
- Aggregations: Results match manual calculations
- Performance: All queries meet targets

---

### Phase 5: Frontend Data Transformation
**Objective:** Validate frontend correctly receives and transforms database data

**Tests to Implement:**

#### 5.1 Data Fetching Validation
```python
Test React hooks and data retrieval:

1. useNHSData Hook
   - Trigger data fetch for trust RGT
   - Verify: Returns 12 records (one per month)
   - Validate: Data structure matches expectations
   - Check: Loading and error states work

2. useTrustSelection Hook
   - Select trust RGT
   - Verify: State updates correctly
   - Validate: Dependent components receive update

3. Data Filtering Hooks
   - Apply specialty filter
   - Apply date range filter
   - Verify: Filtered data correct
   - Validate: Filter combinations work
```

#### 5.2 Data Transformation Accuracy
```python
Critical: Test percentage format conversions

Test Case 1: Database → Frontend Display
- Database value: 0.852 (decimal)
- Frontend display: Should show "85.2%"
- Test: Extract value, apply transformation, verify output

Test Case 2: Database → Chart Data
- Database value: 0.852
- Chart expects: 85.2 (percentage for Y-axis)
- Test: Chart data transformer, verify format

Test Case 3: Null Handling
- Database value: null
- Frontend display: Should show "No data" not "undefined%"
- Test: All null handling across components

Test Case 4: Number Formatting
- Database value: 1234
- Frontend display: "1,234"
- Test: Number formatter utility

Document Findings:
- How are percentages currently stored in database?
- How does frontend expect to receive them?
- Are conversions happening correctly?
- Where are mismatches occurring?
```

#### 5.3 Chart Data Preparation
```python
For each chart type, validate data structure:

1. Line Chart (RTT Performance Over Time)
   - Input: 12 months of RTT data for one trust
   - Expected output: Array of {month, value} objects
   - Validate: Dates sorted, values in correct format

2. Bar Chart (Specialty Comparison)
   - Input: 20 specialties data for one trust
   - Expected output: Array of {specialty, value} objects
   - Validate: All specialties included, sorted correctly

3. Heatmap (Multi-Trust Comparison)
   - Input: Multiple trusts, multiple metrics
   - Expected output: 2D array structure
   - Validate: Proper dimensions, value ranges

4. KPI Cards
   - Input: Latest month data + previous month
   - Expected output: Current value + trend indicator
   - Validate: Calculations correct, trends accurate
```

#### 5.4 KPI Calculation Validation
```python
Test KPI card calculations:

1. RTT Compliance Card
   - Database: rtt_data.trust_total_percent_within_18_weeks
   - Display: Large percentage with trend arrow
   - Validation:
     - Percentage formatted correctly
     - Trend calculated: (current - previous) / previous × 100
     - Color coding appropriate (red < 70%, amber < 92%, green ≥ 92%)

2. 52+ Week Waiters Card
   - Database: rtt_data.trust_total_52_plus_weeks
   - Display: Patient count with month-over-month change
   - Validation:
     - Count displayed correctly
     - Change calculation accurate
     - Alert shown if increasing

3. A&E Performance Card
   - Database: ae_data.four_hour_performance_pct
   - Display: Percentage with 95% target indicator
   - Validation:
     - Percentage correct
     - Target comparison accurate
     - Status indicator appropriate

4. Diagnostic Backlog Card
   - Database: Sum of all diagnostics_data.*.total_waiting
   - Display: Total waiting across all test types
   - Validation:
     - Aggregation correct
     - Trend accurate
```

**Expected Outputs:**
- `phase5_frontend_transformation_report.json`
- Data fetch accuracy: % successful retrievals
- Transformation accuracy: % correct conversions
- Chart data validation: pass/fail per chart type
- KPI calculation accuracy: detailed results

**Success Criteria:**
- Data fetching: 100% successful
- Percentage transformations: 100% correct
- Chart data structures: 100% valid
- KPI calculations: 100% accurate

---

### Phase 6: Visual Display Accuracy
**Objective:** Validate visual components display data correctly

**Tests to Implement:**

#### 6.1 KPI Cards Display Validation
```python
For each KPI card:

1. Value Display
   - Trace: Database value → Frontend calculation → Display
   - Example: RTT compliance
     - Database: 0.752 or 75.2 (document which)
     - Calculation: If 0.752, multiply by 100
     - Display: "75.2%"
   - Validate: Displayed value matches source

2. Trend Indicator
   - Verify: Arrow direction correct (up/down based on change)
   - Verify: Percentage change calculated correctly
   - Verify: Color coding appropriate

3. Status Indicators
   - Verify: Color reflects performance level
   - Verify: Badges show correct status
   - Verify: Thresholds applied correctly

Test all 4 KPI cards on Overview page
```

#### 6.2 Chart Accuracy Validation
```python
For each chart:

1. Performance vs 92% Target Chart
   - Verify: Data points match database values
   - Verify: 92% reference line present
   - Verify: Time axis labels correct
   - Validate: Tooltip values accurate

2. Patients Awaiting Treatment Chart
   - Verify: Bar heights represent correct volumes
   - Verify: Values match database total_pathways
   - Validate: Month labels correct

3. Average Wait Time Chart
   - Verify: Values match median_wait_weeks from database
   - Verify: Trend line calculated correctly
   - Validate: Y-axis scale appropriate

4. Breach Breakdown Chart (52/65/78 weeks)
   - Verify: Stacked values match database breach counts
   - Verify: Proportions correct
   - Validate: Legend accurate
```

#### 6.3 Data Table Validation
```python
For Specialty Performance Table (RTT Deep Dive):

1. Table Data
   - Compare table rows to database rtt_data specialties
   - Verify: Each specialty row shows correct data
   - Verify: Percentages formatted correctly
   - Verify: Volume figures accurate

2. Sorting
   - Test: Sort by performance
   - Verify: Order matches calculations
   - Test: Sort by volume
   - Verify: Largest to smallest correct

3. Filtering
   - Apply specialty filter
   - Verify: Only selected specialties shown
   - Verify: Calculations update correctly
```

#### 6.4 Color Coding and Status Indicators
```python
Test performance-based styling:

1. RTT Performance
   - < 50%: Red/Critical
   - 50-70%: Orange/Concern
   - 70-92%: Amber/Warning
   - ≥ 92%: Green/Good
   - Verify: Colors applied correctly across all components

2. A&E Performance
   - < 75%: Critical
   - 75-85%: Poor
   - 85-95%: Fair
   - ≥ 95%: Good (target)
   - Verify: Status indicators correct

3. Diagnostics Breaches
   - No breaches: Green
   - < 10% breach rate: Amber
   - ≥ 10% breach rate: Red
   - Verify: Thresholds applied correctly
```

**Expected Outputs:**
- `phase6_visual_display_report.json`
- KPI card accuracy: % correct displays
- Chart accuracy: validation per chart
- Table accuracy: row-by-row validation results
- Color coding: threshold application results

**Success Criteria:**
- KPI displays: 100% accurate
- Chart data: 100% matches database
- Table data: 100% correct
- Color coding: 100% thresholds applied correctly

---

### Phase 7: End-to-End Pipeline Validation
**Objective:** Complete data flow validation from source to display

**Tests to Implement:**

#### 7.1 Complete Pipeline Trace
```python
Select 5 test cases spanning all data types:

Test Case 1: RTT General Surgery for Trust RGT, Aug 2024
Step 1: Source File
- File: Incomplete-Provider-Aug24.xlsx
- Locate: Trust RGT, General Surgery column
- Record: percent_within_18_weeks = __________

Step 2: Processed Data
- Run: rtt_processor.py on Aug 2024 file
- Extract: RGT general_surgery data
- Record: percent_within_18_weeks = __________

Step 3: Database
- Query: SELECT rtt_data->'general_surgery'->>'percent_within_18_weeks'
         FROM trust_metrics
         WHERE trust_code='RGT' AND period='2024-08-01'
- Record: Value = __________

Step 4: Frontend
- Load: Dashboard for trust RGT, period Aug 2024
- Inspect: Network response for RTT data
- Record: general_surgery value = __________

Step 5: Display
- View: RTT Deep Dive specialty table
- Locate: General Surgery row
- Record: Displayed value = __________

Validation: All 5 steps must have IDENTICAL values

Repeat for:
- Test Case 2: A&E 4-hour performance
- Test Case 3: MRI diagnostics waiting list
- Test Case 4: Virtual ward occupancy
- Test Case 5: Trust-level RTT total
```

#### 7.2 Cross-Data-Source Consistency
```python
Test data consistency across related metrics:

Test: RTT and Diagnostics Relationship
- High RTT waits often correlate with diagnostic delays
- Select trust with poor RTT performance
- Check: Are diagnostics also showing high waits?
- Validate: Data tells coherent story

Test: A&E and Capacity Relationship
- High A&E pressure may relate to bed capacity
- Select trust with poor A&E performance
- Check: Virtual ward utilization, discharge rates
- Validate: Metrics make sense together
```

#### 7.3 Regression Validation
```python
Compare against historical baselines:

For key metrics:
- RTT compliance: Historical range 60-95%
- A&E 4-hour: Historical range 50-90%
- 52+ week waiters: Historical range 0-1000 per trust

Validation:
- Are current values within expected historical ranges?
- Flag any values outside 3 standard deviations
- Investigate anomalies: data error or real change?
```

#### 7.4 User Journey Testing
```python
Simulate actual user workflows:

Journey 1: Trust Selection and Overview
1. User selects trust from dropdown
2. Overview page loads
3. Verify: All 4 KPI cards display correctly
4. Verify: All 4 charts render with data
5. Verify: No console errors

Journey 2: Drill Down to Specialty Detail
1. From overview, navigate to RTT Deep Dive
2. Verify: Specialty table loads with 20 rows
3. Click specialty to view detail
4. Verify: Detail view shows correct data
5. Verify: Back navigation works

Journey 3: Multi-Trust Comparison
1. Navigate to Benchmarking tab
2. Select 5 trusts for comparison
3. Verify: Comparison charts display correctly
4. Verify: Data accurate for all 5 trusts

Journey 4: Data Export
1. Select data to export
2. Trigger export function
3. Verify: Downloaded data matches displayed data
4. Verify: File format correct
```

**Expected Outputs:**
- `phase7_end_to_end_validation_report.json`
- Complete pipeline traces: 5/5 matches confirmed
- Cross-source consistency: relationships validated
- Regression validation: anomalies flagged
- User journey testing: all workflows successful

**Success Criteria:**
- Pipeline traceability: 100% (all steps match)
- Cross-source consistency: Makes logical sense
- Regression validation: 90%+ within historical ranges
- User journeys: 100% successful without errors

---

### Phase 8: Comprehensive System Report
**Objective:** Generate final assessment with confidence levels

**Tests to Implement:**

#### 8.1 Overall Data Quality Score
```python
Calculate composite score:

Data Quality = (
    Phase1_RawDataQuality × 0.15 +
    Phase2_ProcessingAccuracy × 0.20 +
    Phase3_DatabaseIntegrity × 0.25 +
    Phase4_QueryAccuracy × 0.10 +
    Phase5_FrontendTransformation × 0.15 +
    Phase6_VisualDisplay × 0.10 +
    Phase7_EndToEnd × 0.05
)

Target: > 80 for production readiness
```

#### 8.2 Confidence Level by Data Source
```python
Calculate confidence per data source:

RTT Data Confidence:
- Raw data quality: X%
- Processing accuracy: Y%
- Database integrity: Z%
- Display accuracy: W%
- Overall RTT confidence: (X+Y+Z+W)/4

Repeat for:
- A&E Data Confidence
- Diagnostics Data Confidence
- Capacity Data Confidence
- Cancer Data Confidence (98% - already known)

System-wide confidence: Average of all data sources
```

#### 8.3 Issue Prioritization
```python
Categorize all identified issues:

Critical (Must Fix Before Production):
- Data loss or corruption
- Mathematical errors > 5%
- Complete pipeline failures
- Display shows wrong data

High Priority (Should Fix Soon):
- Percentage format inconsistencies
- Missing data for some trusts
- Performance issues > 2 seconds
- Incomplete data coverage

Medium Priority (Nice to Have):
- Trust preservation < 95%
- Minor display formatting
- Edge case handling
- Optimization opportunities

Low Priority (Future Enhancement):
- Additional validation
- Performance optimization beyond targets
- Enhanced error messages
```

#### 8.4 Comparison to Previous Reports
```python
Historical trend analysis:

| Date | Status | Confidence | Critical Issues |
|------|--------|------------|-----------------|
| 2025-09-24 | Medium Issues | N/A | 0 |
| 2025-09-25 AM | CRITICAL FAILURE | N/A | Multiple |
| 2025-09-25 PM | Low Confidence | 57% | 3 |
| 2025-09-29 (Cancer Only) | High Confidence | 98% | 0 |
| 2025-09-29 (This Test) | TBD | TBD% | TBD |

Assess: Trend improving or declining?
```

**Expected Outputs:**
- `phase8_comprehensive_system_report.md`
- Overall data quality score
- Confidence levels by data source
- Prioritized issue list
- Comparison to historical reports
- Production readiness recommendation

**Success Criteria:**
- Overall data quality: > 80
- System-wide confidence: > 80%
- Critical issues: 0
- High priority issues: < 5
- Clear production readiness decision

---

## Implementation Guidelines

### Test Execution Order
1. ✅ Phase 1: Raw Source Data (foundation)
2. ✅ Phase 2: Processing Accuracy (transformation layer)
3. ✅ Phase 3: Database Integrity (storage layer)
4. ✅ Phase 4: Query Accuracy (retrieval layer)
5. ✅ Phase 5: Frontend Transformation (presentation layer)
6. ✅ Phase 6: Visual Display (user interface layer)
7. ✅ Phase 7: End-to-End (complete pipeline)
8. ✅ Phase 8: System Report (comprehensive assessment)

### Test File Structure
```
data-integrity-tests/
├── phase1_raw_data_validation.py
│   ├── test_rtt_files()
│   ├── test_ae_files()
│   ├── test_diagnostics_files()
│   └── test_capacity_files()
├── phase2_processing_accuracy.py
│   ├── test_rtt_processor()
│   ├── test_ae_processor()
│   ├── test_diagnostics_processor()
│   └── test_capacity_processor()
├── phase3_database_integrity.py
│   ├── test_record_counts()
│   ├── test_jsonb_structure()
│   ├── test_data_accuracy()
│   └── test_mathematical_consistency()
├── phase4_query_accuracy.py
│   ├── test_basic_queries()
│   ├── test_jsonb_queries()
│   ├── test_aggregations()
│   └── test_performance()
├── phase5_frontend_transformation.py
│   ├── test_data_fetching()
│   ├── test_transformations()
│   ├── test_chart_data()
│   └── test_kpi_calculations()
├── phase6_visual_display.py
│   ├── test_kpi_cards()
│   ├── test_charts()
│   ├── test_tables()
│   └── test_color_coding()
├── phase7_end_to_end.py
│   ├── test_pipeline_trace()
│   ├── test_cross_source_consistency()
│   ├── test_regression_validation()
│   └── test_user_journeys()
├── phase8_system_report.py
│   ├── calculate_quality_score()
│   ├── calculate_confidence_levels()
│   ├── prioritize_issues()
│   └── generate_final_report()
└── utils/
    ├── data_loader.py
    ├── database_connector.py
    ├── comparison_tools.py
    └── report_generator.py
```

### Key Testing Principles

1. **Test Real Data**: Use actual source files, not mocked data
2. **Trace Specific Values**: Follow individual data points through entire pipeline
3. **Document Format Issues**: When percentages mismatch, document exact formats
4. **Validate Calculations**: Verify mathematical operations are correct
5. **Check Edge Cases**: Test null values, missing data, extreme values
6. **Measure Performance**: Track query times, load times
7. **Compare to Source**: Always validate against original Excel/CSV files

### Critical Questions to Answer

1. **Percentage Format**: Are percentages stored as decimals (0.852) or percentages (85.2) in database?
2. **Conversion Logic**: Where and how are percentage conversions happening?
3. **Data Loss**: Why might trusts or records be missing?
4. **Calculation Errors**: What's causing the 67.1% mathematical consistency?
5. **Display Issues**: Why do users see "undefined%" in some places?

### Success Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Raw Data Quality | >98% | >95% | <90% |
| Processing Accuracy | 100% | >95% | <90% |
| Database Integrity | >98% | >95% | <90% |
| Query Accuracy | 100% | >98% | <95% |
| Frontend Transformation | 100% | >95% | <90% |
| Visual Display | 100% | >98% | <95% |
| End-to-End Trace | 100% | >90% | <80% |
| **Overall Confidence** | **>90%** | **>80%** | **<70%** |

---

## Expected Deliverables

### Test Reports
1. Phase 1-7 individual test reports (JSON format)
2. Phase 8 comprehensive system report (Markdown)
3. Data quality scorecard
4. Confidence level assessment by data source
5. Prioritized issue list with remediation recommendations
6. Historical comparison analysis

### Documentation
1. Percentage format specification document
2. Data transformation mapping (source → database → display)
3. Identified data gaps and coverage report
4. Performance benchmark results
5. Production readiness assessment

### Code Artifacts
1. Complete test suite (8 phases)
2. Utility functions for data validation
3. Report generation scripts
4. Automated test runner
5. Configuration for continuous testing

---

## Timeline Estimate

- **Phase 1**: 2 hours (file validation, quality checks)
- **Phase 2**: 3 hours (processor testing, accuracy validation)
- **Phase 3**: 3 hours (database integrity, mathematical checks)
- **Phase 4**: 2 hours (query testing, performance measurement)
- **Phase 5**: 2 hours (frontend transformation validation)
- **Phase 6**: 2 hours (visual display testing)
- **Phase 7**: 3 hours (end-to-end traces, user journeys)
- **Phase 8**: 1 hour (report generation, analysis)

**Total Estimated Time**: 18 hours

Can be parallelized or done incrementally, stopping after each phase to address critical issues before proceeding.

---

## Critical Notes

- **Focus on RTT Data First**: This is 80% of the dashboard, highest priority
- **Document Everything**: Especially percentage format handling
- **Test with Real Data**: No sample/mock data
- **Validate Math**: Every calculation must be verified
- **Trace End-to-End**: At least 5 complete pipeline traces required
- **Performance Matters**: Track all query and load times
- **Compare to Source**: Always validate against original Excel files

The goal is not just to test if code runs, but to **prove the data is accurate** from source files through to what users see on screen.
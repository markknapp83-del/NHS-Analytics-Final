# Supabase Data Pipeline Fix & Enhancement Plan

## Project Overview
Fix the existing Supabase `trust_metrics` table data population issues and build a robust automated data pipeline for NHS analytics. Keep the current JSONB schema structure while resolving data transformation and population problems.

## Current State Analysis

### Existing Infrastructure ✅
- **Database Schema**: Well-designed `trust_metrics` table with JSONB fields
- **Indexes**: Proper GIN indexes on JSONB fields for performance
- **Constraints**: Unique constraint preventing duplicate records
- **CSV Data Source**: 271-column unified dataset with 1,816 records

### Identified Issues ❌
- **Empty JSONB Fields**: All data fields showing "EMPTY" instead of structured data
- **Incomplete Geographic Data**: ICB codes mostly null
- **Data Population Failure**: ETL process not transforming CSV → JSONB correctly
- **Missing Data Validation**: No quality checks during data insertion

## Phase I: Data Pipeline Diagnosis & Repair (4-6 hours)

### Task 1.1: Database Audit & Investigation (1 hour)
```bash
# Claude Code Task: Comprehensive database audit to understand current state
# Action: Query existing data structure and identify specific failure points
# Output: database_audit_report.md, data_structure_analysis.sql
```

**Investigation Requirements**:
- Connect to Supabase database using existing credentials
- Analyze current record structure and JSONB field contents
- Identify patterns in data population failures
- Document actual vs. expected data format
- Map CSV columns to intended JSONB structure

**Specific Queries to Run**:
```sql
-- Check actual JSONB content structure
SELECT trust_code, rtt_data, ae_data, diagnostics_data 
FROM trust_metrics 
WHERE rtt_data IS NOT NULL 
LIMIT 5;

-- Analyze data completeness
SELECT 
  COUNT(*) as total_records,
  COUNT(rtt_data) as rtt_populated,
  COUNT(ae_data) as ae_populated,
  COUNT(diagnostics_data) as diagnostics_populated,
  COUNT(icb_code) as icb_populated
FROM trust_metrics;

-- Check for data type issues
SELECT trust_code, period, data_type, 
       jsonb_typeof(rtt_data) as rtt_type,
       jsonb_typeof(ae_data) as ae_type
FROM trust_metrics 
LIMIT 10;
```

### Task 1.2: CSV to JSONB Mapping Analysis (1 hour)
```bash
# Claude Code Task: Analyze CSV structure and create proper JSONB mapping
# Action: Load CSV data and design correct transformation logic
# Output: csv_jsonb_mapping.json, transformation_strategy.md
```

**Mapping Requirements**:
- Load `unified_monthly_data_enhanced.csv` and analyze structure
- Map 271 CSV columns to 6 JSONB field categories
- Define transformation rules for each data domain
- Handle missing values and data type conversions
- Create validation rules for data quality

**Expected JSONB Structure Design**:
```json
{
  "rtt_data": {
    "trust_total": {
      "percent_within_18_weeks": 85.2,
      "total_incomplete_pathways": 12450,
      "total_52_plus_weeks": 234,
      "total_65_plus_weeks": 89,
      "total_78_plus_weeks": 23,
      "median_wait_weeks": 14.7
    },
    "specialties": {
      "general_surgery": {
        "percent_within_18_weeks": 82.1,
        "total_incomplete_pathways": 1250,
        "total_52_plus_weeks": 45,
        "median_wait_weeks": 15.2
      }
      // ... all 20 specialties
    }
  },
  "ae_data": {
    "four_hour_performance_pct": 75.3,
    "total_attendances": 8450,
    "over_four_hours_total": 2089,
    "emergency_admissions_total": 2340,
    "twelve_hour_wait_admissions": 12
  },
  "diagnostics_data": {
    "mri_scans": {
      "total_waiting": 1250,
      "six_week_breaches": 89,
      "thirteen_week_breaches": 23,
      "planned_tests": 456,
      "unscheduled_tests": 123
    }
    // ... all 15 diagnostic types
  },
  "capacity_data": {
    "virtual_ward_capacity": 45,
    "virtual_ward_occupancy_rate": 78.5,
    "avg_daily_discharges": 156
  }
}
```

### Task 1.3: Data Transformation Engine (2 hours)
```bash
# Claude Code Task: Build robust CSV → Supabase transformation pipeline
# Action: Create data processing engine with validation and error handling
# Output: data_transformer.py, validation_engine.py, transform_csv_to_supabase.py
```

**Transformation Engine Requirements**:
- **CSV Processing**: Parse 271-column CSV with proper data type handling
- **JSONB Construction**: Build nested JSON structures for each data domain
- **Data Validation**: Validate data ranges, formats, and required fields
- **Error Handling**: Log transformation errors without stopping pipeline
- **Batch Processing**: Handle large datasets efficiently

**Key Components**:
```python
class NHSDataTransformer:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.validation_rules = self.load_validation_rules()
    
    def transform_csv_row(self, csv_row: dict) -> dict:
        """Transform single CSV row to trust_metrics record"""
        
    def build_rtt_data(self, csv_row: dict) -> dict:
        """Extract and structure RTT metrics"""
        
    def build_ae_data(self, csv_row: dict) -> dict:
        """Extract and structure A&E metrics"""
        
    def build_diagnostics_data(self, csv_row: dict) -> dict:
        """Extract and structure diagnostic metrics"""
        
    def validate_record(self, record: dict) -> tuple[bool, list]:
        """Validate record against business rules"""
        
    def upsert_to_supabase(self, records: list) -> dict:
        """Batch upsert with conflict resolution"""
```

### Task 1.4: Database Population & Validation (1 hour)
```bash
# Claude Code Task: Populate database with transformed data and validate results
# Action: Run full data transformation pipeline and verify database state
# Output: population_report.md, data_quality_validation.md
```

**Population Process**:
- Clear existing empty records (or update them)
- Transform all 1,816 CSV records to proper JSONB format
- Batch insert/update to Supabase with conflict handling
- Validate final database state
- Generate data quality reports

**Validation Checks**:
- Record count matches CSV (1,816 trust-month observations)
- All JSONB fields properly populated (no more "EMPTY" values)
- ICB codes populated where available
- Data ranges within expected bounds
- Cross-field validation (RTT totals match specialty sums)

## Phase II: Automated Data Pipeline Development (6-8 hours)

### Task 2.1: NHS Data Source Integration (2 hours)
```bash
# Claude Code Task: Build automated NHS data download system
# Action: Create robust data fetching for all NHS England data sources
# Output: nhs_data_downloader.py, data_source_config.json, download_scheduler.py
```

**Data Source Configuration**:
```json
{
  "data_sources": {
    "rtt_data": {
      "url_pattern": "https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/{year}/{month}/",
      "file_patterns": ["Incomplete-Provider-{month}{year}.xlsx"],
      "frequency": "monthly",
      "release_day": 14,
      "processing_priority": 1
    },
    "ae_data": {
      "url_pattern": "https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/{year}/{month}/",
      "file_patterns": ["AE-activity-{month}{year}.xlsx"],
      "frequency": "monthly", 
      "release_day": 14,
      "processing_priority": 2
    },
    "diagnostics_data": {
      "url_pattern": "https://www.england.nhs.uk/statistics/statistical-work-areas/diagnostics-waiting-times-and-activity/{year}/{month}/",
      "file_patterns": ["Diagnostic-waiting-times-{month}{year}.xlsx"],
      "frequency": "monthly",
      "release_day": 21,
      "processing_priority": 3
    }
  }
}
```

### Task 2.2: Multi-Source Data Processing (2 hours)
```bash
# Claude Code Task: Build processors for different NHS Excel file formats
# Action: Create specialized processors for RTT, A&E, and diagnostic data files
# Output: rtt_processor.py, ae_processor.py, diagnostics_processor.py
```

**Processor Requirements**:
- Handle varying Excel file formats across data sources
- Extract trust-level and specialty-level metrics
- Maintain data consistency across sources
- Handle missing trusts or data points gracefully
- Map trust codes consistently across all sources

### Task 2.3: Pipeline Orchestration & Scheduling (2 hours)
```bash
# Claude Code Task: Build pipeline orchestration with scheduling and monitoring
# Action: Create automated pipeline with error handling and notifications
# Output: pipeline_orchestrator.py, scheduler.py, monitoring_dashboard.py
```

**Orchestration Features**:
- **Scheduling**: Run pipeline automatically based on NHS release patterns
- **Dependency Management**: Process data sources in correct order
- **Error Recovery**: Retry failed downloads/processing with exponential backoff
- **Monitoring**: Track pipeline health and data quality metrics
- **Notifications**: Alert on pipeline failures or data quality issues

**Pipeline Workflow**:
```python
class NHSDataPipeline:
    def run_monthly_update(self, year: int, month: int):
        """Complete monthly data update workflow"""
        # 1. Download new data files
        # 2. Process each data source
        # 3. Validate data quality  
        # 4. Update database
        # 5. Verify update success
        # 6. Send completion notifications
```

### Task 2.4: Data Quality & Monitoring (2 hours)
```bash
# Claude Code Task: Implement comprehensive data quality monitoring
# Action: Build validation, monitoring, and alerting system
# Output: data_quality_monitor.py, quality_dashboard.py, alert_system.py
```

**Quality Monitoring Features**:
- **Data Completeness**: Track missing trusts or metrics
- **Data Consistency**: Validate cross-source data alignment
- **Trend Analysis**: Detect unusual changes in data patterns
- **Performance Monitoring**: Track pipeline execution times
- **Historical Validation**: Compare new data against historical patterns

## Phase III: Dashboard Integration & Testing (4-6 hours)

### Task 3.1: Database Client Library (2 hours)
```bash
# Claude Code Task: Build TypeScript client library for dashboard integration
# Action: Create type-safe database access layer for frontend
# Output: /lib/supabase-client.ts, /types/database.ts, /hooks/useNHSData.ts
```

**Client Library Features**:
```typescript
export class NHSDatabaseClient {
  // Core data fetching
  async getTrustMetrics(trustCode: string, dateRange: DateRange): Promise<TrustMetrics[]>
  async getAllTrusts(): Promise<Trust[]>
  async getTrustsByICB(icbCode: string): Promise<Trust[]>
  
  // Specialized queries
  async getRTTPerformance(trustCode: string, specialties?: string[]): Promise<RTTData[]>
  async getAEPerformance(trustCode: string): Promise<AEData[]>
  async getDiagnosticsData(trustCode: string, testTypes?: string[]): Promise<DiagnosticsData[]>
  
  // Analytics and comparisons
  async compareMultipleTrusts(trustCodes: string[], metrics: string[]): Promise<ComparisonData>
  async getICBBenchmarks(icbCode: string): Promise<BenchmarkData>
  async getTrendAnalysis(trustCode: string, metric: string): Promise<TrendData>
}
```

### Task 3.2: Dashboard Reconstruction (2 hours)
```bash
# Claude Code Task: Rebuild dashboard components to use Supabase database
# Action: Update all dashboard components to use database instead of CSV
# Output: Updated dashboard components with database integration
```

**Component Updates Required**:
- **Trust Selector**: Load trust list from database
- **KPI Cards**: Query latest metrics from JSONB fields
- **Charts**: Transform JSONB data for chart libraries
- **Filters**: Database-driven filtering instead of client-side
- **Advanced Analytics**: Leverage database queries for complex analysis

### Task 3.3: Performance Optimization (1 hour)
```bash
# Claude Code Task: Optimize database queries and dashboard performance
# Action: Implement caching, query optimization, and performance monitoring
# Output: performance_optimization_report.md, caching_strategy.md
```

**Optimization Strategies**:
- **Query Optimization**: Efficient JSONB queries with proper indexing
- **Data Caching**: Cache frequently accessed data in browser/server
- **Lazy Loading**: Load dashboard sections on demand
- **Connection Pooling**: Optimize database connection usage

### Task 3.4: End-to-End Testing (1 hour)
```bash
# Claude Code Task: Comprehensive testing of pipeline and dashboard
# Action: Test complete data flow from NHS sources to dashboard visualization
# Output: testing_report.md, performance_benchmarks.md
```

**Testing Scenarios**:
- **Data Pipeline**: Test download → process → database → dashboard flow
- **Dashboard Functionality**: Verify all charts and analytics work correctly
- **Performance**: Validate load times and query response times
- **Error Handling**: Test failure scenarios and recovery
- **Data Quality**: Verify data accuracy and completeness

## Success Criteria

### Database Population ✅
- [ ] All 1,816 CSV records successfully transformed and loaded
- [ ] No "EMPTY" JSONB fields - all data properly structured
- [ ] ICB codes populated where available from source data
- [ ] Data validation rules enforced during population
- [ ] Database queries return expected results for dashboard components

### Automated Pipeline ✅
- [ ] Automated download from all NHS England data sources
- [ ] Robust processing of varying Excel file formats
- [ ] Scheduled pipeline execution based on NHS release patterns
- [ ] Comprehensive error handling and recovery mechanisms
- [ ] Data quality monitoring and alerting system

### Dashboard Integration ✅
- [ ] All dashboard components successfully using database instead of CSV
- [ ] Sub-3-second load times for all dashboard operations
- [ ] Advanced analytics working with database-driven queries
- [ ] Professional appearance maintained while using real database data
- [ ] Responsive design working across all device sizes

### Production Readiness ✅
- [ ] Pipeline can handle new NHS data releases automatically
- [ ] Database performance optimized for dashboard query patterns
- [ ] Monitoring and alerting operational for pipeline health
- [ ] Documentation complete for pipeline operation and maintenance
- [ ] Error recovery procedures tested and documented

## Risk Mitigation Strategies

### Data Quality Risks
- **Validation at Every Step**: Comprehensive data validation during transformation
- **Graceful Degradation**: Dashboard functions even with partial data
- **Data Quality Monitoring**: Automated detection of data anomalies
- **Rollback Capability**: Ability to revert to previous data version if needed

### Pipeline Reliability Risks
- **Robust Error Handling**: Pipeline continues operation despite individual failures
- **Multiple Retry Mechanisms**: Exponential backoff for transient failures
- **Manual Override Capability**: Ability to manually trigger pipeline steps
- **Monitoring and Alerting**: Immediate notification of pipeline issues

### Performance Risks
- **Database Optimization**: Proper indexing and query optimization
- **Caching Strategy**: Reduce database load through intelligent caching
- **Scalability Planning**: Database and application designed for growth
- **Performance Monitoring**: Continuous monitoring of system performance

## File Structure After Completion

```
NHS-Analytics-Database/
├── data-pipeline/
│   ├── nhs_data_downloader.py
│   ├── data_transformer.py
│   ├── rtt_processor.py
│   ├── ae_processor.py
│   ├── diagnostics_processor.py
│   ├── pipeline_orchestrator.py
│   └── data_quality_monitor.py
├── database/
│   ├── schema.sql (existing)
│   ├── migration_scripts/
│   └── validation_queries.sql
├── dashboard/
│   ├── lib/
│   │   ├── supabase-client.ts
│   │   └── database-types.ts
│   ├── hooks/
│   │   └── useNHSData.ts
│   └── components/
│       └── [updated dashboard components]
├── monitoring/
│   ├── quality_dashboard.py
│   ├── alert_system.py
│   └── performance_monitor.py
└── docs/
    ├── database_audit_report.md
    ├── pipeline_architecture.md
    ├── data_quality_validation.md
    └── deployment_guide.md
```

## Claude Code Execution Instructions

### Phase I: Database Repair
```bash
claude-code diagnose --database="supabase" --table="trust_metrics" 
--task="audit-jsonb-population-failure"

claude-code transform --source="unified_monthly_data_enhanced.csv" 
--target="supabase-jsonb" --validation="strict"

claude-code populate --database="supabase" --records="1816" 
--verify="data-quality-validation"
```

### Phase II: Pipeline Development
```bash
claude-code build-pipeline --sources="nhs-england-data" 
--processors="rtt,ae,diagnostics" --schedule="monthly"

claude-code orchestrate --pipeline="nhs-data-pipeline" 
--monitoring="enabled" --notifications="email"
```

### Phase III: Dashboard Integration  
```bash
claude-code integrate-dashboard --database="supabase" 
--components="all" --performance="optimize"

claude-code test --scope="end-to-end" --pipeline="full" 
--dashboard="complete" --performance="benchmark"
```

This plan will transform your existing Supabase infrastructure into a fully functional, automated NHS data platform while preserving the investment in your current schema design.
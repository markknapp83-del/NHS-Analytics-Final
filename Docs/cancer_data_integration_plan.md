# Cancer Data Integration Plan

## Project Overview
Integrate NHS Cancer Waiting Times (CWT) data into the NHS Analytics Dashboard, creating a comprehensive Cancer Performance tab and enhancing the Overview tab with cancer intelligence. Cancer data is critical for identifying trusts under system pressure and insourcing opportunities.

## Project Context
- **Location**: `C:\Users\Mark\Projects\NHS Data Analytics v5`
- **Database**: Supabase with `cancer_data` JSONB column in trust_metrics table
- **Data Source**: 3 historical CWT Provider Extract files (Apr 2024 - Jul 2025)
- **Current Stack**: Next.js 14, TypeScript, ShadCN/UI, Tailwind CSS, Recharts
- **Reference Design**: RTT Deep Dive and Community Health tab structure

## Data Structure Analysis

### Source Data Characteristics
- **File Structure**: Excel workbook with single data sheet
- **Records per File**: ~41,000 rows (4 months × 159 trusts × multiple metrics)
- **Trust Coverage**: 159 trusts total (146 R-code NHS trusts + 13 other providers)
- **Temporal Granularity**: Published every 6 months, covering 4-month periods
- **Data Dimensions**: Standard × Cancer Type × Route × Treatment Modality × Trust × Month

### Column Structure
```
PERIOD        - Date field (Excel date format)
YEAR          - NHS Financial Year (e.g., "2025/26")
MONTH         - Month abbreviation (APR, MAY, JUN, JUL)
STANDARD      - Cancer waiting time standard
ORG CODE      - Trust code (e.g., R1H, RGT)
STAGE/ROUTE   - Screening, Urgent Suspected Cancer, etc.
TREATMENT MODALITY - Surgery, Radiotherapy, Anti-cancer drug, etc.
CANCER TYPE   - Specific cancer type or suspected cancer pathway
TOTAL TREATED - Number of patients treated
WITHIN STANDARD - Patients meeting standard
BREACHES      - Patients exceeding standard
```

### Cancer Waiting Time Standards (3 Types)

**1. 28-day FDS (Faster Diagnosis Standard)**
- **Target**: 75% of patients
- **Pathway**: Suspected cancer referral → Diagnosis or exclusion of cancer
- **Purpose**: Faster diagnosis for suspected cancer patients
- **Records**: ~8,000 per 4-month file

**2. 31-day Combined**
- **Target**: 96% of patients  
- **Pathway**: Decision to treat → First definitive treatment
- **Purpose**: Rapid treatment once cancer confirmed
- **Records**: ~14,000 per 4-month file

**3. 62-day Combined**
- **Target**: 85% of patients
- **Pathway**: Urgent GP referral (or screening) → First definitive treatment
- **Purpose**: End-to-end urgent pathway standard
- **Records**: ~19,000 per 4-month file
- **Most Critical**: Indicates overall system capacity and pressure

### Cancer Types (32 Total)

**Major Cancer Categories (Treated):**
- Breast
- Lung
- Lower Gastrointestinal
- Upper Gastrointestinal - Oesophagus & Stomach
- Upper Gastrointestinal - Hepatobiliary
- Gynaecological
- Head & Neck
- Skin
- Haematological - Lymphoma
- Haematological - Other
- Other (various)

**Suspected Cancer Pathways:**
- Suspected breast cancer
- Suspected lung cancer
- Suspected lower gastrointestinal cancer
- Suspected upper gastrointestinal cancer
- Suspected gynaecological cancer
- Suspected head & neck cancer
- Suspected urological malignancies (excluding testicular)
- Suspected testicular cancer
- Suspected skin cancer
- Suspected haematological malignancies (excluding acute leukaemia)
- Suspected acute leukaemia
- Suspected brain/central nervous system tumours
- Suspected children's cancer
- Suspected sarcoma
- Suspected other cancer
- Suspected cancer - non-specific symptoms

**Other Categories:**
- Exhibited (non-cancer) breast symptoms - cancer not initially suspected
- ALL CANCERS (aggregate)
- Missing or Invalid

### Routes/Stages (9 Types)
- Urgent Suspected Cancer
- URGENT SUSPECTED CANCER (alternative format)
- Screening / NATIONAL SCREENING PROGRAMME
- Breast Symptomatic / BREAST SYMPTOMATIC, CANCER NOT SUSPECTED
- Consultant Upgrade
- First Treatment
- Subsequent Treatment

### Treatment Modalities (5 Types + Aggregate)
- Surgery
- Anti-cancer drug regimen
- Radiotherapy
- Other
- ALL MODALITIES (aggregate)
- null (applies to 28-day FDS - no treatment yet)

## Database Schema

### Cancer Data JSONB Structure (Detailed)

```json
{
  "period": "2025-Q1",
  "period_start": "2025-04-01",
  "period_end": "2025-06-30",
  "data_type": "quarterly",
  "months_covered": ["APR", "MAY", "JUN"],
  
  "standards": {
    "28_day_fds": {
      "summary": {
        "total_treated": 1250,
        "within_standard": 1100,
        "breaches": 150,
        "performance_pct": 88.0
      },
      "by_cancer_type": {
        "suspected_breast_cancer": {
          "total_treated": 400,
          "within_standard": 380,
          "breaches": 20,
          "performance_pct": 95.0,
          "by_route": {
            "urgent_suspected_cancer": {
              "total_treated": 350,
              "within_standard": 335,
              "breaches": 15,
              "performance_pct": 95.7
            },
            "breast_symptomatic": {
              "total_treated": 50,
              "within_standard": 45,
              "breaches": 5,
              "performance_pct": 90.0
            }
          }
        },
        "suspected_lung_cancer": {
          "total_treated": 200,
          "within_standard": 160,
          "breaches": 40,
          "performance_pct": 80.0,
          "by_route": {
            "urgent_suspected_cancer": {
              "total_treated": 200,
              "within_standard": 160,
              "breaches": 40,
              "performance_pct": 80.0
            }
          }
        }
        // ... all cancer types with data
      }
    },
    
    "31_day_combined": {
      "summary": {
        "total_treated": 2800,
        "within_standard": 2650,
        "breaches": 150,
        "performance_pct": 94.6
      },
      "by_cancer_type": {
        "breast": {
          "total_treated": 800,
          "within_standard": 780,
          "breaches": 20,
          "performance_pct": 97.5,
          "by_treatment_modality": {
            "surgery": {
              "total_treated": 450,
              "within_standard": 445,
              "breaches": 5,
              "performance_pct": 98.9,
              "by_route": {
                "first_treatment": {
                  "total_treated": 400,
                  "within_standard": 395,
                  "breaches": 5,
                  "performance_pct": 98.75
                },
                "subsequent_treatment": {
                  "total_treated": 50,
                  "within_standard": 50,
                  "breaches": 0,
                  "performance_pct": 100.0
                }
              }
            },
            "anti_cancer_drug_regimen": {
              "total_treated": 250,
              "within_standard": 240,
              "breaches": 10,
              "performance_pct": 96.0,
              "by_route": { /* ... */ }
            },
            "radiotherapy": {
              "total_treated": 100,
              "within_standard": 95,
              "breaches": 5,
              "performance_pct": 95.0,
              "by_route": { /* ... */ }
            }
          }
        },
        "lung": { /* ... */ }
        // ... all cancer types
      }
    },
    
    "62_day_combined": {
      "summary": {
        "total_treated": 3500,
        "within_standard": 2800,
        "breaches": 700,
        "performance_pct": 80.0
      },
      "by_cancer_type": {
        "breast": {
          "total_treated": 900,
          "within_standard": 800,
          "breaches": 100,
          "performance_pct": 88.9,
          "by_route": {
            "urgent_suspected_cancer": {
              "total_treated": 700,
              "within_standard": 630,
              "breaches": 70,
              "performance_pct": 90.0,
              "by_treatment_modality": {
                "surgery": {
                  "total_treated": 400,
                  "within_standard": 370,
                  "breaches": 30,
                  "performance_pct": 92.5
                },
                "anti_cancer_drug_regimen": { /* ... */ }
              }
            },
            "screening": {
              "total_treated": 200,
              "within_standard": 170,
              "breaches": 30,
              "performance_pct": 85.0,
              "by_treatment_modality": { /* ... */ }
            }
          }
        },
        "lung": { /* ... */ }
        // ... all cancer types
      }
    }
  },
  
  "metadata": {
    "total_patients_treated_all_standards": 7550,
    "total_breaches_all_standards": 1000,
    "overall_performance_weighted": 86.8,
    
    "worst_performing_standard": {
      "standard": "62-day Combined",
      "performance_pct": 80.0,
      "breaches": 700
    },
    
    "worst_performing_cancer_types": [
      {
        "cancer_type": "lung",
        "standard": "62-day Combined",
        "performance_pct": 72.5,
        "breaches": 180
      },
      {
        "cancer_type": "lower_gastrointestinal",
        "standard": "62-day Combined", 
        "performance_pct": 75.3,
        "breaches": 120
      }
    ],
    
    "top_volume_cancer_types": [
      { "cancer_type": "breast", "total_treated": 900 },
      { "cancer_type": "lung", "total_treated": 650 },
      { "cancer_type": "lower_gastrointestinal", "total_treated": 480 }
    ],
    
    "data_quality": {
      "missing_or_invalid_records": 15,
      "null_treatment_modalities": 1250,
      "complete_data_pct": 98.5
    },
    
    "last_updated": "2025-09-25T10:00:00Z",
    "data_source": "NHS Cancer Waiting Times Provider Extract",
    "file_processed": "CWTCRSApr2025toJul2025DataExtractProvider.xlsx"
  }
}
```

### Field Naming Conventions

**Cancer Type Mapping (Excel → Database Keys):**
```python
cancer_type_mapping = {
    "Breast": "breast",
    "Lung": "lung",
    "Lower Gastrointestinal": "lower_gastrointestinal",
    "Upper Gastrointestinal - Oesophagus & Stomach": "upper_gi_oesophagus_stomach",
    "Upper Gastrointestinal - Hepatobiliary": "upper_gi_hepatobiliary",
    "Gynaecological": "gynaecological",
    "Head & Neck": "head_neck",
    "Skin": "skin",
    "Haematological - Lymphoma": "haematological_lymphoma",
    "Haematological - Other (a)": "haematological_other",
    "Suspected breast cancer": "suspected_breast_cancer",
    "Suspected lung cancer": "suspected_lung_cancer",
    "Suspected lower gastrointestinal cancer": "suspected_lower_gi_cancer",
    "Suspected upper gastrointestinal cancer": "suspected_upper_gi_cancer",
    "Suspected gynaecological cancer": "suspected_gynaecological_cancer",
    "Suspected head & neck cancer": "suspected_head_neck_cancer",
    "Suspected urological malignancies (excluding testicular)": "suspected_urological",
    "Suspected testicular cancer": "suspected_testicular_cancer",
    "Suspected skin cancer": "suspected_skin_cancer",
    "Suspected haematological malignancies (excluding acute leukaemia)": "suspected_haematological",
    "Suspected acute leukaemia": "suspected_acute_leukaemia",
    "Suspected brain/central nervous system tumours": "suspected_brain_cns",
    "Suspected children's cancer": "suspected_childrens_cancer",
    "Suspected sarcoma": "suspected_sarcoma",
    "Suspected other cancer": "suspected_other_cancer",
    "Suspected cancer - non-specific symptoms": "suspected_non_specific",
    "Exhibited (non-cancer) breast symptoms - cancer not initially suspected": "breast_symptomatic_non_cancer",
    "Other (a)": "other",
    "ALL CANCERS": "all_cancers",
    "Missing or Invalid": "missing_invalid"
}
```

**Route Mapping:**
```python
route_mapping = {
    "Urgent Suspected Cancer": "urgent_suspected_cancer",
    "URGENT SUSPECTED CANCER": "urgent_suspected_cancer",
    "Screening": "screening",
    "NATIONAL SCREENING PROGRAMME": "screening",
    "Breast Symptomatic": "breast_symptomatic",
    "BREAST SYMPTOMATIC, CANCER NOT SUSPECTED": "breast_symptomatic",
    "Consultant Upgrade": "consultant_upgrade",
    "First Treatment": "first_treatment",
    "Subsequent Treatment": "subsequent_treatment"
}
```

**Treatment Modality Mapping:**
```python
modality_mapping = {
    "Surgery": "surgery",
    "Anti-cancer drug regimen": "anti_cancer_drug_regimen",
    "Radiotherapy": "radiotherapy",
    "Other": "other",
    "ALL MODALITIES": "all_modalities"
}
```

### Database Update Strategy

**Insert/Update Logic:**
```sql
-- Create or update cancer data for trust-quarter
INSERT INTO trust_metrics (
    trust_code, 
    trust_name,
    period, 
    data_type,
    cancer_data,
    created_at,
    updated_at
)
VALUES (
    'R1H',
    'Barts Health NHS Trust',
    '2025-04-01',
    'quarterly',
    $1::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (trust_code, period, data_type)
DO UPDATE SET
    cancer_data = $1::jsonb,
    updated_at = NOW();
```

**Period Determination Logic:**
```python
def determine_quarter(months: list[str]) -> tuple[str, str, str]:
    """
    Determine quarter from list of months in file.
    NHS Financial Year: Apr-Mar
    Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar
    """
    month_to_quarter = {
        'APR': ('Q1', '04-01'), 'MAY': ('Q1', '04-01'), 'JUN': ('Q1', '04-01'),
        'JUL': ('Q2', '07-01'), 'AUG': ('Q2', '07-01'), 'SEP': ('Q2', '07-01'),
        'OCT': ('Q3', '10-01'), 'NOV': ('Q3', '10-01'), 'DEC': ('Q3', '10-01'),
        'JAN': ('Q4', '01-01'), 'FEB': ('Q4', '01-01'), 'MAR': ('Q4', '01-01')
    }
    
    # Get quarter from first month
    first_month = sorted(months)[0]
    quarter, month_day = month_to_quarter[first_month]
    
    # Determine year (handle Q4 which spans calendar years)
    year = file_year if first_month != 'JAN' else file_year + 1
    
    period_start = f"{year}-{month_day}"
    period_label = f"{year}-{quarter}"
    
    return period_label, period_start, quarter
```

## Implementation Plan

### Phase I: Historical Data Processing (3-4 hours)

#### Task 1.1: Trust Code Mapping
**Objective**: Map cancer data ORG CODEs to trust names from existing database

```python
# Fetch all trust codes and names from trust_metrics
trust_mapping_query = """
    SELECT DISTINCT trust_code, trust_name 
    FROM trust_metrics 
    WHERE trust_code IS NOT NULL
"""

# Create lookup dictionary
trust_name_map = {
    row['trust_code']: row['trust_name']
    for row in trust_mapping_results
}

# Handle unmapped trusts
def get_trust_name(org_code: str) -> str:
    return trust_name_map.get(org_code, f"Unknown Trust ({org_code})")
```

**Deliverables:**
- [ ] Trust code to name mapping dictionary
- [ ] List of cancer data trusts not in trust_metrics
- [ ] Coverage report (expected: 146 R-codes, ~95% match rate)

#### Task 1.2: Multi-File Cancer Data Processing
**Objective**: Process all 3 historical cancer files into unified dataset

**File Processing Pipeline:**
```python
def process_cancer_file(file_path: str) -> dict:
    """
    Process single cancer CWT Provider Extract file.
    Returns: dict of {trust_code: {quarter: cancer_data_jsonb}}
    """
    
    # 1. Read Excel file
    df = pd.read_excel(file_path, sheet_name='CWT CRS Provider Extract')
    
    # 2. Determine period/quarter
    months_in_file = df['MONTH'].unique()
    quarter_label, period_start, quarter = determine_quarter(months_in_file)
    
    # 3. Group by trust and aggregate
    trust_data = {}
    
    for trust_code in df['ORG CODE'].unique():
        if not trust_code.startswith('R'):
            continue  # Skip non-NHS trusts
            
        trust_df = df[df['ORG CODE'] == trust_code]
        
        # Build nested JSONB structure
        cancer_jsonb = build_cancer_jsonb(
            trust_df, 
            quarter_label, 
            period_start,
            months_in_file
        )
        
        trust_data[trust_code] = {
            'quarter': quarter_label,
            'period': period_start,
            'data': cancer_jsonb
        }
    
    return trust_data

def build_cancer_jsonb(df, quarter, period_start, months):
    """Build detailed nested JSONB structure from trust data"""
    
    jsonb = {
        'period': quarter,
        'period_start': period_start,
        'period_end': calculate_period_end(period_start),
        'data_type': 'quarterly',
        'months_covered': sorted(months),
        'standards': {},
        'metadata': {}
    }
    
    # Process each standard
    for standard in ['28-day FDS', '31-day Combined', '62-day Combined']:
        standard_key = standard.lower().replace('-', '_').replace(' ', '_')
        standard_df = df[df['STANDARD'] == standard]
        
        jsonb['standards'][standard_key] = {
            'summary': calculate_summary(standard_df),
            'by_cancer_type': {}
        }
        
        # Process by cancer type
        for cancer_type in standard_df['CANCER TYPE'].unique():
            if pd.isna(cancer_type):
                continue
                
            cancer_key = map_cancer_type(cancer_type)
            cancer_df = standard_df[standard_df['CANCER TYPE'] == cancer_type]
            
            cancer_data = {
                'total_treated': int(cancer_df['TOTAL TREATED'].sum()),
                'within_standard': int(cancer_df['WITHIN STANDARD'].sum()),
                'breaches': int(cancer_df['BREACHES'].sum()),
                'performance_pct': calculate_performance(cancer_df),
                'by_route': {}
            }
            
            # Process by route
            for route in cancer_df['STAGE/ROUTE'].unique():
                if pd.isna(route):
                    continue
                    
                route_key = map_route(route)
                route_df = cancer_df[cancer_df['STAGE/ROUTE'] == route]
                
                route_data = {
                    'total_treated': int(route_df['TOTAL TREATED'].sum()),
                    'within_standard': int(route_df['WITHIN STANDARD'].sum()),
                    'breaches': int(route_df['BREACHES'].sum()),
                    'performance_pct': calculate_performance(route_df)
                }
                
                # For 31-day and 62-day, add treatment modality breakdown
                if standard != '28-day FDS':
                    route_data['by_treatment_modality'] = {}
                    
                    for modality in route_df['TREATMENT MODALITY'].unique():
                        if pd.isna(modality):
                            continue
                            
                        modality_key = map_modality(modality)
                        modality_df = route_df[route_df['TREATMENT MODALITY'] == modality]
                        
                        route_data['by_treatment_modality'][modality_key] = {
                            'total_treated': int(modality_df['TOTAL TREATED'].sum()),
                            'within_standard': int(modality_df['WITHIN STANDARD'].sum()),
                            'breaches': int(modality_df['BREACHES'].sum()),
                            'performance_pct': calculate_performance(modality_df)
                        }
                
                cancer_data['by_route'][route_key] = route_data
            
            jsonb['standards'][standard_key]['by_cancer_type'][cancer_key] = cancer_data
    
    # Calculate metadata
    jsonb['metadata'] = calculate_metadata(df, jsonb)
    
    return jsonb
```

**Deliverables:**
- [ ] Cancer data processor script
- [ ] Processed data for all 3 files
- [ ] Coverage report (trusts × quarters)
- [ ] Data quality report

#### Task 1.3: Database Integration
**Objective**: Load processed cancer data into Supabase

```python
async def load_cancer_data_to_supabase(trust_cancer_data: dict):
    """
    Load cancer data for all trusts and quarters into database.
    """
    
    for trust_code, quarters in trust_cancer_data.items():
        trust_name = get_trust_name(trust_code)
        
        for quarter_data in quarters.values():
            period = quarter_data['period']
            cancer_jsonb = quarter_data['data']
            
            # Upsert to database
            result = await supabase.from_('trust_metrics').upsert({
                'trust_code': trust_code,
                'trust_name': trust_name,
                'period': period,
                'data_type': 'quarterly',
                'cancer_data': cancer_jsonb,
                'updated_at': datetime.now().isoformat()
            }, on_conflict=['trust_code', 'period', 'data_type']).execute()
            
            if result.error:
                log_error(f"Failed to load {trust_code} {period}: {result.error}")
            else:
                log_success(f"Loaded {trust_code} {period}")
```

**Validation Queries:**
```sql
-- Check cancer data coverage
SELECT 
    COUNT(DISTINCT trust_code) as trusts_with_cancer_data,
    COUNT(DISTINCT period) as quarters_covered,
    COUNT(*) as total_records
FROM trust_metrics
WHERE cancer_data IS NOT NULL;

-- Get sample cancer data
SELECT 
    trust_code,
    trust_name,
    period,
    cancer_data->'metadata'->>'total_patients_treated_all_standards' as total_treated,
    cancer_data->'metadata'->>'overall_performance_weighted' as performance
FROM trust_metrics
WHERE cancer_data IS NOT NULL
ORDER BY period DESC, trust_code
LIMIT 10;

-- Check 62-day performance
SELECT 
    trust_code,
    period,
    cancer_data->'standards'->'62_day_combined'->'summary'->>'performance_pct' as performance_62day
FROM trust_metrics
WHERE cancer_data IS NOT NULL
ORDER BY (cancer_data->'standards'->'62_day_combined'->'summary'->>'performance_pct')::float ASC
LIMIT 20;
```

**Deliverables:**
- [ ] Database load complete for all files
- [ ] Validation queries executed
- [ ] Coverage report confirmed
- [ ] Sample data verified

### Phase II: Cancer Performance Tab (5-6 hours)

#### Task 2.1: Tab Structure and Navigation
**Objective**: Create Cancer Performance tab in dashboard navigation

**File Locations:**
- `src/app/dashboard/layout.tsx` - Add tab to navigation
- `src/app/dashboard/cancer-performance/page.tsx` - New route

**Navigation Update:**
```typescript
const tabs = [
  { name: 'Overview', href: '/dashboard', icon: BarChart3 },
  { name: 'RTT Deep Dive', href: '/dashboard/rtt-deep-dive', icon: TrendingUp },
  { name: 'Community Health', href: '/dashboard/community-health', icon: Users },
  { name: 'Cancer Performance', href: '/dashboard/cancer-performance', icon: Activity }, // NEW
  { name: 'Operational', href: '/dashboard/operational', icon: Activity },
  { name: 'Capacity', href: '/dashboard/capacity', icon: Building2 }
];
```

#### Task 2.2: Cancer KPI Cards
**Objective**: Display key cancer performance metrics

**Four Primary KPI Cards:**

```typescript
// Card 1: Overall Cancer Performance (Weighted Average)
{
  title: "Overall Cancer Performance",
  value: cancer_data.metadata.overall_performance_weighted,
  previousValue: previous_quarter.metadata.overall_performance_weighted,
  trend: "% points from last quarter",
  description: "Weighted average across all standards",
  icon: Target,
  format: "percentage",
  target: 85,
  colorCode: value >= 85 ? 'green' : value >= 75 ? 'amber' : 'red'
}

// Card 2: 62-Day Standard Performance
{
  title: "62-Day Standard Performance",
  value: cancer_data.standards['62_day_combined'].summary.performance_pct,
  previousValue: previous_quarter.standards['62_day_combined'].summary.performance_pct,
  trend: "% points from last quarter",
  description: "Urgent referral to treatment (Target: 85%)",
  icon: Clock,
  format: "percentage",
  target: 85
}

// Card 3: 28-Day FDS Performance
{
  title: "28-Day Faster Diagnosis",
  value: cancer_data.standards['28_day_fds'].summary.performance_pct,
  previousValue: previous_quarter.standards['28_day_fds'].summary.performance_pct,
  trend: "% points from last quarter",
  description: "Faster diagnosis standard (Target: 75%)",
  icon: Zap,
  format: "percentage",
  target: 75
}

// Card 4: Total Patients Treated
{
  title: "Total Patients Treated",
  value: cancer_data.metadata.total_patients_treated_all_standards,
  previousValue: previous_quarter.metadata.total_patients_treated_all_standards,
  trend: "patients from last quarter",
  description: "Across all cancer pathways",
  icon: Users,
  format: "number"
}
```

**Calculation Logic:**
```typescript
function calculateOverallPerformance(cancerData: CancerData): number {
  // Weighted average: 62-day has highest weight as most critical
  const weights = {
    '28_day_fds': 0.2,
    '31_day_combined': 0.3,
    '62_day_combined': 0.5
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  Object.entries(weights).forEach(([standard, weight]) => {
    const perf = cancerData.standards[standard].summary.performance_pct;
    weightedSum += perf * weight;
    totalWeight += weight;
  });
  
  return Math.round(weightedSum / totalWeight * 10) / 10;
}
```

**File Location**: `src/components/cancer/cancer-kpi-cards.tsx`

#### Task 2.3: Performance by Standard Chart
**Objective**: Compare performance across 3 standards

**Chart Specification:**
```typescript
{
  title: "Performance by Waiting Time Standard",
  description: "Performance against NHS cancer targets",
  chartType: "groupedBar",
  data: {
    categories: [
      "28-day FDS",
      "31-day Combined", 
      "62-day Combined"
    ],
    series: [
      {
        name: "Performance %",
        data: [
          cancer_data.standards['28_day_fds'].summary.performance_pct,
          cancer_data.standards['31_day_combined'].summary.performance_pct,
          cancer_data.standards['62_day_combined'].summary.performance_pct
        ],
        color: "var(--chart-1)"
      },
      {
        name: "NHS Target",
        data: [75, 96, 85],
        color: "var(--chart-2)",
        type: "line",
        marker: "triangle"
      }
    ]
  },
  features: [
    "Target lines overlay",
    "Color coding: Green (above target), Amber (within 5%), Red (below)",
    "Value labels on bars",
    "Hover tooltip with breach counts"
  ]
}
```

**File Location**: `src/components/charts/cancer-standards-chart.tsx`

#### Task 2.4: Performance by Cancer Type Chart
**Objective**: Show performance across major cancer types

**Chart Specification:**
```typescript
{
  title: "62-Day Performance by Cancer Type",
  description: "Performance for major cancer types (urgent pathway)",
  chartType: "horizontalBar",
  data: {
    // Get top 10 cancer types by volume from 62-day standard
    categories: getTopCancerTypes(
      cancer_data.standards['62_day_combined'].by_cancer_type, 
      10
    ),
    values: cancer_types.map(type => ({
      name: formatCancerTypeName(type),
      performance: cancer_data.standards['62_day_combined']
        .by_cancer_type[type].performance_pct,
      treated: cancer_data.standards['62_day_combined']
        .by_cancer_type[type].total_treated,
      breaches: cancer_data.standards['62_day_combined']
        .by_cancer_type[type].breaches
    })),
    colors: value => value >= 85 ? 'green' : value >= 75 ? 'amber' : 'red'
  },
  sorting: "performance_asc", // Show worst performers first
  features: [
    "Sorted worst to best",
    "85% target line",
    "Value labels with %",
    "Hover: patient volumes and breaches"
  ]
}
```

**File Location**: `src/components/charts/cancer-by-type-chart.tsx`

#### Task 2.5: Quarterly Trend Chart
**Objective**: Show performance trends across available quarters

**Chart Specification:**
```typescript
{
  title: "Cancer Performance Trends",
  description: "Quarterly performance across all standards",
  chartType: "line",
  data: {
    xAxis: quarters, // Array of available quarters
    series: [
      {
        name: "62-day Standard",
        dataKey: "62_day_performance",
        color: "var(--chart-1)",
        strokeWidth: 3
      },
      {
        name: "31-day Standard",
        dataKey: "31_day_performance",
        color: "var(--chart-2)",
        strokeWidth: 2
      },
      {
        name: "28-day FDS",
        dataKey: "28_day_performance",
        color: "var(--chart-3)",
        strokeWidth: 2
      }
    ],
    targets: [
      { name: "62-day Target", value: 85, style: "dashed" },
      { name: "31-day Target", value: 96, style: "dashed" },
      { name: "28-day Target", value: 75, style: "dashed" }
    ]
  },
  features: [
    "Target lines for each standard",
    "Data point markers",
    "Smooth curves",
    "Hover: exact values and breach counts",
    "Note: Limited historical data (6-monthly publication)"
  ]
}
```

**File Location**: `src/components/charts/cancer-trend-chart.tsx`

#### Task 2.6: Breach Analysis Chart
**Objective**: Visualize breach patterns by cancer type

**Chart Specification:**
```typescript
{
  title: "Cancer Pathway Breaches",
  description: "Total breaches by cancer type across all standards",
  chartType: "stackedBar",
  data: {
    // Get top cancer types by total breaches
    categories: getTopCancerTypesByBreaches(cancer_data, 10),
    series: [
      {
        name: "62-day Breaches",
        dataKey: "62_day_breaches",
        color: "var(--color-red)",
        stackId: "breaches"
      },
      {
        name: "31-day Breaches",
        dataKey: "31_day_breaches",
        color: "var(--color-orange)",
        stackId: "breaches"
      },
      {
        name: "28-day Breaches",
        dataKey: "28_day_breaches",
        color: "var(--color-amber)",
        stackId: "breaches"
      }
    ]
  },
  features: [
    "Stacked bars showing breach breakdown",
    "Sorted by total breaches (highest first)",
    "Value labels on segments",
    "Hover: breach details and performance %"
  ]
}
```

**File Location**: `src/components/charts/cancer-breaches-chart.tsx`

#### Task 2.7: Cancer Type Performance Table
**Objective**: Detailed table view of all cancer types and standards

**Table Structure:**
```typescript
interface CancerPerformanceRow {
  cancerType: string;
  displayName: string;
  category: 'treated' | 'suspected';
  
  // 28-day FDS (if applicable)
  fds_28_treated: number | null;
  fds_28_performance: number | null;
  fds_28_breaches: number | null;
  
  // 31-day Combined
  day_31_treated: number;
  day_31_performance: number;
  day_31_breaches: number;
  
  // 62-day Combined
  day_62_treated: number;
  day_62_performance: number;
  day_62_breaches: number;
  
  // Overall
  total_treated_all_standards: number;
  total_breaches_all_standards: number;
  worst_standard: string;
}

// Table Columns
const columns = [
  { header: "Cancer Type", accessor: "displayName", sortable: true },
  { header: "28-day FDS %", accessor: "fds_28_performance", format: "percentage" },
  { header: "31-day %", accessor: "day_31_performance", format: "percentage" },
  { header: "62-day %", accessor: "day_62_performance", format: "percentage" },
  { header: "Total Treated", accessor: "total_treated_all_standards", format: "number" },
  { header: "Total Breaches", accessor: "total_breaches_all_standards", format: "number" },
  { header: "Worst Standard", accessor: "worst_standard", badge: true }
];
```

**Visual Features:**
- Group by category: "Treated Cancer Types" and "Suspected Cancer Pathways"
- Color-code performance cells (Green ≥ target, Amber within 5%, Red below)
- Sort by any column
- Filter by category, standard performance threshold
- Expandable rows showing route and treatment modality breakdown

**File Location**: `src/components/cancer/cancer-performance-table.tsx`

### Phase III: Overview Tab Integration (2-3 hours)

#### Task 3.1: Critical Issues Table Enhancement
**Objective**: Add cancer breaches to existing critical issues

**Enhanced Critical Issues Logic:**
```typescript
interface CriticalIssue {
  category: 'RTT' | 'Community Health' | 'Cancer';
  service: string;
  metric: string;
  value: number;
  severity: 'critical' | 'warning';
  trend: number;
  period: string; // Include period for cancer (quarterly)
}

// Identify cancer critical issues
function getCancerCriticalIssues(cancerData: CancerData): CriticalIssue[] {
  const issues: CriticalIssue[] = [];
  
  // 62-day standard below 75% = Critical
  if (cancerData.standards['62_day_combined'].summary.performance_pct < 75) {
    issues.push({
      category: 'Cancer',
      service: '62-Day Standard',
      metric: 'Performance',
      value: cancerData.standards['62_day_combined'].summary.performance_pct,
      severity: 'critical',
      trend: calculateTrend(cancerData, '62_day_combined'),
      period: cancerData.period
    });
  }
  
  // Worst performing cancer types
  const worstCancerTypes = cancerData.metadata.worst_performing_cancer_types || [];
  worstCancerTypes.slice(0, 3).forEach(cancer => {
    if (cancer.performance_pct < 75) {
      issues.push({
        category: 'Cancer',
        service: formatCancerTypeName(cancer.cancer_type),
        metric: `${cancer.standard} Performance`,
        value: cancer.performance_pct,
        severity: cancer.performance_pct < 70 ? 'critical' : 'warning',
        trend: calculateCancerTypeTrend(cancer),
        period: cancerData.period
      });
    }
  });
  
  return issues;
}
```

**Display Updates:**
```typescript
// Merge with existing RTT and Community issues
const allCriticalIssues = [
  ...getRTTCriticalIssues(rttData),
  ...getCommunityHealthCriticalIssues(communityData),
  ...getCancerCriticalIssues(cancerData)
]
  .sort((a, b) => {
    // Sort: Critical first, then by value
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.value - b.value;
  })
  .slice(0, 10); // Top 10 issues
```

**Visual Indicators:**
- Cancer issues show period label: "Q1 2025"
- Category badge with icon (Cancer = Activity icon)
- Performance color coding consistent with standards

**File Location**: `src/components/dashboard/critical-issues-table.tsx`

#### Task 3.2: Cancer Alert Widget (Optional)
**Objective**: Add standalone cancer performance indicator

**Widget Specification:**
```typescript
<Card className="border-l-4 border-l-nhs-blue">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">Cancer Performance Status</CardTitle>
      <Badge variant={getPerformanceBadge(performance)}>
        {performance}% Overall
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">62-Day Standard</span>
        <span className={getPerformanceColor(day62Performance)}>
          {day62Performance}%
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Worst Performing</span>
        <span className="text-red-600">{worstCancerType}</span>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full mt-3"
        onClick={() => router.push('/dashboard/cancer-performance')}
      >
        View Cancer Performance
      </Button>
    </div>
  </CardContent>
</Card>
```

**Placement**: Below or alongside existing KPI cards on Overview tab

**File Location**: `src/components/dashboard/cancer-alert-widget.tsx`

### Phase IV: Data Integration & State Management (2-3 hours)

#### Task 4.1: Cancer Data Hook
**Objective**: Create reusable hook for cancer data access

```typescript
// hooks/use-cancer-data.ts
export function useCancerData(trustCode: string) {
  const [data, setData] = useState<CancerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCancerData() {
      try {
        const { data: cancerData, error } = await supabase
          .from('trust_metrics')
          .select('period, cancer_data, data_type')
          .eq('trust_code', trustCode)
          .eq('data_type', 'quarterly')
          .not('cancer_data', 'is', null)
          .order('period', { ascending: true });

        if (error) throw error;

        const parsed = cancerData.map(row => ({
          period: row.period,
          ...row.cancer_data
        }));

        setData(parsed);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (trustCode) {
      fetchCancerData();
    }
  }, [trustCode]);

  return { data, isLoading, error };
}

// Helper functions
export function getLatestCancerData(data: CancerData[]) {
  return data[data.length - 1];
}

export function getPreviousQuarterData(data: CancerData[]) {
  return data[data.length - 2];
}

export function getCancerTypePerformance(
  cancerData: CancerData,
  cancerType: string,
  standard: string
) {
  const standardKey = standard.toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
  return cancerData.standards[standardKey]?.by_cancer_type?.[cancerType];
}
```

**File Location**: `src/hooks/use-cancer-data.ts`

#### Task 4.2: TypeScript Interfaces
**Objective**: Define comprehensive types for cancer data

```typescript
// types/cancer.ts
export interface CancerPerformanceMetrics {
  total_treated: number;
  within_standard: number;
  breaches: number;
  performance_pct: number;
}

export interface CancerRouteData extends CancerPerformanceMetrics {
  by_treatment_modality?: Record<string, CancerPerformanceMetrics>;
}

export interface CancerTypeData extends CancerPerformanceMetrics {
  by_route: Record<string, CancerRouteData>;
}

export interface CancerStandardData {
  summary: CancerPerformanceMetrics;
  by_cancer_type: Record<string, CancerTypeData>;
}

export interface CancerDataMetadata {
  total_patients_treated_all_standards: number;
  total_breaches_all_standards: number;
  overall_performance_weighted: number;
  worst_performing_standard: {
    standard: string;
    performance_pct: number;
    breaches: number;
  };
  worst_performing_cancer_types: Array<{
    cancer_type: string;
    standard: string;
    performance_pct: number;
    breaches: number;
  }>;
  top_volume_cancer_types: Array<{
    cancer_type: string;
    total_treated: number;
  }>;
  data_quality: {
    missing_or_invalid_records: number;
    null_treatment_modalities: number;
    complete_data_pct: number;
  };
  last_updated: string;
  data_source: string;
  file_processed: string;
}

export interface CancerData {
  period: string;
  period_start: string;
  period_end: string;
  data_type: 'quarterly';
  months_covered: string[];
  standards: {
    '28_day_fds': CancerStandardData;
    '31_day_combined': CancerStandardData;
    '62_day_combined': CancerStandardData;
  };
  metadata: CancerDataMetadata;
}

export interface CancerPerformanceRow {
  cancerType: string;
  displayName: string;
  category: 'treated' | 'suspected';
  fds_28_treated: number | null;
  fds_28_performance: number | null;
  fds_28_breaches: number | null;
  day_31_treated: number;
  day_31_performance: number;
  day_31_breaches: number;
  day_62_treated: number;
  day_62_performance: number;
  day_62_breaches: number;
  total_treated_all_standards: number;
  total_breaches_all_standards: number;
  worst_standard: string;
}
```

**Cancer Type Display Names:**
```typescript
export const CANCER_TYPE_DISPLAY_NAMES: Record<string, string> = {
  'breast': 'Breast Cancer',
  'lung': 'Lung Cancer',
  'lower_gastrointestinal': 'Lower GI Cancer',
  'upper_gi_oesophagus_stomach': 'Upper GI (Oesophagus & Stomach)',
  'upper_gi_hepatobiliary': 'Upper GI (Hepatobiliary)',
  'gynaecological': 'Gynaecological Cancer',
  'head_neck': 'Head & Neck Cancer',
  'skin': 'Skin Cancer',
  'haematological_lymphoma': 'Haematological (Lymphoma)',
  'haematological_other': 'Haematological (Other)',
  'suspected_breast_cancer': 'Suspected Breast Cancer',
  'suspected_lung_cancer': 'Suspected Lung Cancer',
  // ... all cancer types
};
```

**File Location**: `src/types/cancer.ts`

#### Task 4.3: Data Transformers
**Objective**: Transform cancer JSONB to chart-ready formats

```typescript
// lib/cancer-data-transformers.ts

export function transformForStandardsChart(cancerData: CancerData): ChartDataPoint[] {
  return [
    {
      name: '28-day FDS',
      performance: cancerData.standards['28_day_fds'].summary.performance_pct,
      target: 75,
      treated: cancerData.standards['28_day_fds'].summary.total_treated,
      breaches: cancerData.standards['28_day_fds'].summary.breaches
    },
    {
      name: '31-day Combined',
      performance: cancerData.standards['31_day_combined'].summary.performance_pct,
      target: 96,
      treated: cancerData.standards['31_day_combined'].summary.total_treated,
      breaches: cancerData.standards['31_day_combined'].summary.breaches
    },
    {
      name: '62-day Combined',
      performance: cancerData.standards['62_day_combined'].summary.performance_pct,
      target: 85,
      treated: cancerData.standards['62_day_combined'].summary.total_treated,
      breaches: cancerData.standards['62_day_combined'].summary.breaches
    }
  ];
}

export function transformForCancerTypeChart(
  cancerData: CancerData,
  standard: string = '62_day_combined',
  limit: number = 10
): ChartDataPoint[] {
  const standardData = cancerData.standards[standard];
  
  return Object.entries(standardData.by_cancer_type)
    .map(([type, data]) => ({
      name: CANCER_TYPE_DISPLAY_NAMES[type] || type,
      performance: data.performance_pct,
      treated: data.total_treated,
      breaches: data.breaches,
      type: type
    }))
    .sort((a, b) => b.treated - a.treated) // Sort by volume
    .slice(0, limit);
}

export function transformForTrendChart(
  historicalData: CancerData[]
): ChartDataPoint[] {
  return historicalData.map(quarter => ({
    period: formatQuarterLabel(quarter.period),
    '28_day_performance': quarter.standards['28_day_fds'].summary.performance_pct,
    '31_day_performance': quarter.standards['31_day_combined'].summary.performance_pct,
    '62_day_performance': quarter.standards['62_day_combined'].summary.performance_pct
  }));
}

export function transformForPerformanceTable(
  cancerData: CancerData
): CancerPerformanceRow[] {
  const rows: CancerPerformanceRow[] = [];
  
  // Aggregate data across all standards for each cancer type
  const cancerTypes = new Set([
    ...Object.keys(cancerData.standards['28_day_fds'].by_cancer_type || {}),
    ...Object.keys(cancerData.standards['31_day_combined'].by_cancer_type || {}),
    ...Object.keys(cancerData.standards['62_day_combined'].by_cancer_type || {})
  ]);
  
  cancerTypes.forEach(type => {
    const fds28 = cancerData.standards['28_day_fds'].by_cancer_type[type];
    const day31 = cancerData.standards['31_day_combined'].by_cancer_type[type];
    const day62 = cancerData.standards['62_day_combined'].by_cancer_type[type];
    
    const row: CancerPerformanceRow = {
      cancerType: type,
      displayName: CANCER_TYPE_DISPLAY_NAMES[type] || type,
      category: type.startsWith('suspected_') ? 'suspected' : 'treated',
      
      fds_28_treated: fds28?.total_treated || null,
      fds_28_performance: fds28?.performance_pct || null,
      fds_28_breaches: fds28?.breaches || null,
      
      day_31_treated: day31?.total_treated || 0,
      day_31_performance: day31?.performance_pct || 0,
      day_31_breaches: day31?.breaches || 0,
      
      day_62_treated: day62?.total_treated || 0,
      day_62_performance: day62?.performance_pct || 0,
      day_62_breaches: day62?.breaches || 0,
      
      total_treated_all_standards: (fds28?.total_treated || 0) + 
                                     (day31?.total_treated || 0) + 
                                     (day62?.total_treated || 0),
      total_breaches_all_standards: (fds28?.breaches || 0) + 
                                      (day31?.breaches || 0) + 
                                      (day62?.breaches || 0),
      worst_standard: identifyWorstStandard(fds28, day31, day62)
    };
    
    rows.push(row);
  });
  
  return rows.sort((a, b) => b.total_treated_all_standards - a.total_treated_all_standards);
}

function identifyWorstStandard(fds28: any, day31: any, day62: any): string {
  const performances = [
    { name: '28-day FDS', perf: fds28?.performance_pct || 100 },
    { name: '31-day', perf: day31?.performance_pct || 100 },
    { name: '62-day', perf: day62?.performance_pct || 100 }
  ];
  
  return performances.sort((a, b) => a.perf - b.perf)[0].name;
}

function formatQuarterLabel(period: string): string {
  // "2025-Q1" -> "Q1 2025"
  const [year, quarter] = period.split('-');
  return `${quarter} ${year}`;
}
```

**File Location**: `src/lib/cancer-data-transformers.ts`

## Phase V: Styling & Polish (1-2 hours)

### Task 5.1: Consistent Visual Design
**Objective**: Match RTT Deep Dive and Community Health styling

**Color Palette:**
```css
/* Cancer performance colors */
--cancer-excellent: hsl(142, 76%, 36%);    /* Above target - Green */
--cancer-good: hsl(48, 96%, 53%);          /* Within 5% of target - Yellow */
--cancer-concern: hsl(38, 92%, 50%);       /* 5-10% below target - Amber */
--cancer-critical: hsl(0, 84%, 60%);       /* >10% below target - Red */

/* Standard-specific colors */
--standard-28day: hsl(217, 91%, 60%);      /* Blue */
--standard-31day: hsl(280, 79%, 57%);      /* Purple */
--standard-62day: hsl(0, 84%, 60%);        /* Red (most critical) */

/* Period indicator */
--quarterly-badge: hsl(38, 92%, 50%);      /* Amber - indicates quarterly data */
```

**Performance Color Logic:**
```typescript
function getPerformanceColor(performance: number, target: number): string {
  if (performance >= target) return 'var(--cancer-excellent)';
  if (performance >= target - 5) return 'var(--cancer-good)';
  if (performance >= target - 10) return 'var(--cancer-concern)';
  return 'var(--cancer-critical)';
}
```

### Task 5.2: Temporal Context Indicators
**Objective**: Clear labeling of quarterly vs monthly data

**Period Badge Component:**
```typescript
<Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
  <Calendar className="h-3 w-3 mr-1" />
  {formatQuarterPeriod(cancerData.period)}
  <Info className="h-3 w-3 ml-1" />
</Badge>

// Tooltip on hover
<Tooltip content={`Data covers ${cancerData.months_covered.join(', ')} ${cancerData.period_start.split('-')[0]}`}>
  ...
</Tooltip>
```

**Placement**: On all cancer-related components (KPI cards, charts, tables)

### Task 5.3: Loading & Error States
**Objective**: Handle quarterly data loading gracefully

**No Data State:**
```typescript
{!isLoading && !data && (
  <Card>
    <CardContent className="p-12 text-center">
      <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        No Cancer Performance Data Available
      </h3>
      <p className="text-sm text-slate-600">
        This trust has not reported cancer waiting times data for the selected quarter.
      </p>
      <p className="text-xs text-slate-500 mt-2">
        Cancer data is published every 6 months by NHS England
      </p>
    </CardContent>
  </Card>
)}
```

## Testing & Validation

### Test Cases

**Data Processing:**
- [ ] All 3 cancer files processed successfully
- [ ] Trust codes correctly mapped to names
- [ ] Quarterly periods correctly determined
- [ ] JSONB structure valid and complete
- [ ] Metadata calculations accurate

**Database Integration:**
- [ ] All trust-quarter records inserted
- [ ] No duplicate records
- [ ] JSONB queryable with expected structure
- [ ] Performance metrics accessible

**Frontend Display:**
- [ ] Cancer tab loads with all components
- [ ] KPI cards show correct values
- [ ] All 4 charts render accurately
- [ ] Performance table displays all cancer types
- [ ] Overview tab includes cancer issues

**Temporal Handling:**
- [ ] Quarterly periods clearly labeled
- [ ] Month-over-month trends work correctly
- [ ] Historical trend chart displays available quarters
- [ ] No confusion between quarterly and monthly data

**Cross-Trust Validation:**
- [ ] Test with high-performing trust
- [ ] Test with low-performing trust
- [ ] Test with limited cancer data
- [ ] Verify trust code mapping accuracy

### Performance Targets
- [ ] Cancer tab loads < 2 seconds
- [ ] Chart rendering < 500ms
- [ ] Database queries < 300ms
- [ ] Trust switching < 1 second

## Success Criteria

### Functional Requirements
- [ ] Cancer Performance tab fully operational
- [ ] All 3 standards visualized (28-day, 31-day, 62-day)
- [ ] Cancer types and routes accessible
- [ ] Treatment modality breakdowns available
- [ ] Quarterly trend analysis functional
- [ ] Overview tab includes cancer intelligence

### Data Requirements
- [ ] 3 historical files processed and integrated
- [ ] 146 R-code NHS trusts with cancer data
- [ ] ~9-12 months of quarterly data coverage
- [ ] Detailed nested JSONB structure implemented
- [ ] Metadata calculations accurate

### Business Value
- [ ] 62-day performance clearly highlighted (most critical)
- [ ] Worst-performing cancer types identified
- [ ] Breach patterns visible for opportunity identification
- [ ] Cross-correlation with RTT and diagnostics possible
- [ ] Quarterly reporting aligned with NHS publication cycle

## Implementation Timeline

**Week 1: Data Processing & Integration**
- Days 1-2: Historical file processing and trust mapping
- Days 3-4: Database integration and validation
- Day 5: Testing and quality assurance

**Week 2: Frontend Development**
- Days 1-2: Cancer tab structure and KPI cards
- Days 3-4: Charts and visualizations
- Day 5: Performance table and overview integration

**Week 3: Polish & Testing**
- Days 1-2: Styling consistency and temporal indicators
- Days 3-4: Comprehensive testing across trusts
- Day 5: Documentation and deployment

## Claude Code Execution Commands

```bash
# Phase I: Data Processing
claude-code execute --phase="cancer-data-processing" 
  --task="process-3-historical-files,trust-mapping,database-integration"
  --context="CWT-provider-extract-files"

# Phase II: Cancer Tab Development
claude-code execute --phase="cancer-performance-tab" 
  --task="create-tab,kpi-cards,4-charts,performance-table"
  --reference="rtt-deep-dive-community-health-design"

# Phase III: Overview Integration
claude-code execute --phase="overview-enhancements" 
  --task="critical-issues-table,cancer-alert-widget"
  --data-source="quarterly-cancer-data"

# Phase IV: Data Integration
claude-code execute --phase="data-layer" 
  --task="hooks,types,transformers"
  --structure="detailed-nested-jsonb"

# Phase V: Polish & Testing
claude-code execute --phase="finalization" 
  --task="styling,temporal-indicators,testing"
  --validate="comprehensive"
```

## Future Enhancements

**Phase VI: Advanced Analytics (Post-Launch)**
- Cancer pathway drill-downs (route and modality specific views)
- Correlation analysis: Cancer breaches vs diagnostic delays
- Predictive modeling: Identify trusts likely to miss standards
- Benchmark comparisons: Trust vs ICB vs national performance
- Alert system: Notify when standards deteriorate

**Phase VII: Data Automation**
- Automated 6-monthly cancer data ingestion
- Email notifications when new cancer data published
- Automatic database updates and validation
- Historical trend expansion as more data becomes available

## Critical Notes

**Temporal Awareness:**
- Cancer data is ALWAYS quarterly/6-monthly
- Never present as monthly data
- Clear period labels on all components
- Acknowledge limited historical depth

**Data Quality:**
- Some trusts may have incomplete cancer data
- Small patient numbers can skew percentages
- "Missing or Invalid" records should be flagged
- Treatment modality can be null for 28-day FDS

**Business Priority:**
- 62-day standard is most critical indicator
- Lung, Lower GI typically worst-performing
- High breaches = system under pressure = insourcing opportunity
- Cancer performance correlates with broader capacity issues

---

This plan integrates cancer data using the detailed nested JSONB structure as requested, providing comprehensive cancer intelligence while properly handling the quarterly temporal granularity.
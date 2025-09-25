#!/usr/bin/env python3
"""
Phase 2: Single Month Community Data Processing Pipeline
Build and test ETL pipeline with one month of community health data
"""

import os
import pandas as pd
import json
from datetime import datetime
from pathlib import Path
from supabase import create_client, Client

# Service name mappings from the plan
ADULT_SERVICE_MAPPING = {
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

CYP_SERVICE_MAPPING = {
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

def load_trust_mapping():
    """Load trust mapping from Phase 1"""
    with open("trust_mapping.json", "r") as f:
        mapping = json.load(f)

    # Create lookup dict for matched trusts
    matched_trusts = {trust["trust_code"]: trust for trust in mapping["matched_trusts"]}

    print(f"📋 Loaded trust mapping: {len(matched_trusts)} trusts to process")
    return matched_trusts

def extract_period_from_filename(filename):
    """Extract period date from filename with NHS financial year logic"""
    # Examples:
    # Community-health-services-waiting-lists-2024-25-January.xlsx -> 2025-01-01 (financial year logic)
    # Community-health-services-waiting-lists-2024-25-August.xlsx -> 2024-08-01

    import re

    try:
        # Extract year and month from filename
        match = re.search(r'(\d{4})-\d{2}-(\w+)\.xlsx$', filename)
        if not match:
            return "2024-07-01"  # Default fallback

        year_str = match.group(1)
        month_str = match.group(2)

        # Convert month name to number
        month_map = {
            "January": 1, "February": 2, "March": 3, "April": 4,
            "May": 5, "June": 6, "July": 7, "August": 8,
            "September": 9, "October": 10, "November": 11, "December": 12
        }

        if month_str not in month_map:
            return "2024-07-01"  # Default fallback

        # For NHS financial year, April-March spans two calendar years
        # Files named 2024-25 contain data from April 2024 to March 2025
        year = int(year_str)
        month = month_map[month_str]

        # Adjust year based on month for financial year
        if month >= 4:  # April-December: use first year
            period_year = year
        else:  # January-March: use second year
            period_year = year + 1

        return f"{period_year}-{month:02d}-01"

    except Exception as e:
        print(f"    ⚠️ Could not extract period from {filename}: {e}")
        return "2024-07-01"  # Default fallback

def read_community_tables(file_path):
    """Read all 8 community health tables (Table 4, 4a-4g) from Excel file"""

    tables = {}
    table_names = ['Table 4', 'Table 4a', 'Table 4b', 'Table 4c', 'Table 4d', 'Table 4e', 'Table 4f', 'Table 4g']

    print(f"  📖 Reading tables: {', '.join(table_names)}")

    for table_name in table_names:
        try:
            # Read table with proper header handling
            # Skip first 4 rows to get to the data (after header row)
            df = pd.read_excel(file_path, sheet_name=table_name, header=None, skiprows=5)
            df = df.reset_index(drop=True)

            tables[table_name] = df
            print(f"    ✅ {table_name}: {df.shape[0]} rows, {df.shape[1]} columns")

        except Exception as e:
            print(f"    ❌ Error reading {table_name}: {e}")
            tables[table_name] = None

    return tables

def extract_provider_data(tables, trust_codes):
    """Extract provider-level data for specified trust codes"""

    provider_data = {}

    if not tables['Table 4'] is None:
        # Get the base table to identify trust positions
        df_base = tables['Table 4']

        # Find provider rows (first column should contain 'Provider' or trust codes)
        trust_rows = {}

        for idx, row in df_base.iterrows():
            org_type = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
            org_code = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""

            # Look for trust codes in the second column when org_type is Provider
            if org_type == "Provider" and org_code in trust_codes:
                trust_rows[org_code] = idx

        print(f"    Found data for {len(trust_rows)} trusts")

        # Extract data for each trust from all tables
        for trust_code, row_idx in trust_rows.items():
            provider_data[trust_code] = {}

            # Process each table
            for table_name, df in tables.items():
                if df is not None and row_idx < len(df):
                    # Get the row data for this trust
                    row_data = df.iloc[row_idx].values[3:]  # Skip org_type, org_code, org_name columns
                    provider_data[trust_code][table_name] = row_data.tolist()

    return provider_data

def get_service_names(file_path):
    """Extract service names from the header of Table 4 with robust row detection"""

    try:
        # Read the header rows to get service names (increased to 10 rows to be safe)
        df_header = pd.read_excel(file_path, sheet_name='Table 4', header=None, nrows=10)

        # Find the row that contains service names by looking for (A) and (CYP) patterns
        service_header_row = None
        for row_idx in range(df_header.shape[0]):
            row_data = df_header.iloc[row_idx].astype(str)

            # Look for service patterns - should have both (A) and (CYP) services
            adult_services = row_data.str.contains(r'\(A\)', na=False).sum()
            cyp_services = row_data.str.contains(r'\(CYP\)', na=False).sum()

            if adult_services >= 10 and cyp_services >= 5:  # Should have many services
                service_header_row = row_idx
                break

        if service_header_row is None:
            print(f"    ❌ Could not find service header row")
            return []

        # Service names are in the detected row, starting from column 3
        # Row structure: ['Organisation Type', 'Organisation Code', 'Organisation Name', service1, service2, ...]
        service_row = df_header.iloc[service_header_row].values[3:]  # Skip first 3 columns (org type, code, name)

        # Clean up service names
        services = []
        for service in service_row:
            if pd.notna(service) and str(service).strip() != '':
                services.append(str(service).strip())

        print(f"    Extracted {len(services)} service names")
        if len(services) > 0:
            print(f"    Sample services: {services[:5]}")
        return services

    except Exception as e:
        print(f"    ⚠️ Could not extract service names: {e}")
        return []

def consolidate_trust_data(trust_code, provider_data, services):
    """Consolidate data from 8 tables into JSONB structure for one trust"""

    if trust_code not in provider_data:
        return None

    trust_data = provider_data[trust_code]

    # Initialize the structure
    community_data = {
        "adult_services": {},
        "cyp_services": {},
        "metadata": {
            "services_reported": 0,
            "total_waiting_all_services": 0,
            "services_with_52plus_breaches": 0,
            "last_updated": datetime.now().isoformat()
        }
    }

    # Process each service
    total_waiting = 0
    services_count = 0
    breaches_52plus = 0

    for idx, service_name in enumerate(services):
        if idx >= len(trust_data.get('Table 4', [])):
            continue

        # Get wait time data from all tables
        total_waiting_val = trust_data.get('Table 4', [])[idx] if idx < len(trust_data.get('Table 4', [])) else None
        wait_0_1 = trust_data.get('Table 4a', [])[idx] if idx < len(trust_data.get('Table 4a', [])) else None
        wait_1_2 = trust_data.get('Table 4b', [])[idx] if idx < len(trust_data.get('Table 4b', [])) else None
        wait_2_4 = trust_data.get('Table 4c', [])[idx] if idx < len(trust_data.get('Table 4c', [])) else None
        wait_4_12 = trust_data.get('Table 4d', [])[idx] if idx < len(trust_data.get('Table 4d', [])) else None
        wait_12_18 = trust_data.get('Table 4e', [])[idx] if idx < len(trust_data.get('Table 4e', [])) else None
        wait_18_52 = trust_data.get('Table 4f', [])[idx] if idx < len(trust_data.get('Table 4f', [])) else None
        wait_52plus = trust_data.get('Table 4g', [])[idx] if idx < len(trust_data.get('Table 4g', [])) else None

        # Skip if no total waiting data
        if pd.isna(total_waiting_val) or str(total_waiting_val).strip() == '':
            continue

        try:
            total_waiting_int = int(float(total_waiting_val))
            if total_waiting_int <= 0:
                continue
        except:
            continue

        # Convert values to integers, handling NaN and empty strings
        def safe_int(val):
            if pd.isna(val) or str(val).strip() == '':
                return 0
            try:
                return int(float(val))
            except:
                return 0

        # Build service data
        service_data = {
            "total_waiting": total_waiting_int,
            "wait_0_1_weeks": safe_int(wait_0_1),
            "wait_1_2_weeks": safe_int(wait_1_2),
            "wait_2_4_weeks": safe_int(wait_2_4),
            "wait_4_12_weeks": safe_int(wait_4_12),
            "wait_12_18_weeks": safe_int(wait_12_18),
            "wait_18_52_weeks": safe_int(wait_18_52),
            "wait_52_plus_weeks": safe_int(wait_52plus)
        }

        # Map service name to database key
        service_key = None
        if service_name in ADULT_SERVICE_MAPPING:
            service_key = ADULT_SERVICE_MAPPING[service_name]
            community_data["adult_services"][service_key] = service_data
        elif service_name in CYP_SERVICE_MAPPING:
            service_key = CYP_SERVICE_MAPPING[service_name]
            community_data["cyp_services"][service_key] = service_data

        if service_key:
            services_count += 1
            total_waiting += total_waiting_int
            if service_data["wait_52_plus_weeks"] > 0:
                breaches_52plus += 1

    # Update metadata
    community_data["metadata"]["services_reported"] = services_count
    community_data["metadata"]["total_waiting_all_services"] = total_waiting
    community_data["metadata"]["services_with_52plus_breaches"] = breaches_52plus

    return community_data

def init_supabase():
    """Initialize Supabase client"""

    # Load environment variables
    with open("hooks/.env", "r") as f:
        env_content = f.read()

    url = None
    key = None

    for line in env_content.split('\n'):
        if line.startswith('SUPABASE_URL='):
            url = line.split('=', 1)[1]
        elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            key = line.split('=', 1)[1]

    if not url or not key:
        raise Exception("Could not find Supabase credentials in hooks/.env")

    return create_client(url, key)

def update_trust_metrics(supabase: Client, trust_code, period, community_data):
    """Update community_health_data field in trust_metrics table"""

    try:
        # Note: The column is actually called community_health_data in the database
        result = supabase.table('trust_metrics').update({
            'community_health_data': community_data,
            'updated_at': datetime.now().isoformat()
        }).eq('trust_code', trust_code).eq('period', period).eq('data_type', 'monthly').execute()

        if result.data:
            print(f"    ✅ Updated {trust_code} for {period}")
            return True
        else:
            print(f"    ⚠️ No existing record found for {trust_code} {period}")
            return False

    except Exception as e:
        print(f"    ❌ Database error for {trust_code}: {e}")
        return False

def process_single_month(file_path, matched_trusts):
    """Process a single month of community data"""

    filename = Path(file_path).name
    print(f"\n🔄 Processing: {filename}")

    # Extract period
    period = extract_period_from_filename(filename)
    print(f"  📅 Period: {period}")

    # Read all tables
    tables = read_community_tables(file_path)

    # Extract service names
    services = get_service_names(file_path)

    # Extract provider data
    provider_data = extract_provider_data(tables, matched_trusts.keys())

    # Initialize Supabase
    supabase = init_supabase()

    # Process each trust
    results = {
        "period": period,
        "processed_trusts": [],
        "failed_trusts": [],
        "total_services_processed": 0
    }

    print(f"  🏥 Processing {len(provider_data)} trusts...")

    for trust_code in provider_data:
        print(f"    Processing {trust_code}...")

        # Consolidate data
        community_data = consolidate_trust_data(trust_code, provider_data, services)

        if community_data:
            # Update database
            success = update_trust_metrics(supabase, trust_code, period, community_data)

            if success:
                results["processed_trusts"].append({
                    "trust_code": trust_code,
                    "services_count": community_data["metadata"]["services_reported"],
                    "total_waiting": community_data["metadata"]["total_waiting_all_services"]
                })
                results["total_services_processed"] += community_data["metadata"]["services_reported"]
            else:
                results["failed_trusts"].append(trust_code)
        else:
            results["failed_trusts"].append(trust_code)
            print(f"    ⚠️ No valid data found for {trust_code}")

    return results

def main():
    print("🏥 NHS Community Data Single Month Processor - Phase 2")
    print("=" * 60)

    # Load trust mapping from Phase 1
    matched_trusts = load_trust_mapping()

    # Process one test file (July 2025)
    test_file = "Data/Community-health-services-waiting-lists-2025-26-July.xlsx"

    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        return

    # Process the file
    results = process_single_month(test_file, matched_trusts)

    # Save results
    with open("single_month_processing_results.json", "w") as f:
        json.dump(results, f, indent=2)

    # Print summary
    print(f"\n🎯 Phase 2 Complete!")
    print(f"  Period processed: {results['period']}")
    print(f"  Successful trusts: {len(results['processed_trusts'])}")
    print(f"  Failed trusts: {len(results['failed_trusts'])}")
    print(f"  Total services processed: {results['total_services_processed']}")

    if results['failed_trusts']:
        print(f"  Failed trust codes: {', '.join(results['failed_trusts'])}")

    print(f"  📄 Results saved to: single_month_processing_results.json")

if __name__ == "__main__":
    main()
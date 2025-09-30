#!/usr/bin/env python3
"""
Cancer Data Processing Script - Phase I Implementation
Process NHS Cancer Waiting Times (CWT) data and integrate into Supabase database
"""

import pandas as pd
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
import traceback
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://fsopilxzaaukmcqcskqm.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk5MzYzNywiZXhwIjoyMDczNTY5NjM3fQ.mDtWXZo-U4lyM-A73qCICQRDP5qOw7nc9ZOF2YcDagg"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Cancer type mapping (Excel format -> Database key)
CANCER_TYPE_MAPPING = {
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

# Route mapping
ROUTE_MAPPING = {
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

# Treatment modality mapping
MODALITY_MAPPING = {
    "Surgery": "surgery",
    "Anti-cancer drug regimen": "anti_cancer_drug_regimen",
    "Radiotherapy": "radiotherapy",
    "Other": "other",
    "ALL MODALITIES": "all_modalities"
}

# Standard mapping
STANDARD_MAPPING = {
    "28-day FDS": "28_day_fds",
    "31-day Combined": "31_day_combined",
    "62-day Combined": "62_day_combined"
}

class CancerDataProcessor:
    def __init__(self):
        self.trust_mapping = self._load_trust_mapping()
        print(f"Loaded {len(self.trust_mapping)} trust mappings from database")

    def _load_trust_mapping(self) -> Dict[str, str]:
        """Load trust code to trust name mapping from database"""
        try:
            response = supabase.table('trust_metrics').select('trust_code, trust_name').execute()

            mapping = {}
            for record in response.data:
                trust_code = record.get('trust_code')
                trust_name = record.get('trust_name')
                if trust_code and trust_name:
                    mapping[trust_code] = trust_name

            return mapping
        except Exception as e:
            print(f"Error loading trust mapping: {e}")
            return {}

    def get_month_to_date_mapping(self) -> Dict[str, str]:
        """Map month abbreviations to MM-DD format"""
        return {
            'JAN': '01-01', 'FEB': '02-01', 'MAR': '03-01',
            'APR': '04-01', 'MAY': '05-01', 'JUN': '06-01',
            'JUL': '07-01', 'AUG': '08-01', 'SEP': '09-01',
            'OCT': '10-01', 'NOV': '11-01', 'DEC': '12-01'
        }

    def get_month_last_day(self, month: str, year: int) -> str:
        """Get the last day of a month"""
        last_days = {
            'JAN': '31', 'FEB': '28', 'MAR': '31', 'APR': '30',
            'MAY': '31', 'JUN': '30', 'JUL': '31', 'AUG': '31',
            'SEP': '30', 'OCT': '31', 'NOV': '30', 'DEC': '31'
        }
        # Handle leap years for February
        if month == 'FEB' and (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)):
            return '29'
        return last_days[month]

    def calculate_performance(self, df: pd.DataFrame) -> float:
        """Calculate performance percentage from dataframe"""
        total_treated = df['TOTAL TREATED'].sum()
        if total_treated == 0:
            return 0.0
        within_standard = df['WITHIN STANDARD'].sum()
        return round((within_standard / total_treated) * 100, 1)

    def calculate_period_end(self, period_start: str) -> str:
        """Calculate period end date (last day of month)"""
        start_date = datetime.strptime(period_start, '%Y-%m-%d')

        # Calculate last day of the same month
        if start_date.month == 12:
            end_date = start_date.replace(day=31)
        else:
            # Get first day of next month, then subtract 1 day
            next_month = start_date.replace(month=start_date.month + 1, day=1)
            end_date = next_month - timedelta(days=1)

        return end_date.strftime('%Y-%m-%d')

    def build_cancer_jsonb(self, df: pd.DataFrame, period_start: str, period_end: str, month: str) -> Dict:
        """Build detailed nested JSONB structure from trust data for a single month"""

        jsonb = {
            'period': period_start[:7],  # YYYY-MM format
            'period_start': period_start,
            'period_end': period_end,
            'data_type': 'monthly',
            'month': month,
            'standards': {},
            'metadata': {}
        }

        # Process each standard
        for standard in ['28-day FDS', '31-day Combined', '62-day Combined']:
            standard_key = STANDARD_MAPPING[standard]
            standard_df = df[df['STANDARD'] == standard]

            if standard_df.empty:
                continue

            # Calculate summary for this standard
            summary = {
                'total_treated': float(standard_df['TOTAL TREATED'].sum()),
                'within_standard': float(standard_df['WITHIN STANDARD'].sum()),
                'breaches': float(standard_df['BREACHES'].sum()),
                'performance_pct': self.calculate_performance(standard_df)
            }

            jsonb['standards'][standard_key] = {
                'summary': summary,
                'by_cancer_type': {}
            }

            # Process by cancer type
            for cancer_type in standard_df['CANCER TYPE'].unique():
                if pd.isna(cancer_type):
                    continue

                cancer_key = CANCER_TYPE_MAPPING.get(cancer_type, cancer_type.lower().replace(' ', '_'))
                cancer_df = standard_df[standard_df['CANCER TYPE'] == cancer_type]

                cancer_data = {
                    'total_treated': float(cancer_df['TOTAL TREATED'].sum()),
                    'within_standard': float(cancer_df['WITHIN STANDARD'].sum()),
                    'breaches': float(cancer_df['BREACHES'].sum()),
                    'performance_pct': self.calculate_performance(cancer_df),
                    'by_route': {}
                }

                # Process by route
                for route in cancer_df['STAGE/ROUTE'].unique():
                    if pd.isna(route):
                        continue

                    route_key = ROUTE_MAPPING.get(route, route.lower().replace(' ', '_'))
                    route_df = cancer_df[cancer_df['STAGE/ROUTE'] == route]

                    route_data = {
                        'total_treated': float(route_df['TOTAL TREATED'].sum()),
                        'within_standard': float(route_df['WITHIN STANDARD'].sum()),
                        'breaches': float(route_df['BREACHES'].sum()),
                        'performance_pct': self.calculate_performance(route_df)
                    }

                    # For 31-day and 62-day, add treatment modality breakdown
                    if standard != '28-day FDS':
                        route_data['by_treatment_modality'] = {}

                        for modality in route_df['TREATMENT MODALITY'].unique():
                            if pd.isna(modality):
                                continue

                            modality_key = MODALITY_MAPPING.get(modality, modality.lower().replace(' ', '_'))
                            modality_df = route_df[route_df['TREATMENT MODALITY'] == modality]

                            route_data['by_treatment_modality'][modality_key] = {
                                'total_treated': float(modality_df['TOTAL TREATED'].sum()),
                                'within_standard': float(modality_df['WITHIN STANDARD'].sum()),
                                'breaches': float(modality_df['BREACHES'].sum()),
                                'performance_pct': self.calculate_performance(modality_df)
                            }

                    cancer_data['by_route'][route_key] = route_data

                jsonb['standards'][standard_key]['by_cancer_type'][cancer_key] = cancer_data

        # Calculate metadata
        jsonb['metadata'] = self.calculate_metadata(df, jsonb)

        return jsonb

    def calculate_metadata(self, df: pd.DataFrame, jsonb: Dict) -> Dict:
        """Calculate metadata for the cancer data"""

        # Overall totals
        total_treated = float(df['TOTAL TREATED'].sum())
        total_breaches = float(df['BREACHES'].sum())

        # Calculate weighted overall performance
        weights = {'28_day_fds': 0.2, '31_day_combined': 0.3, '62_day_combined': 0.5}
        weighted_sum = 0
        total_weight = 0

        for standard, weight in weights.items():
            if standard in jsonb['standards']:
                perf = jsonb['standards'][standard]['summary']['performance_pct']
                weighted_sum += perf * weight
                total_weight += weight

        overall_performance = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0

        # Find worst performing standard
        worst_standard = None
        worst_performance = 100
        for standard_key, data in jsonb['standards'].items():
            perf = data['summary']['performance_pct']
            if perf < worst_performance:
                worst_performance = perf
                worst_standard = standard_key

        # Find worst performing cancer types
        worst_cancer_types = []
        for standard_key, standard_data in jsonb['standards'].items():
            for cancer_type, cancer_data in standard_data['by_cancer_type'].items():
                worst_cancer_types.append({
                    'cancer_type': cancer_type,
                    'standard': standard_key.replace('_', '-').title(),
                    'performance_pct': cancer_data['performance_pct'],
                    'breaches': cancer_data['breaches']
                })

        # Sort and take top 3 worst
        worst_cancer_types.sort(key=lambda x: x['performance_pct'])
        worst_cancer_types = worst_cancer_types[:3]

        # Top volume cancer types
        volume_types = []
        for standard_key, standard_data in jsonb['standards'].items():
            for cancer_type, cancer_data in standard_data['by_cancer_type'].items():
                volume_types.append({
                    'cancer_type': cancer_type,
                    'total_treated': cancer_data['total_treated']
                })

        # Remove duplicates and sort by volume
        volume_dict = {}
        for item in volume_types:
            cancer_type = item['cancer_type']
            if cancer_type not in volume_dict:
                volume_dict[cancer_type] = 0
            volume_dict[cancer_type] += item['total_treated']

        top_volume = [{'cancer_type': k, 'total_treated': v} for k, v in volume_dict.items()]
        top_volume.sort(key=lambda x: x['total_treated'], reverse=True)
        top_volume = top_volume[:3]

        metadata = {
            'total_patients_treated_all_standards': total_treated,
            'total_breaches_all_standards': total_breaches,
            'overall_performance_weighted': overall_performance,
            'worst_performing_standard': {
                'standard': worst_standard.replace('_', '-').title() if worst_standard else 'Unknown',
                'performance_pct': worst_performance,
                'breaches': jsonb['standards'][worst_standard]['summary']['breaches'] if worst_standard else 0
            },
            'worst_performing_cancer_types': worst_cancer_types,
            'top_volume_cancer_types': top_volume,
            'data_quality': {
                'missing_or_invalid_records': len(df[df['CANCER TYPE'].str.contains('Missing|Invalid', na=False)]),
                'null_treatment_modalities': len(df[pd.isna(df['TREATMENT MODALITY'])]),
                'complete_data_pct': round((len(df) - len(df[pd.isna(df['TOTAL TREATED'])])) / len(df) * 100, 1)
            },
            'last_updated': datetime.now().isoformat(),
            'data_source': 'NHS Cancer Waiting Times Provider Extract',
            'file_processed': 'Unknown'  # Will be set by caller
        }

        return metadata

    def process_cancer_file(self, file_path: str) -> Dict[str, List[Dict]]:
        """
        Process single cancer CWT Provider Extract file.
        Returns: dict of {trust_code: [list of monthly cancer_data_jsonb]}
        """
        print(f"\nProcessing file: {os.path.basename(file_path)}")

        try:
            # Read Excel file - try different sheet names
            sheet_names_to_try = [
                'CWT CRS Provider Extract',
                'Sheet1',
                'Data',
                'CWT Data'
            ]

            df = None
            for sheet_name in sheet_names_to_try:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name)
                    print(f"Successfully read sheet: {sheet_name}")
                    break
                except:
                    continue

            if df is None:
                # Try reading first sheet
                df = pd.read_excel(file_path)
                print("Read first sheet (default)")

            print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

            # Get unique periods (already in YYYY-MM-DD format from Excel)
            unique_periods = df['PERIOD'].unique()
            print(f"Found {len(unique_periods)} unique periods in file")

            # Process by period, then by trust
            trust_data = {}

            for period_timestamp in unique_periods:
                if pd.isna(period_timestamp):
                    continue

                # Convert timestamp to string date
                period_date = pd.to_datetime(period_timestamp).strftime('%Y-%m-%d')
                period_month = pd.to_datetime(period_timestamp).strftime('%b').upper()
                period_end = self.calculate_period_end(period_date)

                print(f"\nProcessing period: {period_date} ({period_month})")

                # Filter data for this period
                period_df = df[df['PERIOD'] == period_timestamp]

                # Get trust codes for this period
                trust_codes = period_df['ORG CODE'].unique()
                r_trust_codes = [code for code in trust_codes if str(code).startswith('R')]

                for trust_code in r_trust_codes:
                    if pd.isna(trust_code):
                        continue

                    trust_df = period_df[period_df['ORG CODE'] == trust_code]

                    if trust_df.empty:
                        continue

                    # Build nested JSONB structure for this month
                    cancer_jsonb = self.build_cancer_jsonb(
                        trust_df,
                        period_date,
                        period_end,
                        period_month
                    )

                    # Add filename to metadata
                    cancer_jsonb['metadata']['file_processed'] = os.path.basename(file_path)

                    # Store by trust
                    if trust_code not in trust_data:
                        trust_data[trust_code] = []

                    trust_data[trust_code].append({
                        'period': period_date,
                        'data': cancer_jsonb
                    })

            print(f"\nSuccessfully processed {len(trust_data)} trusts across {len(unique_periods)} periods")
            return trust_data

        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
            traceback.print_exc()
            return {}

    def get_trust_name(self, org_code: str) -> str:
        """Get trust name from org code, with fallback"""
        return self.trust_mapping.get(org_code, f"Unknown Trust ({org_code})")

    def load_to_database(self, trust_cancer_data: Dict[str, List[Dict]]) -> None:
        """Load cancer data for all trusts and months into database"""

        success_count = 0
        error_count = 0

        for trust_code, monthly_data in trust_cancer_data.items():
            trust_name = self.get_trust_name(trust_code)

            for month_data in monthly_data:
                period = month_data['period']
                cancer_jsonb = month_data['data']

                try:
                    # Upsert to database
                    result = supabase.table('trust_metrics').upsert({
                        'trust_code': trust_code,
                        'trust_name': trust_name,
                        'period': period,
                        'data_type': 'monthly',
                        'cancer_data': cancer_jsonb,
                        'updated_at': datetime.now().isoformat()
                    }, on_conflict='trust_code,period,data_type').execute()

                    print(f"✓ Loaded {trust_code} {period}")
                    success_count += 1

                except Exception as e:
                    print(f"✗ Failed to load {trust_code} {period}: {e}")
                    error_count += 1

        print(f"\nDatabase loading complete: {success_count} success, {error_count} errors")

    def run_validation_queries(self) -> None:
        """Run validation queries to verify data integration"""

        print("\n" + "="*50)
        print("VALIDATION REPORT")
        print("="*50)

        try:
            # Check cancer data coverage
            coverage = supabase.table('trust_metrics').select(
                'trust_code',
                'period',
                'cancer_data'
            ).eq('data_type', 'monthly').neq('cancer_data', 'null').execute()

            trust_count = len(set(record['trust_code'] for record in coverage.data))
            month_count = len(set(record['period'] for record in coverage.data))
            total_records = len(coverage.data)

            print(f"Cancer Data Coverage:")
            print(f"- Trusts with cancer data: {trust_count}")
            print(f"- Months covered: {month_count}")
            print(f"- Total records: {total_records}")

            # Sample cancer data
            print(f"\nSample Cancer Data:")
            sample = supabase.table('trust_metrics').select(
                'trust_code',
                'trust_name',
                'period',
                'cancer_data->metadata->total_patients_treated_all_standards',
                'cancer_data->metadata->overall_performance_weighted'
            ).neq('cancer_data', 'null').limit(5).execute()

            for record in sample.data:
                total_treated = record.get('cancer_data', {}).get('metadata', {}).get('total_patients_treated_all_standards', 0)
                performance = record.get('cancer_data', {}).get('metadata', {}).get('overall_performance_weighted', 0)
                print(f"- {record['trust_code']} ({record['period']}): {total_treated} patients, {performance}% performance")

            # Check 62-day performance
            print(f"\nWorst 62-day Performance:")
            performance_query = supabase.table('trust_metrics').select(
                'trust_code',
                'period',
                'cancer_data->standards->62_day_combined->summary->performance_pct'
            ).neq('cancer_data', 'null').limit(10).execute()

            performance_data = []
            for record in performance_query.data:
                cancer_data = record.get('cancer_data', {})
                standards = cancer_data.get('standards', {})
                day_62 = standards.get('62_day_combined', {})
                summary = day_62.get('summary', {})
                perf = summary.get('performance_pct', 0)

                if perf > 0:
                    performance_data.append({
                        'trust_code': record['trust_code'],
                        'period': record['period'],
                        'performance': perf
                    })

            # Sort by performance
            performance_data.sort(key=lambda x: x['performance'])

            for item in performance_data[:5]:
                print(f"- {item['trust_code']} ({item['period']}): {item['performance']}%")

        except Exception as e:
            print(f"Error running validation: {e}")
            traceback.print_exc()


def main():
    """Main execution function"""
    print("NHS Cancer Data Processing - Phase I")
    print("="*50)

    processor = CancerDataProcessor()

    # File paths
    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"
    cancer_files = [
        "CWT-CRS-Apr-2024-to-Sep-2024-Data-Extract-Provider-Final.xlsx",
        "CWT-CRS-Oct-2024-to-Mar-2025-Data-Extract-Provider.xlsx",
        "CWT-CRS-Apr-2025-to-Jul-2025-Data-Extract-Provider.xlsx"
    ]

    # Process all files
    all_trust_data = {}

    for filename in cancer_files:
        file_path = os.path.join(data_dir, filename)

        if not os.path.exists(file_path):
            print(f"Warning: File not found: {file_path}")
            continue

        trust_data = processor.process_cancer_file(file_path)

        # Merge into combined dataset
        for trust_code, monthly_data_list in trust_data.items():
            if trust_code not in all_trust_data:
                all_trust_data[trust_code] = []
            # monthly_data_list is already a list, so extend instead of append
            all_trust_data[trust_code].extend(monthly_data_list)

    # Report processing results
    print(f"\n" + "="*50)
    print(f"PROCESSING SUMMARY")
    print(f"="*50)
    print(f"Total trusts processed: {len(all_trust_data)}")
    total_months = sum(len(monthly_records) for monthly_records in all_trust_data.values())
    print(f"Total trust-month records: {total_months}")

    # Load to database
    print(f"\nLoading data to Supabase...")
    processor.load_to_database(all_trust_data)

    # Run validation
    processor.run_validation_queries()

    print(f"\nPhase I processing complete!")


if __name__ == "__main__":
    main()
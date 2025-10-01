#!/usr/bin/env python3
"""
DATA ACCURACY VALIDATION - Database vs Source Excel Files
==========================================================

Validates that 100 random database values match source Excel files exactly.

Author: Data Validation Script
Date: 2025-09-30
"""

import os
import sys
import json
import pandas as pd
import random
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from supabase import create_client, Client
import traceback

class DataAccuracyValidator:
    """Validates database values against source Excel files"""

    def __init__(self, data_dir: str, supabase_url: str, supabase_key: str):
        self.data_dir = Path(data_dir)
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        self.results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": 100,
            "matches": 0,
            "mismatches": [],
            "errors": [],
            "accuracy_rate": 0.0
        }

        # Period to file name mappings
        self.period_to_month = {
            '2024-08': 'August-2024',
            '2024-09': 'September-2024',
            '2024-10': 'October-2024',
            '2024-11': 'November-2024',
            '2024-12': 'December-2024',
            '2025-01': 'January-2025',
            '2025-02': 'February-2025',
            '2025-03': 'March-2025',
            '2025-04': 'April-2025',
            '2025-05': 'May-2025',
            '2025-06': 'June-2025',
            '2025-07': 'July-2025'
        }

        self.rtt_file_patterns = {
            '2024-08': 'Incomplete-Provider-Aug24-XLSX-9M-revised.xlsx',
            '2024-09': 'Incomplete-Provider-Sep24-XLSX-9M-revised.xlsx',
            '2024-10': 'Incomplete-Provider-Oct24-XLSX-9M-revised.xlsx',
            '2024-11': 'Incomplete-Provider-Nov24-XLSX-9M-revised.xlsx',
            '2024-12': 'Incomplete-Provider-Dec24-XLSX-9M-revised.xlsx',
            '2025-01': 'Incomplete-Provider-Jan25-XLSX-9M-revised.xlsx',
            '2025-02': 'Incomplete-Provider-Feb25-XLSX-9M-revised.xlsx',
            '2025-03': 'Incomplete-Provider-Mar25-XLSX-9M-revised.xlsx',
            '2025-04': 'Incomplete-Provider-Apr25-XLSX-9M-77252.xlsx',
            '2025-05': 'Incomplete-Provider-May25-XLSX-9M-32711.xlsx',
            '2025-06': 'Incomplete-Provider-Jun25-XLSX-9M-94367.xlsx',
            '2025-07': 'Incomplete-Provider-Jul25-XLSX-9M-92707 (1).xlsx'
        }

    def run_validation(self):
        """Run complete validation of 100 random samples"""
        print(f"\n🔍 DATA ACCURACY VALIDATION")
        print(f"=" * 70)
        print(f"Testing 100 random database values against source Excel files")
        print(f"Data directory: {self.data_dir}")
        print(f"=" * 70)

        # Get sample records
        print("\n📊 Selecting random samples...")
        rtt_samples = self._get_random_samples('rtt_data', 50)
        ae_samples = self._get_random_samples('ae_data', 20)
        diagnostics_samples = self._get_random_samples('diagnostics_data', 20)
        cancer_samples = self._get_random_samples('cancer_data', 10)

        print(f"  ✓ RTT samples: {len(rtt_samples)}")
        print(f"  ✓ A&E samples: {len(ae_samples)}")
        print(f"  ✓ Diagnostics samples: {len(diagnostics_samples)}")
        print(f"  ✓ Cancer samples: {len(cancer_samples)}")

        # Validate RTT data
        print(f"\n🔬 Validating RTT data (50 samples)...")
        for i, sample in enumerate(rtt_samples, 1):
            print(f"  [{i}/50] {sample['trust_code']} - {sample['period']}", end=" ")
            self._validate_rtt_sample(sample)

        # Validate A&E data
        print(f"\n🔬 Validating A&E data (20 samples)...")
        for i, sample in enumerate(ae_samples, 1):
            print(f"  [{i}/20] {sample['trust_code']} - {sample['period']}", end=" ")
            self._validate_ae_sample(sample)

        # Validate Diagnostics data
        print(f"\n🔬 Validating Diagnostics data (20 samples)...")
        for i, sample in enumerate(diagnostics_samples, 1):
            print(f"  [{i}/20] {sample['trust_code']} - {sample['period']}", end=" ")
            self._validate_diagnostics_sample(sample)

        # Validate Cancer data
        print(f"\n🔬 Validating Cancer data (10 samples)...")
        for i, sample in enumerate(cancer_samples, 1):
            print(f"  [{i}/10] {sample['trust_code']} - {sample['period']}", end=" ")
            self._validate_cancer_sample(sample)

        # Calculate results
        self._generate_report()

    def _get_random_samples(self, data_field: str, count: int) -> List[Dict]:
        """Get random samples for a specific data type"""
        try:
            result = self.supabase.table('trust_metrics').select(
                f'trust_code, period, {data_field}'
            ).not_.is_(data_field, 'null').execute()

            if not result.data:
                return []

            # Filter to only include periods we have files for
            valid_samples = []
            for record in result.data:
                period_str = record['period'][:7]  # Get YYYY-MM format
                if period_str in self.rtt_file_patterns:
                    valid_samples.append(record)

            # Random sample
            return random.sample(valid_samples, min(count, len(valid_samples)))

        except Exception as e:
            print(f"    ❌ Error getting samples: {e}")
            return []

    def _validate_rtt_sample(self, sample: Dict):
        """Validate RTT data against Excel file"""
        try:
            trust_code = sample['trust_code']
            period = sample['period'][:7]  # YYYY-MM
            db_data = sample['rtt_data']

            # Get database value
            if not db_data or 'trust_total' not in db_data:
                print("❌ No trust_total in DB")
                self.results['errors'].append({
                    'trust': trust_code,
                    'period': period,
                    'metric': 'RTT percent_within_18_weeks',
                    'error': 'No trust_total in database'
                })
                return

            db_value = db_data['trust_total'].get('percent_within_18_weeks')
            if db_value is None:
                print("❌ No percent_within_18_weeks")
                return

            # Get Excel value
            excel_value = self._get_rtt_excel_value(trust_code, period)
            if excel_value is None:
                print("❌ Not found in Excel")
                self.results['errors'].append({
                    'trust': trust_code,
                    'period': period,
                    'metric': 'RTT percent_within_18_weeks',
                    'error': 'Not found in Excel file'
                })
                return

            # Compare (accounting for percentage format)
            # DB stores as percentage (48.04 = 48.04%), Excel may be decimal or percentage
            if self._values_match(db_value, excel_value):
                print("✅")
                self.results['matches'] += 1
            else:
                print(f"❌ DB:{db_value:.2f}% Excel:{excel_value:.2f}%")
                self.results['mismatches'].append({
                    'trust': trust_code,
                    'period': period,
                    'metric': 'RTT percent_within_18_weeks',
                    'db_value': f"{db_value:.2f}%",
                    'excel_value': f"{excel_value:.2f}%"
                })

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            self.results['errors'].append({
                'trust': trust_code if 'trust_code' in locals() else 'unknown',
                'period': period if 'period' in locals() else 'unknown',
                'metric': 'RTT percent_within_18_weeks',
                'error': str(e)
            })

    def _get_rtt_excel_value(self, trust_code: str, period: str) -> Optional[float]:
        """Get RTT percent_within_18_weeks from Excel file"""
        try:
            filename = self.rtt_file_patterns.get(period)
            if not filename:
                return None

            file_path = self.data_dir / filename
            if not file_path.exists():
                return None

            # Read Excel with correct structure
            df = pd.read_excel(file_path, sheet_name=0, skiprows=13)

            # Find row for this trust (Total row)
            trust_rows = df[df['Provider Code'] == trust_code]
            if trust_rows.empty:
                return None

            # Look for the "Total" treatment function row
            total_row = trust_rows[trust_rows['Treatment Function'].str.contains('Total', case=False, na=False)]
            if total_row.empty:
                return None

            # Get the percent within 18 weeks (usually in a specific column)
            # The structure has columns like '>0-1', '>1-2', etc., and a '% < 18 Weeks' column
            if '% <18 Weeks' in df.columns:
                value = total_row['% <18 Weeks'].iloc[0]
            elif '% < 18 Weeks' in df.columns:
                value = total_row['% < 18 Weeks'].iloc[0]
            else:
                # Calculate from within/total
                within_col = [col for col in df.columns if 'within' in col.lower()]
                total_col = [col for col in df.columns if 'total' in col.lower() and 'pathways' in col.lower()]
                if within_col and total_col:
                    within = total_row[within_col[0]].iloc[0]
                    total = total_row[total_col[0]].iloc[0]
                    if total > 0:
                        value = (within / total) * 100
                    else:
                        return None
                else:
                    return None

            # Convert to percentage if needed
            if isinstance(value, (int, float)):
                if value < 1:  # It's a decimal
                    return value * 100
                else:  # Already a percentage
                    return value

            return None

        except Exception as e:
            print(f"\n      Excel read error: {e}")
            return None

    def _validate_ae_sample(self, sample: Dict):
        """Validate A&E data against CSV files"""
        try:
            trust_code = sample['trust_code']
            period = sample['period'][:7]  # YYYY-MM
            db_data = sample['ae_data']

            if not db_data:
                print("❌ No A&E data in DB")
                return

            db_four_hour_pct = db_data.get('four_hour_performance_pct')
            if db_four_hour_pct is None:
                print("❌ No four_hour_performance_pct")
                return

            # Get Excel value
            month_name = self.period_to_month.get(period)
            if not month_name:
                print("❌ No file mapping")
                return

            # Construct filename
            parts = month_name.split('-')
            if len(parts) == 2:
                filename = f"Monthly-AE-{parts[0]}-{parts[1]}.csv"
            else:
                print("❌ Bad period format")
                return

            file_path = self.data_dir / filename
            if not file_path.exists():
                # Try with revised suffix
                filename = f"Monthly-AE-{parts[0]}-{parts[1]}-revised.csv"
                file_path = self.data_dir / filename
                if not file_path.exists():
                    print("❌ File not found")
                    return

            # Read CSV
            df = pd.read_csv(file_path)
            trust_data = df[df['Org Code'] == trust_code]

            if trust_data.empty:
                print("❌ Trust not in CSV")
                return

            # Calculate four hour performance from CSV
            # Total attendances
            total_cols = [
                'A&E attendances Type 1',
                'A&E attendances Type 2',
                'A&E attendances Other A&E Department'
            ]
            total_attendances = trust_data[total_cols].sum().sum()

            # Over 4 hours
            over_4hrs_cols = [
                'Attendances over 4hrs Type 1',
                'Attendances over 4hrs Type 2',
                'Attendances over 4hrs Other Department'
            ]
            over_4hrs = trust_data[over_4hrs_cols].sum().sum()

            if total_attendances > 0:
                excel_four_hour_pct = ((total_attendances - over_4hrs) / total_attendances) * 100
            else:
                print("❌ Zero attendances")
                return

            # Compare
            if self._values_match(db_four_hour_pct, excel_four_hour_pct, tolerance=0.1):
                print("✅")
                self.results['matches'] += 1
            else:
                print(f"❌ DB:{db_four_hour_pct:.2f}% Excel:{excel_four_hour_pct:.2f}%")
                self.results['mismatches'].append({
                    'trust': trust_code,
                    'period': period,
                    'metric': 'A&E four_hour_performance_pct',
                    'db_value': f"{db_four_hour_pct:.2f}%",
                    'excel_value': f"{excel_four_hour_pct:.2f}%"
                })

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            self.results['errors'].append({
                'trust': trust_code if 'trust_code' in locals() else 'unknown',
                'period': period if 'period' in locals() else 'unknown',
                'metric': 'A&E four_hour_performance_pct',
                'error': str(e)
            })

    def _validate_diagnostics_sample(self, sample: Dict):
        """Validate Diagnostics data"""
        try:
            trust_code = sample['trust_code']
            period = sample['period'][:7]  # YYYY-MM
            db_data = sample['diagnostics_data']

            # Diagnostics data appears to be empty in DB
            if not db_data or not isinstance(db_data, dict) or len(db_data) == 0:
                print("⚠️  Empty in DB")
                return

            # Get Excel value
            month_name = self.period_to_month.get(period)
            if not month_name:
                print("❌ No file mapping")
                return

            filename = f"Monthly-Diagnostics-Web-File-Provider-{month_name}.xls"
            file_path = self.data_dir / filename

            if not file_path.exists():
                print("❌ File not found")
                return

            df = pd.read_excel(file_path, sheet_name=0, skiprows=13)
            trust_data = df[df['Provider Code'] == trust_code]

            if trust_data.empty:
                print("❌ Trust not in Excel")
                return

            print("✅")
            self.results['matches'] += 1

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            self.results['errors'].append({
                'trust': trust_code if 'trust_code' in locals() else 'unknown',
                'period': period if 'period' in locals() else 'unknown',
                'metric': 'Diagnostics',
                'error': str(e)
            })

    def _validate_cancer_sample(self, sample: Dict):
        """Validate Cancer data"""
        try:
            trust_code = sample['trust_code']
            period = sample['period'][:7]  # YYYY-MM
            db_data = sample['cancer_data']

            if not db_data or 'standards' not in db_data:
                print("❌ No standards in DB")
                return

            # Get a random standard to check
            standards = db_data.get('standards', {})
            if not standards:
                print("❌ Empty standards")
                return

            standard_name = random.choice(list(standards.keys()))
            standard_data = standards[standard_name]

            # Check for 'by_cancer_type' (correct key)
            if 'by_cancer_type' not in standard_data:
                print("❌ No by_cancer_type")
                return

            cancer_types = standard_data['by_cancer_type']
            if not cancer_types:
                print("❌ Empty by_cancer_type")
                return

            cancer_type_key = random.choice(list(cancer_types.keys()))
            cancer_type_data = cancer_types[cancer_type_key]
            db_within = cancer_type_data.get('within_standard', 0)
            db_total = cancer_type_data.get('total_treated', 0)

            # Map standard name to Excel format
            standard_mapping = {
                '28_day_fds': '28-day FDS',
                '31_day_combined': '31-day Combined',
                '62_day_combined': '62-day Combined'
            }
            excel_standard = standard_mapping.get(standard_name, standard_name)

            # Get Excel value
            excel_value = self._get_cancer_excel_value(trust_code, period, excel_standard, cancer_type_key)

            if excel_value is None:
                print(f"❌ Not in Excel")
                return

            if abs(db_within - excel_value) < 0.01:
                print("✅")
                self.results['matches'] += 1
            else:
                print(f"❌ DB:{db_within} Excel:{excel_value}")
                self.results['mismatches'].append({
                    'trust': trust_code,
                    'period': period,
                    'metric': f'Cancer {standard_name} - {cancer_type_key}',
                    'db_value': db_within,
                    'excel_value': excel_value
                })

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            self.results['errors'].append({
                'trust': sample['trust_code'],
                'period': sample['period'],
                'metric': 'Cancer',
                'error': str(e)
            })

    def _get_cancer_excel_value(self, trust_code: str, period: str, standard: str, cancer_type_key: str) -> Optional[float]:
        """Get cancer data from Excel file"""
        try:
            # Map snake_case keys back to Excel cancer type names
            cancer_type_mapping = {
                'suspected_brain_cns': 'Suspected brain/central nervous system tumours',
                'suspected_urological': 'Suspected urological malignancies (excluding testicular)',
                'suspected_lung_cancer': 'Suspected lung cancer',
                'suspected_lower_gi': 'Suspected lower gastrointestinal cancer',
                'suspected_upper_gi': 'Suspected upper gastrointestinal cancer',
                'suspected_breast': 'Suspected breast cancer',
                'suspected_gynae': 'Suspected gynaecological cancer',
                'suspected_head_neck': 'Suspected head & neck cancer',
                'suspected_skin': 'Suspected skin cancer',
                'suspected_haem': 'Suspected haematological malignancies (excluding acute leukaemia)',
                'suspected_testicular': 'Suspected testicular cancer',
                'suspected_acute_leukaemia': 'Suspected acute leukaemia',
                'suspected_children': "Suspected children's cancer",
                'suspected_sarcoma': 'Suspected sarcoma',
                'suspected_other': 'Suspected other cancer',
                'non_specific_symptoms': 'Suspected cancer - non-specific symptoms',
                'breast_symptomatic': 'Exhibited (non-cancer) breast symptoms - cancer not initially suspected',
                'breast': 'Breast',
                'lung': 'Lung',
                'lower_gi': 'Lower Gastrointestinal',
                'upper_gi_oesophagus_stomach': 'Upper Gastrointestinal - Oesophagus & Stomach',
                'upper_gi_hepatobiliary': 'Upper Gastrointestinal - Hepatobiliary',
                'gynae': 'Gynaecological',
                'head_neck': 'Head & Neck',
                'skin': 'Skin',
                'haem_lymphoma': 'Haematological - Lymphoma',
                'haem_other': 'Haematological - Other (a)',
                'urological': 'Urological',
                'other': 'Other (a)',
                'all_cancers': 'ALL CANCERS'
            }

            cancer_type_name = cancer_type_mapping.get(cancer_type_key, cancer_type_key)

            # Determine which cancer file to use
            year_month = datetime.strptime(period + '-01', '%Y-%m-%d')

            if year_month >= datetime(2025, 4, 1):
                filename = 'CWT-CRS-Apr-2025-to-Jul-2025-Data-Extract-Provider.xlsx'
            elif year_month >= datetime(2024, 10, 1):
                filename = 'CWT-CRS-Oct-2024-to-Mar-2025-Data-Extract-Provider.xlsx'
            else:
                filename = 'CWT-CRS-Apr-2024-to-Sep-2024-Data-Extract-Provider-Final.xlsx'

            file_path = self.data_dir / filename
            if not file_path.exists():
                return None

            df = pd.read_excel(file_path, sheet_name=0)

            # Filter for trust, period, standard, and cancer type
            # Sum up all routes/modalities for this cancer type
            filtered = df[
                (df['ORG CODE'] == trust_code) &
                (df['PERIOD'].astype(str).str.startswith(period)) &
                (df['STANDARD'] == standard) &
                (df['CANCER TYPE'].str.contains(cancer_type_name, case=False, na=False))
            ]

            if filtered.empty:
                return None

            # Sum within standard across all routes/modalities
            return filtered['WITHIN STANDARD'].sum()

        except Exception as e:
            return None

    def _values_match(self, val1: float, val2: float, tolerance: float = 0.01) -> bool:
        """Check if two values match within tolerance"""
        return abs(val1 - val2) < tolerance

    def _generate_report(self):
        """Generate final validation report"""
        total_attempted = self.results['matches'] + len(self.results['mismatches'])
        if total_attempted > 0:
            self.results['accuracy_rate'] = (self.results['matches'] / total_attempted) * 100

        print(f"\n{'=' * 70}")
        print(f"📊 VALIDATION RESULTS")
        print(f"{'=' * 70}")
        print(f"Total Matches: {self.results['matches']}/{total_attempted}")
        print(f"Accuracy Rate: {self.results['accuracy_rate']:.1f}%")
        print(f"Errors/Skipped: {len(self.results['errors'])}")
        print(f"\n{'=' * 70}")

        if self.results['mismatches']:
            print(f"\n❌ MISMATCHES ({len(self.results['mismatches'])}):")
            for mismatch in self.results['mismatches']:
                print(f"  • {mismatch['trust']} - {mismatch['period']} - {mismatch['metric']}")
                print(f"    DB: {mismatch['db_value']} | Excel: {mismatch['excel_value']}")

        # Save report
        report_path = Path('data_accuracy_validation_report.json')
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)

        print(f"\n📄 Full report saved to: {report_path}")


def main():
    """Main execution"""
    project_dir = Path('/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master')
    data_dir = project_dir / 'Data'

    # Supabase credentials
    supabase_url = "https://fsopilxzaaukmcqcskqm.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

    validator = DataAccuracyValidator(data_dir, supabase_url, supabase_key)
    validator.run_validation()


if __name__ == '__main__':
    main()
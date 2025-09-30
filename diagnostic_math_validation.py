#!/usr/bin/env python3
"""
NHS Data Analytics - Mathematical Validation Diagnostic Script
=============================================================

This script validates mathematical calculations in the cancer data processing
to identify the source of the 67.1% mathematical consistency issue.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import pandas as pd
import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Add project root to path
sys.path.append('/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master')

try:
    from cancer_data_processor import CancerDataProcessor
except ImportError as e:
    print(f"❌ Error importing cancer_data_processor: {e}")
    sys.exit(1)

class MathValidationDiagnostic:
    """Diagnose mathematical calculation inconsistencies"""

    def __init__(self):
        self.processor = CancerDataProcessor()
        self.issues_found = []
        self.validations_passed = 0
        self.validations_failed = 0

    def validate_basic_arithmetic(self, df: pd.DataFrame) -> List[Dict]:
        """Validate that WITHIN STANDARD + BREACHES = TOTAL TREATED"""
        print("🔍 Validating basic arithmetic: WITHIN STANDARD + BREACHES = TOTAL TREATED")

        issues = []

        for index, row in df.iterrows():
            within_standard = row['WITHIN STANDARD']
            breaches = row['BREACHES']
            total_treated = row['TOTAL TREATED']

            # Skip rows with missing data
            if pd.isna(within_standard) or pd.isna(breaches) or pd.isna(total_treated):
                issues.append({
                    'row': index,
                    'issue': 'Missing data',
                    'within_standard': within_standard,
                    'breaches': breaches,
                    'total_treated': total_treated
                })
                continue

            calculated_total = within_standard + breaches

            if abs(calculated_total - total_treated) > 0.1:  # Allow for small rounding differences
                issues.append({
                    'row': index,
                    'issue': 'Arithmetic mismatch',
                    'within_standard': within_standard,
                    'breaches': breaches,
                    'calculated_total': calculated_total,
                    'total_treated': total_treated,
                    'difference': calculated_total - total_treated,
                    'trust_code': row['ORG CODE'],
                    'standard': row['STANDARD'],
                    'cancer_type': row['CANCER TYPE']
                })
                self.validations_failed += 1
            else:
                self.validations_passed += 1

        return issues

    def validate_percentage_calculations(self, df: pd.DataFrame) -> List[Dict]:
        """Validate percentage calculations match expected values"""
        print("📊 Validating percentage calculations")

        issues = []

        # Group by trust and standard to test aggregated calculations
        grouped = df.groupby(['ORG CODE', 'STANDARD'])

        for (trust_code, standard), group in grouped:
            if len(group) == 0:
                continue

            # Calculate using processor method
            processor_percentage = self.processor.calculate_performance(group)

            # Calculate manually
            total_within = group['WITHIN STANDARD'].sum()
            total_treated = group['TOTAL TREATED'].sum()

            if total_treated == 0:
                expected_percentage = 0.0
            else:
                expected_percentage = round((total_within / total_treated) * 100, 1)

            if abs(processor_percentage - expected_percentage) > 0.1:
                issues.append({
                    'trust_code': trust_code,
                    'standard': standard,
                    'processor_percentage': processor_percentage,
                    'expected_percentage': expected_percentage,
                    'difference': processor_percentage - expected_percentage,
                    'total_within': total_within,
                    'total_treated': total_treated,
                    'records_in_group': len(group)
                })
                self.validations_failed += 1
            else:
                self.validations_passed += 1

        return issues

    def validate_data_types_and_nulls(self, df: pd.DataFrame) -> Dict:
        """Check for data type issues and null values that could affect calculations"""
        print("🔬 Validating data types and null values")

        validation_info = {
            'null_counts': {},
            'data_types': {},
            'invalid_values': []
        }

        numeric_columns = ['TOTAL TREATED', 'WITHIN STANDARD', 'BREACHES']

        for col in numeric_columns:
            validation_info['null_counts'][col] = df[col].isnull().sum()
            validation_info['data_types'][col] = str(df[col].dtype)

            # Check for negative values
            negative_mask = df[col] < 0
            if negative_mask.any():
                validation_info['invalid_values'].append({
                    'column': col,
                    'issue': 'negative_values',
                    'count': negative_mask.sum()
                })

            # Check for non-numeric values after conversion
            try:
                pd.to_numeric(df[col], errors='raise')
            except (ValueError, TypeError) as e:
                validation_info['invalid_values'].append({
                    'column': col,
                    'issue': 'non_numeric_values',
                    'error': str(e)
                })

        return validation_info

    def validate_weighted_calculations(self, df: pd.DataFrame) -> List[Dict]:
        """Validate the weighted performance calculations in metadata"""
        print("⚖️ Validating weighted performance calculations")

        issues = []

        # Test a sample trust
        sample_trusts = df['ORG CODE'].unique()[:3]  # Test first 3 trusts

        for trust_code in sample_trusts:
            trust_df = df[df['ORG CODE'] == trust_code]
            if trust_df.empty:
                continue

            # Process through the full pipeline
            try:
                months = trust_df['MONTH'].unique().tolist()
                period_label = "2024-Q1"  # Dummy for testing
                period_start = "2024-04-01"

                jsonb_data = self.processor.build_cancer_jsonb(trust_df, period_label, period_start, months)

                # Validate the metadata calculations
                metadata = jsonb_data.get('metadata', {})
                overall_performance = metadata.get('overall_performance_weighted', 0)

                # Manual weighted calculation
                weights = {'28_day_fds': 0.2, '31_day_combined': 0.3, '62_day_combined': 0.5}
                weighted_sum = 0
                total_weight = 0

                standards = jsonb_data.get('standards', {})
                for standard, weight in weights.items():
                    if standard in standards:
                        perf = standards[standard]['summary']['performance_pct']
                        weighted_sum += perf * weight
                        total_weight += weight

                expected_weighted = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0

                if abs(overall_performance - expected_weighted) > 0.1:
                    issues.append({
                        'trust_code': trust_code,
                        'calculated_weighted': overall_performance,
                        'expected_weighted': expected_weighted,
                        'difference': overall_performance - expected_weighted,
                        'standards_available': list(standards.keys()),
                        'weights_used': total_weight
                    })
                    self.validations_failed += 1
                else:
                    self.validations_passed += 1

            except Exception as e:
                issues.append({
                    'trust_code': trust_code,
                    'error': str(e),
                    'issue': 'Processing error in weighted calculation'
                })
                self.validations_failed += 1

        return issues

    def run_diagnostic(self, file_path: str) -> Dict[str, Any]:
        """Run complete mathematical validation diagnostic"""
        print(f"\n🔍 NHS Data Analytics - Mathematical Validation Diagnostic")
        print(f"📁 File: {Path(file_path).name}")
        print("=" * 80)

        try:
            # Load the Excel file
            df = pd.read_excel(file_path, sheet_name='CWT CRS Provider Extract')
            print(f"📊 Loaded {len(df)} rows, {len(df.columns)} columns")

            diagnostic_results = {
                'file_path': file_path,
                'total_rows': len(df),
                'validations_passed': 0,
                'validations_failed': 0,
                'issues': {
                    'basic_arithmetic': [],
                    'percentage_calculations': [],
                    'weighted_calculations': [],
                    'data_quality': {}
                }
            }

            # Run all validations
            print("\n" + "="*50)
            diagnostic_results['issues']['basic_arithmetic'] = self.validate_basic_arithmetic(df)

            print("\n" + "="*50)
            diagnostic_results['issues']['percentage_calculations'] = self.validate_percentage_calculations(df)

            print("\n" + "="*50)
            diagnostic_results['issues']['data_quality'] = self.validate_data_types_and_nulls(df)

            print("\n" + "="*50)
            diagnostic_results['issues']['weighted_calculations'] = self.validate_weighted_calculations(df)

            # Summary
            diagnostic_results['validations_passed'] = self.validations_passed
            diagnostic_results['validations_failed'] = self.validations_failed
            total_validations = self.validations_passed + self.validations_failed
            success_rate = (self.validations_passed / total_validations * 100) if total_validations > 0 else 0

            print("\n" + "="*80)
            print("📊 DIAGNOSTIC SUMMARY")
            print("="*80)
            print(f"✅ Validations passed: {self.validations_passed}")
            print(f"❌ Validations failed: {self.validations_failed}")
            print(f"📈 Success rate: {success_rate:.1f}%")

            # Report specific issues
            for category, issues_list in diagnostic_results['issues'].items():
                if isinstance(issues_list, list) and len(issues_list) > 0:
                    print(f"\n⚠️ {category.replace('_', ' ').title()}: {len(issues_list)} issues")
                    for issue in issues_list[:3]:  # Show first 3 issues
                        print(f"   • {issue}")

            diagnostic_results['success_rate'] = success_rate
            return diagnostic_results

        except Exception as e:
            print(f"❌ Error running diagnostic: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e)}

def main():
    """Run mathematical validation diagnostic on cancer data"""

    # Test with the first available cancer file
    data_dir = Path("/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data")
    test_file = data_dir / "CWT-CRS-Apr-2024-to-Sep-2024-Data-Extract-Provider-Final.xlsx"

    if not test_file.exists():
        print(f"❌ Test file not found: {test_file}")
        return

    diagnostic = MathValidationDiagnostic()
    results = diagnostic.run_diagnostic(str(test_file))

    # Save results
    output_file = "math_validation_diagnostic_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Results saved to: {output_file}")

if __name__ == "__main__":
    main()
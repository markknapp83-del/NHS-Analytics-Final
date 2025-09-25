#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Phase 1: Source Data Verification
=============================================================

This script validates the completeness and integrity of raw NHS data sources
and the unified dataset to ensure all expected files are present and readable.

Author: Claude Code Assistant
Date: 2025-09-24
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple
import csv
from supabase import create_client, Client

class SourceDataValidator:
    """Validates completeness and integrity of NHS raw data sources"""

    def __init__(self, data_dir: str, supabase_url: str = None, supabase_key: str = None):
        self.data_dir = Path(data_dir)
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"⚠️ Warning: Could not connect to Supabase: {e}")
            self.supabase = None

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 1: Source Data Verification",
            "data_directory": str(self.data_dir),
            "supabase_connected": self.supabase is not None,
            "results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": []
        }

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 1 validation tests"""
        print("🔍 Starting Phase 1: Source Data Verification")
        print(f"📁 Data directory: {self.data_dir}")
        print(f"🔗 Supabase connection: {'✅ Connected' if self.supabase else '❌ Not connected'}")
        print("-" * 70)

        # Test 1: Raw data file completeness
        print("\n1️⃣ Testing raw data file completeness...")
        self.test_raw_data_completeness()

        # Test 2: Unified CSV validation
        print("\n2️⃣ Testing unified CSV validation...")
        self.test_unified_csv_validation()

        # Test 3: File integrity checks
        print("\n3️⃣ Testing file integrity...")
        self.test_file_integrity()

        # Test 4: Database connectivity check
        if self.supabase:
            print("\n4️⃣ Testing database connectivity...")
            self.test_database_connectivity()

        # Generate summary
        self.generate_summary()

        return self.report

    def test_raw_data_completeness(self) -> None:
        """Test 1.1: Validate all expected raw data files are present"""
        expected_months = [
            "August-2024", "September-2024", "October-2024", "November-2024", "December-2024",
            "January-2025", "February-2025", "March-2025", "April-2025", "May-2025", "June-2025", "July-2025"
        ]

        completeness_results = {}

        # Check A&E data files
        print("   📊 Checking A&E data files...")
        ae_files = list(self.data_dir.glob("Monthly-AE-*.csv"))
        ae_months_found = []
        for file in ae_files:
            # Extract month from filename like "Monthly-AE-August-2024.csv"
            parts = file.stem.split('-')
            if len(parts) >= 3:
                month_year = f"{parts[2]}-{parts[3]}" if len(parts) >= 4 else parts[2]
                ae_months_found.append(month_year)

        completeness_results["ae_data"] = {
            "expected_count": 12,
            "found_count": len(ae_files),
            "found_files": [f.name for f in ae_files],
            "months_found": ae_months_found,
            "status": "PASS" if len(ae_files) >= 12 else "WARN" if len(ae_files) >= 10 else "FAIL"
        }

        # Check RTT data files (Excel format)
        print("   📈 Checking RTT data files...")
        rtt_files = list(self.data_dir.glob("Incomplete-Provider-*-XLSX-9M-*.xlsx"))
        rtt_months_found = []
        for file in rtt_files:
            # Extract month from filename
            parts = file.stem.split('-')
            if len(parts) >= 3:
                month_code = parts[2]
                rtt_months_found.append(month_code)

        completeness_results["rtt_data"] = {
            "expected_count": 12,
            "found_count": len(rtt_files),
            "found_files": [f.name for f in rtt_files],
            "months_found": rtt_months_found,
            "status": "PASS" if len(rtt_files) >= 12 else "WARN" if len(rtt_files) >= 10 else "FAIL"
        }

        # Check daily discharge data files
        print("   🏥 Checking daily discharge data files...")
        discharge_files = list(self.data_dir.glob("Daily-discharge-sitrep-monthly-data-*.csv"))
        completeness_results["discharge_data"] = {
            "expected_count": 12,
            "found_count": len(discharge_files),
            "found_files": [f.name for f in discharge_files],
            "status": "PASS" if len(discharge_files) >= 12 else "WARN" if len(discharge_files) >= 10 else "FAIL"
        }

        # Check other important data files
        print("   📋 Checking other NHS data files...")
        other_file_patterns = [
            ("Workforce", "NHS Workforce Statistics*.xlsx"),
            ("Community Health", "Community-health-services-waiting-lists*.xlsx"),
            ("Diagnostics", "Monthly-Diagnostics-Web-File-Provider*.xls"),
            ("Virtual Ward", "Monthly-Virtual-Ward-*.xlsx")
        ]

        other_files = {}
        for category, pattern in other_file_patterns:
            files = list(self.data_dir.glob(pattern))
            other_files[category] = {
                "count": len(files),
                "files": [f.name for f in files[:5]]  # Show first 5 files
            }

        completeness_results["other_data"] = other_files

        self.report["results"]["raw_data_completeness"] = completeness_results

        # Report findings
        for data_type, result in completeness_results.items():
            if data_type != "other_data":
                status_emoji = "✅" if result["status"] == "PASS" else ("⚠️" if result["status"] == "WARN" else "❌")
                print(f"   {status_emoji} {data_type}: {result['found_count']}/{result['expected_count']} files found")
                if result["status"] == "FAIL":
                    self.report["issues_found"].append(f"Critical: Missing {data_type} files - expected 12, found {result['found_count']}")
                elif result["status"] == "WARN":
                    self.report["issues_found"].append(f"Warning: Incomplete {data_type} files - expected 12, found {result['found_count']}")

        # Report other data files
        print("   📊 Other NHS data categories found:")
        for category, info in other_files.items():
            print(f"      • {category}: {info['count']} files")

    def test_unified_csv_validation(self) -> None:
        """Test 1.2: Validate unified CSV file structure and content"""
        unified_csv_path = self.data_dir / "unified_monthly_data_enhanced.csv"

        if not unified_csv_path.exists():
            self.report["results"]["unified_csv"] = {
                "status": "FAIL",
                "error": "Unified CSV file not found"
            }
            self.report["issues_found"].append("Critical: unified_monthly_data_enhanced.csv file missing")
            print("   ❌ Unified CSV file not found!")
            return

        print(f"   📄 Validating {unified_csv_path.name}...")

        try:
            # Read CSV header first to check structure
            with open(unified_csv_path, 'r') as f:
                reader = csv.reader(f)
                header = next(reader)
                total_columns = len(header)

            # Read CSV to get basic stats
            df = pd.read_csv(unified_csv_path)
            total_records = len(df)

            # Check for expected key columns
            expected_columns = [
                'trust_code', 'trust_name', 'period',
                'rtt_general_surgery_total_incomplete_pathways',
                'ae_attendances_total', 'ae_4hr_performance_pct',
                'trust_total_total_incomplete_pathways',
                'trust_total_percent_within_18_weeks'
            ]

            missing_columns = [col for col in expected_columns if col not in df.columns]
            present_expected_columns = [col for col in expected_columns if col in df.columns]

            # Check for duplicate records
            duplicate_records = df.duplicated(subset=['trust_code', 'period']).sum()

            # Analyze trust coverage
            unique_trusts = df['trust_code'].nunique()
            trust_codes = df['trust_code'].unique()
            unique_periods = df['period'].nunique()
            period_range = f"{df['period'].min()} to {df['period'].max()}"

            # Validate trust codes format (should be 3-character codes)
            invalid_trust_codes = df[df['trust_code'].str.len() != 3]['trust_code'].unique().tolist()

            # Check period format (should be YYYY-MM-DD format)
            try:
                pd.to_datetime(df['period'])
                date_format_valid = True
                date_format_error = None
            except Exception as e:
                date_format_valid = False
                date_format_error = str(e)

            # Sample data quality check
            sample_data_analysis = {}
            if 'ae_4hr_performance_pct' in df.columns:
                ae_performance = df['ae_4hr_performance_pct'].dropna()
                sample_data_analysis['ae_performance'] = {
                    'count': len(ae_performance),
                    'mean': ae_performance.mean().round(2),
                    'min': ae_performance.min(),
                    'max': ae_performance.max(),
                    'out_of_range': len(ae_performance[(ae_performance < 0) | (ae_performance > 100)])
                }

            if 'trust_total_percent_within_18_weeks' in df.columns:
                rtt_performance = df['trust_total_percent_within_18_weeks'].dropna()
                sample_data_analysis['rtt_performance'] = {
                    'count': len(rtt_performance),
                    'mean': rtt_performance.mean().round(2),
                    'min': rtt_performance.min(),
                    'max': rtt_performance.max(),
                    'out_of_range': len(rtt_performance[(rtt_performance < 0) | (rtt_performance > 1)])
                }

            unified_results = {
                "status": "PASS",
                "file_size_mb": round(unified_csv_path.stat().st_size / (1024*1024), 2),
                "total_records": total_records,
                "total_columns": total_columns,
                "unique_trusts": unique_trusts,
                "sample_trust_codes": trust_codes[:10].tolist(),
                "unique_periods": unique_periods,
                "period_range": period_range,
                "duplicate_records": duplicate_records,
                "missing_columns": missing_columns,
                "present_expected_columns": present_expected_columns,
                "invalid_trust_codes": invalid_trust_codes,
                "date_format_valid": date_format_valid,
                "date_format_error": date_format_error,
                "sample_data_analysis": sample_data_analysis
            }

            # Data quality checks
            null_percentages = (df.isnull().sum() / len(df) * 100).round(2)
            high_null_columns = null_percentages[null_percentages > 80].to_dict()  # Very high null threshold
            moderate_null_columns = null_percentages[(null_percentages > 30) & (null_percentages <= 80)].to_dict()

            unified_results["data_quality_checks"] = {
                "high_null_columns": high_null_columns,
                "moderate_null_columns": moderate_null_columns,
                "null_percentage_summary": {
                    "columns_with_high_nulls": len(high_null_columns),
                    "columns_with_moderate_nulls": len(moderate_null_columns),
                    "average_null_rate": null_percentages.mean().round(2)
                }
            }

            # Validation checks
            issues = []
            if total_records != 1816:
                issues.append(f"Expected 1,816 records, found {total_records}")
                if abs(total_records - 1816) > 50:  # More than 50 records difference is critical
                    unified_results["status"] = "FAIL"
                else:
                    unified_results["status"] = "WARN"

            if total_columns < 250:  # Allow some flexibility in column count
                issues.append(f"Expected ~271 columns, found {total_columns}")
                unified_results["status"] = "WARN"

            if missing_columns:
                issues.append(f"Missing essential columns: {missing_columns}")
                unified_results["status"] = "FAIL"

            if duplicate_records > 0:
                issues.append(f"Found {duplicate_records} duplicate trust-period records")
                unified_results["status"] = "WARN" if unified_results["status"] == "PASS" else unified_results["status"]

            if invalid_trust_codes:
                issues.append(f"Found {len(invalid_trust_codes)} invalid trust codes: {invalid_trust_codes}")
                unified_results["status"] = "FAIL"

            if not date_format_valid:
                issues.append(f"Date format validation failed: {date_format_error}")
                unified_results["status"] = "FAIL"

            if unique_trusts < 140:  # Expect around 151 trusts
                issues.append(f"Expected ~151 unique trusts, found {unique_trusts}")
                unified_results["status"] = "WARN"

            unified_results["validation_issues"] = issues
            self.report["issues_found"].extend(issues)

            # Report results
            status_emoji = "✅" if unified_results["status"] == "PASS" else ("⚠️" if unified_results["status"] == "WARN" else "❌")
            print(f"   {status_emoji} Records: {total_records:,}, Columns: {total_columns}, Trusts: {unique_trusts}")
            print(f"      📅 Period range: {period_range}")
            print(f"      📊 Sample trust codes: {', '.join(trust_codes[:5])}")

            if sample_data_analysis:
                print("      📈 Data quality samples:")
                if 'ae_performance' in sample_data_analysis:
                    ae_data = sample_data_analysis['ae_performance']
                    print(f"         A&E Performance: {ae_data['count']} values, avg {ae_data['mean']}%, range {ae_data['min']}-{ae_data['max']}%")
                if 'rtt_performance' in sample_data_analysis:
                    rtt_data = sample_data_analysis['rtt_performance']
                    print(f"         RTT Performance: {rtt_data['count']} values, avg {rtt_data['mean']:.3f}, range {rtt_data['min']:.3f}-{rtt_data['max']:.3f}")

            if issues:
                for issue in issues:
                    print(f"      ⚠️ {issue}")

        except Exception as e:
            unified_results = {
                "status": "FAIL",
                "error": str(e)
            }
            self.report["issues_found"].append(f"Critical: Failed to read unified CSV: {str(e)}")
            print(f"   ❌ Failed to read unified CSV: {str(e)}")

        self.report["results"]["unified_csv"] = unified_results

    def test_file_integrity(self) -> None:
        """Test 1.3: Check file integrity and readability"""
        print("   🔧 Testing file integrity and readability...")

        integrity_results = {
            "csv_files": {"readable": 0, "corrupted": 0, "files_tested": []},
            "excel_files": {"readable": 0, "corrupted": 0, "files_tested": []},
            "total_files_tested": 0
        }

        # Test CSV files (sample first 10 to avoid long processing)
        csv_files = list(self.data_dir.glob("*.csv"))[:10]
        print(f"      Testing {len(csv_files)} CSV files...")

        for csv_file in csv_files:
            try:
                # Try to read the first few rows
                df = pd.read_csv(csv_file, nrows=5)
                integrity_results["csv_files"]["readable"] += 1
                integrity_results["csv_files"]["files_tested"].append({
                    "file": csv_file.name,
                    "status": "OK",
                    "rows_sample": len(df),
                    "columns": len(df.columns),
                    "size_mb": round(csv_file.stat().st_size / (1024*1024), 2)
                })
            except Exception as e:
                integrity_results["csv_files"]["corrupted"] += 1
                integrity_results["csv_files"]["files_tested"].append({
                    "file": csv_file.name,
                    "status": "CORRUPTED",
                    "error": str(e)
                })
                self.report["issues_found"].append(f"Corrupted CSV file: {csv_file.name} - {str(e)}")

        # Test Excel files (sample first 5 to avoid long processing)
        excel_files = (list(self.data_dir.glob("*.xlsx")) + list(self.data_dir.glob("*.xls")))[:5]
        print(f"      Testing {len(excel_files)} Excel files...")

        for excel_file in excel_files:
            try:
                # Try to read Excel file
                df = pd.read_excel(excel_file, nrows=5)
                integrity_results["excel_files"]["readable"] += 1
                integrity_results["excel_files"]["files_tested"].append({
                    "file": excel_file.name,
                    "status": "OK",
                    "rows_sample": len(df),
                    "columns": len(df.columns),
                    "size_mb": round(excel_file.stat().st_size / (1024*1024), 2)
                })
            except Exception as e:
                integrity_results["excel_files"]["corrupted"] += 1
                integrity_results["excel_files"]["files_tested"].append({
                    "file": excel_file.name,
                    "status": "CORRUPTED",
                    "error": str(e)
                })
                self.report["issues_found"].append(f"Corrupted Excel file: {excel_file.name} - {str(e)}")

        integrity_results["total_files_tested"] = len(csv_files) + len(excel_files)

        # Report results
        total_readable = integrity_results["csv_files"]["readable"] + integrity_results["excel_files"]["readable"]
        total_corrupted = integrity_results["csv_files"]["corrupted"] + integrity_results["excel_files"]["corrupted"]

        print(f"   📊 File integrity: {total_readable} readable, {total_corrupted} corrupted (from {integrity_results['total_files_tested']} tested)")

        if total_corrupted > 0:
            print(f"   ⚠️ Found {total_corrupted} corrupted files - check report for details")

        self.report["results"]["file_integrity"] = integrity_results

    def test_database_connectivity(self) -> None:
        """Test 1.4: Check Supabase database connectivity and basic structure"""
        print("   🔗 Testing Supabase database connectivity...")

        db_results = {
            "connection_status": "FAIL",
            "connection_error": None,
            "table_exists": False,
            "record_count": 0,
            "sample_records": [],
            "table_structure": {}
        }

        try:
            # Test basic connection with a simple query
            result = self.supabase.table('trust_metrics').select('trust_code').limit(1).execute()

            db_results["connection_status"] = "PASS"
            db_results["table_exists"] = True
            print("   ✅ Database connection successful")

            # Get record count
            count_result = self.supabase.table('trust_metrics').select('*', count='exact').execute()
            db_results["record_count"] = count_result.count if hasattr(count_result, 'count') else len(count_result.data)
            print(f"      📊 Records in trust_metrics table: {db_results['record_count']:,}")

            # Get sample records
            sample_result = self.supabase.table('trust_metrics').select('trust_code, trust_name, period, rtt_data, ae_data').limit(3).execute()
            db_results["sample_records"] = sample_result.data

            if sample_result.data:
                print("      📋 Sample records found:")
                for i, record in enumerate(sample_result.data[:2], 1):
                    print(f"         {i}. {record.get('trust_code', 'N/A')} - {record.get('trust_name', 'N/A')[:30]}... ({record.get('period', 'N/A')})")

                    # Check JSONB structure
                    rtt_data = record.get('rtt_data')
                    ae_data = record.get('ae_data')

                    if rtt_data and rtt_data != "EMPTY":
                        if isinstance(rtt_data, dict):
                            print(f"            RTT data: ✅ Valid JSON structure")
                        else:
                            print(f"            RTT data: ⚠️ Not JSON format: {type(rtt_data)}")
                    else:
                        print(f"            RTT data: ❌ Empty or missing")

                    if ae_data and ae_data != "EMPTY":
                        if isinstance(ae_data, dict):
                            print(f"            A&E data: ✅ Valid JSON structure")
                        else:
                            print(f"            A&E data: ⚠️ Not JSON format: {type(ae_data)}")
                    else:
                        print(f"            A&E data: ❌ Empty or missing")

            # Check for expected record count
            if db_results["record_count"] == 0:
                self.report["issues_found"].append("Critical: No records found in trust_metrics table")
                db_results["connection_status"] = "WARN"
            elif db_results["record_count"] < 1500:
                self.report["issues_found"].append(f"Warning: Expected ~1816 records, found {db_results['record_count']}")
                db_results["connection_status"] = "WARN"

        except Exception as e:
            db_results["connection_error"] = str(e)
            print(f"   ❌ Database connection failed: {str(e)}")
            self.report["issues_found"].append(f"Critical: Database connection failed - {str(e)}")

        self.report["results"]["database_connectivity"] = db_results

    def generate_summary(self) -> None:
        """Generate overall summary of Phase 1 testing"""
        total_issues = len(self.report["issues_found"])

        # Count critical vs warning issues
        critical_issues = [issue for issue in self.report["issues_found"] if "Critical:" in issue]
        warning_issues = total_issues - len(critical_issues)

        # Overall status determination
        if len(critical_issues) > 0:
            overall_status = "FAIL"
        elif warning_issues > 0:
            overall_status = "WARN"
        else:
            overall_status = "PASS"

        # Count successful tests
        tests_completed = []
        tests_passed = 0

        if "raw_data_completeness" in self.report["results"]:
            tests_completed.append("raw_data_completeness")
            ae_status = self.report["results"]["raw_data_completeness"].get("ae_data", {}).get("status")
            rtt_status = self.report["results"]["raw_data_completeness"].get("rtt_data", {}).get("status")
            if ae_status == "PASS" and rtt_status == "PASS":
                tests_passed += 1

        if "unified_csv" in self.report["results"]:
            tests_completed.append("unified_csv_validation")
            if self.report["results"]["unified_csv"].get("status") == "PASS":
                tests_passed += 1

        if "file_integrity" in self.report["results"]:
            tests_completed.append("file_integrity")
            integrity = self.report["results"]["file_integrity"]
            total_corrupted = integrity.get("csv_files", {}).get("corrupted", 0) + integrity.get("excel_files", {}).get("corrupted", 0)
            if total_corrupted == 0:
                tests_passed += 1

        if "database_connectivity" in self.report["results"]:
            tests_completed.append("database_connectivity")
            if self.report["results"]["database_connectivity"].get("connection_status") == "PASS":
                tests_passed += 1

        self.report["summary"] = {
            "overall_status": overall_status,
            "total_issues": total_issues,
            "critical_issues": len(critical_issues),
            "warning_issues": warning_issues,
            "tests_completed": tests_completed,
            "tests_passed": tests_passed,
            "tests_total": len(tests_completed),
            "pass_rate": round(tests_passed / len(tests_completed) * 100, 1) if tests_completed else 0,
            "files_validated": self.report["results"].get("file_integrity", {}).get("total_files_tested", 0)
        }

        # Generate recommendations based on findings
        recommendations = []
        if len(critical_issues) > 0:
            recommendations.extend([
                "🔴 Critical issues found - address before proceeding to Phase 2",
                "Verify all missing files are obtained from NHS England data sources",
                "Check data transformation pipeline for critical errors"
            ])
        elif warning_issues > 0:
            recommendations.extend([
                "🟡 Warning issues found - review before proceeding to Phase 2",
                "Consider data quality improvements for better accuracy"
            ])
        else:
            recommendations.append("✅ All Phase 1 tests passed - ready to proceed to Phase 2")

        # Specific recommendations based on test results
        if "database_connectivity" in self.report["results"]:
            db_status = self.report["results"]["database_connectivity"].get("connection_status")
            if db_status == "FAIL":
                recommendations.append("Fix database connectivity issues before proceeding")
            elif db_status == "WARN":
                recommendations.append("Investigate database data population issues")

        self.report["recommendations"] = recommendations

        # Print summary
        print("\n" + "="*70)
        print("📋 PHASE 1 SUMMARY - SOURCE DATA VERIFICATION")
        print("="*70)
        status_emoji = "✅" if overall_status == "PASS" else ("⚠️" if overall_status == "WARN" else "❌")
        print(f"{status_emoji} Overall Status: {overall_status}")
        print(f"📊 Tests Passed: {tests_passed}/{len(tests_completed)} ({self.report['summary']['pass_rate']}%)")
        print(f"📋 Total Issues: {total_issues} (🔴 {len(critical_issues)} Critical, 🟡 {warning_issues} Warnings)")
        print(f"📁 Files Validated: {self.report['summary']['files_validated']}")

        if self.report["results"].get("unified_csv"):
            csv_data = self.report["results"]["unified_csv"]
            print(f"📄 Unified CSV: {csv_data.get('total_records', 'N/A'):,} records, {csv_data.get('unique_trusts', 'N/A')} trusts")

        if self.report["results"].get("database_connectivity"):
            db_data = self.report["results"]["database_connectivity"]
            print(f"🔗 Database: {db_data.get('record_count', 'N/A'):,} records in Supabase")

        if self.report["issues_found"]:
            print(f"\n⚠️ Issues Found:")
            for i, issue in enumerate(self.report["issues_found"][:8], 1):  # Show first 8 issues
                print(f"   {i}. {issue}")
            if len(self.report["issues_found"]) > 8:
                print(f"   ... and {len(self.report['issues_found']) - 8} more issues")

        print(f"\n💡 Recommendations:")
        for rec in recommendations:
            print(f"   • {rec}")

def main():
    """Main execution function"""
    if len(sys.argv) > 1:
        data_dir = sys.argv[1]
    else:
        data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Create validator and run tests
    validator = SourceDataValidator(data_dir)
    results = validator.run_all_tests()

    # Save results
    output_file = f"phase1_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Detailed results saved to: {output_file}")

    return results["summary"]["overall_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "PASS" else 1)
#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Phase 2: Database Migration Integrity
================================================================

This script validates the accuracy of data migration from CSV to Supabase database,
verifying JSONB structure integrity and transformation accuracy.

Author: Claude Code Assistant
Date: 2025-09-24
"""

import os
import sys
import json
import pandas as pd
import random
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple, Optional
from supabase import create_client, Client

class DatabaseMigrationValidator:
    """Validates database migration integrity and transformation accuracy"""

    def __init__(self, data_dir: str, supabase_url: str = None, supabase_key: str = None):
        self.data_dir = Path(data_dir)
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error: Could not connect to Supabase: {e}")
            sys.exit(1)

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 2: Database Migration Integrity",
            "data_directory": str(self.data_dir),
            "results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "sample_validations": []
        }

        # Load unified CSV data
        self.csv_data = self.load_csv_data()

    def load_csv_data(self) -> Optional[pd.DataFrame]:
        """Load the unified CSV data for comparison"""
        unified_csv_path = self.data_dir / "unified_monthly_data_enhanced.csv"

        if not unified_csv_path.exists():
            print("❌ Error: Could not find unified CSV file")
            return None

        try:
            df = pd.read_csv(unified_csv_path)
            print(f"📄 Loaded CSV: {len(df):,} records, {len(df.columns)} columns")
            return df
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return None

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 2 validation tests"""
        print("🔍 Starting Phase 2: Database Migration Integrity")
        print(f"🔗 Database: {self.supabase_url}")
        print("-" * 70)

        if self.csv_data is None:
            self.report["summary"]["overall_status"] = "FAIL"
            self.report["issues_found"].append("Critical: Could not load source CSV data")
            return self.report

        # Test 1: Database record completeness
        print("\n1️⃣ Testing database record completeness...")
        self.test_database_completeness()

        # Test 2: JSONB structure validation
        print("\n2️⃣ Testing JSONB structure integrity...")
        self.test_jsonb_structure_integrity()

        # Test 3: Data transformation accuracy
        print("\n3️⃣ Testing data transformation accuracy...")
        self.test_data_transformation_accuracy()

        # Test 4: Cross-validation with source data
        print("\n4️⃣ Testing cross-validation with source data...")
        self.test_cross_validation()

        # Generate summary
        self.generate_summary()

        return self.report

    def test_database_completeness(self) -> None:
        """Test 2.1: Verify complete migration of records"""
        print("   📊 Checking database record completeness...")

        completeness_results = {
            "csv_total_records": len(self.csv_data),
            "csv_unique_trusts": self.csv_data['trust_code'].nunique(),
            "csv_unique_periods": self.csv_data['period'].nunique(),
            "csv_period_range": f"{self.csv_data['period'].min()} to {self.csv_data['period'].max()}"
        }

        try:
            # Get database counts
            db_result = self.supabase.table('trust_metrics').select('*', count='exact').execute()
            db_total = db_result.count if hasattr(db_result, 'count') else len(db_result.data)

            # Get unique trusts and periods from database
            trust_result = self.supabase.table('trust_metrics').select('trust_code').execute()
            db_trusts = set(record['trust_code'] for record in trust_result.data)

            period_result = self.supabase.table('trust_metrics').select('period').execute()
            db_periods = set(record['period'] for record in period_result.data)

            completeness_results.update({
                "db_total_records": db_total,
                "db_unique_trusts": len(db_trusts),
                "db_unique_periods": len(db_periods),
                "db_period_range": f"{min(db_periods)} to {max(db_periods)}" if db_periods else "N/A"
            })

            # Check for missing trusts
            csv_trusts = set(self.csv_data['trust_code'].unique())
            missing_trusts = csv_trusts - db_trusts
            extra_trusts = db_trusts - csv_trusts

            # Check for missing periods
            csv_periods = set(self.csv_data['period'].unique())
            missing_periods = csv_periods - db_periods
            extra_periods = db_periods - csv_periods

            completeness_results.update({
                "missing_trusts": list(missing_trusts),
                "extra_trusts": list(extra_trusts),
                "missing_periods": list(missing_periods),
                "extra_periods": list(extra_periods),
                "record_count_match": abs(db_total - len(self.csv_data)) <= 5,  # Allow small discrepancy
                "trust_count_match": len(db_trusts) == len(csv_trusts),
                "period_count_match": len(db_periods) == len(csv_periods)
            })

            # Determine status
            issues = []
            status = "PASS"

            if abs(db_total - len(self.csv_data)) > 50:  # Critical difference
                issues.append(f"Significant record count mismatch: CSV {len(self.csv_data)} vs DB {db_total}")
                status = "FAIL"
            elif abs(db_total - len(self.csv_data)) > 5:  # Minor difference
                issues.append(f"Minor record count difference: CSV {len(self.csv_data)} vs DB {db_total}")
                status = "WARN"

            if missing_trusts:
                issues.append(f"Missing {len(missing_trusts)} trusts in database: {list(missing_trusts)[:5]}")
                status = "FAIL" if len(missing_trusts) > 10 else "WARN"

            if missing_periods:
                issues.append(f"Missing {len(missing_periods)} periods in database: {list(missing_periods)[:5]}")
                status = "WARN"

            completeness_results["status"] = status
            completeness_results["issues"] = issues

            # Report results
            status_emoji = "✅" if status == "PASS" else ("⚠️" if status == "WARN" else "❌")
            print(f"   {status_emoji} Record counts - CSV: {len(self.csv_data):,}, DB: {db_total:,}")
            print(f"      Trust counts - CSV: {len(csv_trusts)}, DB: {len(db_trusts)}")
            print(f"      Period counts - CSV: {len(csv_periods)}, DB: {len(db_periods)}")

            for issue in issues:
                print(f"      ⚠️ {issue}")

            self.report["issues_found"].extend(issues)

        except Exception as e:
            completeness_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Database completeness check failed - {str(e)}")
            print(f"   ❌ Database query failed: {str(e)}")

        self.report["results"]["database_completeness"] = completeness_results

    def test_jsonb_structure_integrity(self) -> None:
        """Test 2.2: Validate JSONB field structure and content"""
        print("   📋 Checking JSONB structure integrity...")

        jsonb_results = {
            "sample_size": 50,
            "fields_analyzed": ["rtt_data", "ae_data", "diagnostics_data", "capacity_data"],
            "structure_analysis": {},
            "empty_field_analysis": {},
            "data_type_analysis": {}
        }

        try:
            # Get sample of records for detailed analysis
            sample_result = self.supabase.table('trust_metrics').select(
                'trust_code, trust_name, period, rtt_data, ae_data, diagnostics_data, capacity_data'
            ).limit(50).execute()

            sample_records = sample_result.data
            jsonb_results["actual_sample_size"] = len(sample_records)

            print(f"      📊 Analyzing {len(sample_records)} sample records...")

            for field in jsonb_results["fields_analyzed"]:
                field_analysis = {
                    "total_records": len(sample_records),
                    "populated_count": 0,
                    "empty_count": 0,
                    "empty_string_count": 0,  # "EMPTY" values
                    "null_count": 0,
                    "valid_json_count": 0,
                    "invalid_json_count": 0,
                    "structure_examples": []
                }

                for record in sample_records:
                    field_value = record.get(field)

                    if field_value is None:
                        field_analysis["null_count"] += 1
                    elif field_value == "EMPTY":
                        field_analysis["empty_string_count"] += 1
                    elif isinstance(field_value, dict):
                        field_analysis["valid_json_count"] += 1
                        field_analysis["populated_count"] += 1

                        # Collect structure examples (first 3)
                        if len(field_analysis["structure_examples"]) < 3:
                            structure_sample = {
                                "trust_code": record.get("trust_code", "N/A"),
                                "keys": list(field_value.keys()) if isinstance(field_value, dict) else [],
                                "key_count": len(field_value.keys()) if isinstance(field_value, dict) else 0
                            }
                            field_analysis["structure_examples"].append(structure_sample)
                    else:
                        field_analysis["invalid_json_count"] += 1

                # Calculate percentages
                field_analysis["populated_percentage"] = round(
                    field_analysis["populated_count"] / len(sample_records) * 100, 1
                )
                field_analysis["empty_string_percentage"] = round(
                    field_analysis["empty_string_count"] / len(sample_records) * 100, 1
                )

                jsonb_results["structure_analysis"][field] = field_analysis

                # Report field analysis
                status_emoji = "✅" if field_analysis["populated_percentage"] > 80 else ("⚠️" if field_analysis["populated_percentage"] > 50 else "❌")
                print(f"      {status_emoji} {field}: {field_analysis['populated_percentage']}% populated, {field_analysis['empty_string_percentage']}% empty")

                # Log issues
                if field_analysis["empty_string_percentage"] > 20:
                    self.report["issues_found"].append(f"Warning: {field} has {field_analysis['empty_string_percentage']}% 'EMPTY' values")

                if field_analysis["invalid_json_count"] > 0:
                    self.report["issues_found"].append(f"Warning: {field} has {field_analysis['invalid_json_count']} invalid JSON structures")

            # Overall JSONB assessment
            avg_populated = sum(analysis["populated_percentage"] for analysis in jsonb_results["structure_analysis"].values()) / len(jsonb_results["fields_analyzed"])

            if avg_populated > 80:
                jsonb_results["overall_status"] = "PASS"
            elif avg_populated > 50:
                jsonb_results["overall_status"] = "WARN"
            else:
                jsonb_results["overall_status"] = "FAIL"

            jsonb_results["average_populated_percentage"] = round(avg_populated, 1)

        except Exception as e:
            jsonb_results.update({
                "overall_status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: JSONB structure analysis failed - {str(e)}")
            print(f"   ❌ JSONB analysis failed: {str(e)}")

        self.report["results"]["jsonb_structure"] = jsonb_results

    def test_data_transformation_accuracy(self) -> None:
        """Test 2.3: Validate data transformation accuracy by comparing sample records"""
        print("   🔍 Testing data transformation accuracy...")

        transformation_results = {
            "sample_size": 25,
            "samples_tested": [],
            "transformation_accuracy": {},
            "value_comparisons": [],
            "failed_transformations": []
        }

        try:
            # Get random sample of trusts and periods for detailed validation
            sample_combinations = []
            for _ in range(25):
                random_row = self.csv_data.sample(n=1).iloc[0]
                sample_combinations.append({
                    "trust_code": random_row['trust_code'],
                    "period": random_row['period']
                })

            transformation_results["actual_sample_size"] = len(sample_combinations)

            accurate_transformations = 0
            total_comparisons = 0

            for sample in sample_combinations:
                trust_code = sample["trust_code"]
                period = sample["period"]

                # Get CSV record
                csv_record = self.csv_data[
                    (self.csv_data['trust_code'] == trust_code) &
                    (self.csv_data['period'] == period)
                ]

                if csv_record.empty:
                    continue

                csv_record = csv_record.iloc[0]

                # Get database record
                db_result = self.supabase.table('trust_metrics').select('*').eq(
                    'trust_code', trust_code
                ).eq('period', period).execute()

                if not db_result.data:
                    transformation_results["failed_transformations"].append({
                        "trust_code": trust_code,
                        "period": period,
                        "error": "Record not found in database"
                    })
                    continue

                db_record = db_result.data[0]

                # Validate key transformations
                validation_result = self.validate_record_transformation(csv_record, db_record, trust_code, period)
                transformation_results["samples_tested"].append(validation_result)

                if validation_result["overall_accuracy"] > 0.8:  # 80% accuracy threshold
                    accurate_transformations += 1

                total_comparisons += 1

            # Calculate overall accuracy
            if total_comparisons > 0:
                overall_accuracy = accurate_transformations / total_comparisons
                transformation_results["overall_accuracy"] = round(overall_accuracy * 100, 1)
            else:
                transformation_results["overall_accuracy"] = 0

            # Determine status
            if transformation_results["overall_accuracy"] > 85:
                transformation_results["status"] = "PASS"
            elif transformation_results["overall_accuracy"] > 70:
                transformation_results["status"] = "WARN"
                self.report["issues_found"].append(f"Warning: Transformation accuracy below 85% ({transformation_results['overall_accuracy']}%)")
            else:
                transformation_results["status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Low transformation accuracy ({transformation_results['overall_accuracy']}%)")

            # Report results
            status_emoji = "✅" if transformation_results["status"] == "PASS" else ("⚠️" if transformation_results["status"] == "WARN" else "❌")
            print(f"   {status_emoji} Transformation accuracy: {transformation_results['overall_accuracy']}% ({accurate_transformations}/{total_comparisons} samples)")

            if len(transformation_results["failed_transformations"]) > 0:
                print(f"      ⚠️ {len(transformation_results['failed_transformations'])} transformations failed")

        except Exception as e:
            transformation_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Transformation accuracy testing failed - {str(e)}")
            print(f"   ❌ Transformation testing failed: {str(e)}")

        self.report["results"]["transformation_accuracy"] = transformation_results

    def validate_record_transformation(self, csv_record, db_record, trust_code: str, period: str) -> Dict[str, Any]:
        """Validate a single record's transformation accuracy"""
        validation = {
            "trust_code": trust_code,
            "period": period,
            "field_comparisons": {},
            "accurate_fields": 0,
            "total_fields": 0,
            "overall_accuracy": 0
        }

        # Define key fields to validate
        validation_fields = [
            ("ae_attendances_total", "ae_data", ["total_attendances"]),
            ("ae_4hr_performance_pct", "ae_data", ["four_hour_performance_pct"]),
            ("trust_total_percent_within_18_weeks", "rtt_data", ["trust_total", "percent_within_18_weeks"]),
            ("trust_total_total_incomplete_pathways", "rtt_data", ["trust_total", "total_incomplete_pathways"]),
        ]

        for csv_field, db_jsonb_field, json_path in validation_fields:
            validation["total_fields"] += 1

            # Get CSV value
            csv_value = csv_record.get(csv_field)

            # Get DB value from JSONB
            db_jsonb = db_record.get(db_jsonb_field, {})
            db_value = db_jsonb
            for key in json_path:
                if isinstance(db_value, dict) and key in db_value:
                    db_value = db_value[key]
                else:
                    db_value = None
                    break

            # Compare values
            comparison_result = self.compare_values(csv_value, db_value, csv_field)
            validation["field_comparisons"][csv_field] = comparison_result

            if comparison_result["accurate"]:
                validation["accurate_fields"] += 1

        # Calculate overall accuracy
        if validation["total_fields"] > 0:
            validation["overall_accuracy"] = validation["accurate_fields"] / validation["total_fields"]

        return validation

    def compare_values(self, csv_value, db_value, field_name: str) -> Dict[str, Any]:
        """Compare CSV and database values with appropriate tolerance"""
        comparison = {
            "csv_value": csv_value,
            "db_value": db_value,
            "accurate": False,
            "notes": []
        }

        # Handle null/empty values
        if pd.isna(csv_value) and (db_value is None or db_value == ""):
            comparison["accurate"] = True
            comparison["notes"].append("Both values are null/empty")
            return comparison

        if pd.isna(csv_value) or db_value is None:
            comparison["notes"].append("One value is null, the other is not")
            return comparison

        # For percentage fields, allow small tolerance due to rounding
        if "percent" in field_name.lower() or "pct" in field_name.lower():
            try:
                csv_num = float(csv_value)
                db_num = float(db_value)

                # Allow 0.1% tolerance for percentages
                if abs(csv_num - db_num) <= 0.1:
                    comparison["accurate"] = True
                else:
                    comparison["notes"].append(f"Percentage difference: {abs(csv_num - db_num):.3f}")
            except (ValueError, TypeError):
                comparison["notes"].append("Could not convert to numeric for percentage comparison")
        else:
            # For other numeric fields, allow 1% tolerance or exact match for integers
            try:
                csv_num = float(csv_value)
                db_num = float(db_value)

                if csv_num == db_num:
                    comparison["accurate"] = True
                elif csv_num != 0 and abs((csv_num - db_num) / csv_num) <= 0.01:  # 1% tolerance
                    comparison["accurate"] = True
                else:
                    comparison["notes"].append(f"Numeric difference: CSV {csv_num}, DB {db_num}")
            except (ValueError, TypeError):
                # String comparison
                if str(csv_value).strip() == str(db_value).strip():
                    comparison["accurate"] = True
                else:
                    comparison["notes"].append("String values don't match")

        return comparison

    def test_cross_validation(self) -> None:
        """Test 2.4: Cross-validate data consistency and relationships"""
        print("   🔗 Testing cross-validation with source data...")

        cross_validation_results = {
            "trust_name_consistency": {},
            "period_continuity": {},
            "data_relationships": {},
            "completeness_analysis": {}
        }

        try:
            # Test 1: Trust name consistency
            print("      📋 Checking trust name consistency...")
            trust_names_csv = dict(zip(self.csv_data['trust_code'], self.csv_data['trust_name']))

            db_trusts_result = self.supabase.table('trust_metrics').select(
                'trust_code, trust_name'
            ).execute()

            trust_names_db = {}
            for record in db_trusts_result.data:
                trust_code = record['trust_code']
                if trust_code not in trust_names_db:
                    trust_names_db[trust_code] = record['trust_name']

            inconsistent_names = {}
            for trust_code, csv_name in trust_names_csv.items():
                db_name = trust_names_db.get(trust_code, "NOT_FOUND")
                if db_name != "NOT_FOUND" and csv_name != db_name:
                    inconsistent_names[trust_code] = {
                        "csv_name": csv_name,
                        "db_name": db_name
                    }

            cross_validation_results["trust_name_consistency"] = {
                "total_trusts_checked": len(trust_names_csv),
                "inconsistent_names": len(inconsistent_names),
                "inconsistent_details": list(inconsistent_names.items())[:5]  # Show first 5
            }

            if len(inconsistent_names) > 0:
                self.report["issues_found"].append(f"Warning: {len(inconsistent_names)} trusts have inconsistent names between CSV and database")

            # Test 2: Period continuity
            print("      📅 Checking period continuity...")
            csv_periods = sorted(self.csv_data['period'].unique())

            db_periods_result = self.supabase.table('trust_metrics').select('period').execute()
            db_periods = sorted(set(record['period'] for record in db_periods_result.data))

            period_gaps = []
            for i in range(1, len(csv_periods)):
                current_period = pd.to_datetime(csv_periods[i])
                previous_period = pd.to_datetime(csv_periods[i-1])
                expected_gap = pd.Timedelta(days=32)  # Approximately 1 month + tolerance

                if current_period - previous_period > expected_gap:
                    period_gaps.append({
                        "gap_after": csv_periods[i-1],
                        "gap_before": csv_periods[i],
                        "gap_months": (current_period - previous_period).days // 30
                    })

            cross_validation_results["period_continuity"] = {
                "csv_periods": len(csv_periods),
                "db_periods": len(db_periods),
                "period_gaps": len(period_gaps),
                "gap_details": period_gaps
            }

            # Test 3: Data relationship validation
            print("      🔍 Checking data relationships...")
            relationship_checks = []

            # Sample 10 records for relationship validation
            sample_df = self.csv_data.sample(n=10)
            for _, row in sample_df.iterrows():
                trust_code = row['trust_code']
                period = row['period']

                # Check that RTT specialty totals don't exceed trust totals
                trust_total = row.get('trust_total_total_incomplete_pathways', 0)
                surgery_total = row.get('rtt_general_surgery_total_incomplete_pathways', 0)

                if pd.notna(trust_total) and pd.notna(surgery_total) and surgery_total > trust_total:
                    relationship_checks.append({
                        "trust_code": trust_code,
                        "period": period,
                        "issue": "Surgery total exceeds trust total",
                        "surgery_total": surgery_total,
                        "trust_total": trust_total
                    })

            cross_validation_results["data_relationships"] = {
                "checks_performed": len(sample_df),
                "relationship_violations": len(relationship_checks),
                "violation_details": relationship_checks
            }

            # Overall cross-validation status
            total_issues = len(inconsistent_names) + len(period_gaps) + len(relationship_checks)
            if total_issues == 0:
                cross_validation_results["overall_status"] = "PASS"
            elif total_issues <= 5:
                cross_validation_results["overall_status"] = "WARN"
            else:
                cross_validation_results["overall_status"] = "FAIL"

            print(f"      📊 Cross-validation: {len(inconsistent_names)} name issues, {len(period_gaps)} period gaps, {len(relationship_checks)} relationship violations")

        except Exception as e:
            cross_validation_results.update({
                "overall_status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Cross-validation failed - {str(e)}")
            print(f"   ❌ Cross-validation failed: {str(e)}")

        self.report["results"]["cross_validation"] = cross_validation_results

    def generate_summary(self) -> None:
        """Generate overall summary of Phase 2 testing"""
        total_issues = len(self.report["issues_found"])

        # Count critical vs warning issues
        critical_issues = [issue for issue in self.report["issues_found"] if "Critical:" in issue]
        warning_issues = total_issues - len(critical_issues)

        # Count passed tests
        tests_passed = 0
        tests_total = 0

        test_results = [
            ("database_completeness", self.report["results"].get("database_completeness", {})),
            ("jsonb_structure", self.report["results"].get("jsonb_structure", {})),
            ("transformation_accuracy", self.report["results"].get("transformation_accuracy", {})),
            ("cross_validation", self.report["results"].get("cross_validation", {}))
        ]

        for test_name, test_result in test_results:
            tests_total += 1
            status = test_result.get("status") or test_result.get("overall_status", "FAIL")
            if status == "PASS":
                tests_passed += 1

        # Overall status determination
        if len(critical_issues) > 0:
            overall_status = "FAIL"
        elif warning_issues > 3:  # Allow some warnings
            overall_status = "WARN"
        elif tests_passed / tests_total >= 0.75:  # 75% pass rate
            overall_status = "PASS"
        else:
            overall_status = "WARN"

        self.report["summary"] = {
            "overall_status": overall_status,
            "total_issues": total_issues,
            "critical_issues": len(critical_issues),
            "warning_issues": warning_issues,
            "tests_passed": tests_passed,
            "tests_total": tests_total,
            "pass_rate": round(tests_passed / tests_total * 100, 1) if tests_total > 0 else 0
        }

        # Generate recommendations
        recommendations = []
        if len(critical_issues) > 0:
            recommendations.extend([
                "🔴 Critical database migration issues found - requires immediate attention",
                "Review data transformation pipeline for systematic errors",
                "Verify all source data is being processed correctly"
            ])
        elif warning_issues > 0:
            recommendations.extend([
                "🟡 Some migration quality issues detected - recommend review",
                "Consider data quality improvements in transformation process"
            ])
        else:
            recommendations.append("✅ Database migration integrity verified - ready for Phase 3")

        # Specific recommendations based on test results
        jsonb_result = self.report["results"].get("jsonb_structure", {})
        if jsonb_result.get("overall_status") == "FAIL":
            recommendations.append("Fix JSONB structure population - check for 'EMPTY' values")

        transformation_result = self.report["results"].get("transformation_accuracy", {})
        if transformation_result.get("status") in ["FAIL", "WARN"]:
            recommendations.append("Improve data transformation accuracy - review field mapping logic")

        self.report["recommendations"] = recommendations

        # Print summary
        print("\n" + "="*70)
        print("📋 PHASE 2 SUMMARY - DATABASE MIGRATION INTEGRITY")
        print("="*70)
        status_emoji = "✅" if overall_status == "PASS" else ("⚠️" if overall_status == "WARN" else "❌")
        print(f"{status_emoji} Overall Status: {overall_status}")
        print(f"📊 Tests Passed: {tests_passed}/{tests_total} ({self.report['summary']['pass_rate']}%)")
        print(f"📋 Total Issues: {total_issues} (🔴 {len(critical_issues)} Critical, 🟡 {warning_issues} Warnings)")

        # Test-specific summaries
        if "database_completeness" in self.report["results"]:
            completeness = self.report["results"]["database_completeness"]
            csv_count = completeness.get("csv_total_records", "N/A")
            db_count = completeness.get("db_total_records", "N/A")
            print(f"📄 Migration: CSV {csv_count:,} → DB {db_count:,} records")

        if "jsonb_structure" in self.report["results"]:
            jsonb = self.report["results"]["jsonb_structure"]
            avg_populated = jsonb.get("average_populated_percentage", 0)
            print(f"📊 JSONB Structure: {avg_populated}% average field population")

        if "transformation_accuracy" in self.report["results"]:
            transform = self.report["results"]["transformation_accuracy"]
            accuracy = transform.get("overall_accuracy", 0)
            print(f"🎯 Transformation Accuracy: {accuracy}%")

        if self.report["issues_found"]:
            print(f"\n⚠️ Issues Found:")
            for i, issue in enumerate(self.report["issues_found"][:8], 1):
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
    validator = DatabaseMigrationValidator(data_dir)
    results = validator.run_all_tests()

    # Save results
    output_file = f"phase2_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Detailed results saved to: {output_file}")

    return results["summary"]["overall_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "PASS" else 1)
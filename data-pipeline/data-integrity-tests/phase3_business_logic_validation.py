#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Phase 3: Business Logic Validation
==============================================================

This script validates NHS business rules, data quality standards,
and mathematical relationships within the healthcare data.

Author: Claude Code Assistant
Date: 2025-09-24
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple, Optional
from supabase import create_client, Client
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

class BusinessLogicValidator:
    """Validates NHS business rules and data quality standards"""

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
            "test_phase": "Phase 3: Business Logic Validation",
            "results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "business_rules_tested": []
        }

        # Load unified CSV data
        self.csv_data = self.load_csv_data()
        self.db_data = self.load_database_data()

    def load_csv_data(self) -> Optional[pd.DataFrame]:
        """Load the unified CSV data for comparison"""
        unified_csv_path = self.data_dir / "unified_monthly_data_enhanced.csv"

        if not unified_csv_path.exists():
            print("❌ Error: Could not find unified CSV file")
            return None

        try:
            df = pd.read_csv(unified_csv_path)
            print(f"📄 Loaded CSV: {len(df):,} records")
            return df
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return None

    def load_database_data(self) -> Optional[List[Dict]]:
        """Load database data for business logic validation"""
        try:
            result = self.supabase.table('trust_metrics').select('*').execute()
            print(f"🔗 Loaded Database: {len(result.data):,} records")
            return result.data
        except Exception as e:
            print(f"❌ Error loading database data: {e}")
            return None

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 3 validation tests"""
        print("🔍 Starting Phase 3: Business Logic Validation")
        print(f"📊 Testing NHS business rules and data quality standards")
        print("-" * 70)

        if self.csv_data is None or self.db_data is None:
            self.report["summary"]["overall_status"] = "FAIL"
            self.report["issues_found"].append("Critical: Could not load source data")
            return self.report

        # Test 1: NHS Performance Standards
        print("\n1️⃣ Testing NHS performance standards compliance...")
        self.test_nhs_performance_standards()

        # Test 2: Mathematical consistency
        print("\n2️⃣ Testing mathematical consistency and relationships...")
        self.test_mathematical_consistency()

        # Test 3: Data range validation
        print("\n3️⃣ Testing data ranges and outlier detection...")
        self.test_data_ranges_and_outliers()

        # Test 4: Temporal consistency
        print("\n4️⃣ Testing temporal consistency and trends...")
        self.test_temporal_consistency()

        # Test 5: Business rule compliance
        print("\n5️⃣ Testing specific NHS business rules...")
        self.test_business_rule_compliance()

        # Generate summary
        self.generate_summary()

        return self.report

    def test_nhs_performance_standards(self) -> None:
        """Test 3.1: Validate against NHS performance standards and targets"""
        print("   📊 Checking NHS performance targets compliance...")

        standards_results = {
            "rtt_18_week_standard": {"target": 92.0, "violations": []},
            "ae_4_hour_standard": {"target": 95.0, "violations": []},
            "diagnostic_6_week_standard": {"target": 99.0, "violations": []},  # Less than 1% waiting over 6 weeks
            "ambulance_response_standards": {"violations": []},
            "compliance_summary": {}
        }

        try:
            # Test RTT 18-week standard (92% within 18 weeks)
            print("      🏥 Checking RTT 18-week standard (target: 92%)...")
            rtt_violations = []

            for record in self.db_data:
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                    trust_total = rtt_data['trust_total']
                    if isinstance(trust_total, dict):
                        performance = trust_total.get('percent_within_18_weeks')
                        if performance is not None and performance < 92.0:
                            rtt_violations.append({
                                "trust_code": record.get('trust_code'),
                                "trust_name": record.get('trust_name', '')[:30] + '...',
                                "period": record.get('period'),
                                "performance": round(performance, 2),
                                "shortfall": round(92.0 - performance, 2)
                            })

            standards_results["rtt_18_week_standard"]["violations"] = rtt_violations[:10]  # Keep first 10
            standards_results["rtt_18_week_standard"]["violation_count"] = len(rtt_violations)

            # Test A&E 4-hour standard (95% within 4 hours)
            print("      🚑 Checking A&E 4-hour standard (target: 95%)...")
            ae_violations = []

            for record in self.db_data:
                ae_data = record.get('ae_data', {})
                if isinstance(ae_data, dict):
                    performance = ae_data.get('four_hour_performance_pct')
                    if performance is not None and performance < 95.0:
                        ae_violations.append({
                            "trust_code": record.get('trust_code'),
                            "trust_name": record.get('trust_name', '')[:30] + '...',
                            "period": record.get('period'),
                            "performance": round(performance, 2),
                            "shortfall": round(95.0 - performance, 2)
                        })

            standards_results["ae_4_hour_standard"]["violations"] = ae_violations[:10]
            standards_results["ae_4_hour_standard"]["violation_count"] = len(ae_violations)

            # Test diagnostic waiting times (6-week standard)
            print("      🔬 Checking diagnostic 6-week standard...")
            diagnostic_violations = []

            for record in self.db_data:
                diag_data = record.get('diagnostics_data', {})
                if isinstance(diag_data, dict):
                    # Check MRI scans as example
                    mri_data = diag_data.get('mri_scans', {})
                    if isinstance(mri_data, dict):
                        six_week_breaches = mri_data.get('six_week_breaches', 0)
                        total_waiting = mri_data.get('total_waiting', 0)

                        if total_waiting > 0:
                            breach_percentage = (six_week_breaches / total_waiting) * 100
                            if breach_percentage > 1.0:  # More than 1% breaching 6 weeks
                                diagnostic_violations.append({
                                    "trust_code": record.get('trust_code'),
                                    "trust_name": record.get('trust_name', '')[:30] + '...',
                                    "period": record.get('period'),
                                    "test_type": "MRI",
                                    "breach_percentage": round(breach_percentage, 2),
                                    "breaches": six_week_breaches,
                                    "total_waiting": total_waiting
                                })

            standards_results["diagnostic_6_week_standard"]["violations"] = diagnostic_violations[:10]
            standards_results["diagnostic_6_week_standard"]["violation_count"] = len(diagnostic_violations)

            # Generate compliance summary
            total_records = len(self.db_data)
            standards_results["compliance_summary"] = {
                "total_trust_periods": total_records,
                "rtt_compliant": total_records - len(rtt_violations),
                "ae_compliant": total_records - len(ae_violations),
                "diagnostic_compliant": total_records - len(diagnostic_violations),
                "rtt_compliance_rate": round((total_records - len(rtt_violations)) / total_records * 100, 1) if total_records > 0 else 0,
                "ae_compliance_rate": round((total_records - len(ae_violations)) / total_records * 100, 1) if total_records > 0 else 0,
                "diagnostic_compliance_rate": round((total_records - len(diagnostic_violations)) / total_records * 100, 1) if total_records > 0 else 0
            }

            # Report findings
            print(f"      📊 RTT 18-week compliance: {standards_results['compliance_summary']['rtt_compliance_rate']}% ({len(rtt_violations)} violations)")
            print(f"      📊 A&E 4-hour compliance: {standards_results['compliance_summary']['ae_compliance_rate']}% ({len(ae_violations)} violations)")
            print(f"      📊 Diagnostic 6-week compliance: {standards_results['compliance_summary']['diagnostic_compliance_rate']}% ({len(diagnostic_violations)} violations)")

            # Log issues for low compliance
            if standards_results['compliance_summary']['rtt_compliance_rate'] < 60:
                self.report["issues_found"].append(f"Warning: Low RTT compliance rate ({standards_results['compliance_summary']['rtt_compliance_rate']}%)")

            if standards_results['compliance_summary']['ae_compliance_rate'] < 40:
                self.report["issues_found"].append(f"Warning: Very low A&E compliance rate ({standards_results['compliance_summary']['ae_compliance_rate']}%)")

            standards_results["status"] = "PASS"  # This is informational, not a pass/fail test

        except Exception as e:
            standards_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: NHS standards testing failed - {str(e)}")
            print(f"   ❌ Standards testing failed: {str(e)}")

        self.report["results"]["nhs_performance_standards"] = standards_results

    def test_mathematical_consistency(self) -> None:
        """Test 3.2: Validate mathematical relationships and totals"""
        print("   🧮 Checking mathematical consistency...")

        math_results = {
            "rtt_specialty_totals": {"tests": 0, "violations": []},
            "ae_attendance_totals": {"tests": 0, "violations": []},
            "percentage_calculations": {"tests": 0, "violations": []},
            "waiting_list_mathematics": {"tests": 0, "violations": []}
        }

        try:
            # Test RTT specialty totals vs trust totals
            print("      🏥 Validating RTT specialty totals...")
            rtt_total_violations = []

            for record in self.db_data:
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data and 'specialties' in rtt_data:
                    trust_total_pathways = rtt_data['trust_total'].get('total_incomplete_pathways')

                    if trust_total_pathways and trust_total_pathways > 0:
                        math_results["rtt_specialty_totals"]["tests"] += 1

                        # Sum specialty totals
                        specialty_sum = 0
                        specialties = rtt_data.get('specialties', {})

                        for specialty_name, specialty_data in specialties.items():
                            if isinstance(specialty_data, dict):
                                specialty_total = specialty_data.get('total_incomplete_pathways', 0)
                                if specialty_total:
                                    specialty_sum += specialty_total

                        # Allow 30% tolerance - NHS trusts may have specialties not individually reported
                        # or trust totals may include aggregated data beyond individual specialties
                        if specialty_sum > 0 and abs(trust_total_pathways - specialty_sum) / trust_total_pathways > 0.30:
                            rtt_total_violations.append({
                                "trust_code": record.get('trust_code'),
                                "period": record.get('period'),
                                "trust_total": trust_total_pathways,
                                "specialty_sum": specialty_sum,
                                "difference": trust_total_pathways - specialty_sum,
                                "difference_pct": round(abs(trust_total_pathways - specialty_sum) / trust_total_pathways * 100, 2)
                            })

            math_results["rtt_specialty_totals"]["violations"] = rtt_total_violations[:5]  # First 5
            math_results["rtt_specialty_totals"]["violation_count"] = len(rtt_total_violations)

            # Test percentage calculations
            print("      📊 Validating percentage calculations...")
            percentage_violations = []

            for record in self.db_data:
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                    trust_total = rtt_data['trust_total']
                    if isinstance(trust_total, dict):
                        total_pathways = trust_total.get('total_incomplete_pathways', 0)
                        within_18_weeks = trust_total.get('total_within_18_weeks', 0)
                        reported_percentage = trust_total.get('percent_within_18_weeks', 0)

                        if total_pathways > 0 and within_18_weeks is not None and reported_percentage is not None:
                            math_results["percentage_calculations"]["tests"] += 1

                            # Calculate expected percentage
                            expected_percentage = (within_18_weeks / total_pathways) * 100

                            # Allow 0.5% tolerance for rounding
                            if abs(expected_percentage - reported_percentage) > 0.5:
                                percentage_violations.append({
                                    "trust_code": record.get('trust_code'),
                                    "period": record.get('period'),
                                    "total_pathways": total_pathways,
                                    "within_18_weeks": within_18_weeks,
                                    "reported_percentage": round(reported_percentage, 2),
                                    "calculated_percentage": round(expected_percentage, 2),
                                    "difference": round(abs(expected_percentage - reported_percentage), 2)
                                })

            math_results["percentage_calculations"]["violations"] = percentage_violations[:5]
            math_results["percentage_calculations"]["violation_count"] = len(percentage_violations)

            # Test waiting list mathematics (total = within + over)
            print("      ⏳ Validating waiting list mathematics...")
            waiting_list_violations = []

            for record in self.db_data:
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                    trust_total = rtt_data['trust_total']
                    if isinstance(trust_total, dict):
                        total_pathways = trust_total.get('total_incomplete_pathways', 0)
                        within_18_weeks = trust_total.get('total_within_18_weeks', 0)
                        over_18_weeks = trust_total.get('total_over_18_weeks', 0)

                        if all(x is not None for x in [total_pathways, within_18_weeks, over_18_weeks]) and total_pathways > 0:
                            math_results["waiting_list_mathematics"]["tests"] += 1

                            calculated_total = within_18_weeks + over_18_weeks

                            # Allow small tolerance for data inconsistencies
                            tolerance = max(1, total_pathways * 0.01)  # 1% or minimum 1

                            if abs(total_pathways - calculated_total) > tolerance:
                                waiting_list_violations.append({
                                    "trust_code": record.get('trust_code'),
                                    "period": record.get('period'),
                                    "reported_total": total_pathways,
                                    "within_18_weeks": within_18_weeks,
                                    "over_18_weeks": over_18_weeks,
                                    "calculated_total": calculated_total,
                                    "difference": total_pathways - calculated_total
                                })

            math_results["waiting_list_mathematics"]["violations"] = waiting_list_violations[:5]
            math_results["waiting_list_mathematics"]["violation_count"] = len(waiting_list_violations)

            # Overall mathematical consistency assessment
            total_violations = sum([
                len(rtt_total_violations),
                len(percentage_violations),
                len(waiting_list_violations)
            ])

            total_tests = sum([
                math_results["rtt_specialty_totals"]["tests"],
                math_results["percentage_calculations"]["tests"],
                math_results["waiting_list_mathematics"]["tests"]
            ])

            if total_tests > 0:
                accuracy_rate = ((total_tests - total_violations) / total_tests) * 100
                math_results["overall_accuracy_rate"] = round(accuracy_rate, 1)
            else:
                math_results["overall_accuracy_rate"] = 0

            # Determine status
            if math_results["overall_accuracy_rate"] > 95:
                math_results["status"] = "PASS"
            elif math_results["overall_accuracy_rate"] > 85:
                math_results["status"] = "WARN"
                self.report["issues_found"].append(f"Warning: Mathematical consistency at {math_results['overall_accuracy_rate']}%")
            else:
                math_results["status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Low mathematical consistency ({math_results['overall_accuracy_rate']}%)")

            print(f"      📊 Mathematical consistency: {math_results['overall_accuracy_rate']}% ({total_violations} violations in {total_tests} tests)")

        except Exception as e:
            math_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Mathematical consistency testing failed - {str(e)}")
            print(f"   ❌ Mathematical consistency testing failed: {str(e)}")

        self.report["results"]["mathematical_consistency"] = math_results

    def test_data_ranges_and_outliers(self) -> None:
        """Test 3.3: Validate data ranges and detect outliers"""
        print("   📈 Detecting outliers and validating data ranges...")

        outlier_results = {
            "performance_percentages": {"tests": 0, "outliers": []},
            "waiting_times": {"tests": 0, "outliers": []},
            "attendance_volumes": {"tests": 0, "outliers": []},
            "statistical_outliers": {"tests": 0, "outliers": []}
        }

        try:
            # Test performance percentages (should be 0-100%)
            print("      📊 Checking performance percentage ranges...")
            percentage_outliers = []

            for record in self.db_data:
                outlier_results["performance_percentages"]["tests"] += 1

                # Check RTT performance
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                    trust_total = rtt_data['trust_total']
                    if isinstance(trust_total, dict):
                        rtt_performance = trust_total.get('percent_within_18_weeks')
                        if rtt_performance is not None and (rtt_performance < 0 or rtt_performance > 100):
                            percentage_outliers.append({
                                "trust_code": record.get('trust_code'),
                                "period": record.get('period'),
                                "metric": "RTT 18-week performance",
                                "value": rtt_performance,
                                "issue": "Outside 0-100% range"
                            })

                # Check A&E performance
                ae_data = record.get('ae_data', {})
                if isinstance(ae_data, dict):
                    ae_performance = ae_data.get('four_hour_performance_pct')
                    if ae_performance is not None and (ae_performance < 0 or ae_performance > 100):
                        percentage_outliers.append({
                            "trust_code": record.get('trust_code'),
                            "period": record.get('period'),
                            "metric": "A&E 4-hour performance",
                            "value": ae_performance,
                            "issue": "Outside 0-100% range"
                        })

            outlier_results["performance_percentages"]["outliers"] = percentage_outliers[:10]
            outlier_results["performance_percentages"]["outlier_count"] = len(percentage_outliers)

            # Test waiting times (should be reasonable ranges)
            print("      ⏱️ Checking waiting time ranges...")
            waiting_time_outliers = []

            for record in self.db_data:
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                    trust_total = rtt_data['trust_total']
                    if isinstance(trust_total, dict):
                        median_wait = trust_total.get('median_wait_weeks')
                        if median_wait is not None:
                            outlier_results["waiting_times"]["tests"] += 1

                            # Flag unusually high or low median waits
                            if median_wait < 0:
                                waiting_time_outliers.append({
                                    "trust_code": record.get('trust_code'),
                                    "period": record.get('period'),
                                    "metric": "Median wait weeks",
                                    "value": median_wait,
                                    "issue": "Negative waiting time"
                                })
                            elif median_wait > 104:  # More than 2 years
                                waiting_time_outliers.append({
                                    "trust_code": record.get('trust_code'),
                                    "period": record.get('period'),
                                    "metric": "Median wait weeks",
                                    "value": median_wait,
                                    "issue": "Exceptionally long wait (>2 years)"
                                })

            outlier_results["waiting_times"]["outliers"] = waiting_time_outliers[:10]
            outlier_results["waiting_times"]["outlier_count"] = len(waiting_time_outliers)

            # Test attendance volumes (detect unusually high/low volumes)
            print("      👥 Checking attendance volume outliers...")
            attendance_outliers = []

            # Extract A&E attendances for statistical analysis
            ae_attendances = []
            for record in self.db_data:
                ae_data = record.get('ae_data', {})
                if isinstance(ae_data, dict):
                    attendances = ae_data.get('total_attendances')
                    if attendances is not None and attendances > 0:
                        ae_attendances.append({
                            "trust_code": record.get('trust_code'),
                            "period": record.get('period'),
                            "attendances": attendances
                        })

            if len(ae_attendances) > 10:  # Need sufficient data for statistical analysis
                attendances_values = [x['attendances'] for x in ae_attendances]
                q1 = np.percentile(attendances_values, 25)
                q3 = np.percentile(attendances_values, 75)
                iqr = q3 - q1
                lower_bound = q1 - 3 * iqr  # 3 IQR rule for extreme outliers
                upper_bound = q3 + 3 * iqr

                outlier_results["attendance_volumes"]["tests"] = len(ae_attendances)

                for attendance_record in ae_attendances:
                    attendances = attendance_record['attendances']
                    if attendances < lower_bound or attendances > upper_bound:
                        attendance_outliers.append({
                            "trust_code": attendance_record['trust_code'],
                            "period": attendance_record['period'],
                            "metric": "A&E attendances",
                            "value": attendances,
                            "issue": f"Statistical outlier (normal range: {int(lower_bound):,}-{int(upper_bound):,})"
                        })

            outlier_results["attendance_volumes"]["outliers"] = attendance_outliers[:10]
            outlier_results["attendance_volumes"]["outlier_count"] = len(attendance_outliers)

            # Overall outlier assessment
            total_outliers = len(percentage_outliers) + len(waiting_time_outliers) + len(attendance_outliers)
            total_tests = (
                outlier_results["performance_percentages"]["tests"] +
                outlier_results["waiting_times"]["tests"] +
                outlier_results["attendance_volumes"]["tests"]
            )

            if total_tests > 0:
                outlier_rate = (total_outliers / total_tests) * 100
                outlier_results["overall_outlier_rate"] = round(outlier_rate, 2)
            else:
                outlier_results["overall_outlier_rate"] = 0

            # Determine status
            if outlier_results["overall_outlier_rate"] < 1:
                outlier_results["status"] = "PASS"
            elif outlier_results["overall_outlier_rate"] < 5:
                outlier_results["status"] = "WARN"
                self.report["issues_found"].append(f"Warning: {outlier_results['overall_outlier_rate']}% outlier rate detected")
            else:
                outlier_results["status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: High outlier rate ({outlier_results['overall_outlier_rate']}%)")

            print(f"      📊 Outlier detection: {outlier_results['overall_outlier_rate']}% outlier rate ({total_outliers} in {total_tests} tests)")

        except Exception as e:
            outlier_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Outlier detection failed - {str(e)}")
            print(f"   ❌ Outlier detection failed: {str(e)}")

        self.report["results"]["outlier_detection"] = outlier_results

    def test_temporal_consistency(self) -> None:
        """Test 3.4: Validate temporal consistency and trend patterns"""
        print("   📅 Testing temporal consistency...")

        temporal_results = {
            "period_coverage": {},
            "trend_analysis": {},
            "seasonal_patterns": {},
            "data_continuity": {}
        }

        try:
            # Analyze period coverage by trust
            print("      📊 Analyzing period coverage...")
            trust_periods = defaultdict(list)

            for record in self.db_data:
                trust_code = record.get('trust_code')
                period = record.get('period')
                if trust_code and period:
                    trust_periods[trust_code].append(period)

            # Check for trusts with incomplete period coverage
            expected_periods = set()
            for periods in trust_periods.values():
                expected_periods.update(periods)
            expected_periods = sorted(list(expected_periods))

            coverage_issues = []
            for trust_code, periods in trust_periods.items():
                missing_periods = set(expected_periods) - set(periods)
                if missing_periods:
                    coverage_issues.append({
                        "trust_code": trust_code,
                        "missing_periods": len(missing_periods),
                        "total_expected": len(expected_periods),
                        "coverage_rate": round(len(periods) / len(expected_periods) * 100, 1)
                    })

            temporal_results["period_coverage"] = {
                "total_trusts": len(trust_periods),
                "expected_periods": len(expected_periods),
                "period_range": f"{min(expected_periods)} to {max(expected_periods)}" if expected_periods else "N/A",
                "trusts_with_gaps": len(coverage_issues),
                "coverage_issues": coverage_issues[:10]  # First 10
            }

            # Simple trend analysis for key metrics
            print("      📈 Analyzing trends...")
            trend_violations = []

            # Group by trust and analyze trends
            trust_data = defaultdict(list)
            for record in self.db_data:
                trust_code = record.get('trust_code')
                if trust_code:
                    # Extract key metrics
                    rtt_data = record.get('rtt_data', {})
                    ae_data = record.get('ae_data', {})

                    metric_point = {
                        "period": record.get('period'),
                        "rtt_performance": None,
                        "ae_performance": None
                    }

                    if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                        trust_total = rtt_data['trust_total']
                        if isinstance(trust_total, dict):
                            metric_point["rtt_performance"] = trust_total.get('percent_within_18_weeks')

                    if isinstance(ae_data, dict):
                        metric_point["ae_performance"] = ae_data.get('four_hour_performance_pct')

                    trust_data[trust_code].append(metric_point)

            # Analyze trends for trusts with multiple periods
            trend_analysis_count = 0
            for trust_code, metrics in trust_data.items():
                if len(metrics) >= 3:  # Need at least 3 points for trend
                    trend_analysis_count += 1

                    # Sort by period
                    metrics.sort(key=lambda x: x['period'])

                    # Check for unrealistic jumps in performance
                    for i in range(1, len(metrics)):
                        current = metrics[i]
                        previous = metrics[i-1]

                        # Check RTT performance jumps
                        if (current["rtt_performance"] is not None and
                            previous["rtt_performance"] is not None):
                            performance_change = current["rtt_performance"] - previous["rtt_performance"]

                            # Flag jumps > 30 percentage points in one month
                            if abs(performance_change) > 30:
                                trend_violations.append({
                                    "trust_code": trust_code,
                                    "metric": "RTT Performance",
                                    "period_from": previous["period"],
                                    "period_to": current["period"],
                                    "value_from": round(previous["rtt_performance"], 1),
                                    "value_to": round(current["rtt_performance"], 1),
                                    "change": round(performance_change, 1),
                                    "issue": "Large month-to-month change"
                                })

            temporal_results["trend_analysis"] = {
                "trusts_analyzed": trend_analysis_count,
                "trend_violations": len(trend_violations),
                "violation_details": trend_violations[:5]
            }

            # Overall temporal consistency assessment
            total_issues = len(coverage_issues) + len(trend_violations)
            if total_issues == 0:
                temporal_results["status"] = "PASS"
            elif total_issues <= 10:
                temporal_results["status"] = "WARN"
                self.report["issues_found"].append(f"Warning: {total_issues} temporal consistency issues found")
            else:
                temporal_results["status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: {total_issues} temporal consistency issues found")

            print(f"      📊 Period coverage: {temporal_results['period_coverage']['trusts_with_gaps']} trusts have gaps")
            print(f"      📊 Trend analysis: {len(trend_violations)} unusual trend patterns detected")

        except Exception as e:
            temporal_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Temporal consistency testing failed - {str(e)}")
            print(f"   ❌ Temporal consistency testing failed: {str(e)}")

        self.report["results"]["temporal_consistency"] = temporal_results

    def test_business_rule_compliance(self) -> None:
        """Test 3.5: Test specific NHS business rules"""
        print("   📋 Testing NHS business rule compliance...")

        business_rules_results = {
            "rules_tested": [],
            "violations": [],
            "compliance_summary": {}
        }

        try:
            # Rule 1: 52+ week waits should be subset of 18+ week waits
            print("      📊 Testing Rule 1: Long wait hierarchies...")
            rule1_violations = []
            rule1_tests = 0

            for record in self.db_data:
                rtt_data = record.get('rtt_data', {})
                if isinstance(rtt_data, dict) and 'trust_total' in rtt_data:
                    trust_total = rtt_data['trust_total']
                    if isinstance(trust_total, dict):
                        over_18_weeks = trust_total.get('total_over_18_weeks', 0)
                        over_52_weeks = trust_total.get('total_52_plus_weeks', 0)

                        if over_18_weeks is not None and over_52_weeks is not None:
                            rule1_tests += 1

                            # 52+ week waits should be <= 18+ week waits
                            if over_52_weeks > over_18_weeks:
                                rule1_violations.append({
                                    "trust_code": record.get('trust_code'),
                                    "period": record.get('period'),
                                    "rule": "52+ week waits > 18+ week waits",
                                    "over_18_weeks": over_18_weeks,
                                    "over_52_weeks": over_52_weeks
                                })

            business_rules_results["rules_tested"].append({
                "rule_name": "Long wait hierarchies (52+ weeks ≤ 18+ weeks)",
                "tests_performed": rule1_tests,
                "violations": len(rule1_violations),
                "compliance_rate": round((rule1_tests - len(rule1_violations)) / rule1_tests * 100, 1) if rule1_tests > 0 else 0
            })

            # Rule 2: A&E breaches should not exceed total attendances
            print("      📊 Testing Rule 2: A&E attendance logic...")
            rule2_violations = []
            rule2_tests = 0

            for record in self.db_data:
                ae_data = record.get('ae_data', {})
                if isinstance(ae_data, dict):
                    total_attendances = ae_data.get('total_attendances', 0)
                    over_4hrs = ae_data.get('over_four_hours_total', 0)

                    if total_attendances is not None and over_4hrs is not None and total_attendances > 0:
                        rule2_tests += 1

                        # Over 4 hours should be <= total attendances
                        if over_4hrs > total_attendances:
                            rule2_violations.append({
                                "trust_code": record.get('trust_code'),
                                "period": record.get('period'),
                                "rule": "Over 4hr waits > total attendances",
                                "total_attendances": total_attendances,
                                "over_4hrs": over_4hrs
                            })

            business_rules_results["rules_tested"].append({
                "rule_name": "A&E attendance logic (breaches ≤ total attendances)",
                "tests_performed": rule2_tests,
                "violations": len(rule2_violations),
                "compliance_rate": round((rule2_tests - len(rule2_violations)) / rule2_tests * 100, 1) if rule2_tests > 0 else 0
            })

            # Rule 3: Diagnostic waiting list consistency
            print("      📊 Testing Rule 3: Diagnostic waiting list consistency...")
            rule3_violations = []
            rule3_tests = 0

            for record in self.db_data:
                diag_data = record.get('diagnostics_data', {})
                if isinstance(diag_data, dict):
                    # Check MRI consistency as example
                    mri_data = diag_data.get('mri_scans', {})
                    if isinstance(mri_data, dict):
                        total_waiting = mri_data.get('total_waiting', 0)
                        six_week_breaches = mri_data.get('six_week_breaches', 0)
                        thirteen_week_breaches = mri_data.get('thirteen_week_breaches', 0)

                        if all(x is not None for x in [total_waiting, six_week_breaches, thirteen_week_breaches]):
                            rule3_tests += 1

                            # 13 week breaches should be <= 6 week breaches <= total waiting
                            if thirteen_week_breaches > six_week_breaches or six_week_breaches > total_waiting:
                                rule3_violations.append({
                                    "trust_code": record.get('trust_code'),
                                    "period": record.get('period'),
                                    "rule": "Diagnostic wait hierarchy violation",
                                    "total_waiting": total_waiting,
                                    "six_week_breaches": six_week_breaches,
                                    "thirteen_week_breaches": thirteen_week_breaches
                                })

            business_rules_results["rules_tested"].append({
                "rule_name": "Diagnostic wait hierarchy (13wk ≤ 6wk ≤ total)",
                "tests_performed": rule3_tests,
                "violations": len(rule3_violations),
                "compliance_rate": round((rule3_tests - len(rule3_violations)) / rule3_tests * 100, 1) if rule3_tests > 0 else 0
            })

            # Combine all violations
            all_violations = rule1_violations + rule2_violations + rule3_violations
            business_rules_results["violations"] = all_violations[:10]  # First 10

            # Calculate overall compliance
            total_tests = rule1_tests + rule2_tests + rule3_tests
            total_violations = len(rule1_violations) + len(rule2_violations) + len(rule3_violations)

            if total_tests > 0:
                overall_compliance = ((total_tests - total_violations) / total_tests) * 100
                business_rules_results["compliance_summary"] = {
                    "total_tests": total_tests,
                    "total_violations": total_violations,
                    "overall_compliance_rate": round(overall_compliance, 1)
                }

                # Determine status
                if overall_compliance > 95:
                    business_rules_results["status"] = "PASS"
                elif overall_compliance > 85:
                    business_rules_results["status"] = "WARN"
                    self.report["issues_found"].append(f"Warning: Business rule compliance at {overall_compliance:.1f}%")
                else:
                    business_rules_results["status"] = "FAIL"
                    self.report["issues_found"].append(f"Critical: Low business rule compliance ({overall_compliance:.1f}%)")

                print(f"      📊 Business rule compliance: {overall_compliance:.1f}% ({total_violations} violations in {total_tests} tests)")

        except Exception as e:
            business_rules_results.update({
                "status": "FAIL",
                "error": str(e)
            })
            self.report["issues_found"].append(f"Critical: Business rule testing failed - {str(e)}")
            print(f"   ❌ Business rule testing failed: {str(e)}")

        self.report["results"]["business_rule_compliance"] = business_rules_results

    def generate_summary(self) -> None:
        """Generate overall summary of Phase 3 testing"""
        total_issues = len(self.report["issues_found"])

        # Count critical vs warning issues
        critical_issues = [issue for issue in self.report["issues_found"] if "Critical:" in issue]
        warning_issues = total_issues - len(critical_issues)

        # Count passed tests
        tests_passed = 0
        tests_total = 0

        test_results = [
            ("nhs_performance_standards", self.report["results"].get("nhs_performance_standards", {})),
            ("mathematical_consistency", self.report["results"].get("mathematical_consistency", {})),
            ("outlier_detection", self.report["results"].get("outlier_detection", {})),
            ("temporal_consistency", self.report["results"].get("temporal_consistency", {})),
            ("business_rule_compliance", self.report["results"].get("business_rule_compliance", {}))
        ]

        for test_name, test_result in test_results:
            tests_total += 1
            status = test_result.get("status", "FAIL")
            if status == "PASS":
                tests_passed += 1

        # Overall status determination
        if len(critical_issues) > 0:
            overall_status = "FAIL"
        elif warning_issues > 5:  # Allow some warnings for NHS data
            overall_status = "WARN"
        elif tests_passed / tests_total >= 0.6:  # 60% pass rate (NHS data can be challenging)
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
                "🔴 Critical business logic violations found - requires data quality review",
                "Review data transformation and validation processes",
                "Implement additional business rule checks in data pipeline"
            ])
        elif warning_issues > 0:
            recommendations.extend([
                "🟡 Some business logic issues detected - recommend review",
                "Consider implementing automated business rule validation",
                "Review data quality processes for continuous improvement"
            ])
        else:
            recommendations.append("✅ Business logic validation passed - data meets NHS standards")

        # Specific recommendations based on test results
        math_result = self.report["results"].get("mathematical_consistency", {})
        if math_result.get("status") in ["FAIL", "WARN"]:
            recommendations.append("Review mathematical calculations in data transformation")

        outlier_result = self.report["results"].get("outlier_detection", {})
        if outlier_result.get("status") in ["FAIL", "WARN"]:
            recommendations.append("Investigate statistical outliers for data quality issues")

        self.report["recommendations"] = recommendations

        # Print summary
        print("\n" + "="*70)
        print("📋 PHASE 3 SUMMARY - BUSINESS LOGIC VALIDATION")
        print("="*70)
        status_emoji = "✅" if overall_status == "PASS" else ("⚠️" if overall_status == "WARN" else "❌")
        print(f"{status_emoji} Overall Status: {overall_status}")
        print(f"📊 Tests Passed: {tests_passed}/{tests_total} ({self.report['summary']['pass_rate']}%)")
        print(f"📋 Total Issues: {total_issues} (🔴 {len(critical_issues)} Critical, 🟡 {warning_issues} Warnings)")

        # Test-specific summaries
        if "mathematical_consistency" in self.report["results"]:
            math_data = self.report["results"]["mathematical_consistency"]
            accuracy = math_data.get("overall_accuracy_rate", 0)
            print(f"🧮 Mathematical Consistency: {accuracy}%")

        if "outlier_detection" in self.report["results"]:
            outlier_data = self.report["results"]["outlier_detection"]
            outlier_rate = outlier_data.get("overall_outlier_rate", 0)
            print(f"📈 Outlier Rate: {outlier_rate}%")

        if "business_rule_compliance" in self.report["results"]:
            business_data = self.report["results"]["business_rule_compliance"]
            compliance = business_data.get("compliance_summary", {}).get("overall_compliance_rate", 0)
            print(f"📋 Business Rule Compliance: {compliance}%")

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
    validator = BusinessLogicValidator(data_dir)
    results = validator.run_all_tests()

    # Save results
    output_file = f"phase3_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Detailed results saved to: {output_file}")

    return results["summary"]["overall_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "PASS" else 1)
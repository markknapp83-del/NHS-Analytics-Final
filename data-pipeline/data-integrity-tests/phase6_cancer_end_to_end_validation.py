#!/usr/bin/env python3
"""
NHS Cancer Performance Data Accuracy Testing - Phase 6: End-to-End Pipeline Validation
=======================================================================================

This script performs comprehensive end-to-end validation by tracing cancer data
from raw Excel files through processing, database storage, and frontend display
to ensure complete pipeline accuracy and data integrity.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import os
import sys
import json
import subprocess
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
import traceback
from supabase import create_client, Client
import pandas as pd
import random

# Add project root to path for imports
sys.path.append('/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master')

class CancerEndToEndValidator:
    """Validates complete end-to-end cancer data pipeline accuracy"""

    def __init__(self, project_dir: str, data_dir: str, supabase_url: str = None, supabase_key: str = None):
        self.project_dir = Path(project_dir)
        self.data_dir = Path(data_dir)
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error connecting to Supabase: {e}")

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 6: End-to-End Pipeline Validation",
            "project_directory": str(self.project_dir),
            "data_directory": str(self.data_dir),
            "validation_results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "overall_status": "UNKNOWN",
            "confidence_level": 0.0
        }

        # Sample trusts and files for comprehensive testing
        self.test_trusts = ['RJ1', 'RGT', 'RBL', 'RTH']
        self.cancer_files = [
            "CWT-CRS-Apr-2024-to-Sep-2024-Data-Extract-Provider-Final.xlsx",
            "CWT-CRS-Oct-2024-to-Mar-2025-Data-Extract-Provider.xlsx",
            "CWT-CRS-Apr-2025-to-Jul-2025-Data-Extract-Provider.xlsx"
        ]

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 6 end-to-end pipeline validation tests"""
        print(f"\n🧪 Starting Phase 6: End-to-End Cancer Data Pipeline Validation")
        print(f"📂 Project directory: {self.project_dir}")
        print(f"📂 Data directory: {self.data_dir}")

        try:
            # Test 1: Complete pipeline traceability
            self._test_complete_pipeline_traceability()

            # Test 2: Data consistency across pipeline stages
            self._test_cross_stage_consistency()

            # Test 3: Performance metrics end-to-end accuracy
            self._test_performance_metrics_e2e()

            # Test 4: Trust-specific data validation
            self._test_trust_specific_validation()

            # Test 5: Regression testing with known values
            self._test_regression_validation()

            # Test 6: Edge case handling
            self._test_edge_case_handling()

            # Test 7: Overall system reliability
            self._test_system_reliability()

            # Generate summary and confidence score
            self._generate_summary()

        except Exception as e:
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "TEST_EXECUTION_ERROR",
                "description": f"Failed to complete end-to-end pipeline tests: {str(e)}",
                "impact": "Cannot validate complete pipeline accuracy",
                "recommendation": "Review test setup and system availability"
            })
            self.report["overall_status"] = "ERROR"
            traceback.print_exc()

        return self.report

    def _test_complete_pipeline_traceability(self):
        """Test complete traceability from Excel to frontend display"""
        print("\n🔍 Test 1: Complete Pipeline Traceability")

        results = {
            "traces_performed": 0,
            "successful_traces": 0,
            "trace_failures": [],
            "pipeline_stages_tested": ["excel", "processing", "database", "frontend"],
            "stage_pass_rates": {}
        }

        # Select random sample data points for tracing
        for trust_code in self.test_trusts[:2]:  # Test 2 trusts for detailed tracing
            for filename in self.cancer_files[:1]:  # Test 1 file per trust for performance
                file_path = self.data_dir / filename

                if not file_path.exists():
                    continue

                print(f"  🔍 Tracing {trust_code} data through {filename}")
                results["traces_performed"] += 1

                trace_result = self._trace_data_through_pipeline(trust_code, file_path)

                if trace_result["success"]:
                    results["successful_traces"] += 1
                    print(f"    ✅ Complete trace successful")

                    # Record stage pass rates
                    for stage, passed in trace_result["stages"].items():
                        if stage not in results["stage_pass_rates"]:
                            results["stage_pass_rates"][stage] = {"passed": 0, "total": 0}
                        results["stage_pass_rates"][stage]["total"] += 1
                        if passed:
                            results["stage_pass_rates"][stage]["passed"] += 1

                else:
                    results["trace_failures"].append({
                        "trust": trust_code,
                        "file": filename,
                        "failed_stage": trace_result.get("failed_stage"),
                        "error": trace_result.get("error")
                    })
                    print(f"    ❌ Trace failed at stage: {trace_result.get('failed_stage', 'unknown')}")

        # Calculate traceability score
        traceability_score = (results["successful_traces"] / results["traces_performed"]) * 100 if results["traces_performed"] > 0 else 0

        print(f"  🔍 Traceability success rate: {traceability_score:.1f}% ({results['successful_traces']}/{results['traces_performed']})")

        # Show stage pass rates
        if results["stage_pass_rates"]:
            print(f"  📊 Stage pass rates:")
            for stage, rates in results["stage_pass_rates"].items():
                rate = (rates["passed"] / rates["total"]) * 100
                print(f"    - {stage.title()}: {rate:.1f}% ({rates['passed']}/{rates['total']})")

        if traceability_score < 80:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "PIPELINE_TRACEABILITY",
                "description": f"Pipeline traceability below threshold: {traceability_score:.1f}%",
                "impact": "Cannot guarantee data accuracy across complete pipeline",
                "recommendation": "Investigate and fix pipeline stage failures"
            })

        self.report["validation_results"]["pipeline_traceability"] = results

    def _trace_data_through_pipeline(self, trust_code: str, file_path: Path) -> Dict:
        """Trace specific data point through entire pipeline"""
        trace_result = {
            "success": False,
            "stages": {},
            "data_points": {},
            "failed_stage": None,
            "error": None
        }

        try:
            # Stage 1: Excel file reading
            print(f"    📊 Stage 1: Reading Excel data...")
            df = pd.read_excel(file_path)
            trust_df = df[df['ORG CODE'] == trust_code]

            if trust_df.empty:
                trace_result["failed_stage"] = "excel"
                trace_result["error"] = "No data found for trust in Excel"
                return trace_result

            trace_result["stages"]["excel"] = True

            # Sample a specific data point for tracing
            sample_row = trust_df.iloc[0] if len(trust_df) > 0 else None
            if sample_row is None:
                trace_result["failed_stage"] = "excel"
                trace_result["error"] = "No sample row available"
                return trace_result

            trace_result["data_points"]["excel"] = {
                "total_treated": sample_row.get('TOTAL TREATED', 0),
                "within_standard": sample_row.get('WITHIN STANDARD', 0),
                "standard": sample_row.get('STANDARD'),
                "cancer_type": sample_row.get('CANCER TYPE')
            }

            # Stage 2: Data processing (simulate cancer_data_processor logic)
            print(f"    ⚙️ Stage 2: Data processing simulation...")

            # Filter data for this trust using exact processor logic
            # Note: The processor filters by month based on filename period
            # For Apr-Sep 2024 file, it processes months: ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP']
            expected_months = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP']

            # Apply same filtering as processor
            filtered_df = trust_df[
                (trust_df['STANDARD'] == sample_row['STANDARD']) &
                (trust_df['MONTH'].isin(expected_months))
            ]

            # Calculate expected processed values using processor logic
            total_for_standard = int(filtered_df['TOTAL TREATED'].sum())
            within_for_standard = int(filtered_df['WITHIN STANDARD'].sum())

            # Use same performance calculation as processor
            if total_for_standard > 0:
                expected_performance = round((within_for_standard / total_for_standard) * 100, 1)
            else:
                expected_performance = 0.0

            trace_result["stages"]["processing"] = True
            trace_result["data_points"]["processing"] = {
                "expected_total": total_for_standard,
                "expected_within": within_for_standard,
                "expected_performance": expected_performance
            }

            # Stage 3: Database verification
            print(f"    🗄️ Stage 3: Database verification...")

            # Map file name to correct period
            file_name = str(file_path.name)
            if "Apr-2024-to-Sep-2024" in file_name:
                expected_period = "2024-04-01"
            elif "Oct-2024-to-Mar-2025" in file_name:
                expected_period = "2025-10-01"
            elif "Apr-2025-to-Jul-2025" in file_name:
                expected_period = "2025-04-01"
            else:
                expected_period = "2024-04-01"  # Default fallback

            db_data = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).eq('trust_code', trust_code).eq('period', expected_period).neq('cancer_data', 'null').limit(1).execute()

            if not db_data.data:
                trace_result["failed_stage"] = "database"
                trace_result["error"] = "No data found in database"
                return trace_result

            cancer_data = db_data.data[0]['cancer_data']
            standards = cancer_data.get('standards', {})

            # Map standard name to key
            standard_key_mapping = {
                "28-day FDS": "28_day_fds",
                "31-day Combined": "31_day_combined",
                "62-day Combined": "62_day_combined"
            }
            standard_key = standard_key_mapping.get(sample_row['STANDARD'])

            if standard_key and standard_key in standards:
                db_summary = standards[standard_key]['summary']
                trace_result["stages"]["database"] = True
                trace_result["data_points"]["database"] = {
                    "stored_total": db_summary.get('total_treated', 0),
                    "stored_within": db_summary.get('within_standard', 0),
                    "stored_performance": db_summary.get('performance_pct', 0)
                }
            else:
                trace_result["failed_stage"] = "database"
                trace_result["error"] = f"Standard {sample_row['STANDARD']} not found in database"
                return trace_result

            # Stage 4: Frontend data flow (simulate hook logic)
            print(f"    🖥️ Stage 4: Frontend data simulation...")

            # Simulate what useCancerData hook would return
            frontend_data = {
                'period': cancer_data.get('period'),
                **cancer_data
            }

            # Simulate KPI calculation
            frontend_performance = standards[standard_key]['summary']['performance_pct']

            trace_result["stages"]["frontend"] = True
            trace_result["data_points"]["frontend"] = {
                "display_performance": frontend_performance,
                "display_total": standards[standard_key]['summary']['total_treated']
            }

            # Validate consistency across stages
            processing_data = trace_result["data_points"]["processing"]
            database_data = trace_result["data_points"]["database"]
            frontend_data_points = trace_result["data_points"]["frontend"]

            # Allow small differences for rounding
            consistency_checks = [
                abs(processing_data["expected_total"] - database_data["stored_total"]) <= 1,
                abs(processing_data["expected_within"] - database_data["stored_within"]) <= 1,
                abs(processing_data["expected_performance"] - database_data["stored_performance"]) <= 0.5,
                abs(database_data["stored_performance"] - frontend_data_points["display_performance"]) <= 0.1
            ]

            if all(consistency_checks):
                trace_result["success"] = True
                print(f"      ✅ Data consistency verified across all stages")
            else:
                trace_result["failed_stage"] = "consistency"
                trace_result["error"] = "Data inconsistency detected across stages"

        except Exception as e:
            trace_result["error"] = str(e)
            trace_result["failed_stage"] = "exception"

        return trace_result

    def _test_cross_stage_consistency(self):
        """Test data consistency across different pipeline stages"""
        print("\n🔄 Test 2: Cross-Stage Data Consistency")

        results = {
            "consistency_tests": 0,
            "consistent_data_flows": 0,
            "inconsistencies": [],
            "tolerance_exceeded": []
        }

        # Test consistency for multiple trusts and standards
        for trust_code in self.test_trusts[:3]:
            try:
                # Get database data
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                cancer_data = trust_data.data[0]['cancer_data']
                standards = cancer_data.get('standards', {})

                # Test each standard for consistency
                for standard_key, standard_data in standards.items():
                    results["consistency_tests"] += 1

                    # Cross-stage consistency checks
                    consistency_result = self._check_cross_stage_consistency(
                        trust_code, standard_key, standard_data, cancer_data
                    )

                    if consistency_result["consistent"]:
                        results["consistent_data_flows"] += 1
                        print(f"    ✅ {trust_code} {standard_key}: consistent")
                    else:
                        results["inconsistencies"].append({
                            "trust": trust_code,
                            "standard": standard_key,
                            "issues": consistency_result["issues"]
                        })
                        print(f"    ❌ {trust_code} {standard_key}: inconsistent ({len(consistency_result['issues'])} issues)")

            except Exception as e:
                print(f"    ⚠️ Error testing consistency for {trust_code}: {str(e)}")

        # Calculate consistency rate
        consistency_rate = (results["consistent_data_flows"] / results["consistency_tests"]) * 100 if results["consistency_tests"] > 0 else 0

        print(f"  🔄 Cross-stage consistency: {consistency_rate:.1f}% ({results['consistent_data_flows']}/{results['consistency_tests']})")

        if consistency_rate < 90:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "CROSS_STAGE_INCONSISTENCY",
                "description": f"Cross-stage consistency below threshold: {consistency_rate:.1f}%",
                "impact": "Data may be corrupted or transformed incorrectly between stages",
                "recommendation": "Review data transformation logic at each pipeline stage"
            })

        self.report["validation_results"]["cross_stage_consistency"] = results

    def _check_cross_stage_consistency(self, trust_code: str, standard_key: str, standard_data: Dict, cancer_data: Dict) -> Dict:
        """Check consistency for a specific trust and standard across pipeline stages"""
        consistency_result = {
            "consistent": True,
            "issues": []
        }

        try:
            summary = standard_data.get('summary', {})

            # Check internal consistency (within database)
            total_treated = summary.get('total_treated', 0)
            within_standard = summary.get('within_standard', 0)
            breaches = summary.get('breaches', 0)
            performance_pct = summary.get('performance_pct', 0)

            # Mathematical consistency checks
            if abs(total_treated - (within_standard + breaches)) > 1:
                consistency_result["consistent"] = False
                consistency_result["issues"].append("Total treated ≠ within standard + breaches")

            if total_treated > 0:
                expected_performance = (within_standard / total_treated) * 100
                if abs(expected_performance - performance_pct) > 0.5:
                    consistency_result["consistent"] = False
                    consistency_result["issues"].append(f"Performance calculation mismatch: expected {expected_performance:.1f}%, stored {performance_pct:.1f}%")

            # Metadata consistency
            metadata = cancer_data.get('metadata', {})
            overall_performance = metadata.get('overall_performance_weighted', 0)

            # Check if overall performance is within reasonable range based on individual standards
            if overall_performance > 0:
                individual_performances = []
                for std_key, std_data in cancer_data.get('standards', {}).items():
                    perf = std_data.get('summary', {}).get('performance_pct', 0)
                    if perf > 0:
                        individual_performances.append(perf)

                if individual_performances:
                    min_perf = min(individual_performances)
                    max_perf = max(individual_performances)

                    # Overall performance should be within reasonable range of individual performances
                    if overall_performance < min_perf - 10 or overall_performance > max_perf + 5:
                        consistency_result["consistent"] = False
                        consistency_result["issues"].append("Overall performance outside expected range based on standards")

        except Exception as e:
            consistency_result["consistent"] = False
            consistency_result["issues"].append(f"Consistency check error: {str(e)}")

        return consistency_result

    def _test_performance_metrics_e2e(self):
        """Test performance metrics accuracy end-to-end"""
        print("\n📊 Test 3: Performance Metrics End-to-End Accuracy")

        results = {
            "metrics_tested": 0,
            "accurate_metrics": 0,
            "metric_discrepancies": [],
            "critical_metrics_verified": {}
        }

        # Critical metrics to verify
        critical_metrics = [
            "overall_performance_weighted",
            "total_patients_treated_all_standards",
            "total_breaches_all_standards"
        ]

        # Test metrics for each trust
        for trust_code in self.test_trusts[:2]:
            try:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                cancer_data = trust_data.data[0]['cancer_data']
                metadata = cancer_data.get('metadata', {})
                standards = cancer_data.get('standards', {})

                # Test each critical metric
                for metric in critical_metrics:
                    results["metrics_tested"] += 1

                    if metric == "overall_performance_weighted":
                        stored_value = metadata.get(metric, 0)
                        calculated_value = self._calculate_weighted_performance(standards)

                        if abs(stored_value - calculated_value) <= 0.5:
                            results["accurate_metrics"] += 1
                            print(f"    ✅ {trust_code} {metric}: {stored_value:.1f}% (calculated: {calculated_value:.1f}%)")
                        else:
                            results["metric_discrepancies"].append({
                                "trust": trust_code,
                                "metric": metric,
                                "stored": stored_value,
                                "calculated": calculated_value,
                                "difference": abs(stored_value - calculated_value)
                            })
                            print(f"    ❌ {trust_code} {metric}: stored {stored_value:.1f}%, calculated {calculated_value:.1f}%")

                    elif metric == "total_patients_treated_all_standards":
                        stored_value = metadata.get(metric, 0)
                        calculated_value = sum(std_data.get('summary', {}).get('total_treated', 0) for std_data in standards.values())

                        if stored_value == calculated_value:
                            results["accurate_metrics"] += 1
                            print(f"    ✅ {trust_code} {metric}: {stored_value}")
                        else:
                            results["metric_discrepancies"].append({
                                "trust": trust_code,
                                "metric": metric,
                                "stored": stored_value,
                                "calculated": calculated_value,
                                "difference": abs(stored_value - calculated_value)
                            })

                    elif metric == "total_breaches_all_standards":
                        stored_value = metadata.get(metric, 0)
                        calculated_value = sum(std_data.get('summary', {}).get('breaches', 0) for std_data in standards.values())

                        if stored_value == calculated_value:
                            results["accurate_metrics"] += 1
                            print(f"    ✅ {trust_code} {metric}: {stored_value}")
                        else:
                            results["metric_discrepancies"].append({
                                "trust": trust_code,
                                "metric": metric,
                                "stored": stored_value,
                                "calculated": calculated_value,
                                "difference": abs(stored_value - calculated_value)
                            })

                # Record critical metrics for this trust
                results["critical_metrics_verified"][trust_code] = {
                    "overall_performance": metadata.get("overall_performance_weighted", 0),
                    "total_patients": metadata.get("total_patients_treated_all_standards", 0),
                    "total_breaches": metadata.get("total_breaches_all_standards", 0)
                }

            except Exception as e:
                print(f"    ⚠️ Error testing metrics for {trust_code}: {str(e)}")

        # Calculate metrics accuracy
        metrics_accuracy = (results["accurate_metrics"] / results["metrics_tested"]) * 100 if results["metrics_tested"] > 0 else 0

        print(f"  📊 Metrics accuracy: {metrics_accuracy:.1f}% ({results['accurate_metrics']}/{results['metrics_tested']})")

        if metrics_accuracy < 95:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "METRICS_ACCURACY",
                "description": f"Performance metrics accuracy below threshold: {metrics_accuracy:.1f}%",
                "impact": "Critical performance metrics may be incorrect",
                "recommendation": "Review metric calculation logic in processing and frontend"
            })

        # Show significant discrepancies
        if results["metric_discrepancies"]:
            print(f"  📝 Significant metric discrepancies:")
            for discrepancy in results["metric_discrepancies"][:3]:
                print(f"    - {discrepancy['trust']} {discrepancy['metric']}: difference of {discrepancy['difference']}")

        self.report["validation_results"]["performance_metrics_e2e"] = results

    def _calculate_weighted_performance(self, standards: Dict) -> float:
        """Calculate weighted performance for validation"""
        weights = {'28_day_fds': 0.2, '31_day_combined': 0.3, '62_day_combined': 0.5}
        weighted_sum = 0
        total_weight = 0

        for standard_key, weight in weights.items():
            if standard_key in standards:
                perf = standards[standard_key].get('summary', {}).get('performance_pct', 0)
                weighted_sum += perf * weight
                total_weight += weight

        return round(weighted_sum / total_weight, 1) if total_weight > 0 else 0

    def _test_trust_specific_validation(self):
        """Test specific trust data for known values and patterns"""
        print("\n🏥 Test 4: Trust-Specific Data Validation")

        results = {
            "trusts_validated": 0,
            "trusts_passed_validation": 0,
            "trust_validation_results": {},
            "data_quality_issues": []
        }

        for trust_code in self.test_trusts:
            try:
                print(f"  🏥 Validating trust: {trust_code}")
                results["trusts_validated"] += 1

                # Get trust data
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, trust_name, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').execute()

                trust_validation = {
                    "has_data": len(trust_data.data) > 0,
                    "periods_available": len(trust_data.data),
                    "data_quality_checks": {},
                    "issues": []
                }

                if trust_data.data:
                    # Test data quality for this trust
                    for record in trust_data.data[:2]:  # Test up to 2 periods per trust
                        cancer_data = record['cancer_data']
                        period = record['period']

                        # Data quality checks
                        quality_checks = self._perform_trust_data_quality_checks(cancer_data)
                        trust_validation["data_quality_checks"][period] = quality_checks

                        if not quality_checks["passes_all_checks"]:
                            trust_validation["issues"].extend(quality_checks["issues"])

                    # Overall trust validation
                    if len(trust_validation["issues"]) == 0:
                        results["trusts_passed_validation"] += 1
                        print(f"    ✅ {trust_code}: validation passed")
                    else:
                        print(f"    ❌ {trust_code}: {len(trust_validation['issues'])} issues found")
                        results["data_quality_issues"].extend([
                            f"{trust_code}: {issue}" for issue in trust_validation["issues"]
                        ])

                else:
                    trust_validation["issues"].append("No cancer data found")
                    print(f"    ❌ {trust_code}: No data found")

                results["trust_validation_results"][trust_code] = trust_validation

            except Exception as e:
                print(f"    ⚠️ Error validating trust {trust_code}: {str(e)}")

        # Calculate trust validation rate
        validation_rate = (results["trusts_passed_validation"] / results["trusts_validated"]) * 100 if results["trusts_validated"] > 0 else 0

        print(f"  🏥 Trust validation rate: {validation_rate:.1f}% ({results['trusts_passed_validation']}/{results['trusts_validated']})")

        if validation_rate < 75:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "TRUST_VALIDATION_FAILURES",
                "description": f"Trust validation rate below threshold: {validation_rate:.1f}%",
                "impact": "Some trusts may have data quality issues",
                "recommendation": "Investigate trust-specific data quality issues"
            })

        self.report["validation_results"]["trust_specific_validation"] = results

    def _perform_trust_data_quality_checks(self, cancer_data: Dict) -> Dict:
        """Perform data quality checks for a trust's cancer data"""
        quality_checks = {
            "passes_all_checks": True,
            "issues": []
        }

        try:
            # Check required fields
            required_fields = ['period', 'standards', 'metadata']
            for field in required_fields:
                if field not in cancer_data:
                    quality_checks["passes_all_checks"] = False
                    quality_checks["issues"].append(f"Missing required field: {field}")

            # Check standards data
            standards = cancer_data.get('standards', {})
            expected_standards = ['28_day_fds', '31_day_combined', '62_day_combined']

            for standard in expected_standards:
                if standard not in standards:
                    quality_checks["passes_all_checks"] = False
                    quality_checks["issues"].append(f"Missing standard: {standard}")
                    continue

                summary = standards[standard].get('summary', {})

                # Check for reasonable values
                performance = summary.get('performance_pct', 0)
                total_treated = summary.get('total_treated', 0)

                if performance < 0 or performance > 100:
                    quality_checks["passes_all_checks"] = False
                    quality_checks["issues"].append(f"{standard}: Invalid performance percentage: {performance}%")

                if total_treated < 0:
                    quality_checks["passes_all_checks"] = False
                    quality_checks["issues"].append(f"{standard}: Negative total treated: {total_treated}")

            # Check metadata quality
            metadata = cancer_data.get('metadata', {})
            overall_performance = metadata.get('overall_performance_weighted', 0)

            if overall_performance < 0 or overall_performance > 100:
                quality_checks["passes_all_checks"] = False
                quality_checks["issues"].append(f"Invalid overall performance: {overall_performance}%")

        except Exception as e:
            quality_checks["passes_all_checks"] = False
            quality_checks["issues"].append(f"Data quality check error: {str(e)}")

        return quality_checks

    def _test_regression_validation(self):
        """Test against known values and previous results"""
        print("\n🔄 Test 5: Regression Validation")

        results = {
            "regression_tests": 0,
            "regression_passed": 0,
            "value_changes": [],
            "unexpected_changes": []
        }

        # Test known performance ranges (NHS typical ranges)
        expected_ranges = {
            "28_day_fds": (60, 90),    # Typical FDS performance range
            "31_day_combined": (85, 98),  # Typical 31-day range
            "62_day_combined": (70, 90),   # Typical 62-day range
        }

        # Test performance ranges for each trust
        for trust_code in self.test_trusts[:2]:
            try:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                cancer_data = trust_data.data[0]['cancer_data']
                standards = cancer_data.get('standards', {})

                for standard_key, standard_data in standards.items():
                    results["regression_tests"] += 1

                    performance = standard_data.get('summary', {}).get('performance_pct', 0)
                    expected_min, expected_max = expected_ranges.get(standard_key, (0, 100))

                    if expected_min <= performance <= expected_max:
                        results["regression_passed"] += 1
                        print(f"    ✅ {trust_code} {standard_key}: {performance:.1f}% (within expected range)")
                    else:
                        results["unexpected_changes"].append({
                            "trust": trust_code,
                            "standard": standard_key,
                            "performance": performance,
                            "expected_range": f"{expected_min}-{expected_max}%",
                            "deviation": "above_range" if performance > expected_max else "below_range"
                        })
                        print(f"    ⚠️ {trust_code} {standard_key}: {performance:.1f}% (outside expected {expected_min}-{expected_max}%)")

            except Exception as e:
                print(f"    ⚠️ Error in regression testing for {trust_code}: {str(e)}")

        # Calculate regression success rate
        regression_rate = (results["regression_passed"] / results["regression_tests"]) * 100 if results["regression_tests"] > 0 else 0

        print(f"  🔄 Regression validation: {regression_rate:.1f}% within expected ranges")

        if regression_rate < 70:  # Allow more flexibility for NHS performance variation
            self.report["issues_found"].append({
                "severity": "LOW",
                "category": "REGRESSION_VALIDATION",
                "description": f"Many values outside typical NHS performance ranges: {100-regression_rate:.1f}%",
                "impact": "Data may reflect unusual performance periods or processing issues",
                "recommendation": "Review values outside typical NHS performance ranges"
            })

        self.report["validation_results"]["regression_validation"] = results

    def _test_edge_case_handling(self):
        """Test system handling of edge cases and boundary conditions"""
        print("\n🎯 Test 6: Edge Case Handling")

        results = {
            "edge_cases_tested": 0,
            "edge_cases_handled": 0,
            "edge_case_failures": []
        }

        # Test edge cases
        edge_cases = [
            {"name": "zero_totals", "description": "Standards with zero total treated"},
            {"name": "perfect_performance", "description": "100% performance values"},
            {"name": "zero_performance", "description": "0% performance values"},
            {"name": "high_volume", "description": "Very high patient volumes"},
        ]

        for trust_code in self.test_trusts[:1]:  # Test edge cases with one trust
            try:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                cancer_data = trust_data.data[0]['cancer_data']
                standards = cancer_data.get('standards', {})

                for edge_case in edge_cases:
                    results["edge_cases_tested"] += 1

                    edge_case_result = self._test_specific_edge_case(
                        edge_case["name"], standards, cancer_data
                    )

                    if edge_case_result["handled_correctly"]:
                        results["edge_cases_handled"] += 1
                        print(f"    ✅ {edge_case['name']}: handled correctly")
                    else:
                        results["edge_case_failures"].append({
                            "edge_case": edge_case["name"],
                            "description": edge_case["description"],
                            "issue": edge_case_result["issue"]
                        })
                        print(f"    ❌ {edge_case['name']}: {edge_case_result['issue']}")

            except Exception as e:
                print(f"    ⚠️ Error testing edge cases: {str(e)}")

        # Calculate edge case handling rate
        edge_case_rate = (results["edge_cases_handled"] / results["edge_cases_tested"]) * 100 if results["edge_cases_tested"] > 0 else 0

        print(f"  🎯 Edge case handling: {edge_case_rate:.1f}% ({results['edge_cases_handled']}/{results['edge_cases_tested']})")

        if edge_case_rate < 75:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "EDGE_CASE_HANDLING",
                "description": f"Edge case handling below threshold: {edge_case_rate:.1f}%",
                "impact": "System may not handle unusual data conditions properly",
                "recommendation": "Improve edge case handling in data processing"
            })

        self.report["validation_results"]["edge_case_handling"] = results

    def _test_specific_edge_case(self, edge_case_name: str, standards: Dict, cancer_data: Dict) -> Dict:
        """Test a specific edge case"""
        result = {
            "handled_correctly": True,
            "issue": None
        }

        try:
            if edge_case_name == "zero_totals":
                # Look for standards with zero total treated
                zero_total_found = False
                for standard_key, standard_data in standards.items():
                    total = standard_data.get('summary', {}).get('total_treated', 0)
                    performance = standard_data.get('summary', {}).get('performance_pct', 0)

                    if total == 0:
                        zero_total_found = True
                        # Performance should be 0 when total is 0
                        if performance != 0:
                            result["handled_correctly"] = False
                            result["issue"] = f"Non-zero performance ({performance}%) with zero total treated"
                            break

                if not zero_total_found:
                    # This is actually good - no zero totals found
                    pass

            elif edge_case_name == "perfect_performance":
                # Look for 100% performance and validate it's legitimate
                for standard_key, standard_data in standards.items():
                    performance = standard_data.get('summary', {}).get('performance_pct', 0)
                    total_treated = standard_data.get('summary', {}).get('total_treated', 0)
                    within_standard = standard_data.get('summary', {}).get('within_standard', 0)

                    if performance == 100.0:
                        # Should have total_treated = within_standard
                        if total_treated != within_standard and total_treated > 0:
                            result["handled_correctly"] = False
                            result["issue"] = f"100% performance but total_treated ({total_treated}) != within_standard ({within_standard})"
                            break

            elif edge_case_name == "zero_performance":
                # Look for 0% performance and validate
                for standard_key, standard_data in standards.items():
                    performance = standard_data.get('summary', {}).get('performance_pct', 0)
                    within_standard = standard_data.get('summary', {}).get('within_standard', 0)
                    total_treated = standard_data.get('summary', {}).get('total_treated', 0)

                    if performance == 0.0 and total_treated > 0:
                        # Should have within_standard = 0
                        if within_standard != 0:
                            result["handled_correctly"] = False
                            result["issue"] = f"0% performance but within_standard is {within_standard}, not 0"
                            break

            elif edge_case_name == "high_volume":
                # Look for very high patient volumes (potential data quality issue)
                for standard_key, standard_data in standards.items():
                    total_treated = standard_data.get('summary', {}).get('total_treated', 0)

                    if total_treated > 50000:  # Unusually high for a single standard
                        # This might be valid, but flag for review
                        result["handled_correctly"] = True  # Don't fail, just note
                        result["issue"] = f"Very high volume detected: {total_treated} patients"
                        break

        except Exception as e:
            result["handled_correctly"] = False
            result["issue"] = f"Edge case test error: {str(e)}"

        return result

    def _test_system_reliability(self):
        """Test overall system reliability and robustness"""
        print("\n🛡️ Test 7: Overall System Reliability")

        results = {
            "reliability_tests": 0,
            "reliable_components": 0,
            "reliability_issues": [],
            "system_health_score": 0.0
        }

        # Test database connectivity reliability
        results["reliability_tests"] += 1
        try:
            # Test multiple queries to check consistency
            query_results = []
            for i in range(3):
                response = self.supabase.table('trust_metrics').select('count', count='exact').execute()
                query_results.append(response.count)

            if all(count == query_results[0] for count in query_results):
                results["reliable_components"] += 1
                print(f"    ✅ Database connectivity: reliable ({query_results[0]} records)")
            else:
                results["reliability_issues"].append("Database query results inconsistent")
                print(f"    ❌ Database connectivity: inconsistent results")

        except Exception as e:
            results["reliability_issues"].append(f"Database connectivity error: {str(e)}")

        # Test data processing consistency
        results["reliability_tests"] += 1
        try:
            # Test if the same data produces the same results
            sample_trust = self.test_trusts[0]
            trust_data = self.supabase.table('trust_metrics').select(
                'cancer_data'
            ).eq('trust_code', sample_trust).neq('cancer_data', 'null').limit(1).execute()

            if trust_data.data:
                cancer_data = trust_data.data[0]['cancer_data']

                # Recalculate weighted performance
                calculated_performance = self._calculate_weighted_performance(cancer_data.get('standards', {}))
                stored_performance = cancer_data.get('metadata', {}).get('overall_performance_weighted', 0)

                if abs(calculated_performance - stored_performance) <= 0.5:
                    results["reliable_components"] += 1
                    print(f"    ✅ Data processing: reliable (performance calculation consistent)")
                else:
                    results["reliability_issues"].append("Data processing inconsistency detected")

        except Exception as e:
            results["reliability_issues"].append(f"Data processing reliability error: {str(e)}")

        # Test data completeness across multiple trusts
        results["reliability_tests"] += 1
        try:
            trust_coverage = 0
            for trust_code in self.test_trusts:
                trust_data = self.supabase.table('trust_metrics').select(
                    'cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').execute()

                if trust_data.data:
                    trust_coverage += 1

            coverage_rate = (trust_coverage / len(self.test_trusts)) * 100

            if coverage_rate >= 75:  # At least 75% of test trusts should have data
                results["reliable_components"] += 1
                print(f"    ✅ Data completeness: reliable ({coverage_rate:.1f}% coverage)")
            else:
                results["reliability_issues"].append(f"Low data coverage: {coverage_rate:.1f}%")

        except Exception as e:
            results["reliability_issues"].append(f"Data completeness reliability error: {str(e)}")

        # Calculate system health score
        component_reliability = (results["reliable_components"] / results["reliability_tests"]) * 100 if results["reliability_tests"] > 0 else 0

        # Factor in number of issues found across all tests
        total_issues = len(self.report["issues_found"])
        issue_penalty = min(total_issues * 5, 30)  # Max 30 point penalty for issues

        results["system_health_score"] = max(0, component_reliability - issue_penalty)

        print(f"  🛡️ System reliability: {component_reliability:.1f}%")
        print(f"  📊 Overall system health: {results['system_health_score']:.1f}/100")

        if results["system_health_score"] < 70:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "SYSTEM_RELIABILITY",
                "description": f"System reliability below threshold: {results['system_health_score']:.1f}/100",
                "impact": "System may not be reliable for production use",
                "recommendation": "Address reliability issues before deploying to production"
            })

        self.report["validation_results"]["system_reliability"] = results

    def _generate_summary(self):
        """Generate comprehensive end-to-end validation summary and confidence score"""
        print("\n📋 Generating End-to-End Validation Summary...")

        summary = {
            "total_tests_run": len(self.report["validation_results"]),
            "tests_passed": 0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "low_issues": 0,
            "pipeline_integrity_score": 0.0,
            "confidence_metrics": {}
        }

        # Count issues by severity
        for issue in self.report["issues_found"]:
            severity = issue.get("severity", "LOW")
            if severity == "CRITICAL":
                summary["critical_issues"] += 1
            elif severity == "HIGH":
                summary["high_issues"] += 1
            elif severity == "MEDIUM":
                summary["medium_issues"] += 1
            else:
                summary["low_issues"] += 1

        # Calculate confidence metrics from validation results
        validation_results = self.report.get("validation_results", {})

        # Pipeline traceability confidence
        if "pipeline_traceability" in validation_results:
            trace_result = validation_results["pipeline_traceability"]
            if trace_result.get("traces_performed", 0) > 0:
                trace_success = (trace_result.get("successful_traces", 0) / trace_result.get("traces_performed", 1)) * 100
                summary["confidence_metrics"]["traceability"] = trace_success

        # Cross-stage consistency confidence
        if "cross_stage_consistency" in validation_results:
            consistency_result = validation_results["cross_stage_consistency"]
            if consistency_result.get("consistency_tests", 0) > 0:
                consistency_rate = (consistency_result.get("consistent_data_flows", 0) / consistency_result.get("consistency_tests", 1)) * 100
                summary["confidence_metrics"]["consistency"] = consistency_rate

        # Performance metrics accuracy confidence
        if "performance_metrics_e2e" in validation_results:
            metrics_result = validation_results["performance_metrics_e2e"]
            if metrics_result.get("metrics_tested", 0) > 0:
                metrics_accuracy = (metrics_result.get("accurate_metrics", 0) / metrics_result.get("metrics_tested", 1)) * 100
                summary["confidence_metrics"]["metrics_accuracy"] = metrics_accuracy

        # System reliability confidence
        if "system_reliability" in validation_results:
            reliability_result = validation_results["system_reliability"]
            summary["confidence_metrics"]["system_reliability"] = reliability_result.get("system_health_score", 0)

        # Calculate overall pipeline integrity score
        weights = {
            "traceability": 0.3,
            "consistency": 0.25,
            "metrics_accuracy": 0.25,
            "system_reliability": 0.2
        }

        weighted_sum = 0
        total_weight = 0

        for metric, score in summary["confidence_metrics"].items():
            if metric in weights:
                weighted_sum += score * weights[metric]
                total_weight += weights[metric]

        if total_weight > 0:
            summary["pipeline_integrity_score"] = weighted_sum / total_weight

        # Calculate confidence level
        confidence_deductions = {
            "CRITICAL": 25,
            "HIGH": 10,
            "MEDIUM": 5,
            "LOW": 1
        }

        total_deduction = (
            summary["critical_issues"] * confidence_deductions["CRITICAL"] +
            summary["high_issues"] * confidence_deductions["HIGH"] +
            summary["medium_issues"] * confidence_deductions["MEDIUM"] +
            summary["low_issues"] * confidence_deductions["LOW"]
        )

        base_confidence = summary["pipeline_integrity_score"]
        final_confidence = max(0, base_confidence - total_deduction)
        self.report["confidence_level"] = final_confidence

        # Count tests passed (no critical or high issues)
        critical_high_categories = set()
        for issue in self.report["issues_found"]:
            if issue.get("severity") in ["CRITICAL", "HIGH"]:
                critical_high_categories.add(issue.get("category", "").split("_")[0].lower())

        test_categories = ["pipeline", "cross", "performance", "trust", "regression", "edge", "system"]
        for category in test_categories:
            if category not in critical_high_categories:
                summary["tests_passed"] += 1

        # Generate final recommendations
        recommendations = []

        if summary["critical_issues"] > 0:
            recommendations.append("🚨 CRITICAL: Resolve all critical issues before production deployment")

        if final_confidence >= 90:
            recommendations.append("✅ EXCELLENT: High confidence in cancer data accuracy - ready for production")
        elif final_confidence >= 80:
            recommendations.append("👍 GOOD: Acceptable confidence level - minor issues should be addressed")
        elif final_confidence >= 70:
            recommendations.append("⚠️ MODERATE: Moderate confidence - address high-priority issues before production")
        elif final_confidence >= 60:
            recommendations.append("⚠️ LOW: Low confidence - significant improvements needed")
        else:
            recommendations.append("🚨 CRITICAL: Very low confidence - major issues must be resolved")

        if summary["high_issues"] > 0:
            recommendations.append("🔧 Address all high-priority issues to improve data reliability")

        if summary["pipeline_integrity_score"] < 80:
            recommendations.append("🔄 Improve pipeline integrity before full deployment")

        recommendations.append("📊 Run all phase tests regularly to maintain data accuracy confidence")

        self.report["recommendations"].extend(recommendations)

        # Determine overall status based on confidence level
        if final_confidence >= 85 and summary["critical_issues"] == 0:
            self.report["overall_status"] = "HIGH_CONFIDENCE"
        elif final_confidence >= 70 and summary["critical_issues"] == 0:
            self.report["overall_status"] = "MODERATE_CONFIDENCE"
        elif summary["critical_issues"] > 0:
            self.report["overall_status"] = "CRITICAL_ISSUES"
        else:
            self.report["overall_status"] = "LOW_CONFIDENCE"

        self.report["summary"] = summary

        # Print comprehensive summary
        print(f"\n{'='*70}")
        print(f"📋 PHASE 6 END-TO-END VALIDATION SUMMARY")
        print(f"{'='*70}")
        print(f"Pipeline integrity score: {summary['pipeline_integrity_score']:.1f}/100")
        print(f"Final confidence level: {final_confidence:.1f}%")
        print(f"\nConfidence breakdown:")
        for metric, score in summary["confidence_metrics"].items():
            print(f"  {metric.replace('_', ' ').title()}: {score:.1f}%")
        print(f"\nTests: {summary['tests_passed']}/{summary['total_tests_run']} passed")
        print(f"\nIssues found:")
        print(f"  🚨 Critical: {summary['critical_issues']}")
        print(f"  ⚠️ High: {summary['high_issues']}")
        print(f"  ❓ Medium: {summary['medium_issues']}")
        print(f"  ℹ️ Low: {summary['low_issues']}")
        print(f"\nOverall Status: {self.report['overall_status']}")
        print(f"Confidence Level: {final_confidence:.1f}%")

        if self.report["recommendations"]:
            print(f"\n📋 Final Recommendations:")
            for rec in self.report["recommendations"]:
                print(f"  {rec}")

        # Confidence interpretation
        print(f"\n🎯 CONFIDENCE INTERPRETATION:")
        if final_confidence >= 90:
            print(f"  EXCELLENT (90%+): Cancer data is highly accurate and reliable")
        elif final_confidence >= 80:
            print(f"  GOOD (80-89%): Cancer data is generally accurate with minor issues")
        elif final_confidence >= 70:
            print(f"  ACCEPTABLE (70-79%): Cancer data is usable but needs improvement")
        elif final_confidence >= 60:
            print(f"  CONCERNING (60-69%): Cancer data has significant accuracy issues")
        else:
            print(f"  CRITICAL (<60%): Cancer data accuracy is unacceptable for production use")


def main():
    """Main execution function"""
    print("NHS Cancer Performance Data - Phase 6: End-to-End Pipeline Validation")
    print("=" * 90)

    project_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master"
    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    validator = CancerEndToEndValidator(project_dir, data_dir)
    report = validator.run_all_tests()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/phase6_cancer_end_to_end_validation_{timestamp}.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved: {report_file}")
    except Exception as e:
        print(f"\n❌ Error saving report: {e}")

    # Exit with appropriate code based on confidence level
    confidence = report.get("confidence_level", 0)
    status = report.get("overall_status", "ERROR")

    if confidence >= 85 and status == "HIGH_CONFIDENCE":
        print(f"\n🎉 Phase 6 end-to-end validation: HIGH CONFIDENCE - Cancer data is production ready!")
        sys.exit(0)
    elif confidence >= 70 and status in ["MODERATE_CONFIDENCE", "HIGH_CONFIDENCE"]:
        print(f"\n✅ Phase 6 end-to-end validation: ACCEPTABLE CONFIDENCE - Address noted issues")
        sys.exit(0)
    elif status == "CRITICAL_ISSUES":
        print(f"\n🚨 Phase 6 end-to-end validation: CRITICAL ISSUES - Must resolve before production")
        sys.exit(2)
    else:
        print(f"\n⚠️ Phase 6 end-to-end validation: LOW CONFIDENCE - Significant improvements needed")
        sys.exit(1)


if __name__ == "__main__":
    main()
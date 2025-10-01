#!/usr/bin/env python3
"""
NHS Cancer Performance Data Accuracy Testing - Phase 3: Database Integrity Validation
======================================================================================

This script validates cancer data integrity in the Supabase database by running
comprehensive SQL queries to verify data completeness, accuracy, and consistency
of the stored cancer_data JSONB structures.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
import traceback
from supabase import create_client, Client

class CancerDatabaseIntegrityValidator:
    """Validates cancer data integrity in Supabase database"""

    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk5MzYzNywiZXhwIjoyMDczNTY5NjM3fQ.mDtWXZo-U4lyM-A73qCICQRDP5qOw7nc9ZOF2YcDagg"

        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error connecting to Supabase: {e}")
            sys.exit(1)

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 3: Cancer Database Integrity Validation",
            "database_url": self.supabase_url,
            "connection_successful": True,
            "validation_results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "overall_status": "UNKNOWN"
        }

        # Expected cancer standards
        self.expected_standards = ['28_day_fds', '31_day_combined', '62_day_combined']

        # Sample of expected cancer types for validation
        self.key_cancer_types = [
            'breast', 'lung', 'lower_gastrointestinal', 'upper_gi_oesophagus_stomach',
            'gynaecological', 'head_neck', 'skin', 'suspected_breast_cancer',
            'suspected_lung_cancer', 'all_cancers'
        ]

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 3 database integrity validation tests"""
        print(f"\n🧪 Starting Phase 3: Cancer Database Integrity Validation")
        print(f"🗄️ Database: {self.supabase_url}")

        try:
            # Test 1: Database connectivity and basic queries
            self._test_database_connectivity()

            # Test 2: Cancer data coverage and completeness
            self._test_cancer_data_coverage()

            # Test 3: JSONB structure integrity
            self._test_jsonb_structure_integrity()

            # Test 4: Data consistency validation
            self._test_data_consistency()

            # Test 5: Performance metrics validation
            self._test_performance_metrics()

            # Test 6: Trust coverage analysis
            self._test_trust_coverage()

            # Test 7: Quarter and period validation
            self._test_quarter_period_validation()

            # Test 8: Cross-reference with known values
            self._test_cross_reference_validation()

            # Generate summary
            self._generate_summary()

        except Exception as e:
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "TEST_EXECUTION_ERROR",
                "description": f"Failed to complete database integrity tests: {str(e)}",
                "impact": "Cannot validate database integrity",
                "recommendation": "Review database connection and permissions"
            })
            self.report["overall_status"] = "ERROR"
            traceback.print_exc()

        return self.report

    def _test_database_connectivity(self):
        """Test database connectivity and basic query functionality"""
        print("\n🔌 Test 1: Database Connectivity and Basic Queries")

        results = {
            "connection_successful": False,
            "basic_queries_working": False,
            "trust_metrics_table_accessible": False,
            "cancer_data_column_exists": False,
            "sample_data_retrievable": False
        }

        try:
            # Test basic connection
            response = self.supabase.table('trust_metrics').select('count', count='exact').execute()
            results["connection_successful"] = True
            results["trust_metrics_table_accessible"] = True

            total_records = response.count
            print(f"  ✅ Database connection successful")
            print(f"  📊 Total trust_metrics records: {total_records:,}")

            # Test cancer_data column existence
            response = self.supabase.table('trust_metrics').select('cancer_data').limit(1).execute()
            if response.data:
                results["cancer_data_column_exists"] = True
                print(f"  ✅ cancer_data column accessible")

                # Test if we can retrieve actual cancer data
                cancer_response = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).neq('cancer_data', 'null').limit(1).execute()

                if cancer_response.data:
                    results["sample_data_retrievable"] = True
                    sample_trust = cancer_response.data[0]
                    print(f"  ✅ Sample cancer data retrievable for trust {sample_trust['trust_code']}")
                else:
                    print(f"  ⚠️ No cancer data records found in database")
            else:
                print(f"  ❌ cancer_data column not accessible")

            results["basic_queries_working"] = all([
                results["connection_successful"],
                results["trust_metrics_table_accessible"],
                results["cancer_data_column_exists"]
            ])

        except Exception as e:
            print(f"  ❌ Database connectivity error: {str(e)}")
            results["error"] = str(e)
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "DATABASE_CONNECTION",
                "description": f"Cannot connect to database or access cancer data: {str(e)}",
                "impact": "Cannot perform any database validation",
                "recommendation": "Check database credentials and network connectivity"
            })

        self.report["validation_results"]["database_connectivity"] = results

    def _test_cancer_data_coverage(self):
        """Test cancer data coverage across trusts and periods"""
        print("\n📈 Test 2: Cancer Data Coverage and Completeness")

        results = {
            "total_records": 0,
            "records_with_cancer_data": 0,
            "coverage_percentage": 0.0,
            "unique_trusts_with_cancer_data": 0,
            "periods_covered": [],
            "coverage_by_period": {},
            "missing_data_trusts": []
        }

        try:
            # Get overall coverage statistics
            all_records = self.supabase.table('trust_metrics').select('trust_code, period, cancer_data').execute()
            results["total_records"] = len(all_records.data)

            # Count records with cancer data
            records_with_cancer = [r for r in all_records.data if r['cancer_data'] is not None]
            results["records_with_cancer_data"] = len(records_with_cancer)

            if results["total_records"] > 0:
                results["coverage_percentage"] = (results["records_with_cancer_data"] / results["total_records"]) * 100

            # Count unique trusts with cancer data
            trusts_with_cancer = set()
            periods_covered = set()

            for record in records_with_cancer:
                trusts_with_cancer.add(record['trust_code'])
                periods_covered.add(record['period'])

            results["unique_trusts_with_cancer_data"] = len(trusts_with_cancer)
            results["periods_covered"] = sorted(list(periods_covered))

            # Coverage by period
            for period in results["periods_covered"]:
                period_records = [r for r in records_with_cancer if r['period'] == period]
                results["coverage_by_period"][period] = len(period_records)

            print(f"  📈 Coverage Analysis:")
            print(f"    - Total records: {results['total_records']:,}")
            print(f"    - Records with cancer data: {results['records_with_cancer_data']:,} ({results['coverage_percentage']:.1f}%)")
            print(f"    - Unique trusts with cancer data: {results['unique_trusts_with_cancer_data']}")
            print(f"    - Periods covered: {len(results['periods_covered'])}")

            # Show period breakdown
            if results["coverage_by_period"]:
                print(f"  📊 Coverage by period:")
                for period, count in sorted(results["coverage_by_period"].items()):
                    print(f"    - {period}: {count} trusts")

            # Check for expected minimum coverage
            if results["coverage_percentage"] < 10:  # Less than 10% coverage suggests an issue
                self.report["issues_found"].append({
                    "severity": "HIGH",
                    "category": "LOW_DATA_COVERAGE",
                    "description": f"Very low cancer data coverage: {results['coverage_percentage']:.1f}%",
                    "impact": "Insufficient data for reliable analysis",
                    "recommendation": "Investigate data loading process and ensure cancer data processor has run"
                })

            if results["unique_trusts_with_cancer_data"] < 50:  # Expect at least 50 trusts
                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "LIMITED_TRUST_COVERAGE",
                    "description": f"Limited trust coverage: only {results['unique_trusts_with_cancer_data']} trusts have cancer data",
                    "impact": "Limited scope for analysis",
                    "recommendation": "Review cancer data processing to ensure all trusts are included"
                })

        except Exception as e:
            print(f"  ❌ Coverage analysis error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["cancer_data_coverage"] = results

    def _test_jsonb_structure_integrity(self):
        """Test JSONB structure integrity and required fields"""
        print("\n🏗️ Test 3: JSONB Structure Integrity")

        results = {
            "records_tested": 0,
            "valid_structures": 0,
            "structure_errors": [],
            "missing_fields": {},
            "data_type_errors": [],
            "standards_coverage": {}
        }

        # Required top-level fields in cancer_data JSONB
        required_fields = ['period', 'period_start', 'period_end', 'data_type', 'months_covered', 'standards', 'metadata']

        try:
            # Get sample of cancer data records for testing
            cancer_records = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).neq('cancer_data', 'null').limit(20).execute()

            for record in cancer_records.data:
                results["records_tested"] += 1
                trust_code = record['trust_code']
                cancer_data = record['cancer_data']

                structure_valid = True
                record_errors = []

                # Check top-level required fields
                for field in required_fields:
                    if field not in cancer_data:
                        record_errors.append(f"Missing field: {field}")
                        structure_valid = False

                        if field not in results["missing_fields"]:
                            results["missing_fields"][field] = 0
                        results["missing_fields"][field] += 1

                # Check standards structure
                standards = cancer_data.get('standards', {})
                standards_found = list(standards.keys())
                results["standards_coverage"][trust_code] = standards_found

                for expected_standard in self.expected_standards:
                    if expected_standard not in standards:
                        record_errors.append(f"Missing standard: {expected_standard}")
                        structure_valid = False

                # Check standards have required substructures
                for standard_key, standard_data in standards.items():
                    if not isinstance(standard_data, dict):
                        record_errors.append(f"Standard {standard_key} is not a dict")
                        structure_valid = False
                        continue

                    # Check for summary
                    if 'summary' not in standard_data:
                        record_errors.append(f"Missing summary in {standard_key}")
                        structure_valid = False
                    elif not isinstance(standard_data['summary'], dict):
                        record_errors.append(f"Summary in {standard_key} is not a dict")
                        structure_valid = False
                    else:
                        # Check summary fields
                        summary = standard_data['summary']
                        required_summary_fields = ['total_treated', 'within_standard', 'breaches', 'performance_pct']
                        for summary_field in required_summary_fields:
                            if summary_field not in summary:
                                record_errors.append(f"Missing {summary_field} in {standard_key} summary")
                                structure_valid = False

                    # Check for by_cancer_type
                    if 'by_cancer_type' not in standard_data:
                        record_errors.append(f"Missing by_cancer_type in {standard_key}")
                        structure_valid = False

                # Check metadata structure
                metadata = cancer_data.get('metadata', {})
                if isinstance(metadata, dict):
                    expected_metadata_fields = ['total_patients_treated_all_standards', 'overall_performance_weighted', 'last_updated']
                    for meta_field in expected_metadata_fields:
                        if meta_field not in metadata:
                            record_errors.append(f"Missing metadata field: {meta_field}")
                            structure_valid = False

                if structure_valid:
                    results["valid_structures"] += 1
                else:
                    results["structure_errors"].extend([f"{trust_code} ({record['period']}): {err}" for err in record_errors])

            # Calculate structure validity rate
            validity_rate = 0
            if results["records_tested"] > 0:
                validity_rate = (results["valid_structures"] / results["records_tested"]) * 100

            print(f"  🏗️ Structure Analysis:")
            print(f"    - Records tested: {results['records_tested']}")
            print(f"    - Valid structures: {results['valid_structures']} ({validity_rate:.1f}%)")
            print(f"    - Structure errors: {len(results['structure_errors'])}")

            if results["missing_fields"]:
                print(f"  📋 Most common missing fields:")
                for field, count in sorted(results["missing_fields"].items(), key=lambda x: x[1], reverse=True)[:5]:
                    print(f"    - {field}: missing in {count} records")

            if validity_rate < 90:
                severity = "HIGH" if validity_rate < 75 else "MEDIUM"
                self.report["issues_found"].append({
                    "severity": severity,
                    "category": "STRUCTURE_INVALID",
                    "description": f"JSONB structure validity below threshold: {validity_rate:.1f}%",
                    "impact": "Frontend may fail to display cancer data correctly",
                    "recommendation": "Review cancer data processing to ensure complete JSONB structure generation"
                })

        except Exception as e:
            print(f"  ❌ Structure integrity test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["jsonb_structure"] = results

    def _test_data_consistency(self):
        """Test data consistency within cancer records"""
        print("\n🔍 Test 4: Data Consistency Validation")

        results = {
            "records_tested": 0,
            "consistent_records": 0,
            "consistency_errors": [],
            "calculation_mismatches": [],
            "negative_values_found": [],
            "null_performance_records": []
        }

        try:
            # Get cancer data records for consistency testing
            cancer_records = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).neq('cancer_data', 'null').limit(30).execute()

            for record in cancer_records.data:
                results["records_tested"] += 1
                trust_code = record['trust_code']
                period = record['period']
                cancer_data = record['cancer_data']

                record_consistent = True
                record_errors = []

                try:
                    standards = cancer_data.get('standards', {})

                    for standard_key, standard_data in standards.items():
                        summary = standard_data.get('summary', {})

                        total_treated = summary.get('total_treated', 0)
                        within_standard = summary.get('within_standard', 0)
                        breaches = summary.get('breaches', 0)
                        performance_pct = summary.get('performance_pct', 0)

                        # Check for negative values
                        if total_treated < 0 or within_standard < 0 or breaches < 0:
                            results["negative_values_found"].append({
                                "trust": trust_code,
                                "period": period,
                                "standard": standard_key,
                                "values": {"total": total_treated, "within": within_standard, "breaches": breaches}
                            })
                            record_consistent = False

                        # Check calculation consistency: total = within + breaches
                        if total_treated > 0:
                            if abs(total_treated - (within_standard + breaches)) > 1:  # Allow small rounding
                                results["calculation_mismatches"].append({
                                    "trust": trust_code,
                                    "period": period,
                                    "standard": standard_key,
                                    "total": total_treated,
                                    "within_plus_breaches": within_standard + breaches,
                                    "difference": total_treated - (within_standard + breaches)
                                })
                                record_consistent = False

                            # Check performance percentage calculation
                            expected_pct = (within_standard / total_treated) * 100
                            if abs(expected_pct - performance_pct) > 0.5:  # Allow 0.5% tolerance
                                record_errors.append(f"Performance % mismatch in {standard_key}: expected {expected_pct:.1f}%, got {performance_pct:.1f}%")
                                record_consistent = False

                        # Check for null performance when there should be data
                        if total_treated > 0 and performance_pct == 0 and within_standard > 0:
                            results["null_performance_records"].append({
                                "trust": trust_code,
                                "period": period,
                                "standard": standard_key
                            })

                    # Check metadata consistency
                    metadata = cancer_data.get('metadata', {})
                    overall_performance = metadata.get('overall_performance_weighted', 0)

                    if overall_performance < 0 or overall_performance > 100:
                        record_errors.append(f"Invalid overall performance: {overall_performance}%")
                        record_consistent = False

                except Exception as e:
                    record_errors.append(f"Consistency check error: {str(e)}")
                    record_consistent = False

                if record_consistent:
                    results["consistent_records"] += 1

                if record_errors:
                    results["consistency_errors"].extend([f"{trust_code} ({period}): {err}" for err in record_errors])

            # Calculate consistency rate
            consistency_rate = 0
            if results["records_tested"] > 0:
                consistency_rate = (results["consistent_records"] / results["records_tested"]) * 100

            print(f"  🔍 Consistency Analysis:")
            print(f"    - Records tested: {results['records_tested']}")
            print(f"    - Consistent records: {results['consistent_records']} ({consistency_rate:.1f}%)")
            print(f"    - Calculation mismatches: {len(results['calculation_mismatches'])}")
            print(f"    - Negative values found: {len(results['negative_values_found'])}")
            print(f"    - Consistency errors: {len(results['consistency_errors'])}")

            if consistency_rate < 95:
                severity = "HIGH" if consistency_rate < 85 else "MEDIUM"
                self.report["issues_found"].append({
                    "severity": severity,
                    "category": "DATA_INCONSISTENCY",
                    "description": f"Data consistency rate below threshold: {consistency_rate:.1f}%",
                    "impact": "Cancer performance metrics may be unreliable",
                    "recommendation": "Review calculation logic and data processing"
                })

            # Show sample errors
            if results["calculation_mismatches"]:
                print(f"  📝 Sample calculation mismatches:")
                for mismatch in results["calculation_mismatches"][:3]:
                    print(f"    - {mismatch['trust']} {mismatch['standard']}: total={mismatch['total']}, within+breaches={mismatch['within_plus_breaches']}")

        except Exception as e:
            print(f"  ❌ Data consistency test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["data_consistency"] = results

    def _test_performance_metrics(self):
        """Test performance metrics validity and ranges"""
        print("\n📊 Test 5: Performance Metrics Validation")

        results = {
            "metrics_tested": 0,
            "valid_metrics": 0,
            "out_of_range_percentages": [],
            "unrealistic_values": [],
            "performance_distribution": {},
            "standard_performance_stats": {}
        }

        try:
            # Get cancer data for performance testing
            cancer_records = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).neq('cancer_data', 'null').limit(50).execute()

            all_performances = {standard: [] for standard in self.expected_standards}

            for record in cancer_records.data:
                trust_code = record['trust_code']
                cancer_data = record['cancer_data']

                try:
                    standards = cancer_data.get('standards', {})

                    for standard_key, standard_data in standards.items():
                        summary = standard_data.get('summary', {})

                        performance_pct = summary.get('performance_pct', 0)
                        total_treated = summary.get('total_treated', 0)

                        results["metrics_tested"] += 1

                        # Check percentage range (0-100)
                        if 0 <= performance_pct <= 100:
                            results["valid_metrics"] += 1
                            all_performances[standard_key].append(performance_pct)
                        else:
                            results["out_of_range_percentages"].append({
                                "trust": trust_code,
                                "standard": standard_key,
                                "performance": performance_pct
                            })

                        # Check for unrealistic combinations
                        if total_treated > 10000:  # Very high volume
                            results["unrealistic_values"].append({
                                "trust": trust_code,
                                "standard": standard_key,
                                "total_treated": total_treated,
                                "reason": "Very high patient volume"
                            })

                        # Check for perfect performance with high volume (unusual)
                        if performance_pct == 100 and total_treated > 100:
                            results["unrealistic_values"].append({
                                "trust": trust_code,
                                "standard": standard_key,
                                "performance": performance_pct,
                                "total_treated": total_treated,
                                "reason": "Perfect performance with high volume"
                            })

                except Exception as e:
                    continue

            # Calculate performance statistics
            for standard, performances in all_performances.items():
                if performances:
                    results["standard_performance_stats"][standard] = {
                        "count": len(performances),
                        "mean": sum(performances) / len(performances),
                        "min": min(performances),
                        "max": max(performances),
                        "below_target": len([p for p in performances if p < self._get_target_performance(standard)])
                    }

            # Calculate validity rate
            validity_rate = 0
            if results["metrics_tested"] > 0:
                validity_rate = (results["valid_metrics"] / results["metrics_tested"]) * 100

            print(f"  📊 Performance Metrics Analysis:")
            print(f"    - Metrics tested: {results['metrics_tested']}")
            print(f"    - Valid metrics: {results['valid_metrics']} ({validity_rate:.1f}%)")
            print(f"    - Out of range percentages: {len(results['out_of_range_percentages'])}")
            print(f"    - Unrealistic values: {len(results['unrealistic_values'])}")

            # Show performance statistics
            print(f"  📈 Performance statistics by standard:")
            for standard, stats in results["standard_performance_stats"].items():
                target = self._get_target_performance(standard)
                print(f"    - {standard}: mean={stats['mean']:.1f}%, range={stats['min']:.1f}%-{stats['max']:.1f}%, below target ({target}%): {stats['below_target']}")

            if validity_rate < 98:
                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "INVALID_METRICS",
                    "description": f"Performance metrics validity below threshold: {validity_rate:.1f}%",
                    "impact": "Some performance data may be invalid",
                    "recommendation": "Review performance calculation logic and data validation"
                })

            if results["out_of_range_percentages"]:
                print(f"  ⚠️ Out of range percentages found:")
                for oor in results["out_of_range_percentages"][:3]:
                    print(f"    - {oor['trust']} {oor['standard']}: {oor['performance']:.1f}%")

        except Exception as e:
            print(f"  ❌ Performance metrics test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["performance_metrics"] = results

    def _get_target_performance(self, standard: str) -> int:
        """Get target performance percentage for a standard"""
        targets = {
            "28_day_fds": 75,
            "31_day_combined": 96,
            "62_day_combined": 85
        }
        return targets.get(standard, 85)

    def _test_trust_coverage(self):
        """Test trust coverage and identify missing trusts"""
        print("\n🏥 Test 6: Trust Coverage Analysis")

        results = {
            "trusts_with_cancer_data": 0,
            "total_trust_records": 0,
            "coverage_rate": 0.0,
            "missing_cancer_data_trusts": [],
            "r_code_trusts_with_data": 0,
            "sample_trusts_validated": []
        }

        try:
            # Get all trust records
            all_trusts = self.supabase.table('trust_metrics').select('trust_code, trust_name, cancer_data').execute()
            results["total_trust_records"] = len(all_trusts.data)

            trusts_with_cancer = []
            r_code_trusts_with_data = []
            missing_trusts = []

            for trust in all_trusts.data:
                trust_code = trust['trust_code']
                if trust['cancer_data'] is not None:
                    trusts_with_cancer.append(trust_code)
                    if trust_code.startswith('R'):
                        r_code_trusts_with_data.append(trust_code)
                else:
                    missing_trusts.append({
                        "trust_code": trust_code,
                        "trust_name": trust.get('trust_name', 'Unknown')
                    })

            results["trusts_with_cancer_data"] = len(trusts_with_cancer)
            results["r_code_trusts_with_data"] = len(r_code_trusts_with_data)
            results["missing_cancer_data_trusts"] = missing_trusts

            if results["total_trust_records"] > 0:
                results["coverage_rate"] = (results["trusts_with_cancer_data"] / results["total_trust_records"]) * 100

            # Test sample of trusts for data quality
            sample_trusts = trusts_with_cancer[:5]  # Test first 5 trusts with data
            for trust_code in sample_trusts:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, trust_name, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').execute()

                if trust_data.data:
                    periods = [r['period'] for r in trust_data.data]
                    results["sample_trusts_validated"].append({
                        "trust_code": trust_code,
                        "periods": periods,
                        "period_count": len(periods)
                    })

            print(f"  🏥 Trust Coverage Analysis:")
            print(f"    - Total trust records: {results['total_trust_records']}")
            print(f"    - Trusts with cancer data: {results['trusts_with_cancer_data']} ({results['coverage_rate']:.1f}%)")
            print(f"    - R-code trusts with data: {results['r_code_trusts_with_data']}")
            print(f"    - Trusts missing cancer data: {len(results['missing_cancer_data_trusts'])}")

            # Show sample trust validation
            if results["sample_trusts_validated"]:
                print(f"  📋 Sample trust validation:")
                for trust in results["sample_trusts_validated"]:
                    print(f"    - {trust['trust_code']}: {trust['period_count']} periods")

            # Issue reporting
            if results["coverage_rate"] < 20:  # Less than 20% coverage is concerning
                self.report["issues_found"].append({
                    "severity": "HIGH",
                    "category": "LOW_TRUST_COVERAGE",
                    "description": f"Low trust coverage for cancer data: {results['coverage_rate']:.1f}%",
                    "impact": "Limited analysis scope",
                    "recommendation": "Run cancer data processor for more trusts"
                })

            if results["r_code_trusts_with_data"] < 50:  # Expect significant number of R-code trusts
                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "LIMITED_R_TRUST_COVERAGE",
                    "description": f"Limited R-code trust coverage: {results['r_code_trusts_with_data']} trusts",
                    "impact": "May not represent full NHS trust coverage",
                    "recommendation": "Review cancer data processing to ensure R-code trusts are included"
                })

        except Exception as e:
            print(f"  ❌ Trust coverage test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["trust_coverage"] = results

    def _test_quarter_period_validation(self):
        """Test quarter and period data validity"""
        print("\n📅 Test 7: Quarter and Period Validation")

        results = {
            "periods_found": [],
            "valid_periods": 0,
            "invalid_periods": [],
            "quarter_consistency": True,
            "period_date_validation": {},
            "expected_periods": ["2024-Q1", "2024-Q2", "2024-Q3", "2025-Q4", "2025-Q1"]
        }

        try:
            # Get unique periods from cancer data
            cancer_records = self.supabase.table('trust_metrics').select(
                'period, cancer_data'
            ).neq('cancer_data', 'null').execute()

            periods_found = set()
            period_date_checks = {}

            for record in cancer_records.data:
                period = record['period']
                periods_found.add(period)

                cancer_data = record['cancer_data']
                if isinstance(cancer_data, dict):
                    data_period = cancer_data.get('period')
                    period_start = cancer_data.get('period_start')
                    period_end = cancer_data.get('period_end')

                    # Check period consistency
                    if data_period != period:
                        results["quarter_consistency"] = False
                        results["invalid_periods"].append({
                            "database_period": period,
                            "jsonb_period": data_period,
                            "issue": "Period mismatch between database and JSONB"
                        })

                    # Check date format and logic
                    if period_start and period_end:
                        period_date_checks[period] = {
                            "start": period_start,
                            "end": period_end,
                            "valid_format": self._validate_date_format(period_start) and self._validate_date_format(period_end),
                            "logical_order": period_start < period_end if self._validate_date_format(period_start) and self._validate_date_format(period_end) else False
                        }

            results["periods_found"] = sorted(list(periods_found))
            results["period_date_validation"] = period_date_checks

            # Validate period format (YYYY-QX)
            valid_period_pattern = r'^\d{4}-Q[1-4]$'
            import re

            for period in results["periods_found"]:
                if re.match(valid_period_pattern, period):
                    results["valid_periods"] += 1
                else:
                    results["invalid_periods"].append({
                        "period": period,
                        "issue": "Invalid period format"
                    })

            print(f"  📅 Period Validation:")
            print(f"    - Periods found: {len(results['periods_found'])}")
            print(f"    - Valid period formats: {results['valid_periods']}")
            print(f"    - Invalid periods: {len(results['invalid_periods'])}")
            print(f"    - Quarter consistency: {'✅' if results['quarter_consistency'] else '❌'}")

            # Show periods found
            if results["periods_found"]:
                print(f"    - Periods in database: {', '.join(results['periods_found'])}")

            # Check for expected periods
            missing_expected = set(results["expected_periods"]) - set(results["periods_found"])
            if missing_expected:
                print(f"    - Missing expected periods: {', '.join(missing_expected)}")

            # Issue reporting
            if not results["quarter_consistency"]:
                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "PERIOD_INCONSISTENCY",
                    "description": "Period inconsistency between database and JSONB data",
                    "impact": "May cause confusion in period-based analysis",
                    "recommendation": "Review period assignment logic in data processing"
                })

            if results["invalid_periods"]:
                self.report["issues_found"].append({
                    "severity": "LOW",
                    "category": "INVALID_PERIOD_FORMAT",
                    "description": f"Invalid period formats found: {len(results['invalid_periods'])} issues",
                    "impact": "May cause display or filtering issues",
                    "recommendation": "Standardize period format to YYYY-QX"
                })

        except Exception as e:
            print(f"  ❌ Period validation test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["quarter_period_validation"] = results

    def _validate_date_format(self, date_str: str) -> bool:
        """Validate date format YYYY-MM-DD"""
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except:
            return False

    def _test_cross_reference_validation(self):
        """Test cross-reference validation against expected values"""
        print("\n🔗 Test 8: Cross-Reference Validation")

        results = {
            "sample_trusts_tested": 0,
            "cross_reference_matches": 0,
            "validation_results": [],
            "known_trust_validation": {}
        }

        try:
            # Test known trust codes that should have cancer data
            known_trusts = ['RJ1', 'RGT', 'RBL']  # Well-known NHS trusts

            for trust_code in known_trusts:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, trust_name, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if trust_data.data:
                    record = trust_data.data[0]
                    cancer_data = record['cancer_data']

                    validation = {
                        "trust_code": trust_code,
                        "has_data": True,
                        "period": record['period'],
                        "standards_count": len(cancer_data.get('standards', {})),
                        "total_patients": cancer_data.get('metadata', {}).get('total_patients_treated_all_standards', 0),
                        "overall_performance": cancer_data.get('metadata', {}).get('overall_performance_weighted', 0)
                    }

                    results["cross_reference_matches"] += 1
                else:
                    validation = {
                        "trust_code": trust_code,
                        "has_data": False
                    }

                results["known_trust_validation"][trust_code] = validation
                results["sample_trusts_tested"] += 1

            # Test data ranges against expected NHS performance ranges
            cancer_records = self.supabase.table('trust_metrics').select(
                'trust_code, cancer_data'
            ).neq('cancer_data', 'null').limit(10).execute()

            realistic_data_count = 0
            total_tested = 0

            for record in cancer_records.data:
                cancer_data = record['cancer_data']
                overall_performance = cancer_data.get('metadata', {}).get('overall_performance_weighted', 0)

                total_tested += 1

                # Check if performance is in realistic range (NHS typically 60-95%)
                if 30 <= overall_performance <= 100:  # Allow broader range for validation
                    realistic_data_count += 1

            realistic_rate = (realistic_data_count / total_tested) * 100 if total_tested > 0 else 0

            print(f"  🔗 Cross-Reference Validation:")
            print(f"    - Sample trusts tested: {results['sample_trusts_tested']}")
            print(f"    - Known trusts with data: {results['cross_reference_matches']}")
            print(f"    - Realistic performance data: {realistic_rate:.1f}%")

            # Show known trust validation
            if results["known_trust_validation"]:
                print(f"  📋 Known trust validation:")
                for trust_code, validation in results["known_trust_validation"].items():
                    if validation["has_data"]:
                        print(f"    - {trust_code}: {validation['standards_count']} standards, {validation['total_patients']} patients, {validation['overall_performance']:.1f}% performance")
                    else:
                        print(f"    - {trust_code}: No cancer data found")

            # Issue reporting
            if results["cross_reference_matches"] == 0 and results["sample_trusts_tested"] > 0:
                self.report["issues_found"].append({
                    "severity": "HIGH",
                    "category": "NO_KNOWN_TRUST_DATA",
                    "description": "No cancer data found for known NHS trusts",
                    "impact": "May indicate data processing issues",
                    "recommendation": "Verify cancer data processor has run for major NHS trusts"
                })

            if realistic_rate < 80:
                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "UNREALISTIC_DATA_RANGES",
                    "description": f"Low percentage of realistic performance data: {realistic_rate:.1f}%",
                    "impact": "Data may not reflect actual NHS performance",
                    "recommendation": "Review data processing and validation logic"
                })

        except Exception as e:
            print(f"  ❌ Cross-reference validation test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["cross_reference_validation"] = results

    def _generate_summary(self):
        """Generate database integrity validation summary"""
        print("\n📋 Generating Database Integrity Summary...")

        summary = {
            "database_accessible": True,
            "total_tests_run": len(self.report["validation_results"]),
            "tests_passed": 0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "low_issues": 0,
            "overall_integrity_score": 0.0,
            "coverage_metrics": {}
        }

        # Extract key metrics
        validation_results = self.report.get("validation_results", {})

        # Coverage metrics
        if "cancer_data_coverage" in validation_results:
            coverage = validation_results["cancer_data_coverage"]
            summary["coverage_metrics"]["data_coverage_pct"] = coverage.get("coverage_percentage", 0)
            summary["coverage_metrics"]["trusts_with_data"] = coverage.get("unique_trusts_with_cancer_data", 0)
            summary["coverage_metrics"]["periods_covered"] = len(coverage.get("periods_covered", []))

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

        # Calculate tests passed (tests with no critical or high issues)
        test_categories = ["database_connectivity", "jsonb_structure", "data_consistency", "performance_metrics"]
        for category in test_categories:
            if category in validation_results:
                test_result = validation_results[category]
                if not test_result.get("error") and category not in ["database_connectivity"]:  # Special case for connectivity
                    summary["tests_passed"] += 1

        # Calculate overall integrity score
        deductions = 0
        deductions += summary["critical_issues"] * 25  # Heavy penalty for critical issues
        deductions += summary["high_issues"] * 10
        deductions += summary["medium_issues"] * 5
        deductions += summary["low_issues"] * 1

        base_score = 100
        if summary["coverage_metrics"].get("data_coverage_pct", 0) < 10:
            base_score = 50  # Very low coverage significantly impacts score

        summary["overall_integrity_score"] = max(0, base_score - deductions)

        # Generate recommendations
        recommendations = []

        if summary["critical_issues"] > 0:
            recommendations.append("🚨 Critical database issues must be resolved immediately")

        if summary["coverage_metrics"].get("data_coverage_pct", 0) < 10:
            recommendations.append("📊 Very low data coverage - run cancer data processor")

        if summary["overall_integrity_score"] < 70:
            recommendations.append("🔧 Database integrity needs significant improvement")

        if summary["high_issues"] > 0:
            recommendations.append("⚠️ Address high-priority database issues before production use")

        if summary["overall_integrity_score"] >= 80:
            recommendations.append("✅ Database ready for Phase 4 frontend validation")
        else:
            recommendations.append("🔄 Fix database issues before proceeding to frontend testing")

        self.report["recommendations"].extend(recommendations)

        # Determine overall status
        if summary["critical_issues"] > 0:
            self.report["overall_status"] = "CRITICAL_ISSUES"
        elif summary["overall_integrity_score"] < 60:
            self.report["overall_status"] = "POOR_INTEGRITY"
        elif summary["high_issues"] > 0:
            self.report["overall_status"] = "HIGH_ISSUES"
        elif summary["medium_issues"] > 0:
            self.report["overall_status"] = "MEDIUM_ISSUES"
        else:
            self.report["overall_status"] = "PASSED"

        self.report["summary"] = summary

        # Print summary
        print(f"\n{'='*60}")
        print(f"📋 PHASE 3 DATABASE INTEGRITY SUMMARY")
        print(f"{'='*60}")
        print(f"Database accessible: {'✅' if summary['database_accessible'] else '❌'}")
        print(f"Overall integrity score: {summary['overall_integrity_score']:.1f}/100")
        print(f"\nCoverage metrics:")
        for metric, value in summary["coverage_metrics"].items():
            print(f"  {metric}: {value}")
        print(f"\nTests: {summary['tests_passed']}/{summary['total_tests_run']} passed")
        print(f"\nIssues found:")
        print(f"  🚨 Critical: {summary['critical_issues']}")
        print(f"  ⚠️ High: {summary['high_issues']}")
        print(f"  ❓ Medium: {summary['medium_issues']}")
        print(f"  ℹ️ Low: {summary['low_issues']}")
        print(f"\nOverall Status: {self.report['overall_status']}")

        if self.report["recommendations"]:
            print(f"\n📋 Recommendations:")
            for rec in self.report["recommendations"]:
                print(f"  {rec}")


def main():
    """Main execution function"""
    print("NHS Cancer Performance Data - Phase 3: Database Integrity Validation")
    print("=" * 80)

    # Initialize validator
    validator = CancerDatabaseIntegrityValidator()

    # Run all tests
    report = validator.run_all_tests()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/phase3_cancer_database_integrity_{timestamp}.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved: {report_file}")
    except Exception as e:
        print(f"\n❌ Error saving report: {e}")

    # Exit with appropriate code
    status = report.get("overall_status", "ERROR")
    if status == "PASSED":
        print(f"\n✅ Phase 3 database integrity validation completed successfully!")
        sys.exit(0)
    elif status in ["MEDIUM_ISSUES", "HIGH_ISSUES", "POOR_INTEGRITY"]:
        print(f"\n⚠️ Phase 3 database integrity validation completed with issues - review before proceeding")
        sys.exit(1)
    else:
        print(f"\n🚨 Phase 3 database integrity validation failed - critical issues must be resolved")
        sys.exit(2)


if __name__ == "__main__":
    main()
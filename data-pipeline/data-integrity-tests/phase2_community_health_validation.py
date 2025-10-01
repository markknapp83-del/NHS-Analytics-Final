#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Phase 2 Community Health Extension
===============================================================

This script extends Phase 2 validation to include comprehensive Community Health
database migration integrity testing, covering JSONB structure validation,
wait band mathematics, service categorization, and data transformation accuracy.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple, Optional, Set
import random
from supabase import create_client, Client
import warnings
warnings.filterwarnings('ignore')

class CommunityHealthDatabaseValidator:
    """Validates Community Health database migration integrity and transformation accuracy"""

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
            "test_phase": "Phase 2: Community Health Database Migration Integrity",
            "data_directory": str(self.data_dir),
            "results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "sample_validations": []
        }

        # Load Community Health database data
        self.db_data = self.load_database_data()
        self.excel_data = self.load_sample_excel_data()

    def load_database_data(self) -> List[Dict]:
        """Load Community Health data from database"""
        try:
            result = self.supabase.table('trust_metrics').select('*').not_.is_(
                'community_health_data', 'null'
            ).execute()

            # Filter out empty community health data
            community_records = []
            for record in result.data:
                ch_data = record.get('community_health_data')
                if ch_data and ch_data not in [None, {}, "EMPTY"]:
                    community_records.append(record)

            print(f"🔗 Loaded {len(community_records)} database records with Community Health data")
            return community_records
        except Exception as e:
            print(f"❌ Error loading database data: {e}")
            return []

    def load_sample_excel_data(self) -> Dict[str, pd.DataFrame]:
        """Load sample Excel data for validation"""
        excel_data = {}

        # Load 2-3 sample Excel files for validation
        community_files = list(self.data_dir.glob("Community-health-services-waiting-lists*.xlsx"))
        sample_files = community_files[:3] if len(community_files) >= 3 else community_files

        for file in sample_files:
            try:
                # Extract month/year from filename
                file_key = file.stem.replace("Community-health-services-waiting-lists-", "")

                # Read Table 4 with correct header (row 4 has service names)
                df = pd.read_excel(file, sheet_name='Table 4', header=4)
                excel_data[file_key] = df

            except Exception as e:
                print(f"⚠️ Warning: Could not load {file.name}: {e}")

        print(f"📄 Loaded {len(excel_data)} Excel files for validation")
        return excel_data

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 2 Community Health validation tests"""
        print("🔍 Starting Phase 2: Community Health Database Migration Integrity")
        print(f"📊 Testing Community Health data transformation accuracy")
        print("-" * 70)

        if not self.db_data:
            self.report["summary"]["overall_status"] = "FAIL"
            self.report["issues_found"].append("Critical: No Community Health database records found")
            return self.report

        # Test 1: JSONB structure validation
        print("\n1️⃣ Testing JSONB structure integrity...")
        self.test_jsonb_structure_integrity()

        # Test 2: Service categorization validation
        print("\n2️⃣ Testing service categorization accuracy...")
        self.test_service_categorization()

        # Test 3: Wait band mathematics validation
        print("\n3️⃣ Testing wait band mathematics...")
        self.test_wait_band_mathematics()

        # Test 4: Metadata accuracy validation
        print("\n4️⃣ Testing metadata accuracy...")
        self.test_metadata_accuracy()

        # Test 5: Data transformation accuracy
        if self.excel_data:
            print("\n5️⃣ Testing data transformation accuracy...")
            self.test_data_transformation_accuracy()

        # Generate summary
        self.generate_summary()

        return self.report

    def test_jsonb_structure_integrity(self) -> None:
        """Test 2.1: Validate JSONB structure and content for Community Health data"""
        print("   📋 Checking Community Health JSONB structure integrity...")

        jsonb_results = {
            "sample_size": min(100, len(self.db_data)),
            "structure_analysis": {
                "adult_services": {"populated": 0, "empty": 0, "invalid": 0},
                "cyp_services": {"populated": 0, "empty": 0, "invalid": 0},
                "metadata": {"populated": 0, "empty": 0, "invalid": 0}
            },
            "service_analysis": {
                "adult_services_found": set(),
                "cyp_services_found": set(),
                "total_services_count": 0
            },
            "data_quality": {
                "valid_structures": 0,
                "corrupted_structures": 0,
                "empty_services": 0
            },
            "overall_status": "PASS"
        }

        sample_records = self.db_data[:jsonb_results["sample_size"]]

        for record in sample_records:
            ch_data = record.get('community_health_data')

            if not isinstance(ch_data, dict):
                jsonb_results["data_quality"]["corrupted_structures"] += 1
                continue

            jsonb_results["data_quality"]["valid_structures"] += 1

            # Test adult_services structure
            adult_services = ch_data.get('adult_services', {})
            if isinstance(adult_services, dict) and adult_services:
                jsonb_results["structure_analysis"]["adult_services"]["populated"] += 1
                jsonb_results["service_analysis"]["adult_services_found"].update(adult_services.keys())

                # Validate service data structure
                for service_key, service_data in adult_services.items():
                    if isinstance(service_data, dict):
                        required_fields = [
                            'total_waiting', 'wait_0_1_weeks', 'wait_1_2_weeks',
                            'wait_2_4_weeks', 'wait_4_12_weeks', 'wait_12_18_weeks',
                            'wait_18_52_weeks', 'wait_52_plus_weeks'
                        ]

                        if not all(field in service_data for field in required_fields):
                            jsonb_results["structure_analysis"]["adult_services"]["invalid"] += 1
                            break
            else:
                jsonb_results["structure_analysis"]["adult_services"]["empty"] += 1

            # Test cyp_services structure
            cyp_services = ch_data.get('cyp_services', {})
            if isinstance(cyp_services, dict) and cyp_services:
                jsonb_results["structure_analysis"]["cyp_services"]["populated"] += 1
                jsonb_results["service_analysis"]["cyp_services_found"].update(cyp_services.keys())

                # Validate service data structure
                for service_key, service_data in cyp_services.items():
                    if isinstance(service_data, dict):
                        required_fields = [
                            'total_waiting', 'wait_0_1_weeks', 'wait_1_2_weeks',
                            'wait_2_4_weeks', 'wait_4_12_weeks', 'wait_12_18_weeks',
                            'wait_18_52_weeks', 'wait_52_plus_weeks'
                        ]

                        if not all(field in service_data for field in required_fields):
                            jsonb_results["structure_analysis"]["cyp_services"]["invalid"] += 1
                            break
            else:
                jsonb_results["structure_analysis"]["cyp_services"]["empty"] += 1

            # Test metadata structure
            metadata = ch_data.get('metadata', {})
            if isinstance(metadata, dict) and metadata:
                jsonb_results["structure_analysis"]["metadata"]["populated"] += 1

                required_metadata_fields = [
                    'services_reported', 'total_waiting_all_services',
                    'adult_services_count', 'cyp_services_count'
                ]

                if not all(field in metadata for field in required_metadata_fields):
                    jsonb_results["structure_analysis"]["metadata"]["invalid"] += 1
            else:
                jsonb_results["structure_analysis"]["metadata"]["empty"] += 1

        # Calculate service statistics
        jsonb_results["service_analysis"]["total_adult_services"] = len(jsonb_results["service_analysis"]["adult_services_found"])
        jsonb_results["service_analysis"]["total_cyp_services"] = len(jsonb_results["service_analysis"]["cyp_services_found"])
        jsonb_results["service_analysis"]["total_services_count"] = (
            jsonb_results["service_analysis"]["total_adult_services"] +
            jsonb_results["service_analysis"]["total_cyp_services"]
        )

        # Convert sets to lists for JSON serialization
        jsonb_results["service_analysis"]["adult_services_found"] = list(jsonb_results["service_analysis"]["adult_services_found"])
        jsonb_results["service_analysis"]["cyp_services_found"] = list(jsonb_results["service_analysis"]["cyp_services_found"])

        # Calculate success rates
        adult_success_rate = jsonb_results["structure_analysis"]["adult_services"]["populated"] / len(sample_records)
        cyp_success_rate = jsonb_results["structure_analysis"]["cyp_services"]["populated"] / len(sample_records)
        metadata_success_rate = jsonb_results["structure_analysis"]["metadata"]["populated"] / len(sample_records)

        # Determine overall status
        avg_success_rate = (adult_success_rate + cyp_success_rate + metadata_success_rate) / 3

        if avg_success_rate < 0.7:
            jsonb_results["overall_status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: Low JSONB structure integrity ({avg_success_rate:.1%} success rate)")
        elif avg_success_rate < 0.9:
            jsonb_results["overall_status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Some JSONB structure issues ({avg_success_rate:.1%} success rate)")

        # Report findings
        print(f"      📊 Adult services structure: {adult_success_rate:.1%} success rate")
        print(f"      📊 CYP services structure: {cyp_success_rate:.1%} success rate")
        print(f"      📊 Metadata structure: {metadata_success_rate:.1%} success rate")
        print(f"      📊 Total unique services found: {jsonb_results['service_analysis']['total_services_count']}")

        if jsonb_results["data_quality"]["corrupted_structures"] > 0:
            print(f"      ⚠️ {jsonb_results['data_quality']['corrupted_structures']} corrupted JSONB structures found")

        self.report["results"]["jsonb_structure_integrity"] = jsonb_results

    def test_service_categorization(self) -> None:
        """Test 2.2: Validate service categorization between Adult and CYP services"""
        print("   🔍 Testing service categorization accuracy...")

        categorization_results = {
            "categorization_validation": {
                "correct_adult_categorization": 0,
                "incorrect_adult_categorization": 0,
                "correct_cyp_categorization": 0,
                "incorrect_cyp_categorization": 0
            },
            "service_overlap_analysis": {
                "overlapping_services": [],
                "unique_adult_services": 0,
                "unique_cyp_services": 0
            },
            "expected_services": {
                "adult_key_services": [
                    "audiology", "community_nursing_services", "musculoskeletal_service",
                    "podiatry", "physiotherapy", "occupational_therapy", "dietetics",
                    "speech_language_therapy", "intermediate_care"
                ],
                "cyp_key_services": [
                    "audiology", "community_paediatric_service", "physiotherapy",
                    "occupational_therapy", "dietetics", "speech_language_therapy",
                    "vision_screening", "newborn_hearing_screening"
                ]
            },
            "validation_results": {
                "missing_adult_services": [],
                "missing_cyp_services": [],
                "unexpected_adult_services": [],
                "unexpected_cyp_services": []
            },
            "overall_status": "PASS"
        }

        # Analyze service categorization across database records
        all_adult_services = set()
        all_cyp_services = set()

        sample_records = self.db_data[:50]  # Sample first 50 records

        for record in sample_records:
            ch_data = record.get('community_health_data', {})

            if not isinstance(ch_data, dict):
                continue

            # Collect adult services
            adult_services = ch_data.get('adult_services', {})
            if isinstance(adult_services, dict):
                all_adult_services.update(adult_services.keys())

                # Validate each service has proper structure
                for service_key in adult_services.keys():
                    if service_key.startswith('cyp_') or 'children' in service_key.lower() or 'paediatric' in service_key.lower():
                        categorization_results["categorization_validation"]["incorrect_adult_categorization"] += 1
                    else:
                        categorization_results["categorization_validation"]["correct_adult_categorization"] += 1

            # Collect CYP services
            cyp_services = ch_data.get('cyp_services', {})
            if isinstance(cyp_services, dict):
                all_cyp_services.update(cyp_services.keys())

                # Validate each service has proper structure
                for service_key in cyp_services.keys():
                    if service_key.startswith('cyp_') or 'children' in service_key.lower() or 'paediatric' in service_key.lower():
                        categorization_results["categorization_validation"]["correct_cyp_categorization"] += 1
                    else:
                        categorization_results["categorization_validation"]["incorrect_cyp_categorization"] += 1

        # Analyze overlapping services
        overlapping_services = all_adult_services.intersection(all_cyp_services)
        categorization_results["service_overlap_analysis"]["overlapping_services"] = list(overlapping_services)
        categorization_results["service_overlap_analysis"]["unique_adult_services"] = len(all_adult_services - all_cyp_services)
        categorization_results["service_overlap_analysis"]["unique_cyp_services"] = len(all_cyp_services - all_adult_services)

        # Check for expected services
        expected_adult = set(categorization_results["expected_services"]["adult_key_services"])
        expected_cyp = set(categorization_results["expected_services"]["cyp_key_services"])

        categorization_results["validation_results"]["missing_adult_services"] = list(expected_adult - all_adult_services)
        categorization_results["validation_results"]["missing_cyp_services"] = list(expected_cyp - all_cyp_services)

        # Calculate accuracy rates
        total_adult_checks = (
            categorization_results["categorization_validation"]["correct_adult_categorization"] +
            categorization_results["categorization_validation"]["incorrect_adult_categorization"]
        )

        total_cyp_checks = (
            categorization_results["categorization_validation"]["correct_cyp_categorization"] +
            categorization_results["categorization_validation"]["incorrect_cyp_categorization"]
        )

        adult_accuracy = (
            categorization_results["categorization_validation"]["correct_adult_categorization"] / max(1, total_adult_checks)
        )

        cyp_accuracy = (
            categorization_results["categorization_validation"]["correct_cyp_categorization"] / max(1, total_cyp_checks)
        )

        # Determine overall status
        avg_accuracy = (adult_accuracy + cyp_accuracy) / 2

        if avg_accuracy < 0.9 or len(categorization_results["validation_results"]["missing_adult_services"]) > 3:
            categorization_results["overall_status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: Service categorization issues - {avg_accuracy:.1%} accuracy")
        elif avg_accuracy < 0.95 or len(categorization_results["validation_results"]["missing_adult_services"]) > 1:
            categorization_results["overall_status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Minor service categorization issues - {avg_accuracy:.1%} accuracy")

        # Report findings
        print(f"      📊 Adult services categorization: {adult_accuracy:.1%} accuracy")
        print(f"      📊 CYP services categorization: {cyp_accuracy:.1%} accuracy")
        print(f"      📊 Total Adult services found: {len(all_adult_services)}")
        print(f"      📊 Total CYP services found: {len(all_cyp_services)}")
        print(f"      📊 Overlapping services: {len(overlapping_services)}")

        if categorization_results["validation_results"]["missing_adult_services"]:
            print(f"      ⚠️ Missing key Adult services: {len(categorization_results['validation_results']['missing_adult_services'])}")

        self.report["results"]["service_categorization"] = categorization_results

    def test_wait_band_mathematics(self) -> None:
        """Test 2.3: Validate wait band mathematics and calculations"""
        print("   🧮 Testing wait band mathematics...")

        math_results = {
            "wait_band_validation": {"tests": 0, "violations": []},
            "total_calculation_validation": {"tests": 0, "violations": []},
            "percentage_validation": {"tests": 0, "violations": []},
            "statistical_analysis": {
                "mean_total_waiting": 0,
                "median_total_waiting": 0,
                "services_with_breaches": 0,
                "average_breach_rate": 0
            },
            "overall_status": "PASS"
        }

        sample_records = self.db_data[:50]  # Sample for detailed analysis
        all_totals = []
        breach_rates = []

        for record in sample_records:
            ch_data = record.get('community_health_data', {})

            if not isinstance(ch_data, dict):
                continue

            # Test both adult and CYP services
            for service_type in ['adult_services', 'cyp_services']:
                services = ch_data.get(service_type, {})

                if not isinstance(services, dict):
                    continue

                for service_key, service_data in services.items():
                    if not isinstance(service_data, dict):
                        continue

                    # Extract wait band values
                    wait_bands = {
                        'wait_0_1_weeks': service_data.get('wait_0_1_weeks', 0),
                        'wait_1_2_weeks': service_data.get('wait_1_2_weeks', 0),
                        'wait_2_4_weeks': service_data.get('wait_2_4_weeks', 0),
                        'wait_4_12_weeks': service_data.get('wait_4_12_weeks', 0),
                        'wait_12_18_weeks': service_data.get('wait_12_18_weeks', 0),
                        'wait_18_52_weeks': service_data.get('wait_18_52_weeks', 0),
                        'wait_52_plus_weeks': service_data.get('wait_52_plus_weeks', 0)
                    }

                    total_waiting = service_data.get('total_waiting', 0)

                    # Convert to numbers if they're strings
                    try:
                        wait_band_values = {k: float(v) if v is not None else 0 for k, v in wait_bands.items()}
                        total_waiting = float(total_waiting) if total_waiting is not None else 0
                    except (ValueError, TypeError):
                        continue

                    # Skip if no data
                    if total_waiting <= 0:
                        continue

                    math_results["wait_band_validation"]["tests"] += 1
                    all_totals.append(total_waiting)

                    # Test 1: Wait bands should sum to total waiting (allow 1% tolerance)
                    band_sum = sum(wait_band_values.values())
                    if total_waiting > 0:
                        difference_pct = abs(total_waiting - band_sum) / total_waiting
                        if difference_pct > 0.01:  # More than 1% difference
                            math_results["wait_band_validation"]["violations"].append({
                                "trust_code": record.get('trust_code'),
                                "service_type": service_type,
                                "service_key": service_key,
                                "total_waiting": total_waiting,
                                "band_sum": band_sum,
                                "difference": total_waiting - band_sum,
                                "difference_pct": round(difference_pct * 100, 2)
                            })

                    # Test 2: Calculate breach rate
                    breaches_52_plus = wait_band_values.get('wait_52_plus_weeks', 0)
                    if breaches_52_plus > 0:
                        breach_rate = breaches_52_plus / total_waiting
                        breach_rates.append(breach_rate)
                        math_results["statistical_analysis"]["services_with_breaches"] += 1

        # Statistical analysis
        if all_totals:
            math_results["statistical_analysis"]["mean_total_waiting"] = round(np.mean(all_totals), 2)
            math_results["statistical_analysis"]["median_total_waiting"] = round(np.median(all_totals), 2)

        if breach_rates:
            math_results["statistical_analysis"]["average_breach_rate"] = round(np.mean(breach_rates) * 100, 2)

        # Determine overall status
        violation_rate = len(math_results["wait_band_validation"]["violations"]) / max(1, math_results["wait_band_validation"]["tests"])

        if violation_rate > 0.1:  # More than 10% violations
            math_results["overall_status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: High wait band math violations ({violation_rate:.1%})")
        elif violation_rate > 0.05:  # More than 5% violations
            math_results["overall_status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Some wait band math violations ({violation_rate:.1%})")

        # Report findings
        print(f"      📊 Wait band tests: {math_results['wait_band_validation']['tests']}")
        print(f"      📊 Math violations: {len(math_results['wait_band_validation']['violations'])}")
        print(f"      📊 Services with 52+ week breaches: {math_results['statistical_analysis']['services_with_breaches']}")
        print(f"      📊 Average breach rate: {math_results['statistical_analysis']['average_breach_rate']}%")

        if math_results["wait_band_validation"]["violations"]:
            print(f"      ⚠️ Violation rate: {violation_rate:.1%}")

        self.report["results"]["wait_band_mathematics"] = math_results

    def test_metadata_accuracy(self) -> None:
        """Test 2.4: Validate metadata accuracy and consistency"""
        print("   📊 Testing metadata accuracy...")

        metadata_results = {
            "metadata_validation": {"tests": 0, "violations": []},
            "service_count_validation": {"tests": 0, "violations": []},
            "total_waiting_validation": {"tests": 0, "violations": []},
            "consistency_checks": {
                "services_reported_matches_actual": 0,
                "total_waiting_matches_sum": 0,
                "service_counts_match": 0
            },
            "overall_status": "PASS"
        }

        sample_records = self.db_data[:50]

        for record in sample_records:
            ch_data = record.get('community_health_data', {})

            if not isinstance(ch_data, dict):
                continue

            metadata = ch_data.get('metadata', {})
            if not isinstance(metadata, dict):
                continue

            metadata_results["metadata_validation"]["tests"] += 1

            # Extract metadata fields
            services_reported = metadata.get('services_reported', 0)
            total_waiting_all_services = metadata.get('total_waiting_all_services', 0)
            adult_services_count = metadata.get('adult_services_count', 0)
            cyp_services_count = metadata.get('cyp_services_count', 0)

            # Convert to numbers
            try:
                services_reported = int(services_reported) if services_reported else 0
                total_waiting_all_services = float(total_waiting_all_services) if total_waiting_all_services else 0
                adult_services_count = int(adult_services_count) if adult_services_count else 0
                cyp_services_count = int(cyp_services_count) if cyp_services_count else 0
            except (ValueError, TypeError):
                continue

            # Calculate actual values from services
            adult_services = ch_data.get('adult_services', {})
            cyp_services = ch_data.get('cyp_services', {})

            actual_adult_count = len(adult_services) if isinstance(adult_services, dict) else 0
            actual_cyp_count = len(cyp_services) if isinstance(cyp_services, dict) else 0
            actual_total_services = actual_adult_count + actual_cyp_count

            # Calculate actual total waiting
            actual_total_waiting = 0

            if isinstance(adult_services, dict):
                for service_data in adult_services.values():
                    if isinstance(service_data, dict):
                        total_waiting = service_data.get('total_waiting', 0)
                        try:
                            actual_total_waiting += float(total_waiting) if total_waiting else 0
                        except (ValueError, TypeError):
                            pass

            if isinstance(cyp_services, dict):
                for service_data in cyp_services.values():
                    if isinstance(service_data, dict):
                        total_waiting = service_data.get('total_waiting', 0)
                        try:
                            actual_total_waiting += float(total_waiting) if total_waiting else 0
                        except (ValueError, TypeError):
                            pass

            # Validation 1: Services reported matches actual service count
            if services_reported == actual_total_services:
                metadata_results["consistency_checks"]["services_reported_matches_actual"] += 1
            else:
                metadata_results["service_count_validation"]["violations"].append({
                    "trust_code": record.get('trust_code'),
                    "reported_services": services_reported,
                    "actual_services": actual_total_services,
                    "difference": services_reported - actual_total_services
                })

            # Validation 2: Total waiting matches sum of individual services (allow 1% tolerance)
            if total_waiting_all_services > 0 and actual_total_waiting > 0:
                difference_pct = abs(total_waiting_all_services - actual_total_waiting) / total_waiting_all_services
                if difference_pct <= 0.01:  # Within 1% tolerance
                    metadata_results["consistency_checks"]["total_waiting_matches_sum"] += 1
                else:
                    metadata_results["total_waiting_validation"]["violations"].append({
                        "trust_code": record.get('trust_code'),
                        "reported_total": total_waiting_all_services,
                        "calculated_total": actual_total_waiting,
                        "difference": total_waiting_all_services - actual_total_waiting,
                        "difference_pct": round(difference_pct * 100, 2)
                    })

            # Validation 3: Service counts match actual counts
            if adult_services_count == actual_adult_count and cyp_services_count == actual_cyp_count:
                metadata_results["consistency_checks"]["service_counts_match"] += 1

        # Calculate accuracy rates
        tests = metadata_results["metadata_validation"]["tests"]
        if tests > 0:
            services_accuracy = metadata_results["consistency_checks"]["services_reported_matches_actual"] / tests
            waiting_accuracy = metadata_results["consistency_checks"]["total_waiting_matches_sum"] / tests
            counts_accuracy = metadata_results["consistency_checks"]["service_counts_match"] / tests

            avg_accuracy = (services_accuracy + waiting_accuracy + counts_accuracy) / 3

            # Determine overall status
            if avg_accuracy < 0.8:
                metadata_results["overall_status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Low metadata accuracy ({avg_accuracy:.1%})")
            elif avg_accuracy < 0.9:
                metadata_results["overall_status"] = "WARN"
                self.report["issues_found"].append(f"Warning: Some metadata inaccuracies ({avg_accuracy:.1%})")

            # Report findings
            print(f"      📊 Services count accuracy: {services_accuracy:.1%}")
            print(f"      📊 Total waiting accuracy: {waiting_accuracy:.1%}")
            print(f"      📊 Service counts accuracy: {counts_accuracy:.1%}")
            print(f"      📊 Overall metadata accuracy: {avg_accuracy:.1%}")

        self.report["results"]["metadata_accuracy"] = metadata_results

    def test_data_transformation_accuracy(self) -> None:
        """Test 2.5: Validate data transformation accuracy by comparing with Excel source"""
        print("   🔍 Testing data transformation accuracy...")

        transformation_results = {
            "sample_validations": [],
            "accuracy_metrics": {
                "exact_matches": 0,
                "close_matches": 0,  # Within 1% tolerance
                "significant_differences": 0,
                "total_comparisons": 0
            },
            "overall_accuracy": 0,
            "overall_status": "PASS"
        }

        if not self.excel_data:
            transformation_results["overall_status"] = "WARN"
            self.report["issues_found"].append("Warning: No Excel data available for transformation accuracy testing")
            self.report["results"]["data_transformation_accuracy"] = transformation_results
            return

        # Sample validation with available Excel and database data
        sample_validations = 0
        target_validations = 10

        for file_key, excel_df in self.excel_data.items():
            if sample_validations >= target_validations:
                break

            # Find corresponding database records
            # Extract period information from file_key to match with database
            matching_db_records = []
            for db_record in self.db_data:
                # Simple matching - could be improved with date parsing
                if sample_validations < target_validations:
                    matching_db_records.append(db_record)
                    sample_validations += 1

            # Validate sample records
            for db_record in matching_db_records[:5]:  # Limit to 5 per file
                validation_result = self.validate_record_transformation(
                    excel_df, db_record, file_key
                )
                transformation_results["sample_validations"].append(validation_result)

                # Update accuracy metrics
                if validation_result["accuracy_score"] >= 0.99:
                    transformation_results["accuracy_metrics"]["exact_matches"] += 1
                elif validation_result["accuracy_score"] >= 0.95:
                    transformation_results["accuracy_metrics"]["close_matches"] += 1
                else:
                    transformation_results["accuracy_metrics"]["significant_differences"] += 1

                transformation_results["accuracy_metrics"]["total_comparisons"] += 1

        # Calculate overall accuracy
        if transformation_results["accuracy_metrics"]["total_comparisons"] > 0:
            exact_rate = transformation_results["accuracy_metrics"]["exact_matches"] / transformation_results["accuracy_metrics"]["total_comparisons"]
            close_rate = transformation_results["accuracy_metrics"]["close_matches"] / transformation_results["accuracy_metrics"]["total_comparisons"]

            transformation_results["overall_accuracy"] = round((exact_rate + close_rate) * 100, 1)

            # Determine overall status
            if transformation_results["overall_accuracy"] < 80:
                transformation_results["overall_status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Low transformation accuracy ({transformation_results['overall_accuracy']}%)")
            elif transformation_results["overall_accuracy"] < 90:
                transformation_results["overall_status"] = "WARN"
                self.report["issues_found"].append(f"Warning: Some transformation inaccuracies ({transformation_results['overall_accuracy']}%)")

        # Report findings
        print(f"      📊 Transformation accuracy: {transformation_results['overall_accuracy']}%")
        print(f"      📊 Exact matches: {transformation_results['accuracy_metrics']['exact_matches']}")
        print(f"      📊 Close matches: {transformation_results['accuracy_metrics']['close_matches']}")
        print(f"      📊 Significant differences: {transformation_results['accuracy_metrics']['significant_differences']}")

        self.report["results"]["data_transformation_accuracy"] = transformation_results

    def validate_record_transformation(self, excel_df: pd.DataFrame, db_record: Dict, file_key: str) -> Dict[str, Any]:
        """Validate a single record's transformation accuracy"""
        validation = {
            "file_key": file_key,
            "trust_code": db_record.get('trust_code'),
            "comparisons": [],
            "accuracy_score": 0,
            "issues": []
        }

        try:
            ch_data = db_record.get('community_health_data', {})
            trust_code = db_record.get('trust_code')

            if not isinstance(ch_data, dict) or not trust_code:
                validation["accuracy_score"] = 0
                validation["issues"].append("Invalid database record structure")
                return validation

            # Find corresponding Excel row
            org_code_col = None
            for col in excel_df.columns:
                if 'organisation code' in str(col).lower():
                    org_code_col = col
                    break

            if org_code_col is None:
                validation["accuracy_score"] = 0
                validation["issues"].append("Could not find organisation code column in Excel")
                return validation

            excel_row = excel_df[excel_df[org_code_col].astype(str).str.strip() == trust_code]

            if excel_row.empty:
                validation["accuracy_score"] = 0.5  # Partial score - record exists in DB but not Excel
                validation["issues"].append("Trust code not found in Excel file")
                return validation

            excel_row = excel_row.iloc[0]

            # Compare sample services
            accurate_comparisons = 0
            total_comparisons = 0

            # Compare adult services (sample a few)
            adult_services = ch_data.get('adult_services', {})
            if isinstance(adult_services, dict):
                for service_key, service_data in list(adult_services.items())[:3]:  # Sample first 3
                    if isinstance(service_data, dict):
                        total_comparisons += 1

                        # Find corresponding Excel column
                        excel_service_col = None
                        for col in excel_df.columns:
                            if service_key.replace('_', ' ').lower() in str(col).lower():
                                excel_service_col = col
                                break

                        if excel_service_col:
                            excel_value = excel_row.get(excel_service_col, 0)
                            db_value = service_data.get('total_waiting', 0)

                            try:
                                excel_num = float(excel_value) if pd.notna(excel_value) else 0
                                db_num = float(db_value) if db_value is not None else 0

                                if excel_num == db_num:
                                    accurate_comparisons += 1
                                elif excel_num > 0 and abs(excel_num - db_num) / excel_num <= 0.05:  # 5% tolerance
                                    accurate_comparisons += 0.8  # Partial credit

                                validation["comparisons"].append({
                                    "service": service_key,
                                    "excel_value": excel_num,
                                    "db_value": db_num,
                                    "match": excel_num == db_num
                                })

                            except (ValueError, TypeError):
                                validation["issues"].append(f"Could not compare {service_key} - invalid values")

            # Calculate accuracy score
            if total_comparisons > 0:
                validation["accuracy_score"] = accurate_comparisons / total_comparisons
            else:
                validation["accuracy_score"] = 0

        except Exception as e:
            validation["accuracy_score"] = 0
            validation["issues"].append(f"Validation error: {str(e)}")

        return validation

    def generate_summary(self) -> None:
        """Generate overall summary of Phase 2 Community Health testing"""
        total_issues = len(self.report["issues_found"])

        # Count critical vs warning issues
        critical_issues = [issue for issue in self.report["issues_found"] if "Critical:" in issue]
        warning_issues = total_issues - len(critical_issues)

        # Count passed tests
        tests_passed = 0
        tests_total = 0

        test_results = [
            ("jsonb_structure_integrity", self.report["results"].get("jsonb_structure_integrity", {})),
            ("service_categorization", self.report["results"].get("service_categorization", {})),
            ("wait_band_mathematics", self.report["results"].get("wait_band_mathematics", {})),
            ("metadata_accuracy", self.report["results"].get("metadata_accuracy", {})),
            ("data_transformation_accuracy", self.report["results"].get("data_transformation_accuracy", {}))
        ]

        for test_name, test_result in test_results:
            if test_result:  # Only count if test was run
                tests_total += 1
                status = test_result.get("status") or test_result.get("overall_status", "FAIL")
                if status == "PASS":
                    tests_passed += 1

        # Overall status determination
        if len(critical_issues) > 0:
            overall_status = "FAIL"
        elif warning_issues > 2:
            overall_status = "WARN"
        elif tests_passed / tests_total >= 0.8 if tests_total > 0 else False:
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
                "🔴 Critical Community Health database migration issues found",
                "Review JSONB structure and data transformation pipeline",
                "Verify service categorization and wait band mathematics"
            ])
        elif warning_issues > 0:
            recommendations.extend([
                "🟡 Some Community Health database quality issues detected",
                "Consider improving data validation in ETL pipeline",
                "Review metadata accuracy calculations"
            ])
        else:
            recommendations.append("✅ Community Health database migration integrity verified - ready for Phase 3")

        self.report["recommendations"] = recommendations

        # Print summary
        print("\n" + "="*70)
        print("📋 PHASE 2 COMMUNITY HEALTH DATABASE MIGRATION INTEGRITY SUMMARY")
        print("="*70)
        status_emoji = "✅" if overall_status == "PASS" else ("⚠️" if overall_status == "WARN" else "❌")
        print(f"{status_emoji} Overall Status: {overall_status}")
        print(f"📊 Tests Passed: {tests_passed}/{tests_total} ({self.report['summary']['pass_rate']}%)")
        print(f"📋 Total Issues: {total_issues} (🔴 {len(critical_issues)} Critical, 🟡 {warning_issues} Warnings)")
        print(f"🔗 Database Records: {len(self.db_data)} Community Health records analyzed")

        # Test-specific summaries
        if "jsonb_structure_integrity" in self.report["results"]:
            jsonb_data = self.report["results"]["jsonb_structure_integrity"]
            services_count = jsonb_data.get("service_analysis", {}).get("total_services_count", 0)
            print(f"📊 JSONB Structure: {services_count} unique services found")

        if "wait_band_mathematics" in self.report["results"]:
            math_data = self.report["results"]["wait_band_mathematics"]
            tests = math_data.get("wait_band_validation", {}).get("tests", 0)
            violations = len(math_data.get("wait_band_validation", {}).get("violations", []))
            print(f"🧮 Wait Band Math: {violations} violations in {tests} tests")

        if "data_transformation_accuracy" in self.report["results"]:
            transform_data = self.report["results"]["data_transformation_accuracy"]
            accuracy = transform_data.get("overall_accuracy", 0)
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
    validator = CommunityHealthDatabaseValidator(data_dir)
    results = validator.run_all_tests()

    # Save results
    output_file = f"phase2_community_health_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Detailed results saved to: {output_file}")

    return results["summary"]["overall_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "PASS" else 1)
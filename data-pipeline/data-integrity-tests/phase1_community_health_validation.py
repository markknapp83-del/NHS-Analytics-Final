#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Phase 1 Community Health Extension
===============================================================

This script extends Phase 1 validation to include comprehensive Community Health
data validation, covering raw Excel files, service mappings, and data quality checks.

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
import csv
from supabase import create_client, Client
import warnings
warnings.filterwarnings('ignore')

class CommunityHealthValidator:
    """Validates Community Health raw data sources and quality"""

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
            "test_phase": "Phase 1: Community Health Validation",
            "data_directory": str(self.data_dir),
            "supabase_connected": self.supabase is not None,
            "results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": []
        }

        # Community Health service mappings
        self.adult_services = {
            'physiotherapy': 'Physiotherapy',
            'podiatry': 'Podiatry',
            'occupational_therapy': 'Occupational Therapy',
            'speech_language_therapy': 'Speech and Language Therapy',
            'dietetics': 'Dietetics',
            'audiology': 'Audiology',
            'orthoptics': 'Orthoptics',
            'community_nursing': 'Community Nursing',
            'community_mental_health': 'Community Mental Health',
            'learning_disabilities': 'Learning Disabilities',
            'specialist_nursing': 'Specialist Nursing',
            'tissue_viability': 'Tissue Viability',
            'continence': 'Continence',
            'cardiac_rehabilitation': 'Cardiac Rehabilitation',
            'pulmonary_rehabilitation': 'Pulmonary Rehabilitation',
            'pain_management': 'Pain Management',
            'falls_prevention': 'Falls Prevention',
            'diabetes': 'Diabetes',
            'respiratory': 'Respiratory',
            'musculoskeletal': 'Musculoskeletal (MSK)',
            'wheelchair_services': 'Wheelchair Services',
            'community_equipment': 'Community Equipment',
            'intermediate_care': 'Intermediate Care',
            'community_rehabilitation': 'Community Rehabilitation',
            'lymphoedema': 'Lymphoedema',
            'wound_care': 'Wound Care',
            'stoma_care': 'Stoma Care',
            'community_dentistry': 'Community Dentistry',
            'community_optometry': 'Community Optometry',
            'community_pharmacy': 'Community Pharmacy'
        }

        self.cyp_services = {
            'community_paediatrics': 'Community Paediatrics',
            'community_child_health': 'Community Child Health',
            'health_visiting': 'Health Visiting',
            'school_nursing': 'School Nursing',
            'family_nurse_partnership': 'Family Nurse Partnership',
            'community_midwifery': 'Community Midwifery',
            'paediatric_speech_language': 'Paediatric Speech and Language Therapy',
            'paediatric_physiotherapy': 'Paediatric Physiotherapy',
            'paediatric_occupational_therapy': 'Paediatric Occupational Therapy',
            'paediatric_dietetics': 'Paediatric Dietetics',
            'paediatric_audiology': 'Paediatric Audiology',
            'paediatric_mental_health': 'Paediatric Mental Health',
            'looked_after_children': 'Looked After Children',
            'safeguarding': 'Safeguarding',
            'antenatal_screening': 'Antenatal Screening',
            'newborn_hearing': 'Newborn Hearing Screening',
            'vision_screening': 'Vision Screening'
        }

        # Load trust mapping
        self.trust_mapping = self.load_trust_mapping()

    def load_trust_mapping(self) -> Dict[str, str]:
        """Load trust mapping from trust_mapping.json"""
        trust_mapping_path = self.data_dir.parent / "trust_mapping.json"
        if trust_mapping_path.exists():
            try:
                with open(trust_mapping_path, 'r') as f:
                    mapping_data = json.load(f)
                return mapping_data.get('trust_mapping', {})
            except Exception as e:
                print(f"⚠️ Warning: Could not load trust mapping: {e}")
        return {}

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Community Health validation tests"""
        print("🔍 Starting Phase 1: Community Health Validation")
        print(f"📁 Data directory: {self.data_dir}")
        print(f"🔗 Supabase connection: {'✅ Connected' if self.supabase else '❌ Not connected'}")
        print("-" * 70)

        # Test 1: Community Health Excel files validation
        print("\n1️⃣ Testing Community Health Excel files...")
        self.test_community_health_excel_files()

        # Test 2: Service mapping validation
        print("\n2️⃣ Testing service mapping accuracy...")
        self.test_service_mapping_validation()

        # Test 3: Data quality and consistency checks
        print("\n3️⃣ Testing data quality and consistency...")
        self.test_data_quality_consistency()

        # Test 4: Cross-file temporal validation
        print("\n4️⃣ Testing temporal consistency across files...")
        self.test_temporal_consistency()

        # Test 5: Database comparison validation
        if self.supabase:
            print("\n5️⃣ Testing against database records...")
            self.test_database_comparison()

        # Generate summary
        self.generate_summary()

        return self.report

    def test_community_health_excel_files(self) -> None:
        """Test 1.1: Validate Community Health Excel files completeness and structure"""
        print("   📊 Checking Community Health Excel files...")

        excel_results = {
            "expected_files": 12,
            "found_files": 0,
            "file_details": [],
            "structure_validation": {},
            "data_validation": {},
            "missing_files": [],
            "corrupted_files": []
        }

        # Define expected Community Health files
        expected_months = [
            "January", "February", "March", "April", "May", "June", "July",
            "August", "September", "October", "November", "December"
        ]

        # Find Community Health files
        community_files = list(self.data_dir.glob("Community-health-services-waiting-lists*.xlsx"))
        excel_results["found_files"] = len(community_files)

        print(f"   📄 Found {len(community_files)} Community Health Excel files")

        # Validate each file
        for file in community_files:
            print(f"      📋 Validating {file.name}...")
            file_validation = self.validate_excel_file_structure(file)
            excel_results["file_details"].append(file_validation)

            if file_validation["status"] == "CORRUPTED":
                excel_results["corrupted_files"].append(file.name)

        # Check for missing months
        found_months = set()
        for file in community_files:
            for month in expected_months:
                if month.lower() in file.name.lower():
                    found_months.add(month)
                    break

        missing_months = set(expected_months) - found_months
        excel_results["missing_files"] = list(missing_months)

        # Determine overall status
        if len(excel_results["corrupted_files"]) > 0:
            excel_results["status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: {len(excel_results['corrupted_files'])} corrupted Community Health files")
        elif len(missing_months) > 3:
            excel_results["status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: Missing {len(missing_months)} months of Community Health data")
        elif len(missing_months) > 0:
            excel_results["status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Missing {len(missing_months)} months: {list(missing_months)}")
        else:
            excel_results["status"] = "PASS"

        # Report results
        status_emoji = "✅" if excel_results["status"] == "PASS" else ("⚠️" if excel_results["status"] == "WARN" else "❌")
        print(f"   {status_emoji} Community Health files: {excel_results['found_files']}/{excel_results['expected_files']} found")

        if missing_months:
            print(f"      ⚠️ Missing months: {', '.join(missing_months)}")

        if excel_results["corrupted_files"]:
            print(f"      ❌ Corrupted files: {len(excel_results['corrupted_files'])}")

        self.report["results"]["community_health_excel_files"] = excel_results

    def validate_excel_file_structure(self, file_path: Path) -> Dict[str, Any]:
        """Validate individual Excel file structure and content"""
        file_validation = {
            "filename": file_path.name,
            "status": "PASS",
            "size_mb": round(file_path.stat().st_size / (1024*1024), 2),
            "sheets": [],
            "table_validation": {},
            "data_quality": {},
            "issues": []
        }

        try:
            # Get sheet names
            xls = pd.ExcelFile(file_path)
            file_validation["sheets"] = xls.sheet_names

            # Expected tables: Table 4, Table 4a, Table 4b, Table 4c, Table 4d, Table 4e, Table 4f, Table 4g
            expected_tables = ['Table 4', 'Table 4a', 'Table 4b', 'Table 4c', 'Table 4d', 'Table 4e', 'Table 4f', 'Table 4g']

            tables_found = 0
            for expected_table in expected_tables:
                table_found = False
                for sheet in file_validation["sheets"]:
                    if expected_table.lower() in sheet.lower():
                        table_found = True
                        tables_found += 1

                        # Validate table structure
                        try:
                            df = pd.read_excel(file_path, sheet_name=sheet)
                            table_validation = {
                                "sheet_name": sheet,
                                "rows": len(df),
                                "columns": len(df.columns),
                                "has_trust_column": any('trust' in str(col).lower() for col in df.columns),
                                "has_waiting_data": any('waiting' in str(col).lower() for col in df.columns),
                                "non_empty_rows": len(df.dropna(how='all'))
                            }
                            file_validation["table_validation"][expected_table] = table_validation

                            # Basic data quality checks
                            if table_validation["non_empty_rows"] < 50:  # Expect at least 50 trusts
                                file_validation["issues"].append(f"{expected_table}: Only {table_validation['non_empty_rows']} rows with data")

                        except Exception as e:
                            file_validation["issues"].append(f"{expected_table}: Could not read sheet - {str(e)}")

                        break

                if not table_found:
                    file_validation["issues"].append(f"Missing {expected_table}")

            file_validation["data_quality"] = {
                "tables_found": tables_found,
                "expected_tables": len(expected_tables),
                "table_coverage": round(tables_found / len(expected_tables) * 100, 1)
            }

            # Determine file status
            if tables_found < 4:  # Need at least half the tables
                file_validation["status"] = "FAIL"
            elif tables_found < 8:
                file_validation["status"] = "WARN"
            elif file_validation["issues"]:
                file_validation["status"] = "WARN"

        except Exception as e:
            file_validation["status"] = "CORRUPTED"
            file_validation["issues"].append(f"File corruption: {str(e)}")

        return file_validation

    def test_service_mapping_validation(self) -> None:
        """Test 1.2: Validate service name mappings between Excel and database"""
        print("   🔗 Validating service mappings...")

        mapping_results = {
            "adult_services": {
                "expected_services": [],
                "found_services": [],
                "validated_mappings": 0,
                "missing_mappings": []
            },
            "cyp_services": {
                "expected_services": [],
                "found_services": [],
                "validated_mappings": 0,
                "missing_mappings": []
            },
            "trust_mapping": {
                "total_mappings": len(self.trust_mapping),
                "validated_trusts": 0,
                "missing_trusts": []
            },
            "overall_status": "PASS"
        }

        # Sample validation with first available Community Health file
        community_files = list(self.data_dir.glob("Community-health-services-waiting-lists*.xlsx"))

        if community_files:
            sample_file = community_files[0]
            print(f"      📄 Validating mappings using {sample_file.name}")

            try:
                # Read Table 4 with correct header row (row 4 has the service names)
                df = pd.read_excel(sample_file, sheet_name='Table 4', header=4)
                excel_columns = [str(col).strip() for col in df.columns]

                # Extract actual services from Excel columns
                adult_services_found = []
                cyp_services_found = []

                for col in excel_columns:
                    if col.startswith('(A) '):
                        service_name = col[4:].strip()  # Remove "(A) " prefix
                        adult_services_found.append(service_name)
                    elif col.startswith('(CYP) '):
                        service_name = col[6:].strip()  # Remove "(CYP) " prefix
                        cyp_services_found.append(service_name)

                mapping_results["adult_services"]["found_services"] = adult_services_found
                mapping_results["cyp_services"]["found_services"] = cyp_services_found

                # Expected key adult services (based on database mapping)
                key_adult_services = [
                    'Audiology', 'Community nursing services', 'Musculoskeletal service',
                    'Podiatry', 'Physiotherapy', 'Occupational therapy', 'Dietetics',
                    'Speech and language', 'Intermediate care'
                ]

                # Expected key CYP services
                key_cyp_services = [
                    'Audiology', 'Community paediatric service', 'Physiotherapy',
                    'Occupational therapy', 'Dietetics', 'Speech and language',
                    'Vision screening', 'New-born hearing screening'
                ]

                mapping_results["adult_services"]["expected_services"] = key_adult_services
                mapping_results["cyp_services"]["expected_services"] = key_cyp_services

                # Validate adult services mapping
                for expected_service in key_adult_services:
                    service_found = False
                    for found_service in adult_services_found:
                        if expected_service.lower() in found_service.lower() or found_service.lower() in expected_service.lower():
                            service_found = True
                            break

                    if service_found:
                        mapping_results["adult_services"]["validated_mappings"] += 1
                    else:
                        mapping_results["adult_services"]["missing_mappings"].append(expected_service)

                # Validate CYP services mapping
                for expected_service in key_cyp_services:
                    service_found = False
                    for found_service in cyp_services_found:
                        if expected_service.lower() in found_service.lower() or found_service.lower() in expected_service.lower():
                            service_found = True
                            break

                    if service_found:
                        mapping_results["cyp_services"]["validated_mappings"] += 1
                    else:
                        mapping_results["cyp_services"]["missing_mappings"].append(expected_service)

                # Check trust codes (Organisation Code column)
                trust_column = None
                for col in excel_columns:
                    if 'organisation code' in str(col).lower():
                        trust_column = col
                        break

                if trust_column is not None:
                    excel_trust_codes = set(str(code).strip() for code in df[trust_column].dropna() if str(code).strip() != 'nan')

                    # Sample validation of trust codes
                    sample_trust_codes = list(excel_trust_codes)[:20]  # First 20 trust codes
                    for excel_trust in sample_trust_codes:
                        if excel_trust in self.trust_mapping:
                            mapping_results["trust_mapping"]["validated_trusts"] += 1
                        else:
                            mapping_results["trust_mapping"]["missing_trusts"].append(excel_trust)

                print(f"      📊 Adult services found: {len(adult_services_found)}")
                print(f"      📊 Adult key services validated: {mapping_results['adult_services']['validated_mappings']}/{len(key_adult_services)}")
                print(f"      📊 CYP services found: {len(cyp_services_found)}")
                print(f"      📊 CYP key services validated: {mapping_results['cyp_services']['validated_mappings']}/{len(key_cyp_services)}")
                print(f"      📊 Trust codes validated: {mapping_results['trust_mapping']['validated_trusts']}/20 sample")

            except Exception as e:
                mapping_results["overall_status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Service mapping validation failed - {str(e)}")
                print(f"   ❌ Service mapping validation failed: {str(e)}")

        else:
            mapping_results["overall_status"] = "FAIL"
            self.report["issues_found"].append("Critical: No Community Health files found for service mapping validation")

        # Determine overall status
        adult_coverage = mapping_results["adult_services"]["validated_mappings"] / len(mapping_results["adult_services"]["expected_services"]) if mapping_results["adult_services"]["expected_services"] else 0
        cyp_coverage = mapping_results["cyp_services"]["validated_mappings"] / len(mapping_results["cyp_services"]["expected_services"]) if mapping_results["cyp_services"]["expected_services"] else 0

        if adult_coverage < 0.7 or cyp_coverage < 0.7:  # Less than 70% coverage
            mapping_results["overall_status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: Low service mapping coverage - Adult: {adult_coverage:.1%}, CYP: {cyp_coverage:.1%}")
        elif adult_coverage < 0.9 or cyp_coverage < 0.9:  # Less than 90% coverage
            mapping_results["overall_status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Incomplete service mapping - Adult: {adult_coverage:.1%}, CYP: {cyp_coverage:.1%}")

        self.report["results"]["service_mapping_validation"] = mapping_results

    def test_data_quality_consistency(self) -> None:
        """Test 1.3: Data quality and consistency checks across Community Health files"""
        print("   🔍 Testing data quality and consistency...")

        quality_results = {
            "wait_band_validation": {"tests": 0, "violations": []},
            "data_range_validation": {"tests": 0, "outliers": []},
            "missing_data_analysis": {},
            "duplicate_detection": {},
            "overall_status": "PASS"
        }

        community_files = list(self.data_dir.glob("Community-health-services-waiting-lists*.xlsx"))

        if not community_files:
            quality_results["overall_status"] = "FAIL"
            self.report["issues_found"].append("Critical: No Community Health files found for quality testing")
            self.report["results"]["data_quality_consistency"] = quality_results
            return

        # Sample a few files for quality testing
        sample_files = community_files[:3] if len(community_files) >= 3 else community_files

        for file in sample_files:
            print(f"      📄 Testing data quality in {file.name}")

            try:
                # Test Table 4 (main waiting lists table)
                df = pd.read_excel(file, sheet_name='Table 4')

                # Wait band validation (if wait band columns exist)
                wait_band_cols = [col for col in df.columns if any(band in str(col).lower() for band in ['0-1', '1-2', '2-4', '4-12', '12-18', '18-52', '52+'])]
                total_waiting_cols = [col for col in df.columns if 'total' in str(col).lower() and 'waiting' in str(col).lower()]

                if wait_band_cols and total_waiting_cols:
                    for idx, row in df.iterrows():
                        if pd.notna(row.get(total_waiting_cols[0])):
                            quality_results["wait_band_validation"]["tests"] += 1

                            total_waiting = float(row[total_waiting_cols[0]])
                            band_sum = sum(float(row.get(col, 0)) for col in wait_band_cols if pd.notna(row.get(col)))

                            # Allow 1% tolerance
                            if total_waiting > 0 and abs(total_waiting - band_sum) / total_waiting > 0.01:
                                quality_results["wait_band_validation"]["violations"].append({
                                    "file": file.name,
                                    "row": idx,
                                    "total_waiting": total_waiting,
                                    "band_sum": band_sum,
                                    "difference": total_waiting - band_sum
                                })

                # Data range validation
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                for col in numeric_cols:
                    values = df[col].dropna()
                    if len(values) > 0:
                        quality_results["data_range_validation"]["tests"] += 1

                        # Flag negative values in waiting times
                        negative_values = (values < 0).sum()
                        if negative_values > 0:
                            quality_results["data_range_validation"]["outliers"].append({
                                "file": file.name,
                                "column": col,
                                "issue": "negative_values",
                                "count": negative_values
                            })

                        # Flag extremely high values
                        q99 = values.quantile(0.99)
                        extreme_values = (values > q99 * 10).sum()  # 10x the 99th percentile
                        if extreme_values > 0:
                            quality_results["data_range_validation"]["outliers"].append({
                                "file": file.name,
                                "column": col,
                                "issue": "extreme_values",
                                "count": extreme_values,
                                "threshold": q99 * 10
                            })

                # Missing data analysis
                missing_analysis = {
                    "total_rows": len(df),
                    "completely_empty_rows": len(df) - len(df.dropna(how='all')),
                    "missing_data_percentage": round(df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100, 2)
                }
                quality_results["missing_data_analysis"][file.name] = missing_analysis

            except Exception as e:
                quality_results["data_range_validation"]["outliers"].append({
                    "file": file.name,
                    "issue": "file_read_error",
                    "error": str(e)
                })

        # Determine overall status
        violation_rate = len(quality_results["wait_band_validation"]["violations"]) / max(1, quality_results["wait_band_validation"]["tests"])
        outlier_rate = len(quality_results["data_range_validation"]["outliers"]) / max(1, quality_results["data_range_validation"]["tests"])

        if violation_rate > 0.1 or outlier_rate > 0.1:  # More than 10% issues
            quality_results["overall_status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: High data quality issues - {violation_rate:.1%} violations, {outlier_rate:.1%} outliers")
        elif violation_rate > 0.05 or outlier_rate > 0.05:  # More than 5% issues
            quality_results["overall_status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Some data quality issues - {violation_rate:.1%} violations, {outlier_rate:.1%} outliers")

        print(f"      📊 Wait band validation: {len(quality_results['wait_band_validation']['violations'])} violations in {quality_results['wait_band_validation']['tests']} tests")
        print(f"      📊 Data range validation: {len(quality_results['data_range_validation']['outliers'])} outliers in {quality_results['data_range_validation']['tests']} tests")

        self.report["results"]["data_quality_consistency"] = quality_results

    def test_temporal_consistency(self) -> None:
        """Test 1.4: Temporal consistency across Community Health files"""
        print("   📅 Testing temporal consistency...")

        temporal_results = {
            "file_coverage": {},
            "trust_consistency": {},
            "trend_analysis": {},
            "overall_status": "PASS"
        }

        community_files = sorted(list(self.data_dir.glob("Community-health-services-waiting-lists*.xlsx")))

        if len(community_files) < 2:
            temporal_results["overall_status"] = "WARN"
            self.report["issues_found"].append("Warning: Less than 2 Community Health files - cannot perform temporal consistency testing")
            self.report["results"]["temporal_consistency"] = temporal_results
            return

        print(f"      📊 Analyzing {len(community_files)} files for temporal consistency")

        # Extract data from each file
        file_data = {}
        for file in community_files:
            try:
                df = pd.read_excel(file, sheet_name='Table 4')

                # Find trust and total waiting columns
                trust_col = None
                waiting_col = None

                for col in df.columns:
                    if 'trust' in str(col).lower():
                        trust_col = col
                    elif 'total' in str(col).lower() and 'waiting' in str(col).lower():
                        waiting_col = col

                if trust_col and waiting_col:
                    # Extract trust codes and waiting totals
                    file_data[file.name] = {}
                    for _, row in df.iterrows():
                        trust_code = str(row.get(trust_col, '')).strip()
                        waiting_total = row.get(waiting_col, 0)

                        if trust_code and pd.notna(waiting_total):
                            file_data[file.name][trust_code] = float(waiting_total)

            except Exception as e:
                print(f"      ⚠️ Could not process {file.name}: {str(e)}")

        # Analyze trust consistency across files
        if file_data:
            all_trusts = set()
            for trusts in file_data.values():
                all_trusts.update(trusts.keys())

            trust_consistency = {}
            for trust in all_trusts:
                appearances = sum(1 for file_trusts in file_data.values() if trust in file_trusts)
                trust_consistency[trust] = {
                    "appearances": appearances,
                    "total_files": len(file_data),
                    "consistency_rate": appearances / len(file_data)
                }

            # Find trusts with inconsistent reporting
            inconsistent_trusts = [trust for trust, data in trust_consistency.items() if data["consistency_rate"] < 0.8]

            temporal_results["trust_consistency"] = {
                "total_unique_trusts": len(all_trusts),
                "inconsistent_trusts": len(inconsistent_trusts),
                "inconsistent_trust_list": inconsistent_trusts[:10],  # First 10
                "average_consistency_rate": np.mean([data["consistency_rate"] for data in trust_consistency.values()])
            }

            # Simple trend analysis
            trend_violations = []
            for trust in list(all_trusts)[:20]:  # Analyze first 20 trusts
                trust_values = []
                for file_name in sorted(file_data.keys()):
                    if trust in file_data[file_name]:
                        trust_values.append(file_data[file_name][trust])

                if len(trust_values) >= 3:
                    # Check for unrealistic jumps (>1000% change month-to-month)
                    for i in range(1, len(trust_values)):
                        if trust_values[i-1] > 0:
                            change_rate = abs(trust_values[i] - trust_values[i-1]) / trust_values[i-1]
                            if change_rate > 10:  # 1000% change
                                trend_violations.append({
                                    "trust": trust,
                                    "from_value": trust_values[i-1],
                                    "to_value": trust_values[i],
                                    "change_rate": change_rate
                                })

            temporal_results["trend_analysis"] = {
                "trusts_analyzed": min(20, len(all_trusts)),
                "trend_violations": len(trend_violations),
                "violation_details": trend_violations[:5]  # First 5
            }

            # Determine overall status
            consistency_rate = temporal_results["trust_consistency"]["average_consistency_rate"]
            if consistency_rate < 0.7:
                temporal_results["overall_status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Low temporal consistency ({consistency_rate:.1%} average)")
            elif consistency_rate < 0.85:
                temporal_results["overall_status"] = "WARN"
                self.report["issues_found"].append(f"Warning: Some temporal inconsistency ({consistency_rate:.1%} average)")

            if len(trend_violations) > 5:
                temporal_results["overall_status"] = "FAIL" if temporal_results["overall_status"] != "FAIL" else temporal_results["overall_status"]
                self.report["issues_found"].append(f"Critical: {len(trend_violations)} unrealistic trend patterns detected")

            print(f"      📊 Trust consistency: {consistency_rate:.1%} average")
            print(f"      📊 Trend violations: {len(trend_violations)} detected")

        self.report["results"]["temporal_consistency"] = temporal_results

    def test_database_comparison(self) -> None:
        """Test 1.5: Compare raw data against database records"""
        print("   🔗 Comparing with database records...")

        db_comparison_results = {
            "database_records": 0,
            "matching_trusts": 0,
            "data_alignment": {},
            "sample_validations": [],
            "overall_status": "PASS"
        }

        try:
            # Get Community Health data from database
            result = self.supabase.table('trust_metrics').select(
                'trust_code, trust_name, period, community_health_data'
            ).not_.is_('community_health_data', 'null').execute()

            db_records = [r for r in result.data if r.get('community_health_data') not in [None, {}]]
            db_comparison_results["database_records"] = len(db_records)

            print(f"      📊 Found {len(db_records)} database records with Community Health data")

            if db_records:
                # Get sample of trusts from database
                db_trusts = set(record['trust_code'] for record in db_records)

                # Compare with Excel files
                community_files = list(self.data_dir.glob("Community-health-services-waiting-lists*.xlsx"))

                if community_files:
                    sample_file = community_files[0]
                    df = pd.read_excel(sample_file, sheet_name='Table 4')

                    # Find trust column
                    trust_col = None
                    for col in df.columns:
                        if 'trust' in str(col).lower():
                            trust_col = col
                            break

                    if trust_col:
                        excel_trusts = set(str(trust).strip() for trust in df[trust_col].dropna())
                        matching_trusts = db_trusts.intersection(excel_trusts)
                        db_comparison_results["matching_trusts"] = len(matching_trusts)

                        db_comparison_results["data_alignment"] = {
                            "db_trusts": len(db_trusts),
                            "excel_trusts": len(excel_trusts),
                            "matching_trusts": len(matching_trusts),
                            "match_rate": len(matching_trusts) / max(len(db_trusts), len(excel_trusts)) if max(len(db_trusts), len(excel_trusts)) > 0 else 0
                        }

                        print(f"      📊 Trust alignment: {len(matching_trusts)} matching trusts")
                        print(f"      📊 Match rate: {db_comparison_results['data_alignment']['match_rate']:.1%}")

                        # Sample validation of a few records
                        sample_trusts = list(matching_trusts)[:5]
                        for trust in sample_trusts:
                            # Get database record
                            db_record = next((r for r in db_records if r['trust_code'] == trust), None)
                            if db_record:
                                # Get Excel data
                                excel_row = df[df[trust_col].astype(str).str.strip() == trust]
                                if not excel_row.empty:
                                    excel_row = excel_row.iloc[0]

                                    validation = {
                                        "trust_code": trust,
                                        "has_db_data": bool(db_record.get('community_health_data')),
                                        "has_excel_data": True,
                                        "status": "validated"
                                    }
                                    db_comparison_results["sample_validations"].append(validation)

                        # Determine status based on match rate
                        match_rate = db_comparison_results["data_alignment"]["match_rate"]
                        if match_rate < 0.7:
                            db_comparison_results["overall_status"] = "FAIL"
                            self.report["issues_found"].append(f"Critical: Low database-Excel alignment ({match_rate:.1%})")
                        elif match_rate < 0.85:
                            db_comparison_results["overall_status"] = "WARN"
                            self.report["issues_found"].append(f"Warning: Some database-Excel misalignment ({match_rate:.1%})")

        except Exception as e:
            db_comparison_results["overall_status"] = "FAIL"
            db_comparison_results["error"] = str(e)
            self.report["issues_found"].append(f"Critical: Database comparison failed - {str(e)}")
            print(f"   ❌ Database comparison failed: {str(e)}")

        self.report["results"]["database_comparison"] = db_comparison_results

    def generate_summary(self) -> None:
        """Generate overall summary of Community Health validation"""
        total_issues = len(self.report["issues_found"])

        # Count critical vs warning issues
        critical_issues = [issue for issue in self.report["issues_found"] if "Critical:" in issue]
        warning_issues = total_issues - len(critical_issues)

        # Count passed tests
        tests_passed = 0
        tests_total = 0

        test_results = [
            ("community_health_excel_files", self.report["results"].get("community_health_excel_files", {})),
            ("service_mapping_validation", self.report["results"].get("service_mapping_validation", {})),
            ("data_quality_consistency", self.report["results"].get("data_quality_consistency", {})),
            ("temporal_consistency", self.report["results"].get("temporal_consistency", {})),
            ("database_comparison", self.report["results"].get("database_comparison", {}))
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
        elif warning_issues > 3:
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
                "🔴 Critical Community Health data issues found - requires immediate attention",
                "Verify all Community Health Excel files are complete and uncorrupted",
                "Review service mapping configuration between Excel and database"
            ])
        elif warning_issues > 0:
            recommendations.extend([
                "🟡 Some Community Health data quality issues detected",
                "Consider improving data validation in the ETL pipeline",
                "Review temporal consistency patterns for data quality"
            ])
        else:
            recommendations.append("✅ Community Health raw data validation passed - ready for Phase 2")

        self.report["recommendations"] = recommendations

        # Print summary
        print("\n" + "="*70)
        print("📋 PHASE 1 COMMUNITY HEALTH VALIDATION SUMMARY")
        print("="*70)
        status_emoji = "✅" if overall_status == "PASS" else ("⚠️" if overall_status == "WARN" else "❌")
        print(f"{status_emoji} Overall Status: {overall_status}")
        print(f"📊 Tests Passed: {tests_passed}/{tests_total} ({self.report['summary']['pass_rate']}%)")
        print(f"📋 Total Issues: {total_issues} (🔴 {len(critical_issues)} Critical, 🟡 {warning_issues} Warnings)")

        # Test-specific summaries
        if "community_health_excel_files" in self.report["results"]:
            excel_data = self.report["results"]["community_health_excel_files"]
            print(f"📄 Excel Files: {excel_data.get('found_files', 0)}/{excel_data.get('expected_files', 12)} found")

        if "service_mapping_validation" in self.report["results"]:
            mapping_data = self.report["results"]["service_mapping_validation"]
            adult_mapped = mapping_data.get("adult_services", {}).get("validated_mappings", 0)
            cyp_mapped = mapping_data.get("cyp_services", {}).get("validated_mappings", 0)
            print(f"🔗 Service Mappings: {adult_mapped} Adult + {cyp_mapped} CYP services validated")

        if "database_comparison" in self.report["results"]:
            db_data = self.report["results"]["database_comparison"]
            match_rate = db_data.get("data_alignment", {}).get("match_rate", 0)
            print(f"🔗 Database Alignment: {match_rate:.1%} trust match rate")

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
    validator = CommunityHealthValidator(data_dir)
    results = validator.run_all_tests()

    # Save results
    output_file = f"phase1_community_health_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Detailed results saved to: {output_file}")

    return results["summary"]["overall_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "PASS" else 1)
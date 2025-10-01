#!/usr/bin/env python3
"""
NHS Cancer Performance Data Accuracy Testing - Phase 2: Data Processing Accuracy
=================================================================================

This script validates the accuracy of Excel → JSONB transformation by testing
the cancer_data_processor.py against raw data files and verifying calculations,
mappings, and data integrity throughout the processing pipeline.

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
import importlib.util

# Add project root to path to import cancer_data_processor
sys.path.append('/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master')

try:
    from cancer_data_processor import CancerDataProcessor, CANCER_TYPE_MAPPING, ROUTE_MAPPING, MODALITY_MAPPING, STANDARD_MAPPING
except ImportError as e:
    print(f"❌ Error importing cancer_data_processor: {e}")
    sys.exit(1)

class CancerProcessingAccuracyValidator:
    """Validates accuracy of cancer data processing from Excel to JSONB"""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.processor = CancerDataProcessor()

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 2: Cancer Data Processing Accuracy",
            "data_directory": str(self.data_dir),
            "files_processed": [],
            "validation_results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "overall_status": "UNKNOWN"
        }

        # Test configuration
        self.cancer_files = [
            "CWT-CRS-Apr-2024-to-Sep-2024-Data-Extract-Provider-Final.xlsx",
            "CWT-CRS-Oct-2024-to-Mar-2025-Data-Extract-Provider.xlsx",
            "CWT-CRS-Apr-2025-to-Jul-2025-Data-Extract-Provider.xlsx"
        ]

        # Sample trusts for detailed testing (representative sample)
        self.test_trusts = ['RJ1', 'RGT', 'RBL', 'RTH', 'RJL']  # Mix of different trust types

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 2 cancer processing accuracy tests"""
        print(f"\n🧪 Starting Phase 2: Cancer Data Processing Accuracy")
        print(f"📂 Data directory: {self.data_dir}")
        print(f"📋 Files to process: {len(self.cancer_files)}")

        try:
            # Test 1: Processing pipeline integrity
            self._test_processing_pipeline()

            # Test 2: Data transformation accuracy
            self._test_data_transformation_accuracy()

            # Test 3: Performance calculation verification
            self._test_performance_calculations()

            # Test 4: Mapping and categorization accuracy
            self._test_mapping_accuracy()

            # Test 5: JSONB structure validation
            self._test_jsonb_structure()

            # Test 6: Data completeness preservation
            self._test_data_preservation()

            # Test 7: Quarter aggregation accuracy
            self._test_quarter_aggregation()

            # Generate summary
            self._generate_summary()

        except Exception as e:
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "TEST_EXECUTION_ERROR",
                "description": f"Failed to complete processing accuracy tests: {str(e)}",
                "impact": "Cannot validate processing accuracy",
                "recommendation": "Review test setup and cancer_data_processor.py availability"
            })
            self.report["overall_status"] = "ERROR"
            traceback.print_exc()

        return self.report

    def _test_processing_pipeline(self):
        """Test the complete processing pipeline end-to-end"""
        print("\n🔄 Test 1: Processing Pipeline Integrity")

        results = {
            "files_processed": 0,
            "files_failed": 0,
            "pipeline_errors": [],
            "processing_times": {},
            "output_generated": True
        }

        for filename in self.cancer_files:
            file_path = self.data_dir / filename

            if not file_path.exists():
                results["files_failed"] += 1
                results["pipeline_errors"].append(f"File not found: {filename}")
                continue

            try:
                print(f"  🔄 Processing {filename}...")
                start_time = datetime.now()

                # Process the file using the actual processor
                trust_data = self.processor.process_cancer_file(str(file_path))

                end_time = datetime.now()
                processing_time = (end_time - start_time).total_seconds()
                results["processing_times"][filename] = processing_time

                if trust_data:
                    results["files_processed"] += 1
                    self.report["files_processed"].append({
                        "filename": filename,
                        "trusts_processed": len(trust_data),
                        "processing_time": processing_time,
                        "success": True
                    })
                    print(f"    ✅ Success: {len(trust_data)} trusts processed in {processing_time:.2f}s")
                else:
                    results["files_failed"] += 1
                    results["pipeline_errors"].append(f"No data generated for {filename}")
                    print(f"    ❌ Failed: No data generated")

            except Exception as e:
                results["files_failed"] += 1
                results["pipeline_errors"].append(f"Processing error in {filename}: {str(e)}")
                print(f"    ❌ Error: {str(e)}")

        # Report pipeline integrity issues
        if results["files_failed"] > 0:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "PIPELINE_FAILURE",
                "description": f"Processing failed for {results['files_failed']}/{len(self.cancer_files)} files",
                "impact": "Data processing pipeline is not reliable",
                "recommendation": "Review processing errors and fix underlying issues"
            })

        self.report["validation_results"]["processing_pipeline"] = results

    def _test_data_transformation_accuracy(self):
        """Test accuracy of Excel → JSONB data transformation"""
        print("\n🔀 Test 2: Data Transformation Accuracy")

        results = {
            "files_tested": 0,
            "transformation_accuracy": {},
            "field_mapping_errors": [],
            "data_loss_detected": False,
            "sample_validations": []
        }

        # Process first available file for detailed testing
        test_file = None
        for filename in self.cancer_files:
            file_path = self.data_dir / filename
            if file_path.exists():
                test_file = filename
                break

        if not test_file:
            print("  ⚠️ No files available for transformation testing")
            return

        try:
            file_path = self.data_dir / test_file
            print(f"  🔀 Testing transformation with {test_file}")

            # Read raw Excel data
            df = pd.read_excel(file_path)
            print(f"    📊 Raw data: {len(df)} rows, {len(df.columns)} columns")

            # Process through pipeline
            trust_data = self.processor.process_cancer_file(str(file_path))

            if not trust_data:
                self.report["issues_found"].append({
                    "severity": "CRITICAL",
                    "category": "TRANSFORMATION_FAILURE",
                    "description": f"Data transformation failed for {test_file}",
                    "impact": "Cannot validate transformation accuracy",
                    "recommendation": "Debug processing pipeline"
                })
                return

            results["files_tested"] = 1

            # Test sample trusts for detailed validation
            sample_trusts = list(trust_data.keys())[:3]  # Test first 3 trusts

            for trust_code in sample_trusts:
                trust_quarter_data = trust_data[trust_code]
                quarter_data = trust_quarter_data['data']

                # Validate transformation for this trust
                validation = self._validate_trust_transformation(df, trust_code, quarter_data)
                results["sample_validations"].append({
                    "trust_code": trust_code,
                    **validation
                })

                if not validation["transformation_accurate"]:
                    results["field_mapping_errors"].extend(validation["errors"])

            # Calculate overall transformation accuracy
            accurate_transformations = sum(1 for v in results["sample_validations"] if v["transformation_accurate"])
            total_validations = len(results["sample_validations"])
            accuracy_rate = (accurate_transformations / total_validations) * 100 if total_validations > 0 else 0

            results["transformation_accuracy"]["overall"] = accuracy_rate

            print(f"    🎯 Transformation accuracy: {accuracy_rate:.1f}%")
            print(f"    📝 Sample validations: {total_validations}")

            if accuracy_rate < 95:
                severity = "CRITICAL" if accuracy_rate < 80 else "HIGH"
                self.report["issues_found"].append({
                    "severity": severity,
                    "category": "TRANSFORMATION_INACCURACY",
                    "description": f"Data transformation accuracy below threshold: {accuracy_rate:.1f}%",
                    "impact": "Processed data may not match source files",
                    "recommendation": "Review transformation logic and field mappings"
                })

        except Exception as e:
            results["error"] = str(e)
            print(f"  ❌ Transformation test error: {str(e)}")

        self.report["validation_results"]["data_transformation"] = results

    def _validate_trust_transformation(self, df: pd.DataFrame, trust_code: str, jsonb_data: Dict) -> Dict:
        """Validate transformation accuracy for a specific trust"""

        validation = {
            "transformation_accurate": True,
            "errors": [],
            "metrics_checked": 0,
            "metrics_passed": 0
        }

        try:
            # Get raw data for this trust
            trust_df = df[df['ORG CODE'] == trust_code]

            if trust_df.empty:
                validation["errors"].append(f"No raw data found for trust {trust_code}")
                validation["transformation_accurate"] = False
                return validation

            # Check standards data
            for standard_key, standard_data in jsonb_data.get("standards", {}).items():
                standard_name = {
                    "28_day_fds": "28-day FDS",
                    "31_day_combined": "31-day Combined",
                    "62_day_combined": "62-day Combined"
                }.get(standard_key)

                if not standard_name:
                    continue

                # Get raw data for this standard
                standard_df = trust_df[trust_df['STANDARD'] == standard_name]

                if standard_df.empty:
                    continue

                # Validate summary metrics
                expected_total = int(standard_df['TOTAL TREATED'].sum())
                expected_within = int(standard_df['WITHIN STANDARD'].sum())
                expected_breaches = int(standard_df['BREACHES'].sum())

                actual_total = standard_data.get("summary", {}).get("total_treated", 0)
                actual_within = standard_data.get("summary", {}).get("within_standard", 0)
                actual_breaches = standard_data.get("summary", {}).get("breaches", 0)

                validation["metrics_checked"] += 3

                # Check totals (allow small rounding differences)
                if abs(expected_total - actual_total) <= 1:
                    validation["metrics_passed"] += 1
                else:
                    validation["errors"].append(f"Total treated mismatch for {trust_code} {standard_name}: expected {expected_total}, got {actual_total}")

                if abs(expected_within - actual_within) <= 1:
                    validation["metrics_passed"] += 1
                else:
                    validation["errors"].append(f"Within standard mismatch for {trust_code} {standard_name}: expected {expected_within}, got {actual_within}")

                if abs(expected_breaches - actual_breaches) <= 1:
                    validation["metrics_passed"] += 1
                else:
                    validation["errors"].append(f"Breaches mismatch for {trust_code} {standard_name}: expected {expected_breaches}, got {actual_breaches}")

            # Overall accuracy
            if validation["metrics_checked"] > 0:
                accuracy = validation["metrics_passed"] / validation["metrics_checked"]
                validation["transformation_accurate"] = accuracy >= 0.95

        except Exception as e:
            validation["errors"].append(f"Validation error for {trust_code}: {str(e)}")
            validation["transformation_accurate"] = False

        return validation

    def _test_performance_calculations(self):
        """Test accuracy of performance percentage calculations"""
        print("\n🧮 Test 3: Performance Calculation Verification")

        results = {
            "calculations_tested": 0,
            "calculations_accurate": 0,
            "calculation_errors": [],
            "tolerance_threshold": 0.1  # Allow 0.1% tolerance for rounding
        }

        # Test calculations using processed data
        for file_info in self.report.get("files_processed", []):
            if not file_info.get("success", False):
                continue

            filename = file_info["filename"]
            file_path = self.data_dir / filename

            try:
                # Process file to get JSONB data
                trust_data = self.processor.process_cancer_file(str(file_path))

                # Test sample of trusts
                sample_trusts = list(trust_data.keys())[:5]

                for trust_code in sample_trusts:
                    quarter_data = trust_data[trust_code]['data']

                    # Test performance calculations for each standard
                    for standard_key, standard_data in quarter_data.get("standards", {}).items():
                        summary = standard_data.get("summary", {})

                        total_treated = summary.get("total_treated", 0)
                        within_standard = summary.get("within_standard", 0)
                        performance_pct = summary.get("performance_pct", 0)

                        if total_treated > 0:
                            expected_pct = (within_standard / total_treated) * 100
                            difference = abs(expected_pct - performance_pct)

                            results["calculations_tested"] += 1

                            if difference <= results["tolerance_threshold"]:
                                results["calculations_accurate"] += 1
                            else:
                                results["calculation_errors"].append({
                                    "trust": trust_code,
                                    "standard": standard_key,
                                    "expected": round(expected_pct, 1),
                                    "actual": performance_pct,
                                    "difference": round(difference, 2)
                                })

            except Exception as e:
                print(f"  ⚠️ Error testing calculations for {filename}: {str(e)}")

        # Calculate accuracy rate
        accuracy_rate = 0
        if results["calculations_tested"] > 0:
            accuracy_rate = (results["calculations_accurate"] / results["calculations_tested"]) * 100

        print(f"  🧮 Calculations tested: {results['calculations_tested']}")
        print(f"  ✅ Accurate calculations: {results['calculations_accurate']} ({accuracy_rate:.1f}%)")
        print(f"  ❌ Calculation errors: {len(results['calculation_errors'])}")

        if accuracy_rate < 98:
            severity = "HIGH" if accuracy_rate < 95 else "MEDIUM"
            self.report["issues_found"].append({
                "severity": severity,
                "category": "CALCULATION_ERROR",
                "description": f"Performance calculation accuracy below threshold: {accuracy_rate:.1f}%",
                "impact": "Displayed performance percentages may be incorrect",
                "recommendation": "Review calculation logic in cancer_data_processor.py"
            })

        if results["calculation_errors"]:
            print(f"  📝 Sample errors:")
            for error in results["calculation_errors"][:3]:
                print(f"    - {error['trust']} {error['standard']}: expected {error['expected']}%, got {error['actual']}%")

        self.report["validation_results"]["performance_calculations"] = results

    def _test_mapping_accuracy(self):
        """Test accuracy of cancer type, route, and modality mappings"""
        print("\n🗺️ Test 4: Mapping and Categorization Accuracy")

        results = {
            "cancer_type_mappings": {"tested": 0, "accurate": 0, "errors": []},
            "route_mappings": {"tested": 0, "accurate": 0, "errors": []},
            "modality_mappings": {"tested": 0, "accurate": 0, "errors": []},
            "unmapped_values": {"cancer_types": [], "routes": [], "modalities": []}
        }

        # Test mappings with first available file
        test_file = None
        for filename in self.cancer_files:
            file_path = self.data_dir / filename
            if file_path.exists():
                test_file = filename
                break

        if not test_file:
            print("  ⚠️ No files available for mapping testing")
            return

        try:
            file_path = self.data_dir / test_file
            df = pd.read_excel(file_path)

            # Test cancer type mappings
            if 'CANCER TYPE' in df.columns:
                unique_cancer_types = df['CANCER TYPE'].dropna().unique()
                for cancer_type in unique_cancer_types:
                    results["cancer_type_mappings"]["tested"] += 1
                    if cancer_type in CANCER_TYPE_MAPPING:
                        results["cancer_type_mappings"]["accurate"] += 1
                    else:
                        results["cancer_type_mappings"]["errors"].append(cancer_type)
                        results["unmapped_values"]["cancer_types"].append(cancer_type)

            # Test route mappings
            if 'STAGE/ROUTE' in df.columns:
                unique_routes = df['STAGE/ROUTE'].dropna().unique()
                for route in unique_routes:
                    results["route_mappings"]["tested"] += 1
                    if route in ROUTE_MAPPING:
                        results["route_mappings"]["accurate"] += 1
                    else:
                        results["route_mappings"]["errors"].append(route)
                        results["unmapped_values"]["routes"].append(route)

            # Test modality mappings
            if 'TREATMENT MODALITY' in df.columns:
                unique_modalities = df['TREATMENT MODALITY'].dropna().unique()
                for modality in unique_modalities:
                    results["modality_mappings"]["tested"] += 1
                    if modality in MODALITY_MAPPING:
                        results["modality_mappings"]["accurate"] += 1
                    else:
                        results["modality_mappings"]["errors"].append(modality)
                        results["unmapped_values"]["modalities"].append(modality)

            # Calculate accuracy rates
            for mapping_type in ["cancer_type_mappings", "route_mappings", "modality_mappings"]:
                mapping_data = results[mapping_type]
                if mapping_data["tested"] > 0:
                    accuracy = (mapping_data["accurate"] / mapping_data["tested"]) * 100
                    mapping_data["accuracy_rate"] = accuracy

                    print(f"  🗺️ {mapping_type.replace('_', ' ').title()}: {accuracy:.1f}% ({mapping_data['accurate']}/{mapping_data['tested']})")

                    if accuracy < 90:
                        self.report["issues_found"].append({
                            "severity": "MEDIUM",
                            "category": "MAPPING_ERROR",
                            "description": f"Low mapping accuracy for {mapping_type}: {accuracy:.1f}%",
                            "impact": "Some data may not be correctly categorized",
                            "recommendation": f"Add missing mappings for unmapped values"
                        })

            # Report unmapped values
            if results["unmapped_values"]["cancer_types"]:
                print(f"  ⚠️ Unmapped cancer types: {len(results['unmapped_values']['cancer_types'])}")
                for ct in results["unmapped_values"]["cancer_types"][:3]:
                    print(f"    - '{ct}'")

        except Exception as e:
            print(f"  ❌ Mapping test error: {str(e)}")
            results["error"] = str(e)

        self.report["validation_results"]["mapping_accuracy"] = results

    def _test_jsonb_structure(self):
        """Test JSONB structure integrity and completeness"""
        print("\n🏗️ Test 5: JSONB Structure Validation")

        results = {
            "structures_tested": 0,
            "valid_structures": 0,
            "structure_errors": [],
            "required_fields_missing": [],
            "data_types_correct": True
        }

        # Expected JSONB structure
        required_fields = {
            "period": str,
            "period_start": str,
            "period_end": str,
            "data_type": str,
            "months_covered": list,
            "standards": dict,
            "metadata": dict
        }

        required_standard_fields = {
            "summary": dict,
            "by_cancer_type": dict
        }

        required_summary_fields = {
            "total_treated": int,
            "within_standard": int,
            "breaches": int,
            "performance_pct": (int, float)
        }

        # Test structure with processed data
        for file_info in self.report.get("files_processed", []):
            if not file_info.get("success", False):
                continue

            filename = file_info["filename"]
            file_path = self.data_dir / filename

            try:
                trust_data = self.processor.process_cancer_file(str(file_path))

                # Test sample of trusts
                sample_trusts = list(trust_data.keys())[:3]

                for trust_code in sample_trusts:
                    results["structures_tested"] += 1
                    quarter_data = trust_data[trust_code]['data']

                    structure_valid = True
                    errors_for_trust = []

                    # Check top-level fields
                    for field, expected_type in required_fields.items():
                        if field not in quarter_data:
                            errors_for_trust.append(f"Missing field: {field}")
                            structure_valid = False
                        elif not isinstance(quarter_data[field], expected_type):
                            errors_for_trust.append(f"Wrong type for {field}: expected {expected_type.__name__}, got {type(quarter_data[field]).__name__}")
                            results["data_types_correct"] = False

                    # Check standards structure
                    standards = quarter_data.get("standards", {})
                    for standard_key, standard_data in standards.items():
                        # Check standard fields
                        for field, expected_type in required_standard_fields.items():
                            if field not in standard_data:
                                errors_for_trust.append(f"Missing {field} in {standard_key}")
                                structure_valid = False

                        # Check summary structure
                        summary = standard_data.get("summary", {})
                        for field, expected_type in required_summary_fields.items():
                            if field not in summary:
                                errors_for_trust.append(f"Missing {field} in {standard_key} summary")
                                structure_valid = False
                            elif not isinstance(summary[field], expected_type):
                                errors_for_trust.append(f"Wrong type for {standard_key}.summary.{field}")
                                results["data_types_correct"] = False

                    if structure_valid:
                        results["valid_structures"] += 1
                    else:
                        results["structure_errors"].extend([f"{trust_code}: {err}" for err in errors_for_trust])

            except Exception as e:
                print(f"  ⚠️ Error testing structure for {filename}: {str(e)}")

        # Calculate structure validity rate
        validity_rate = 0
        if results["structures_tested"] > 0:
            validity_rate = (results["valid_structures"] / results["structures_tested"]) * 100

        print(f"  🏗️ Structures tested: {results['structures_tested']}")
        print(f"  ✅ Valid structures: {results['valid_structures']} ({validity_rate:.1f}%)")
        print(f"  ❌ Structure errors: {len(results['structure_errors'])}")

        if validity_rate < 95:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "STRUCTURE_INVALID",
                "description": f"JSONB structure validity below threshold: {validity_rate:.1f}%",
                "impact": "Frontend may not be able to display data correctly",
                "recommendation": "Review JSONB generation logic in cancer_data_processor.py"
            })

        if results["structure_errors"]:
            print(f"  📝 Sample structure errors:")
            for error in results["structure_errors"][:3]:
                print(f"    - {error}")

        self.report["validation_results"]["jsonb_structure"] = results

    def _test_data_preservation(self):
        """Test that no data is lost during processing"""
        print("\n💾 Test 6: Data Completeness Preservation")

        results = {
            "files_tested": 0,
            "data_preservation_rate": 0.0,
            "potential_data_loss": [],
            "record_count_comparison": {}
        }

        for filename in self.cancer_files[:2]:  # Test first 2 files for performance
            file_path = self.data_dir / filename
            if not file_path.exists():
                continue

            try:
                # Count raw records
                df = pd.read_excel(file_path)
                raw_records = len(df)
                raw_trusts = df['ORG CODE'].nunique() if 'ORG CODE' in df.columns else 0

                # Process and count processed records
                trust_data = self.processor.process_cancer_file(str(file_path))
                processed_trusts = len(trust_data)

                # Count processed records (sum across all standards and cancer types)
                processed_records = 0
                for trust_code, data in trust_data.items():
                    quarter_data = data['data']
                    for standard_key, standard_data in quarter_data.get("standards", {}).items():
                        processed_records += standard_data.get("summary", {}).get("total_treated", 0)

                results["record_count_comparison"][filename] = {
                    "raw_records": raw_records,
                    "raw_trusts": raw_trusts,
                    "processed_trusts": processed_trusts,
                    "processed_total_treated": processed_records
                }

                trust_preservation = (processed_trusts / raw_trusts) * 100 if raw_trusts > 0 else 0

                print(f"  💾 {filename}:")
                print(f"    - Raw records: {raw_records:,}")
                print(f"    - Raw trusts: {raw_trusts}")
                print(f"    - Processed trusts: {processed_trusts}")
                print(f"    - Trust preservation: {trust_preservation:.1f}%")

                if trust_preservation < 90:
                    results["potential_data_loss"].append({
                        "file": filename,
                        "issue": f"Only {trust_preservation:.1f}% of trusts preserved",
                        "raw_trusts": raw_trusts,
                        "processed_trusts": processed_trusts
                    })

                results["files_tested"] += 1

            except Exception as e:
                print(f"  ⚠️ Error testing data preservation for {filename}: {str(e)}")

        # Calculate overall preservation rate
        if results["record_count_comparison"]:
            total_raw_trusts = sum(data["raw_trusts"] for data in results["record_count_comparison"].values())
            total_processed_trusts = sum(data["processed_trusts"] for data in results["record_count_comparison"].values())

            results["data_preservation_rate"] = (total_processed_trusts / total_raw_trusts) * 100 if total_raw_trusts > 0 else 0

        if results["data_preservation_rate"] < 95:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "DATA_LOSS",
                "description": f"Data preservation rate below threshold: {results['data_preservation_rate']:.1f}%",
                "impact": "Some source data may not be processed",
                "recommendation": "Review filtering logic and ensure all valid trusts are processed"
            })

        self.report["validation_results"]["data_preservation"] = results

    def _test_quarter_aggregation(self):
        """Test quarter aggregation accuracy"""
        print("\n📅 Test 7: Quarter Aggregation Accuracy")

        results = {
            "quarter_mappings_tested": 0,
            "accurate_quarters": 0,
            "quarter_errors": [],
            "month_groupings": {}
        }

        # Test quarter determination logic
        test_cases = [
            (["APR", "MAY", "JUN"], 2024, "2024-Q1"),
            (["JUL", "AUG", "SEP"], 2024, "2024-Q2"),
            (["OCT", "NOV", "DEC"], 2024, "2024-Q3"),
            (["JAN", "FEB", "MAR"], 2024, "2025-Q4"),  # Q4 spans calendar years
        ]

        for months, file_year, expected_quarter in test_cases:
            try:
                quarter_label, period_start, quarter = self.processor.determine_quarter(months, file_year)
                results["quarter_mappings_tested"] += 1

                if quarter_label == expected_quarter:
                    results["accurate_quarters"] += 1
                else:
                    results["quarter_errors"].append({
                        "months": months,
                        "file_year": file_year,
                        "expected": expected_quarter,
                        "actual": quarter_label
                    })

                results["month_groupings"][str(months)] = {
                    "expected": expected_quarter,
                    "actual": quarter_label,
                    "period_start": period_start
                }

            except Exception as e:
                results["quarter_errors"].append({
                    "months": months,
                    "file_year": file_year,
                    "error": str(e)
                })

        # Test with actual file data
        for filename in self.cancer_files[:1]:  # Test with first file
            file_path = self.data_dir / filename
            if not file_path.exists():
                continue

            try:
                df = pd.read_excel(file_path)
                if 'MONTH' in df.columns:
                    months_in_file = df['MONTH'].dropna().unique().tolist()
                    file_year = 2024 if '2024' in filename else 2025

                    quarter_label, period_start, quarter = self.processor.determine_quarter(months_in_file, file_year)

                    print(f"  📅 {filename}: {months_in_file} → {quarter_label}")

                    results["month_groupings"][filename] = {
                        "months": months_in_file,
                        "quarter": quarter_label,
                        "period_start": period_start
                    }

            except Exception as e:
                print(f"  ⚠️ Error testing quarter aggregation for {filename}: {str(e)}")

        # Calculate accuracy
        accuracy_rate = 0
        if results["quarter_mappings_tested"] > 0:
            accuracy_rate = (results["accurate_quarters"] / results["quarter_mappings_tested"]) * 100

        print(f"  📅 Quarter mappings tested: {results['quarter_mappings_tested']}")
        print(f"  ✅ Accurate mappings: {results['accurate_quarters']} ({accuracy_rate:.1f}%)")

        if accuracy_rate < 100:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "QUARTER_MAPPING_ERROR",
                "description": f"Quarter mapping accuracy below 100%: {accuracy_rate:.1f}%",
                "impact": "Data may be assigned to wrong quarters",
                "recommendation": "Review quarter determination logic"
            })

        if results["quarter_errors"]:
            print(f"  ❌ Quarter errors:")
            for error in results["quarter_errors"]:
                if "error" in error:
                    print(f"    - {error['months']} ({error['file_year']}): {error['error']}")
                else:
                    print(f"    - {error['months']} ({error['file_year']}): expected {error['expected']}, got {error['actual']}")

        self.report["validation_results"]["quarter_aggregation"] = results

    def _generate_summary(self):
        """Generate processing accuracy validation summary"""
        print("\n📋 Generating Processing Accuracy Summary...")

        summary = {
            "files_tested": len(self.report["files_processed"]),
            "successful_processing": 0,
            "overall_accuracy_score": 0.0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "accuracy_metrics": {}
        }

        # Count successful processing
        for file_info in self.report["files_processed"]:
            if file_info.get("success", False):
                summary["successful_processing"] += 1

        # Count issues by severity
        for issue in self.report["issues_found"]:
            severity = issue.get("severity", "LOW")
            if severity == "CRITICAL":
                summary["critical_issues"] += 1
            elif severity == "HIGH":
                summary["high_issues"] += 1
            elif severity == "MEDIUM":
                summary["medium_issues"] += 1

        # Calculate accuracy metrics
        validation_results = self.report.get("validation_results", {})

        # Transformation accuracy
        if "data_transformation" in validation_results:
            trans_acc = validation_results["data_transformation"].get("transformation_accuracy", {}).get("overall", 0)
            summary["accuracy_metrics"]["transformation"] = trans_acc

        # Calculation accuracy
        if "performance_calculations" in validation_results:
            calc_results = validation_results["performance_calculations"]
            if calc_results.get("calculations_tested", 0) > 0:
                calc_acc = (calc_results.get("calculations_accurate", 0) / calc_results.get("calculations_tested", 1)) * 100
                summary["accuracy_metrics"]["calculations"] = calc_acc

        # Structure validity
        if "jsonb_structure" in validation_results:
            struct_results = validation_results["jsonb_structure"]
            if struct_results.get("structures_tested", 0) > 0:
                struct_acc = (struct_results.get("valid_structures", 0) / struct_results.get("structures_tested", 1)) * 100
                summary["accuracy_metrics"]["structure"] = struct_acc

        # Overall accuracy score (weighted average)
        weights = {"transformation": 0.4, "calculations": 0.4, "structure": 0.2}
        weighted_sum = 0
        total_weight = 0

        for metric, score in summary["accuracy_metrics"].items():
            if metric in weights:
                weighted_sum += score * weights[metric]
                total_weight += weights[metric]

        if total_weight > 0:
            summary["overall_accuracy_score"] = weighted_sum / total_weight

        # Generate recommendations
        recommendations = []

        if summary["critical_issues"] > 0:
            recommendations.append("🚨 Critical processing issues must be resolved")

        if summary["overall_accuracy_score"] < 95:
            recommendations.append("🔧 Processing accuracy needs improvement")

        if summary["successful_processing"] < len(self.cancer_files):
            recommendations.append("📁 Some files failed processing - investigate errors")

        recommendations.append("✅ Proceed to Phase 3 database validation if accuracy is satisfactory")

        self.report["recommendations"].extend(recommendations)

        # Determine overall status
        if summary["critical_issues"] > 0:
            self.report["overall_status"] = "CRITICAL_ISSUES"
        elif summary["overall_accuracy_score"] < 90:
            self.report["overall_status"] = "LOW_ACCURACY"
        elif summary["high_issues"] > 0:
            self.report["overall_status"] = "HIGH_ISSUES"
        elif summary["medium_issues"] > 0:
            self.report["overall_status"] = "MEDIUM_ISSUES"
        else:
            self.report["overall_status"] = "PASSED"

        self.report["summary"] = summary

        # Print summary
        print(f"\n{'='*60}")
        print(f"📋 PHASE 2 PROCESSING ACCURACY SUMMARY")
        print(f"{'='*60}")
        print(f"Files processed: {summary['successful_processing']}/{summary['files_tested']}")
        print(f"Overall accuracy score: {summary['overall_accuracy_score']:.1f}/100")
        print(f"\nAccuracy breakdown:")
        for metric, score in summary["accuracy_metrics"].items():
            print(f"  {metric.title()}: {score:.1f}%")
        print(f"\nIssues found:")
        print(f"  🚨 Critical: {summary['critical_issues']}")
        print(f"  ⚠️ High: {summary['high_issues']}")
        print(f"  ❓ Medium: {summary['medium_issues']}")
        print(f"\nOverall Status: {self.report['overall_status']}")

        if self.report["recommendations"]:
            print(f"\n📋 Recommendations:")
            for rec in self.report["recommendations"]:
                print(f"  {rec}")


def main():
    """Main execution function"""
    print("NHS Cancer Performance Data - Phase 2: Processing Accuracy Validation")
    print("=" * 80)

    # Data directory
    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Initialize validator
    validator = CancerProcessingAccuracyValidator(data_dir)

    # Run all tests
    report = validator.run_all_tests()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/phase2_cancer_processing_accuracy_{timestamp}.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved: {report_file}")
    except Exception as e:
        print(f"\n❌ Error saving report: {e}")

    # Exit with appropriate code
    status = report.get("overall_status", "ERROR")
    if status == "PASSED":
        print(f"\n✅ Phase 2 processing accuracy validation completed successfully!")
        sys.exit(0)
    elif status in ["MEDIUM_ISSUES", "HIGH_ISSUES", "LOW_ACCURACY"]:
        print(f"\n⚠️ Phase 2 processing accuracy validation completed with issues - review before proceeding")
        sys.exit(1)
    else:
        print(f"\n🚨 Phase 2 processing accuracy validation failed - critical issues must be resolved")
        sys.exit(2)


if __name__ == "__main__":
    main()
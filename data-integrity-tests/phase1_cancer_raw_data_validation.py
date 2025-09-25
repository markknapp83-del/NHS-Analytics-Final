#!/usr/bin/env python3
"""
NHS Cancer Performance Data Accuracy Testing - Phase 1: Raw Data Validation
============================================================================

This script validates the completeness, integrity, and NHS standards compliance
of raw Cancer Waiting Times (CWT) Excel files before processing.

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

class CancerRawDataValidator:
    """Validates raw NHS Cancer Waiting Times Excel files for accuracy and completeness"""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 1: Cancer Raw Data Validation",
            "data_directory": str(self.data_dir),
            "files_tested": [],
            "validation_results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "overall_status": "UNKNOWN"
        }

        # Expected CWT files
        self.expected_files = [
            "CWT-CRS-Apr-2024-to-Sep-2024-Data-Extract-Provider-Final.xlsx",
            "CWT-CRS-Oct-2024-to-Mar-2025-Data-Extract-Provider.xlsx",
            "CWT-CRS-Apr-2025-to-Jul-2025-Data-Extract-Provider.xlsx"
        ]

        # Expected NHS CWT Excel columns
        self.required_columns = [
            'ORG CODE', 'MONTH', 'CANCER TYPE', 'STAGE/ROUTE',
            'TREATMENT MODALITY', 'STANDARD', 'TOTAL TREATED', 'WITHIN STANDARD', 'BREACHES'
        ]

        # Valid NHS Cancer Standards
        self.valid_standards = ['28-day FDS', '31-day Combined', '62-day Combined']

        # Expected cancer types from NHS CWT specification
        self.expected_cancer_types = [
            "Breast", "Lung", "Lower Gastrointestinal",
            "Upper Gastrointestinal - Oesophagus & Stomach",
            "Upper Gastrointestinal - Hepatobiliary",
            "Gynaecological", "Head & Neck", "Skin",
            "Haematological - Lymphoma", "Haematological - Other (a)",
            "Suspected breast cancer", "Suspected lung cancer",
            "Suspected lower gastrointestinal cancer",
            "Suspected upper gastrointestinal cancer",
            "Suspected gynaecological cancer",
            "Suspected head & neck cancer",
            "Suspected urological malignancies (excluding testicular)",
            "Suspected testicular cancer", "Suspected skin cancer",
            "Suspected haematological malignancies (excluding acute leukaemia)",
            "Suspected acute leukaemia",
            "Suspected brain/central nervous system tumours",
            "Suspected children's cancer", "Suspected sarcoma",
            "Suspected other cancer",
            "Suspected cancer - non-specific symptoms",
            "Exhibited (non-cancer) breast symptoms - cancer not initially suspected",
            "Other (a)", "ALL CANCERS", "Missing or Invalid"
        ]

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 1 cancer raw data validation tests"""
        print(f"\n🧪 Starting Phase 1: Cancer Raw Data Validation")
        print(f"📂 Data directory: {self.data_dir}")
        print(f"📋 Expected files: {len(self.expected_files)}")

        try:
            # Test 1: File existence and accessibility
            self._test_file_existence()

            # Test 2: Excel file integrity and structure
            self._test_excel_integrity()

            # Test 3: NHS schema compliance
            self._test_nhs_schema_compliance()

            # Test 4: Data completeness validation
            self._test_data_completeness()

            # Test 5: NHS standards compliance
            self._test_nhs_standards_compliance()

            # Test 6: Data quality checks
            self._test_data_quality()

            # Test 7: Cross-file consistency
            self._test_cross_file_consistency()

            # Generate summary
            self._generate_summary()

        except Exception as e:
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "TEST_EXECUTION_ERROR",
                "description": f"Failed to complete validation tests: {str(e)}",
                "impact": "Cannot validate data accuracy",
                "recommendation": "Review test setup and data directory permissions"
            })
            self.report["overall_status"] = "ERROR"
            traceback.print_exc()

        return self.report

    def _test_file_existence(self):
        """Test if all expected CWT files exist and are accessible"""
        print("\n📋 Test 1: File Existence and Accessibility")

        results = {
            "files_found": [],
            "files_missing": [],
            "files_accessible": [],
            "files_inaccessible": []
        }

        for filename in self.expected_files:
            file_path = self.data_dir / filename

            if file_path.exists():
                results["files_found"].append(filename)
                self.report["files_tested"].append(filename)

                try:
                    # Test file accessibility
                    with open(file_path, 'rb') as f:
                        f.read(1024)  # Read first KB to test accessibility
                    results["files_accessible"].append(filename)
                    print(f"  ✅ {filename} - Found and accessible")
                except Exception as e:
                    results["files_inaccessible"].append(filename)
                    self.report["issues_found"].append({
                        "severity": "HIGH",
                        "category": "FILE_ACCESS",
                        "description": f"File {filename} found but not accessible: {str(e)}",
                        "impact": "Cannot process file data",
                        "recommendation": "Check file permissions and corruption"
                    })
                    print(f"  ❌ {filename} - Found but not accessible: {str(e)}")
            else:
                results["files_missing"].append(filename)
                self.report["issues_found"].append({
                    "severity": "CRITICAL",
                    "category": "MISSING_FILE",
                    "description": f"Expected CWT file not found: {filename}",
                    "impact": "Missing cancer performance data for time period",
                    "recommendation": "Download missing file from NHS England website"
                })
                print(f"  ❌ {filename} - Not found")

        self.report["validation_results"]["file_existence"] = results

        # Check for unexpected files
        actual_files = list(self.data_dir.glob("CWT-CRS-*.xlsx"))
        unexpected_files = []
        for file_path in actual_files:
            if file_path.name not in self.expected_files:
                unexpected_files.append(file_path.name)

        if unexpected_files:
            results["unexpected_files"] = unexpected_files
            print(f"  ⚠️ Found {len(unexpected_files)} unexpected CWT files")

    def _test_excel_integrity(self):
        """Test Excel file integrity and sheet structure"""
        print("\n📊 Test 2: Excel File Integrity and Structure")

        results = {}

        for filename in self.report["files_tested"]:
            file_path = self.data_dir / filename
            file_results = {
                "readable": False,
                "sheet_names": [],
                "main_sheet_found": False,
                "row_count": 0,
                "column_count": 0
            }

            try:
                # Test if Excel file can be read
                excel_file = pd.ExcelFile(file_path)
                file_results["readable"] = True
                file_results["sheet_names"] = excel_file.sheet_names

                # Look for main data sheet
                main_sheet_candidates = [
                    'CWT CRS Provider Extract', 'Sheet1', 'Data', 'CWT Data'
                ]

                main_sheet = None
                for candidate in main_sheet_candidates:
                    if candidate in excel_file.sheet_names:
                        main_sheet = candidate
                        file_results["main_sheet_found"] = True
                        break

                if not main_sheet and excel_file.sheet_names:
                    main_sheet = excel_file.sheet_names[0]  # Use first sheet
                    file_results["main_sheet_found"] = True

                if main_sheet:
                    # Read main sheet
                    df = pd.read_excel(file_path, sheet_name=main_sheet)
                    file_results["row_count"] = len(df)
                    file_results["column_count"] = len(df.columns)
                    file_results["main_sheet_name"] = main_sheet

                    print(f"  ✅ {filename} - Readable, {file_results['row_count']} rows, {file_results['column_count']} columns")
                else:
                    self.report["issues_found"].append({
                        "severity": "HIGH",
                        "category": "EXCEL_STRUCTURE",
                        "description": f"No recognizable data sheet found in {filename}",
                        "impact": "Cannot process file data",
                        "recommendation": "Verify file contains CWT data sheet"
                    })
                    print(f"  ❌ {filename} - No recognizable data sheet")

                excel_file.close()

            except Exception as e:
                file_results["error"] = str(e)
                self.report["issues_found"].append({
                    "severity": "HIGH",
                    "category": "EXCEL_CORRUPTION",
                    "description": f"Cannot read Excel file {filename}: {str(e)}",
                    "impact": "Cannot process file data",
                    "recommendation": "Re-download file or check for corruption"
                })
                print(f"  ❌ {filename} - Cannot read: {str(e)}")

            results[filename] = file_results

        self.report["validation_results"]["excel_integrity"] = results

    def _test_nhs_schema_compliance(self):
        """Test compliance with NHS CWT schema specification"""
        print("\n🏥 Test 3: NHS Schema Compliance")

        results = {}

        for filename in self.report["files_tested"]:
            if filename not in self.report["validation_results"]["excel_integrity"]:
                continue

            file_info = self.report["validation_results"]["excel_integrity"][filename]
            if not file_info.get("readable", False):
                continue

            file_path = self.data_dir / filename
            file_results = {
                "columns_found": [],
                "columns_missing": [],
                "extra_columns": [],
                "schema_compliant": False
            }

            try:
                # Determine main sheet
                main_sheet = file_info.get("main_sheet_name", "Sheet1")
                df = pd.read_excel(file_path, sheet_name=main_sheet)

                file_results["columns_found"] = list(df.columns)

                # Check required columns
                for req_col in self.required_columns:
                    if req_col not in df.columns:
                        file_results["columns_missing"].append(req_col)

                # Check for extra columns (informational)
                for col in df.columns:
                    if col not in self.required_columns:
                        file_results["extra_columns"].append(col)

                # Schema compliance check
                file_results["schema_compliant"] = len(file_results["columns_missing"]) == 0

                if file_results["schema_compliant"]:
                    print(f"  ✅ {filename} - NHS schema compliant")
                else:
                    self.report["issues_found"].append({
                        "severity": "HIGH",
                        "category": "SCHEMA_VIOLATION",
                        "description": f"Missing required columns in {filename}: {file_results['columns_missing']}",
                        "impact": "Data processing may fail or be incomplete",
                        "recommendation": "Verify file is official NHS CWT Provider Extract"
                    })
                    print(f"  ❌ {filename} - Missing columns: {file_results['columns_missing']}")

                if file_results["extra_columns"]:
                    print(f"  ℹ️ {filename} - Extra columns: {len(file_results['extra_columns'])}")

            except Exception as e:
                file_results["error"] = str(e)
                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "SCHEMA_CHECK_ERROR",
                    "description": f"Error checking schema for {filename}: {str(e)}",
                    "impact": "Cannot verify schema compliance",
                    "recommendation": "Manual schema verification needed"
                })
                print(f"  ⚠️ {filename} - Schema check error: {str(e)}")

            results[filename] = file_results

        self.report["validation_results"]["nhs_schema"] = results

    def _test_data_completeness(self):
        """Test data completeness and coverage"""
        print("\n📈 Test 4: Data Completeness Validation")

        results = {}

        for filename in self.report["files_tested"]:
            if not self._is_file_processable(filename):
                continue

            file_path = self.data_dir / filename
            file_results = {
                "total_rows": 0,
                "non_empty_rows": 0,
                "trusts_count": 0,
                "r_trusts_count": 0,
                "months_covered": [],
                "cancer_types_found": [],
                "standards_found": [],
                "null_percentages": {},
                "completeness_score": 0.0
            }

            try:
                main_sheet = self._get_main_sheet_name(filename)
                df = pd.read_excel(file_path, sheet_name=main_sheet)

                file_results["total_rows"] = len(df)
                file_results["non_empty_rows"] = df.dropna(how='all').shape[0]

                # Trust analysis
                if 'ORG CODE' in df.columns:
                    unique_trusts = df['ORG CODE'].dropna().unique()
                    file_results["trusts_count"] = len(unique_trusts)
                    r_trusts = [code for code in unique_trusts if str(code).startswith('R')]
                    file_results["r_trusts_count"] = len(r_trusts)

                # Month coverage
                if 'MONTH' in df.columns:
                    months = df['MONTH'].dropna().unique().tolist()
                    file_results["months_covered"] = sorted(months)

                # Cancer types found
                if 'CANCER TYPE' in df.columns:
                    cancer_types = df['CANCER TYPE'].dropna().unique().tolist()
                    file_results["cancer_types_found"] = cancer_types

                # Standards found
                if 'STANDARD' in df.columns:
                    standards = df['STANDARD'].dropna().unique().tolist()
                    file_results["standards_found"] = standards

                # Null percentage analysis
                for col in self.required_columns:
                    if col in df.columns:
                        null_pct = (df[col].isnull().sum() / len(df)) * 100
                        file_results["null_percentages"][col] = round(null_pct, 2)

                # Overall completeness score (inverse of average null percentage)
                avg_null_pct = sum(file_results["null_percentages"].values()) / len(file_results["null_percentages"]) if file_results["null_percentages"] else 0
                file_results["completeness_score"] = round(100 - avg_null_pct, 2)

                print(f"  📊 {filename}:")
                print(f"    - Rows: {file_results['total_rows']:,} (non-empty: {file_results['non_empty_rows']:,})")
                print(f"    - Trusts: {file_results['trusts_count']} (R-codes: {file_results['r_trusts_count']})")
                print(f"    - Months: {len(file_results['months_covered'])} ({', '.join(file_results['months_covered'])})")
                print(f"    - Cancer types: {len(file_results['cancer_types_found'])}")
                print(f"    - Standards: {len(file_results['standards_found'])}")
                print(f"    - Completeness: {file_results['completeness_score']}%")

                # Flag issues
                if file_results["completeness_score"] < 95:
                    self.report["issues_found"].append({
                        "severity": "MEDIUM",
                        "category": "DATA_COMPLETENESS",
                        "description": f"Data completeness below 95% in {filename} ({file_results['completeness_score']}%)",
                        "impact": "May indicate missing or incomplete data",
                        "recommendation": "Review null percentages and data quality"
                    })

                if file_results["r_trusts_count"] < 100:
                    self.report["issues_found"].append({
                        "severity": "MEDIUM",
                        "category": "TRUST_COVERAGE",
                        "description": f"Only {file_results['r_trusts_count']} R-code trusts found in {filename}",
                        "impact": "Incomplete trust coverage",
                        "recommendation": "Expected ~150 NHS trusts with R-codes"
                    })

            except Exception as e:
                file_results["error"] = str(e)
                print(f"  ❌ {filename} - Completeness check error: {str(e)}")

            results[filename] = file_results

        self.report["validation_results"]["data_completeness"] = results

    def _test_nhs_standards_compliance(self):
        """Test compliance with NHS cancer standards"""
        print("\n🎯 Test 5: NHS Standards Compliance")

        results = {}

        for filename in self.report["files_tested"]:
            if not self._is_file_processable(filename):
                continue

            file_path = self.data_dir / filename
            file_results = {
                "standards_valid": [],
                "standards_invalid": [],
                "cancer_types_valid": [],
                "cancer_types_invalid": [],
                "performance_calculations_valid": True,
                "calculation_errors": []
            }

            try:
                main_sheet = self._get_main_sheet_name(filename)
                df = pd.read_excel(file_path, sheet_name=main_sheet)

                # Check standards
                if 'STANDARD' in df.columns:
                    found_standards = df['STANDARD'].dropna().unique()
                    for standard in found_standards:
                        if standard in self.valid_standards:
                            file_results["standards_valid"].append(standard)
                        else:
                            file_results["standards_invalid"].append(standard)

                # Check cancer types against expected list
                if 'CANCER TYPE' in df.columns:
                    found_cancer_types = df['CANCER TYPE'].dropna().unique()
                    for cancer_type in found_cancer_types:
                        if cancer_type in self.expected_cancer_types:
                            file_results["cancer_types_valid"].append(cancer_type)
                        else:
                            file_results["cancer_types_invalid"].append(cancer_type)

                # Validate performance calculations
                if all(col in df.columns for col in ['TOTAL TREATED', 'WITHIN STANDARD', 'BREACHES']):
                    calculation_errors = 0
                    sample_size = min(1000, len(df))  # Sample for performance
                    sample_df = df.sample(n=sample_size) if len(df) > sample_size else df

                    for _, row in sample_df.iterrows():
                        total = row['TOTAL TREATED']
                        within = row['WITHIN STANDARD']
                        breaches = row['BREACHES']

                        if pd.notna(total) and pd.notna(within) and pd.notna(breaches):
                            if abs(total - (within + breaches)) > 0.1:  # Allow small floating point errors
                                calculation_errors += 1

                    if calculation_errors > 0:
                        file_results["performance_calculations_valid"] = False
                        file_results["calculation_errors"] = calculation_errors
                        error_rate = (calculation_errors / sample_size) * 100

                        self.report["issues_found"].append({
                            "severity": "HIGH",
                            "category": "CALCULATION_ERROR",
                            "description": f"Performance calculation errors in {filename}: {calculation_errors} errors in {sample_size} sampled rows ({error_rate:.1f}%)",
                            "impact": "Incorrect performance metrics",
                            "recommendation": "Verify TOTAL TREATED = WITHIN STANDARD + BREACHES formula"
                        })

                print(f"  🎯 {filename}:")
                print(f"    - Valid standards: {len(file_results['standards_valid'])}/{len(file_results['standards_valid']) + len(file_results['standards_invalid'])}")
                print(f"    - Valid cancer types: {len(file_results['cancer_types_valid'])}/{len(file_results['cancer_types_valid']) + len(file_results['cancer_types_invalid'])}")
                print(f"    - Calculations valid: {'✅' if file_results['performance_calculations_valid'] else '❌'}")

                # Report invalid items
                if file_results["standards_invalid"]:
                    self.report["issues_found"].append({
                        "severity": "MEDIUM",
                        "category": "INVALID_STANDARDS",
                        "description": f"Invalid standards found in {filename}: {file_results['standards_invalid']}",
                        "impact": "May cause processing errors",
                        "recommendation": "Verify data source is official NHS CWT extract"
                    })

                if file_results["cancer_types_invalid"]:
                    print(f"    - Invalid cancer types: {file_results['cancer_types_invalid'][:5]}{'...' if len(file_results['cancer_types_invalid']) > 5 else ''}")

            except Exception as e:
                file_results["error"] = str(e)
                print(f"  ❌ {filename} - Standards check error: {str(e)}")

            results[filename] = file_results

        self.report["validation_results"]["nhs_standards"] = results

    def _test_data_quality(self):
        """Test overall data quality metrics"""
        print("\n🔍 Test 6: Data Quality Checks")

        results = {}

        for filename in self.report["files_tested"]:
            if not self._is_file_processable(filename):
                continue

            file_path = self.data_dir / filename
            file_results = {
                "duplicate_rows": 0,
                "negative_values": {},
                "outliers_detected": {},
                "data_consistency": True,
                "quality_score": 100.0,
                "quality_issues": []
            }

            try:
                main_sheet = self._get_main_sheet_name(filename)
                df = pd.read_excel(file_path, sheet_name=main_sheet)

                # Check for duplicate rows
                file_results["duplicate_rows"] = df.duplicated().sum()

                # Check for negative values in numeric columns
                numeric_cols = ['TOTAL TREATED', 'WITHIN STANDARD', 'BREACHES']
                for col in numeric_cols:
                    if col in df.columns:
                        negative_count = (df[col] < 0).sum()
                        if negative_count > 0:
                            file_results["negative_values"][col] = negative_count
                            file_results["quality_issues"].append(f"Negative values in {col}: {negative_count}")

                # Check for extreme outliers (basic check)
                for col in numeric_cols:
                    if col in df.columns and not df[col].isna().all():
                        q99 = df[col].quantile(0.99)
                        outliers = (df[col] > q99 * 10).sum()  # Values 10x the 99th percentile
                        if outliers > 0:
                            file_results["outliers_detected"][col] = outliers
                            file_results["quality_issues"].append(f"Extreme outliers in {col}: {outliers}")

                # Data consistency checks
                if all(col in df.columns for col in ['TOTAL TREATED', 'WITHIN STANDARD', 'BREACHES']):
                    inconsistent_rows = 0
                    for _, row in df.sample(n=min(500, len(df))).iterrows():
                        if pd.notna(row['TOTAL TREATED']) and row['TOTAL TREATED'] > 0:
                            total = row['TOTAL TREATED']
                            within = row['WITHIN STANDARD'] if pd.notna(row['WITHIN STANDARD']) else 0
                            breaches = row['BREACHES'] if pd.notna(row['BREACHES']) else 0

                            # Check if performance metrics make sense
                            if within > total or breaches > total or within + breaches == 0:
                                inconsistent_rows += 1

                    if inconsistent_rows > 0:
                        file_results["data_consistency"] = False
                        file_results["quality_issues"].append(f"Inconsistent performance data: {inconsistent_rows} rows")

                # Calculate quality score
                deductions = 0
                deductions += min(file_results["duplicate_rows"] * 0.1, 10)  # Max 10 points for duplicates
                deductions += sum(file_results["negative_values"].values()) * 0.5  # 0.5 points per negative value
                deductions += sum(file_results["outliers_detected"].values()) * 0.2  # 0.2 points per outlier
                if not file_results["data_consistency"]:
                    deductions += 20  # Major deduction for inconsistency

                file_results["quality_score"] = max(0, 100 - deductions)

                print(f"  🔍 {filename}:")
                print(f"    - Quality score: {file_results['quality_score']:.1f}/100")
                print(f"    - Duplicate rows: {file_results['duplicate_rows']:,}")
                print(f"    - Negative values: {sum(file_results['negative_values'].values())}")
                print(f"    - Data consistency: {'✅' if file_results['data_consistency'] else '❌'}")

                if file_results["quality_score"] < 90:
                    severity = "HIGH" if file_results["quality_score"] < 75 else "MEDIUM"
                    self.report["issues_found"].append({
                        "severity": severity,
                        "category": "DATA_QUALITY",
                        "description": f"Data quality score below threshold in {filename}: {file_results['quality_score']:.1f}/100",
                        "impact": "May affect data accuracy and reliability",
                        "recommendation": "Review quality issues: " + "; ".join(file_results["quality_issues"][:3])
                    })

            except Exception as e:
                file_results["error"] = str(e)
                print(f"  ❌ {filename} - Quality check error: {str(e)}")

            results[filename] = file_results

        self.report["validation_results"]["data_quality"] = results

    def _test_cross_file_consistency(self):
        """Test consistency across multiple CWT files"""
        print("\n🔗 Test 7: Cross-File Consistency")

        processable_files = [f for f in self.report["files_tested"] if self._is_file_processable(f)]

        if len(processable_files) < 2:
            print("  ⚠️ Cannot perform cross-file consistency check - need at least 2 valid files")
            return

        results = {
            "files_compared": processable_files,
            "trust_consistency": True,
            "schema_consistency": True,
            "data_format_consistency": True,
            "inconsistencies": []
        }

        try:
            file_data = {}

            # Load data from each file
            for filename in processable_files:
                file_path = self.data_dir / filename
                main_sheet = self._get_main_sheet_name(filename)
                df = pd.read_excel(file_path, sheet_name=main_sheet)

                file_data[filename] = {
                    "columns": set(df.columns),
                    "trusts": set(df['ORG CODE'].dropna().astype(str).unique()) if 'ORG CODE' in df.columns else set(),
                    "cancer_types": set(df['CANCER TYPE'].dropna().unique()) if 'CANCER TYPE' in df.columns else set(),
                    "standards": set(df['STANDARD'].dropna().unique()) if 'STANDARD' in df.columns else set()
                }

            # Compare schemas
            base_file = processable_files[0]
            base_columns = file_data[base_file]["columns"]

            for filename in processable_files[1:]:
                if file_data[filename]["columns"] != base_columns:
                    results["schema_consistency"] = False
                    missing = base_columns - file_data[filename]["columns"]
                    extra = file_data[filename]["columns"] - base_columns
                    inconsistency = f"Schema mismatch between {base_file} and {filename}"
                    if missing:
                        inconsistency += f" (missing: {missing})"
                    if extra:
                        inconsistency += f" (extra: {extra})"
                    results["inconsistencies"].append(inconsistency)

            # Check trust consistency (should have similar trust codes across files)
            all_trusts = set()
            for data in file_data.values():
                all_trusts.update(data["trusts"])

            trust_coverage = {}
            for filename, data in file_data.items():
                coverage = len(data["trusts"]) / len(all_trusts) if all_trusts else 0
                trust_coverage[filename] = coverage

            min_coverage = min(trust_coverage.values()) if trust_coverage else 0
            if min_coverage < 0.8:  # Less than 80% trust overlap
                results["trust_consistency"] = False
                results["inconsistencies"].append(f"Low trust coverage overlap (min: {min_coverage:.1%})")

            # Check standards consistency
            all_standards = set()
            for data in file_data.values():
                all_standards.update(data["standards"])

            for filename, data in file_data.items():
                if data["standards"] != all_standards:
                    missing_standards = all_standards - data["standards"]
                    if missing_standards:
                        results["inconsistencies"].append(f"Missing standards in {filename}: {missing_standards}")

            print(f"  🔗 Cross-file consistency:")
            print(f"    - Files compared: {len(processable_files)}")
            print(f"    - Schema consistent: {'✅' if results['schema_consistency'] else '❌'}")
            print(f"    - Trust consistency: {'✅' if results['trust_consistency'] else '❌'}")
            print(f"    - Issues found: {len(results['inconsistencies'])}")

            if results["inconsistencies"]:
                for issue in results["inconsistencies"]:
                    print(f"      - {issue}")

                self.report["issues_found"].append({
                    "severity": "MEDIUM",
                    "category": "CROSS_FILE_INCONSISTENCY",
                    "description": f"Inconsistencies found across CWT files: {len(results['inconsistencies'])} issues",
                    "impact": "May cause processing errors or data mismatches",
                    "recommendation": "Review file sources and ensure all files are from same NHS release"
                })

        except Exception as e:
            results["error"] = str(e)
            print(f"  ❌ Cross-file consistency check error: {str(e)}")

        self.report["validation_results"]["cross_file_consistency"] = results

    def _generate_summary(self):
        """Generate overall validation summary"""
        print("\n📋 Generating Validation Summary...")

        summary = {
            "total_files_expected": len(self.expected_files),
            "total_files_found": len(self.report["files_tested"]),
            "files_processable": 0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "low_issues": 0,
            "overall_data_quality": 0.0,
            "recommendations_count": 0
        }

        # Count processable files
        for filename in self.report["files_tested"]:
            if self._is_file_processable(filename):
                summary["files_processable"] += 1

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

        # Calculate overall data quality score
        if "data_quality" in self.report["validation_results"]:
            quality_scores = []
            for file_results in self.report["validation_results"]["data_quality"].values():
                if "quality_score" in file_results:
                    quality_scores.append(file_results["quality_score"])

            if quality_scores:
                summary["overall_data_quality"] = sum(quality_scores) / len(quality_scores)

        # Generate recommendations
        recommendations = []

        if summary["critical_issues"] > 0:
            recommendations.append("🚨 Critical issues must be resolved before processing")

        if summary["files_found"] < summary["total_files_expected"]:
            recommendations.append("📥 Download missing CWT files from NHS England")

        if summary["overall_data_quality"] < 90:
            recommendations.append("🔍 Review data quality issues in source files")

        if summary["high_issues"] > 0:
            recommendations.append("⚠️ Address high-priority validation issues")

        recommendations.append("✅ Run Phase 2 testing after resolving critical issues")

        summary["recommendations_count"] = len(recommendations)
        self.report["recommendations"].extend(recommendations)

        # Determine overall status
        if summary["critical_issues"] > 0:
            self.report["overall_status"] = "CRITICAL_ISSUES"
        elif summary["high_issues"] > 0:
            self.report["overall_status"] = "HIGH_ISSUES"
        elif summary["medium_issues"] > 0:
            self.report["overall_status"] = "MEDIUM_ISSUES"
        else:
            self.report["overall_status"] = "PASSED"

        self.report["summary"] = summary

        # Print summary
        print(f"\n{'='*60}")
        print(f"📋 PHASE 1 VALIDATION SUMMARY")
        print(f"{'='*60}")
        print(f"Files found: {summary['files_found']}/{summary['total_files_expected']}")
        print(f"Files processable: {summary['files_processable']}")
        print(f"Overall data quality: {summary['overall_data_quality']:.1f}/100")
        print(f"\nIssues found:")
        print(f"  🚨 Critical: {summary['critical_issues']}")
        print(f"  ⚠️ High: {summary['high_issues']}")
        print(f"  ❓ Medium: {summary['medium_issues']}")
        print(f"  ℹ️ Low: {summary['low_issues']}")
        print(f"\nOverall Status: {self.report['overall_status']}")

        if recommendations:
            print(f"\n📋 Recommendations:")
            for rec in recommendations:
                print(f"  {rec}")

    def _is_file_processable(self, filename: str) -> bool:
        """Check if a file is processable based on validation results"""
        if filename not in self.report["files_tested"]:
            return False

        # Check if file passed basic integrity tests
        if "excel_integrity" in self.report["validation_results"]:
            file_info = self.report["validation_results"]["excel_integrity"].get(filename, {})
            if not file_info.get("readable", False):
                return False

        # Check if file has required schema
        if "nhs_schema" in self.report["validation_results"]:
            schema_info = self.report["validation_results"]["nhs_schema"].get(filename, {})
            if not schema_info.get("schema_compliant", False):
                return False

        return True

    def _get_main_sheet_name(self, filename: str) -> str:
        """Get the main sheet name for a file"""
        if "excel_integrity" in self.report["validation_results"]:
            file_info = self.report["validation_results"]["excel_integrity"].get(filename, {})
            return file_info.get("main_sheet_name", "Sheet1")
        return "Sheet1"


def main():
    """Main execution function"""
    print("NHS Cancer Performance Data - Phase 1: Raw Data Validation")
    print("=" * 70)

    # Data directory
    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Initialize validator
    validator = CancerRawDataValidator(data_dir)

    # Run all tests
    report = validator.run_all_tests()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/phase1_cancer_validation_{timestamp}.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved: {report_file}")
    except Exception as e:
        print(f"\n❌ Error saving report: {e}")

    # Exit with appropriate code
    status = report.get("overall_status", "ERROR")
    if status == "PASSED":
        print(f"\n✅ Phase 1 validation completed successfully!")
        sys.exit(0)
    elif status in ["MEDIUM_ISSUES", "HIGH_ISSUES"]:
        print(f"\n⚠️ Phase 1 validation completed with issues - review before proceeding")
        sys.exit(1)
    else:
        print(f"\n🚨 Phase 1 validation failed - critical issues must be resolved")
        sys.exit(2)


if __name__ == "__main__":
    main()
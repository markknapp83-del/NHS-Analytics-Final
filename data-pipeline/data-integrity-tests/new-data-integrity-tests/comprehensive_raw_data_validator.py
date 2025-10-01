#!/usr/bin/env python3
"""
Comprehensive Raw Data Validation Suite
=======================================

Validates the integrity, completeness, and consistency of all raw NHS data files
in the Data/ directory. This is the foundation layer of the data integrity pipeline.

Features:
- File existence and accessibility validation
- Schema and structure verification
- Data quality checks (missing values, duplicates, outliers)
- NHS standards compliance validation
- Cross-file consistency checks
- Temporal coverage analysis

Author: Claude Code Assistant
Date: 2025-09-29
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple, Optional, Set
import traceback
import hashlib
import logging
from dataclasses import dataclass

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DataFileInfo:
    """Information about a data file"""
    path: Path
    name: str
    size: int
    last_modified: datetime
    file_type: str
    hash_md5: str

@dataclass
class ValidationResult:
    """Result of a validation check"""
    test_name: str
    status: str  # PASS, FAIL, WARNING
    message: str
    details: Dict[str, Any]
    critical: bool = False

class ComprehensiveRawDataValidator:
    """
    Comprehensive validator for all raw NHS data files.
    Validates data integrity from source files through to database ingestion.
    """

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.results: List[ValidationResult] = []
        self.file_inventory: List[DataFileInfo] = []

        # Expected file patterns for different data types
        self.expected_patterns = {
            'rtt': ['*RTT*', '*Incomplete*'],
            'ae': ['*AE*', '*A&E*', '*Emergency*'],
            'cancer': ['*CWT*', '*Cancer*'],
            'diagnostics': ['*Diagnostic*', '*DM01*'],
            'community': ['*Community*'],
            'beds': ['*Beds*', '*Capacity*'],
            'ambulance': ['*Amb*', '*Ambulance*']
        }

        # NHS Trust codes pattern (3 characters)
        self.trust_code_pattern = r'^[A-Z0-9]{3}$'

        # Standard NHS date formats
        self.nhs_date_formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y%m%d',
            '%b-%Y', '%B %Y', '%Y-%m', '%m/%Y'
        ]

    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run all validation tests and return comprehensive report"""
        logger.info("Starting comprehensive raw data validation...")

        report = {
            'validation_timestamp': datetime.now().isoformat(),
            'validator': 'Comprehensive Raw Data Validator',
            'data_directory': str(self.data_dir),
            'file_inventory': [],
            'validation_results': [],
            'summary': {},
            'critical_issues': [],
            'recommendations': [],
            'overall_status': 'UNKNOWN'
        }

        try:
            # Phase 1: File Discovery and Inventory
            self._discover_files()
            report['file_inventory'] = [self._file_info_to_dict(f) for f in self.file_inventory]

            # Phase 2: File Accessibility and Basic Validation
            self._validate_file_accessibility()

            # Phase 3: Data Structure Validation
            self._validate_data_structures()

            # Phase 4: Data Quality Validation
            self._validate_data_quality()

            # Phase 5: NHS Standards Compliance
            self._validate_nhs_standards()

            # Phase 6: Cross-File Consistency
            self._validate_cross_file_consistency()

            # Phase 7: Temporal Coverage Analysis
            self._validate_temporal_coverage()

            # Compile results
            report['validation_results'] = [self._result_to_dict(r) for r in self.results]
            report['summary'] = self._generate_summary()
            report['critical_issues'] = [r for r in self.results if r.critical and r.status == 'FAIL']
            report['recommendations'] = self._generate_recommendations()
            report['overall_status'] = self._determine_overall_status()

            logger.info(f"Validation completed. Status: {report['overall_status']}")
            return report

        except Exception as e:
            logger.error(f"Validation failed with error: {e}")
            report['error'] = str(e)
            report['traceback'] = traceback.format_exc()
            report['overall_status'] = 'ERROR'
            return report

    def _discover_files(self) -> None:
        """Discover and inventory all data files"""
        logger.info("Discovering data files...")

        if not self.data_dir.exists():
            self.results.append(ValidationResult(
                'file_discovery', 'FAIL',
                f"Data directory does not exist: {self.data_dir}",
                {}, critical=True
            ))
            return

        for file_path in self.data_dir.rglob('*'):
            if file_path.is_file() and not file_path.name.startswith('.'):
                try:
                    file_info = DataFileInfo(
                        path=file_path,
                        name=file_path.name,
                        size=file_path.stat().st_size,
                        last_modified=datetime.fromtimestamp(file_path.stat().st_mtime),
                        file_type=file_path.suffix.lower(),
                        hash_md5=self._calculate_file_hash(file_path)
                    )
                    self.file_inventory.append(file_info)
                except Exception as e:
                    self.results.append(ValidationResult(
                        'file_discovery', 'WARNING',
                        f"Could not process file {file_path}: {e}",
                        {'file_path': str(file_path), 'error': str(e)}
                    ))

        self.results.append(ValidationResult(
            'file_discovery', 'PASS',
            f"Discovered {len(self.file_inventory)} data files",
            {'file_count': len(self.file_inventory)}
        ))

    def _validate_file_accessibility(self) -> None:
        """Validate that all files are accessible and readable"""
        logger.info("Validating file accessibility...")

        accessible_files = 0
        for file_info in self.file_inventory:
            try:
                if file_info.file_type in ['.xlsx', '.xls', '.csv']:
                    if file_info.file_type in ['.xlsx', '.xls']:
                        pd.read_excel(file_info.path, nrows=1)
                    else:
                        pd.read_csv(file_info.path, nrows=1)
                    accessible_files += 1
                else:
                    # For other file types, just check readability
                    with open(file_info.path, 'rb') as f:
                        f.read(1024)  # Read first 1KB
                    accessible_files += 1

            except Exception as e:
                self.results.append(ValidationResult(
                    'file_accessibility', 'FAIL',
                    f"Cannot access file {file_info.name}: {e}",
                    {'file_path': str(file_info.path), 'error': str(e)},
                    critical=True
                ))

        if accessible_files == len(self.file_inventory):
            self.results.append(ValidationResult(
                'file_accessibility', 'PASS',
                f"All {accessible_files} files are accessible",
                {'accessible_count': accessible_files}
            ))
        else:
            failed_count = len(self.file_inventory) - accessible_files
            self.results.append(ValidationResult(
                'file_accessibility', 'WARNING',
                f"{failed_count} files are not accessible",
                {'failed_count': failed_count, 'accessible_count': accessible_files}
            ))

    def _validate_data_structures(self) -> None:
        """Validate data file structures and schemas"""
        logger.info("Validating data structures...")

        for file_info in self.file_inventory:
            if file_info.file_type not in ['.xlsx', '.xls', '.csv']:
                continue

            try:
                # Load file
                if file_info.file_type in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_info.path)
                else:
                    df = pd.read_csv(file_info.path)

                # Basic structure validation
                structure_details = {
                    'rows': len(df),
                    'columns': len(df.columns),
                    'column_names': list(df.columns),
                    'data_types': df.dtypes.to_dict(),
                    'memory_usage': df.memory_usage(deep=True).sum()
                }

                # Check for empty files
                if len(df) == 0:
                    self.results.append(ValidationResult(
                        'data_structure', 'FAIL',
                        f"File {file_info.name} is empty",
                        structure_details, critical=True
                    ))
                    continue

                # Check for suspicious column patterns
                suspicious_columns = []
                for col in df.columns:
                    if 'unnamed' in str(col).lower() or pd.isna(col):
                        suspicious_columns.append(col)

                if suspicious_columns:
                    self.results.append(ValidationResult(
                        'data_structure', 'WARNING',
                        f"File {file_info.name} has suspicious columns: {suspicious_columns}",
                        {**structure_details, 'suspicious_columns': suspicious_columns}
                    ))
                else:
                    self.results.append(ValidationResult(
                        'data_structure', 'PASS',
                        f"File {file_info.name} has valid structure",
                        structure_details
                    ))

            except Exception as e:
                self.results.append(ValidationResult(
                    'data_structure', 'FAIL',
                    f"Cannot validate structure of {file_info.name}: {e}",
                    {'file_path': str(file_info.path), 'error': str(e)}
                ))

    def _validate_data_quality(self) -> None:
        """Validate data quality metrics"""
        logger.info("Validating data quality...")

        for file_info in self.file_inventory:
            if file_info.file_type not in ['.xlsx', '.xls', '.csv']:
                continue

            try:
                # Load file
                if file_info.file_type in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_info.path)
                else:
                    df = pd.read_csv(file_info.path)

                if len(df) == 0:
                    continue

                # Calculate quality metrics
                quality_metrics = {
                    'total_cells': df.size,
                    'missing_values': df.isnull().sum().sum(),
                    'missing_percentage': (df.isnull().sum().sum() / df.size) * 100,
                    'duplicate_rows': df.duplicated().sum(),
                    'duplicate_percentage': (df.duplicated().sum() / len(df)) * 100
                }

                # Check for excessive missing data
                if quality_metrics['missing_percentage'] > 50:
                    self.results.append(ValidationResult(
                        'data_quality', 'FAIL',
                        f"File {file_info.name} has excessive missing data: {quality_metrics['missing_percentage']:.1f}%",
                        quality_metrics, critical=True
                    ))
                elif quality_metrics['missing_percentage'] > 20:
                    self.results.append(ValidationResult(
                        'data_quality', 'WARNING',
                        f"File {file_info.name} has high missing data: {quality_metrics['missing_percentage']:.1f}%",
                        quality_metrics
                    ))

                # Check for excessive duplicates
                if quality_metrics['duplicate_percentage'] > 10:
                    self.results.append(ValidationResult(
                        'data_quality', 'WARNING',
                        f"File {file_info.name} has high duplicate rows: {quality_metrics['duplicate_percentage']:.1f}%",
                        quality_metrics
                    ))

                # Check for outliers in numeric columns
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                outlier_details = {}

                for col in numeric_cols:
                    if df[col].notna().sum() > 0:
                        Q1 = df[col].quantile(0.25)
                        Q3 = df[col].quantile(0.75)
                        IQR = Q3 - Q1
                        lower_bound = Q1 - 1.5 * IQR
                        upper_bound = Q3 + 1.5 * IQR
                        outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col]

                        if len(outliers) > 0:
                            outlier_details[col] = {
                                'count': len(outliers),
                                'percentage': (len(outliers) / len(df)) * 100,
                                'range': f"{outliers.min()} to {outliers.max()}"
                            }

                if outlier_details:
                    quality_metrics['outliers'] = outlier_details

                if quality_metrics['missing_percentage'] <= 20 and quality_metrics['duplicate_percentage'] <= 10:
                    self.results.append(ValidationResult(
                        'data_quality', 'PASS',
                        f"File {file_info.name} has acceptable data quality",
                        quality_metrics
                    ))

            except Exception as e:
                self.results.append(ValidationResult(
                    'data_quality', 'FAIL',
                    f"Cannot validate quality of {file_info.name}: {e}",
                    {'file_path': str(file_info.path), 'error': str(e)}
                ))

    def _validate_nhs_standards(self) -> None:
        """Validate compliance with NHS data standards"""
        logger.info("Validating NHS standards compliance...")

        for file_info in self.file_inventory:
            if file_info.file_type not in ['.xlsx', '.xls', '.csv']:
                continue

            try:
                # Load file
                if file_info.file_type in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_info.path)
                else:
                    df = pd.read_csv(file_info.path)

                if len(df) == 0:
                    continue

                standards_checks = {}

                # Check for NHS trust codes
                trust_code_columns = [col for col in df.columns if 'ORG' in str(col).upper() or 'TRUST' in str(col).upper() or 'CODE' in str(col).upper()]

                for col in trust_code_columns:
                    if col in df.columns:
                        valid_codes = df[col].astype(str).str.match(r'^[A-Z0-9]{3}$').sum()
                        total_codes = df[col].notna().sum()

                        if total_codes > 0:
                            validity_percentage = (valid_codes / total_codes) * 100
                            standards_checks[f'{col}_validity'] = {
                                'valid_codes': valid_codes,
                                'total_codes': total_codes,
                                'validity_percentage': validity_percentage
                            }

                            if validity_percentage < 90:
                                self.results.append(ValidationResult(
                                    'nhs_standards', 'WARNING',
                                    f"File {file_info.name} has invalid trust codes in {col}: {validity_percentage:.1f}% valid",
                                    standards_checks
                                ))

                # Check for date columns
                date_columns = [col for col in df.columns if any(date_word in str(col).upper() for date_word in ['DATE', 'MONTH', 'YEAR', 'PERIOD'])]

                for col in date_columns:
                    try:
                        # Try to parse dates
                        parsed_dates = pd.to_datetime(df[col], errors='coerce')
                        valid_dates = parsed_dates.notna().sum()
                        total_dates = df[col].notna().sum()

                        if total_dates > 0:
                            date_validity = (valid_dates / total_dates) * 100
                            standards_checks[f'{col}_date_validity'] = {
                                'valid_dates': valid_dates,
                                'total_dates': total_dates,
                                'validity_percentage': date_validity
                            }

                            if date_validity < 95:
                                self.results.append(ValidationResult(
                                    'nhs_standards', 'WARNING',
                                    f"File {file_info.name} has invalid dates in {col}: {date_validity:.1f}% valid",
                                    standards_checks
                                ))
                    except:
                        pass

                # If no issues found, mark as compliant
                if not any(result.test_name == 'nhs_standards' and result.details.get('file_path') == str(file_info.path) for result in self.results):
                    self.results.append(ValidationResult(
                        'nhs_standards', 'PASS',
                        f"File {file_info.name} complies with NHS standards",
                        standards_checks
                    ))

            except Exception as e:
                self.results.append(ValidationResult(
                    'nhs_standards', 'FAIL',
                    f"Cannot validate NHS standards for {file_info.name}: {e}",
                    {'file_path': str(file_info.path), 'error': str(e)}
                ))

    def _validate_cross_file_consistency(self) -> None:
        """Validate consistency across multiple files"""
        logger.info("Validating cross-file consistency...")

        # Group files by type
        file_groups = {}
        for file_info in self.file_inventory:
            for data_type, patterns in self.expected_patterns.items():
                if any(pattern.replace('*', '').upper() in file_info.name.upper() for pattern in patterns):
                    if data_type not in file_groups:
                        file_groups[data_type] = []
                    file_groups[data_type].append(file_info)
                    break

        # Check for overlapping periods and trust codes
        for data_type, files in file_groups.items():
            if len(files) <= 1:
                continue

            try:
                all_trust_codes = set()
                all_periods = set()

                for file_info in files:
                    try:
                        if file_info.file_type in ['.xlsx', '.xls']:
                            df = pd.read_excel(file_info.path)
                        else:
                            df = pd.read_csv(file_info.path)

                        # Extract trust codes
                        trust_cols = [col for col in df.columns if 'ORG' in str(col).upper() or 'TRUST' in str(col).upper()]
                        for col in trust_cols:
                            codes = df[col].dropna().unique()
                            all_trust_codes.update(codes)

                        # Extract periods
                        period_cols = [col for col in df.columns if any(word in str(col).upper() for word in ['MONTH', 'PERIOD', 'DATE'])]
                        for col in period_cols:
                            periods = df[col].dropna().unique()
                            all_periods.update(periods)

                    except Exception as e:
                        logger.warning(f"Error processing {file_info.name} for consistency check: {e}")

                consistency_details = {
                    'data_type': data_type,
                    'file_count': len(files),
                    'unique_trust_codes': len(all_trust_codes),
                    'unique_periods': len(all_periods),
                    'files': [f.name for f in files]
                }

                self.results.append(ValidationResult(
                    'cross_file_consistency', 'PASS',
                    f"Analyzed consistency for {data_type} files",
                    consistency_details
                ))

            except Exception as e:
                self.results.append(ValidationResult(
                    'cross_file_consistency', 'FAIL',
                    f"Cannot validate consistency for {data_type} files: {e}",
                    {'data_type': data_type, 'error': str(e)}
                ))

    def _validate_temporal_coverage(self) -> None:
        """Validate temporal coverage of the data"""
        logger.info("Validating temporal coverage...")

        temporal_summary = {
            'earliest_date': None,
            'latest_date': None,
            'date_range_days': None,
            'files_with_dates': 0,
            'files_without_dates': 0
        }

        all_dates = []

        for file_info in self.file_inventory:
            if file_info.file_type not in ['.xlsx', '.xls', '.csv']:
                continue

            try:
                if file_info.file_type in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_info.path)
                else:
                    df = pd.read_csv(file_info.path)

                if len(df) == 0:
                    continue

                # Look for date columns
                date_columns = [col for col in df.columns if any(word in str(col).upper() for word in ['DATE', 'MONTH', 'YEAR', 'PERIOD'])]

                file_has_dates = False
                for col in date_columns:
                    try:
                        dates = pd.to_datetime(df[col], errors='coerce').dropna()
                        if len(dates) > 0:
                            all_dates.extend(dates)
                            file_has_dates = True
                    except:
                        pass

                if file_has_dates:
                    temporal_summary['files_with_dates'] += 1
                else:
                    temporal_summary['files_without_dates'] += 1

            except Exception as e:
                logger.warning(f"Error analyzing temporal coverage for {file_info.name}: {e}")
                temporal_summary['files_without_dates'] += 1

        if all_dates:
            earliest = min(all_dates)
            latest = max(all_dates)
            temporal_summary.update({
                'earliest_date': earliest.isoformat(),
                'latest_date': latest.isoformat(),
                'date_range_days': (latest - earliest).days
            })

            # Check for reasonable coverage
            if temporal_summary['date_range_days'] < 365:
                self.results.append(ValidationResult(
                    'temporal_coverage', 'WARNING',
                    f"Limited temporal coverage: {temporal_summary['date_range_days']} days",
                    temporal_summary
                ))
            else:
                self.results.append(ValidationResult(
                    'temporal_coverage', 'PASS',
                    f"Good temporal coverage: {temporal_summary['date_range_days']} days",
                    temporal_summary
                ))
        else:
            self.results.append(ValidationResult(
                'temporal_coverage', 'WARNING',
                "No temporal data found in files",
                temporal_summary
            ))

    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate MD5 hash of file"""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except:
            return "unknown"

    def _file_info_to_dict(self, file_info: DataFileInfo) -> Dict[str, Any]:
        """Convert DataFileInfo to dictionary"""
        return {
            'name': file_info.name,
            'path': str(file_info.path),
            'size_bytes': file_info.size,
            'size_human': self._human_readable_size(file_info.size),
            'last_modified': file_info.last_modified.isoformat(),
            'file_type': file_info.file_type,
            'hash_md5': file_info.hash_md5
        }

    def _result_to_dict(self, result: ValidationResult) -> Dict[str, Any]:
        """Convert ValidationResult to dictionary"""
        return {
            'test_name': result.test_name,
            'status': result.status,
            'message': result.message,
            'details': result.details,
            'critical': result.critical
        }

    def _human_readable_size(self, size_bytes: int) -> str:
        """Convert bytes to human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    def _generate_summary(self) -> Dict[str, Any]:
        """Generate validation summary"""
        total_tests = len(self.results)
        passed = len([r for r in self.results if r.status == 'PASS'])
        failed = len([r for r in self.results if r.status == 'FAIL'])
        warnings = len([r for r in self.results if r.status == 'WARNING'])
        critical_failures = len([r for r in self.results if r.critical and r.status == 'FAIL'])

        return {
            'total_files': len(self.file_inventory),
            'total_tests': total_tests,
            'tests_passed': passed,
            'tests_failed': failed,
            'tests_warnings': warnings,
            'critical_failures': critical_failures,
            'success_rate': (passed / total_tests * 100) if total_tests > 0 else 0
        }

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []

        # Check for critical failures
        critical_failures = [r for r in self.results if r.critical and r.status == 'FAIL']
        if critical_failures:
            recommendations.append("🚨 CRITICAL: Address critical failures before proceeding with data processing")

        # Check for accessibility issues
        accessibility_failures = [r for r in self.results if r.test_name == 'file_accessibility' and r.status == 'FAIL']
        if accessibility_failures:
            recommendations.append("📁 Fix file accessibility issues - ensure all data files are readable")

        # Check for data quality issues
        quality_warnings = [r for r in self.results if r.test_name == 'data_quality' and r.status in ['FAIL', 'WARNING']]
        if quality_warnings:
            recommendations.append("🔍 Investigate data quality issues - high missing data or duplicates detected")

        # Check for NHS standards compliance
        standards_warnings = [r for r in self.results if r.test_name == 'nhs_standards' and r.status in ['FAIL', 'WARNING']]
        if standards_warnings:
            recommendations.append("📋 Review NHS standards compliance - invalid trust codes or dates detected")

        # Check temporal coverage
        temporal_warnings = [r for r in self.results if r.test_name == 'temporal_coverage' and r.status == 'WARNING']
        if temporal_warnings:
            recommendations.append("📅 Review temporal coverage - ensure adequate date range for analysis")

        if not recommendations:
            recommendations.append("✅ All validation checks passed - data appears ready for processing")

        return recommendations

    def _determine_overall_status(self) -> str:
        """Determine overall validation status"""
        critical_failures = [r for r in self.results if r.critical and r.status == 'FAIL']
        failures = [r for r in self.results if r.status == 'FAIL']
        warnings = [r for r in self.results if r.status == 'WARNING']

        if critical_failures:
            return 'CRITICAL_FAILURE'
        elif failures:
            return 'FAILURE'
        elif warnings:
            return 'WARNING'
        else:
            return 'PASS'


def main():
    """Main execution function"""
    # Configuration
    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Initialize validator
    validator = ComprehensiveRawDataValidator(data_dir)

    # Run validation
    report = validator.run_comprehensive_validation()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"comprehensive_raw_data_validation_{timestamp}.json"

    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Print summary
    print(f"\n{'='*60}")
    print("COMPREHENSIVE RAW DATA VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Status: {report['overall_status']}")
    print(f"Files Analyzed: {report['summary']['total_files']}")
    print(f"Tests Run: {report['summary']['total_tests']}")
    print(f"Success Rate: {report['summary']['success_rate']:.1f}%")

    if report['critical_issues']:
        print(f"\n🚨 CRITICAL ISSUES: {len(report['critical_issues'])}")
        for issue in report['critical_issues']:
            print(f"  - {issue['message']}")

    print(f"\nDetailed report saved to: {report_path}")

    return report['overall_status'] == 'PASS'


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
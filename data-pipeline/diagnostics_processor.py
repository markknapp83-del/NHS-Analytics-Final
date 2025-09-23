#!/usr/bin/env python3
"""
Diagnostics Data Processor
Specialized processor for NHS diagnostic waiting times Excel files
"""

import pandas as pd
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
import numpy as np
from dataclasses import dataclass


@dataclass
class DiagnosticsMetrics:
    """Container for processed diagnostics metrics"""
    trust_code: str
    period: str
    diagnostics_data: Dict[str, Any]
    raw_data: pd.DataFrame


class DiagnosticsProcessor:
    """
    Processor for NHS diagnostic waiting times and activity data
    Handles various Excel file formats and extracts trust-level diagnostic metrics
    """

    def __init__(self):
        """Initialize diagnostics processor"""
        self.logger = self._setup_logging()

        # Standard diagnostic test type mappings
        self.diagnostic_mappings = {
            'MRI': 'mri_scans',
            'CT': 'ct_scans',
            'Non-obstetric ultrasound': 'ultrasound_non_obstetric',
            'DEXA scan': 'dexa_scans',
            'Echocardiography': 'echocardiography',
            'Endoscopy': 'endoscopy',
            'Colonoscopy': 'colonoscopy',
            'Flexi sigmoidoscopy': 'flexi_sigmoidoscopy',
            'Gastroscopy': 'gastroscopy',
            'Cystoscopy': 'cystoscopy',
            'Bronchoscopy': 'bronchoscopy',
            'ERCP': 'ercp',
            'Percutaneous coronary intervention': 'pci',
            'Coronary angiography': 'coronary_angiography',
            'Carotid artery duplex': 'carotid_duplex',
            'Total': 'total_diagnostics'
        }

        # Standard column mappings for diagnostics data
        self.column_mappings = {
            # Waiting metrics
            'total_waiting': [
                'Total Waiting',
                'Number Waiting',
                'Waiting List Size',
                'Total on waiting list',
                'Incomplete pathways'
            ],
            'six_week_breaches': [
                'Six week breaches',
                '6+ week breaches',
                'Over 6 weeks',
                'Number waiting 6+ weeks',
                'Six weeks and over'
            ],
            'thirteen_week_breaches': [
                'Thirteen week breaches',
                '13+ week breaches',
                'Over 13 weeks',
                'Number waiting 13+ weeks',
                'Thirteen weeks and over'
            ],
            # Activity metrics
            'planned_tests': [
                'Planned tests',
                'Planned activity',
                'Scheduled tests',
                'Planned procedures'
            ],
            'unscheduled_tests': [
                'Unscheduled tests',
                'Unscheduled activity',
                'Emergency tests',
                'Urgent tests'
            ],
            'total_tests': [
                'Total tests',
                'Total activity',
                'Total procedures',
                'All tests'
            ],
            # Performance metrics
            'six_week_performance_pct': [
                'Six week performance',
                '6 week performance %',
                'Percentage within 6 weeks',
                '% within 6 weeks'
            ],
            'mean_wait_weeks': [
                'Mean wait',
                'Average wait',
                'Mean waiting time',
                'Average waiting time'
            ],
            'median_wait_weeks': [
                'Median wait',
                'Median waiting time'
            ]
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('diagnostics_processor')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def _find_column_name(self, df: pd.DataFrame, metric_key: str) -> Optional[str]:
        """Find the actual column name for a metric in the dataframe"""
        possible_names = self.column_mappings.get(metric_key, [])

        for possible_name in possible_names:
            # Exact match
            if possible_name in df.columns:
                return possible_name

            # Case-insensitive match
            for col in df.columns:
                if isinstance(col, str) and col.lower() == possible_name.lower():
                    return col

            # Partial match
            for col in df.columns:
                if isinstance(col, str) and possible_name.lower() in col.lower():
                    return col

        return None

    def _extract_trust_code(self, df: pd.DataFrame) -> Optional[str]:
        """Extract trust code from the dataframe"""
        # Look for trust code columns
        trust_code_columns = ['Trust Code', 'Provider Code', 'Org Code', 'Code', 'Organisation Code']

        for col_name in trust_code_columns:
            if col_name in df.columns:
                # Get first non-null value
                trust_codes = df[col_name].dropna()
                if not trust_codes.empty:
                    return str(trust_codes.iloc[0])

        # Look for trust code in any column that might contain it
        for col in df.columns:
            if isinstance(col, str) and 'code' in col.lower():
                trust_codes = df[col].dropna()
                if not trust_codes.empty:
                    first_value = str(trust_codes.iloc[0])
                    # Trust codes are typically 3-5 characters
                    if 3 <= len(first_value) <= 5 and first_value.isalnum():
                        return first_value

        return None

    def _clean_numeric_value(self, value: Any) -> Optional[float]:
        """Clean and convert a value to numeric"""
        if pd.isna(value):
            return None

        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, str):
            # Remove common non-numeric characters
            cleaned = value.replace(',', '').replace('%', '').replace('*', '').strip()

            # Handle suppressed data markers
            if cleaned.lower() in ['*', '-', 'n/a', 'na', 'suppressed', '']:
                return None

            try:
                return float(cleaned)
            except ValueError:
                return None

        return None

    def _process_diagnostic_row(self, row: pd.Series, test_type: str) -> Dict[str, Any]:
        """Process a single row of diagnostic data"""
        metrics = {}

        # Extract each metric
        for metric_key in self.column_mappings.keys():
            col_name = self._find_column_name(pd.DataFrame([row]), metric_key)
            if col_name and col_name in row.index:
                value = self._clean_numeric_value(row[col_name])
                metrics[metric_key] = value

        return metrics

    def _identify_data_structure(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Identify the structure of the diagnostics data file"""
        structure = {
            'has_trust_column': False,
            'has_test_type_column': False,
            'trust_column': None,
            'test_type_column': None,
            'data_layout': 'unknown'  # 'trust_per_row', 'test_per_row', 'matrix'
        }

        # Look for trust identifier columns
        trust_columns = ['Trust Code', 'Provider Code', 'Org Code', 'Trust Name', 'Provider Name', 'Organisation Code']
        for col in trust_columns:
            if col in df.columns:
                structure['has_trust_column'] = True
                structure['trust_column'] = col
                break

        # Look for test type columns
        test_columns = ['Test Type', 'Diagnostic Test', 'Modality', 'Test', 'Examination Type']
        for col in test_columns:
            if col in df.columns:
                structure['has_test_type_column'] = True
                structure['test_type_column'] = col
                break

        # Determine layout
        if structure['has_trust_column'] and structure['has_test_type_column']:
            structure['data_layout'] = 'matrix'
        elif structure['has_trust_column']:
            structure['data_layout'] = 'trust_per_row'
        elif structure['has_test_type_column']:
            structure['data_layout'] = 'test_per_row'

        return structure

    def process_diagnostics_file(self, file_path: Path, period: str) -> List[DiagnosticsMetrics]:
        """Process a diagnostics Excel file and extract metrics for all trusts"""
        self.logger.info(f"Processing diagnostics file: {file_path.name}")

        results = []

        try:
            # Try to read different sheets
            excel_file = pd.ExcelFile(file_path)

            # Look for the main data sheet
            data_sheet = None
            for sheet_name in excel_file.sheet_names:
                if any(keyword in sheet_name.lower() for keyword in ['provider', 'trust', 'diagnostic', 'waiting', 'data']):
                    data_sheet = sheet_name
                    break

            if not data_sheet:
                data_sheet = excel_file.sheet_names[0]  # Use first sheet as fallback

            # Read the data
            df = pd.read_excel(file_path, sheet_name=data_sheet)

            # Skip initial rows that might be headers/metadata
            # Look for the row that contains column headers
            header_row = 0
            for i, row in df.iterrows():
                if any(col_name in str(row.values).lower() for col_name in ['trust', 'provider', 'waiting', 'diagnostic']):
                    header_row = i
                    break

            if header_row > 0:
                df = pd.read_excel(file_path, sheet_name=data_sheet, header=header_row)

            # Clean column names
            df.columns = df.columns.astype(str).str.strip()

            # Identify data structure
            structure = self._identify_data_structure(df)
            self.logger.info(f"Detected data layout: {structure['data_layout']}")

            # Process based on structure
            if structure['data_layout'] == 'matrix':
                results = self._process_matrix_layout(df, structure, period)
            elif structure['data_layout'] == 'trust_per_row':
                results = self._process_trust_per_row_layout(df, structure, period)
            elif structure['data_layout'] == 'test_per_row':
                results = self._process_test_per_row_layout(df, structure, period)
            else:
                self.logger.warning(f"Unknown data layout, attempting generic processing")
                results = self._process_generic_layout(df, period)

            self.logger.info(f"Processed {len(results)} trust records from diagnostics file")

        except Exception as e:
            self.logger.error(f"Error processing diagnostics file {file_path.name}: {str(e)}")
            raise

        return results

    def _process_matrix_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[DiagnosticsMetrics]:
        """Process diagnostics data in matrix layout (trusts and test types in same table)"""
        results = []

        trust_col = structure['trust_column']
        test_col = structure['test_type_column']

        # Group by trust
        for trust_code, trust_group in df.groupby(trust_col):
            if pd.isna(trust_code):
                continue

            trust_code = str(trust_code).strip()

            # Process each test type for this trust
            diagnostics_data = {}

            for _, row in trust_group.iterrows():
                test_raw = str(row[test_col]) if not pd.isna(row[test_col]) else 'Other'
                test_key = self._map_test_type(test_raw)

                metrics = self._process_diagnostic_row(row, test_key)
                diagnostics_data[test_key] = metrics

            # Create diagnostics metrics object
            diag_metrics = DiagnosticsMetrics(
                trust_code=trust_code,
                period=period,
                diagnostics_data=diagnostics_data,
                raw_data=trust_group
            )

            results.append(diag_metrics)

        return results

    def _process_trust_per_row_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[DiagnosticsMetrics]:
        """Process diagnostics data with one trust per row"""
        results = []

        trust_col = structure['trust_column']

        for _, row in df.iterrows():
            trust_code = str(row[trust_col]) if not pd.isna(row[trust_col]) else None

            if not trust_code:
                continue

            trust_code = trust_code.strip()

            # Extract trust-level aggregate metrics
            diagnostics_data = {
                'total_diagnostics': self._process_diagnostic_row(row, 'total_diagnostics')
            }

            # Create diagnostics metrics object
            diag_metrics = DiagnosticsMetrics(
                trust_code=trust_code,
                period=period,
                diagnostics_data=diagnostics_data,
                raw_data=pd.DataFrame([row])
            )

            results.append(diag_metrics)

        return results

    def _process_test_per_row_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[DiagnosticsMetrics]:
        """Process diagnostics data with one test type per row (single trust file)"""
        results = []

        test_col = structure['test_type_column']

        # Extract trust code (should be consistent across all rows)
        trust_code = self._extract_trust_code(df)

        if not trust_code:
            self.logger.error("Could not extract trust code from test-per-row layout")
            return results

        # Process each test type
        diagnostics_data = {}

        for _, row in df.iterrows():
            test_raw = str(row[test_col]) if not pd.isna(row[test_col]) else 'Other'
            test_key = self._map_test_type(test_raw)

            metrics = self._process_diagnostic_row(row, test_key)
            diagnostics_data[test_key] = metrics

        # Create single diagnostics metrics object for the trust
        diag_metrics = DiagnosticsMetrics(
            trust_code=trust_code,
            period=period,
            diagnostics_data=diagnostics_data,
            raw_data=df
        )

        results.append(diag_metrics)

        return results

    def _process_generic_layout(self, df: pd.DataFrame, period: str) -> List[DiagnosticsMetrics]:
        """Generic processing for unknown layouts"""
        results = []

        # Try to extract any trust codes we can find
        trust_code = self._extract_trust_code(df)

        if trust_code:
            # Process as single trust with aggregate metrics
            diagnostics_data = {
                'total_diagnostics': {}
            }

            # Try to extract any metrics from the first row
            if not df.empty:
                diagnostics_data['total_diagnostics'] = self._process_diagnostic_row(df.iloc[0], 'total_diagnostics')

            diag_metrics = DiagnosticsMetrics(
                trust_code=trust_code,
                period=period,
                diagnostics_data=diagnostics_data,
                raw_data=df
            )

            results.append(diag_metrics)

        return results

    def _map_test_type(self, test_raw: str) -> str:
        """Map raw test type to standardized key"""
        if not test_raw or pd.isna(test_raw):
            return 'other'

        test_clean = str(test_raw).strip()

        # Direct mapping
        if test_clean in self.diagnostic_mappings:
            return self.diagnostic_mappings[test_clean]

        # Case-insensitive mapping
        for key, value in self.diagnostic_mappings.items():
            if key.lower() == test_clean.lower():
                return value

        # Partial matching for common variations
        test_lower = test_clean.lower()

        if 'mri' in test_lower:
            return 'mri_scans'
        elif 'ct' in test_lower:
            return 'ct_scans'
        elif 'ultrasound' in test_lower and 'obstetric' not in test_lower:
            return 'ultrasound_non_obstetric'
        elif 'dexa' in test_lower:
            return 'dexa_scans'
        elif 'echo' in test_lower:
            return 'echocardiography'
        elif 'endoscopy' in test_lower:
            return 'endoscopy'
        elif 'colonoscopy' in test_lower:
            return 'colonoscopy'
        elif 'sigmoidoscopy' in test_lower:
            return 'flexi_sigmoidoscopy'
        elif 'gastroscopy' in test_lower:
            return 'gastroscopy'
        elif 'cystoscopy' in test_lower:
            return 'cystoscopy'
        elif 'bronchoscopy' in test_lower:
            return 'bronchoscopy'
        elif 'ercp' in test_lower:
            return 'ercp'
        elif 'pci' in test_lower or 'percutaneous coronary' in test_lower:
            return 'pci'
        elif 'angiography' in test_lower:
            return 'coronary_angiography'
        elif 'carotid' in test_lower:
            return 'carotid_duplex'
        elif 'total' in test_lower:
            return 'total_diagnostics'

        # Default to 'other' for unrecognized test types
        return 'other'

    def _calculate_derived_metrics(self, diagnostics_data: Dict[str, Any]) -> None:
        """Calculate derived diagnostics metrics"""
        for test_type, metrics in diagnostics_data.items():
            if not isinstance(metrics, dict):
                continue

            # Calculate 6-week performance if we have the components
            total_waiting = metrics.get('total_waiting')
            six_week_breaches = metrics.get('six_week_breaches')

            if total_waiting and six_week_breaches is not None and total_waiting > 0:
                within_six_weeks = total_waiting - six_week_breaches
                performance_pct = (within_six_weeks / total_waiting) * 100
                metrics['six_week_performance_pct'] = performance_pct

            # Calculate total tests if we have components
            planned_tests = metrics.get('planned_tests')
            unscheduled_tests = metrics.get('unscheduled_tests')

            if planned_tests is not None and unscheduled_tests is not None:
                metrics['total_tests'] = planned_tests + unscheduled_tests

    def validate_diagnostics_metrics(self, metrics: DiagnosticsMetrics) -> List[str]:
        """Validate diagnostics metrics for data quality"""
        warnings = []

        diagnostics_data = metrics.diagnostics_data

        # Check if we have diagnostic data
        if not diagnostics_data:
            warnings.append("No diagnostics metrics found")
            return warnings

        # Validate each test type
        for test_type, test_metrics in diagnostics_data.items():
            if not isinstance(test_metrics, dict):
                continue

            # Validate 6-week performance percentage
            performance_pct = test_metrics.get('six_week_performance_pct')
            if performance_pct is not None:
                if performance_pct < 0 or performance_pct > 100:
                    warnings.append(f"Invalid 6-week performance for {test_type}: {performance_pct}%")

            # Validate that breaches don't exceed total waiting
            total_waiting = test_metrics.get('total_waiting')
            six_week_breaches = test_metrics.get('six_week_breaches')
            thirteen_week_breaches = test_metrics.get('thirteen_week_breaches')

            if total_waiting is not None:
                if six_week_breaches is not None and six_week_breaches > total_waiting:
                    warnings.append(f"6-week breaches exceed total waiting for {test_type}")

                if thirteen_week_breaches is not None and thirteen_week_breaches > total_waiting:
                    warnings.append(f"13-week breaches exceed total waiting for {test_type}")

            # Validate that 13-week breaches don't exceed 6-week breaches
            if six_week_breaches is not None and thirteen_week_breaches is not None:
                if thirteen_week_breaches > six_week_breaches:
                    warnings.append(f"13-week breaches exceed 6-week breaches for {test_type}")

            # Validate total tests calculation
            planned_tests = test_metrics.get('planned_tests')
            unscheduled_tests = test_metrics.get('unscheduled_tests')
            total_tests = test_metrics.get('total_tests')

            if all(x is not None for x in [planned_tests, unscheduled_tests, total_tests]):
                expected_total = planned_tests + unscheduled_tests
                if abs(total_tests - expected_total) > 1:  # Allow for rounding
                    warnings.append(f"Total tests doesn't match sum of planned and unscheduled for {test_type}")

        return warnings


def main():
    """Example usage of Diagnostics Processor"""
    processor = DiagnosticsProcessor()

    # Example processing (would need actual file)
    # results = processor.process_diagnostics_file(Path("diagnostics_data.xlsx"), "2024-01")

    print("Diagnostics Processor initialized successfully")
    print(f"Configured for {len(processor.diagnostic_mappings)} diagnostic test types")
    print(f"Configured for {len(processor.column_mappings)} metric types")


if __name__ == "__main__":
    main()
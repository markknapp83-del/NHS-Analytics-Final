#!/usr/bin/env python3
"""
A&E (Accident & Emergency) Data Processor
Specialized processor for NHS A&E waiting times and activity Excel files
"""

import pandas as pd
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
import numpy as np
from dataclasses import dataclass


@dataclass
class AEMetrics:
    """Container for processed A&E metrics"""
    trust_code: str
    period: str
    ae_data: Dict[str, Any]
    raw_data: pd.DataFrame


class AEProcessor:
    """
    Processor for NHS A&E waiting times and activity data
    Handles various Excel file formats and extracts trust-level A&E metrics
    """

    def __init__(self):
        """Initialize A&E processor"""
        self.logger = self._setup_logging()

        # Standard A&E column mappings
        self.column_mappings = {
            # Performance metrics
            'four_hour_performance_pct': [
                'Percentage in 4 hours',
                '4 hour performance',
                '% in 4 hours',
                'Percentage within 4 hours',
                'Four hour performance %',
                'Total % in 4 hours'
            ],
            # Activity metrics
            'total_attendances': [
                'Total Attendances',
                'Attendances',
                'Total A&E attendances',
                'Number of attendances',
                'Accident and Emergency attendances'
            ],
            'over_four_hours_total': [
                'Total over 4 hours',
                'Over 4 hours',
                'Number over 4 hours',
                'Attendances over 4 hours',
                'Total spending >4 hours'
            ],
            'emergency_admissions_total': [
                'Emergency Admissions',
                'Admissions',
                'Total emergency admissions',
                'Number of emergency admissions',
                'Emergency admissions from A&E'
            ],
            'twelve_hour_wait_admissions': [
                '12 hour wait admissions',
                'Twelve hour waits',
                '12+ hour admissions',
                'Number waiting 12+ hours for admission',
                'Trolley waits 12+ hours'
            ],
            # Wait time distributions
            'zero_to_one_hour': [
                '0 to <1 hours',
                '0-1 hours',
                'Under 1 hour'
            ],
            'one_to_two_hours': [
                '1 to <2 hours',
                '1-2 hours'
            ],
            'two_to_four_hours': [
                '2 to <4 hours',
                '2-4 hours'
            ],
            'four_to_eight_hours': [
                '4 to <8 hours',
                '4-8 hours'
            ],
            'eight_to_twelve_hours': [
                '8 to <12 hours',
                '8-12 hours'
            ],
            'over_twelve_hours': [
                '12+ hours',
                '12 hours and over',
                'Over 12 hours'
            ]
        }

        # A&E department types
        self.department_types = {
            'Type 1': 'major_ae',  # Major A&E (24/7, consultant-led)
            'Type 2': 'single_specialty_ae',  # Single specialty
            'Type 3': 'other_ae',  # Other A&E/minor injury units
            'Total': 'total'
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('ae_processor')
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

    def _clean_numeric_value(self, value: Any, is_percentage_field: bool = False) -> Optional[float]:
        """
        Clean and convert a value to numeric with proper percentage handling

        Args:
            value: The value to clean
            is_percentage_field: If True, handle percentage conversion properly
        """
        if pd.isna(value):
            return None

        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, str):
            # Handle suppressed data markers first
            if value.strip().lower() in ['*', '-', 'n/a', 'na', 'suppressed', '']:
                return None

            # Check if value has percentage symbol
            has_percent_symbol = '%' in value

            # Remove common non-numeric characters
            cleaned = value.replace(',', '').replace('%', '').replace('*', '').strip()

            try:
                numeric_value = float(cleaned)

                # Apply percentage conversion logic based on context
                if is_percentage_field and has_percent_symbol:
                    # Value like "85.2%" -> should be stored as decimal format for consistency
                    return numeric_value / 100.0  # Convert to decimal format
                elif is_percentage_field and not has_percent_symbol and numeric_value <= 1.0:
                    # Value like "0.852" -> already in decimal format
                    return numeric_value
                elif is_percentage_field and not has_percent_symbol and numeric_value > 1.0:
                    # Value like "85.2" -> assume it's percentage, convert to decimal
                    return numeric_value / 100.0
                else:
                    # Non-percentage field or unclear format, return as-is
                    return numeric_value

            except ValueError:
                return None

        return None

    def _process_ae_row(self, row: pd.Series) -> Dict[str, Any]:
        """Process a single row of A&E data"""
        metrics = {}

        # Extract each metric
        for metric_key in self.column_mappings.keys():
            col_name = self._find_column_name(pd.DataFrame([row]), metric_key)
            if col_name and col_name in row.index:
                # Identify if this is a percentage field
                is_percentage = metric_key == 'four_hour_performance_pct' or 'performance_pct' in metric_key
                value = self._clean_numeric_value(row[col_name], is_percentage_field=is_percentage)
                metrics[metric_key] = value

        return metrics

    def _identify_data_structure(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Identify the structure of the A&E data file"""
        structure = {
            'has_trust_column': False,
            'has_department_type_column': False,
            'trust_column': None,
            'department_type_column': None,
            'data_layout': 'unknown'  # 'trust_per_row', 'department_per_row', 'matrix'
        }

        # Look for trust identifier columns
        trust_columns = ['Trust Code', 'Provider Code', 'Org Code', 'Trust Name', 'Provider Name', 'Organisation Code']
        for col in trust_columns:
            if col in df.columns:
                structure['has_trust_column'] = True
                structure['trust_column'] = col
                break

        # Look for department type columns
        dept_columns = ['Type', 'Department Type', 'A&E Type', 'AE Type']
        for col in dept_columns:
            if col in df.columns:
                structure['has_department_type_column'] = True
                structure['department_type_column'] = col
                break

        # Determine layout
        if structure['has_trust_column'] and structure['has_department_type_column']:
            structure['data_layout'] = 'matrix'
        elif structure['has_trust_column']:
            structure['data_layout'] = 'trust_per_row'
        elif structure['has_department_type_column']:
            structure['data_layout'] = 'department_per_row'

        return structure

    def process_ae_file(self, file_path: Path, period: str) -> List[AEMetrics]:
        """Process an A&E Excel file and extract metrics for all trusts"""
        self.logger.info(f"Processing A&E file: {file_path.name}")

        results = []

        try:
            # Try to read different sheets
            excel_file = pd.ExcelFile(file_path)

            # Look for the main data sheet
            data_sheet = None
            for sheet_name in excel_file.sheet_names:
                if any(keyword in sheet_name.lower() for keyword in ['provider', 'trust', 'ae', 'emergency', 'data']):
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
                if any(col_name in str(row.values).lower() for col_name in ['trust', 'provider', 'attendances', 'emergency']):
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
            elif structure['data_layout'] == 'department_per_row':
                results = self._process_department_per_row_layout(df, structure, period)
            else:
                self.logger.warning(f"Unknown data layout, attempting generic processing")
                results = self._process_generic_layout(df, period)

            self.logger.info(f"Processed {len(results)} trust records from A&E file")

        except Exception as e:
            self.logger.error(f"Error processing A&E file {file_path.name}: {str(e)}")
            raise

        return results

    def _process_matrix_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[AEMetrics]:
        """Process A&E data in matrix layout (trusts and department types in same table)"""
        results = []

        trust_col = structure['trust_column']
        dept_col = structure['department_type_column']

        # Group by trust
        for trust_code, trust_group in df.groupby(trust_col):
            if pd.isna(trust_code):
                continue

            trust_code = str(trust_code).strip()

            # Aggregate metrics across all department types for this trust
            ae_data = self._aggregate_department_metrics(trust_group, dept_col)

            # Create A&E metrics object
            ae_metrics = AEMetrics(
                trust_code=trust_code,
                period=period,
                ae_data=ae_data,
                raw_data=trust_group
            )

            results.append(ae_metrics)

        return results

    def _process_trust_per_row_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[AEMetrics]:
        """Process A&E data with one trust per row"""
        results = []

        trust_col = structure['trust_column']

        for _, row in df.iterrows():
            trust_code = str(row[trust_col]) if not pd.isna(row[trust_col]) else None

            if not trust_code:
                continue

            trust_code = trust_code.strip()

            # Extract trust-level metrics
            ae_data = self._process_ae_row(row)

            # Create A&E metrics object
            ae_metrics = AEMetrics(
                trust_code=trust_code,
                period=period,
                ae_data=ae_data,
                raw_data=pd.DataFrame([row])
            )

            results.append(ae_metrics)

        return results

    def _process_department_per_row_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[AEMetrics]:
        """Process A&E data with one department type per row (single trust file)"""
        results = []

        dept_col = structure['department_type_column']

        # Extract trust code (should be consistent across all rows)
        trust_code = self._extract_trust_code(df)

        if not trust_code:
            self.logger.error("Could not extract trust code from department-per-row layout")
            return results

        # Aggregate metrics across department types
        ae_data = self._aggregate_department_metrics(df, dept_col)

        # Create single A&E metrics object for the trust
        ae_metrics = AEMetrics(
            trust_code=trust_code,
            period=period,
            ae_data=ae_data,
            raw_data=df
        )

        results.append(ae_metrics)

        return results

    def _process_generic_layout(self, df: pd.DataFrame, period: str) -> List[AEMetrics]:
        """Generic processing for unknown layouts"""
        results = []

        # Try to extract any trust codes we can find
        trust_code = self._extract_trust_code(df)

        if trust_code:
            # Process as single trust with aggregate metrics
            ae_data = {}

            # Try to extract any metrics from the first row
            if not df.empty:
                ae_data = self._process_ae_row(df.iloc[0])

            ae_metrics = AEMetrics(
                trust_code=trust_code,
                period=period,
                ae_data=ae_data,
                raw_data=df
            )

            results.append(ae_metrics)

        return results

    def _aggregate_department_metrics(self, df: pd.DataFrame, dept_col: str) -> Dict[str, Any]:
        """Aggregate A&E metrics across department types"""
        aggregated = {}

        # Initialize aggregated metrics
        for metric_key in self.column_mappings.keys():
            aggregated[metric_key] = None

        # Look for total row first
        total_row = None
        for _, row in df.iterrows():
            dept_type = str(row[dept_col]) if not pd.isna(row[dept_col]) else ''
            if dept_type.lower() in ['total', 'all']:
                total_row = row
                break

        if total_row is not None:
            # Use total row if available
            aggregated = self._process_ae_row(total_row)
        else:
            # Sum across department types
            for metric_key in self.column_mappings.keys():
                values = []
                for _, row in df.iterrows():
                    metrics = self._process_ae_row(row)
                    if metric_key in metrics and metrics[metric_key] is not None:
                        values.append(metrics[metric_key])

                if values:
                    if metric_key.endswith('_pct') or 'performance' in metric_key:
                        # For percentages, we need to calculate weighted average
                        # This is complex without knowing the weights, so we'll take the mean
                        aggregated[metric_key] = sum(values) / len(values)
                    else:
                        # For counts, sum them up
                        aggregated[metric_key] = sum(values)

        # Calculate derived metrics
        self._calculate_derived_metrics(aggregated)

        return aggregated

    def _calculate_derived_metrics(self, ae_data: Dict[str, Any]) -> None:
        """Calculate derived A&E metrics"""
        # Calculate 4-hour performance if we have the components
        total_attendances = ae_data.get('total_attendances')
        over_four_hours = ae_data.get('over_four_hours_total')

        if total_attendances and over_four_hours and total_attendances > 0:
            within_four_hours = total_attendances - over_four_hours
            performance_pct = (within_four_hours / total_attendances) * 100
            ae_data['four_hour_performance_pct'] = performance_pct

        # Calculate over 4 hours if we have performance percentage and total
        elif total_attendances and ae_data.get('four_hour_performance_pct') and total_attendances > 0:
            performance_pct = ae_data['four_hour_performance_pct']
            within_four_hours = (performance_pct / 100) * total_attendances
            over_four_hours = total_attendances - within_four_hours
            ae_data['over_four_hours_total'] = over_four_hours

    def validate_ae_metrics(self, metrics: AEMetrics) -> List[str]:
        """Validate A&E metrics for data quality"""
        warnings = []

        ae_data = metrics.ae_data

        # Check if we have basic A&E data
        if not ae_data:
            warnings.append("No A&E metrics found")
            return warnings

        # Validate 4-hour performance percentage
        performance_pct = ae_data.get('four_hour_performance_pct')
        if performance_pct is not None:
            if performance_pct < 0 or performance_pct > 100:
                warnings.append(f"Invalid 4-hour performance percentage: {performance_pct}")

        # Validate that over 4 hours doesn't exceed total attendances
        total_attendances = ae_data.get('total_attendances')
        over_four_hours = ae_data.get('over_four_hours_total')

        if total_attendances is not None and over_four_hours is not None:
            if over_four_hours > total_attendances:
                warnings.append("Over 4 hours exceeds total attendances")

        # Validate that emergency admissions don't exceed total attendances
        emergency_admissions = ae_data.get('emergency_admissions_total')
        if total_attendances is not None and emergency_admissions is not None:
            if emergency_admissions > total_attendances:
                warnings.append("Emergency admissions exceed total attendances")

        # Validate 12-hour waits don't exceed over 4 hours
        twelve_hour_waits = ae_data.get('twelve_hour_wait_admissions')
        if over_four_hours is not None and twelve_hour_waits is not None:
            if twelve_hour_waits > over_four_hours:
                warnings.append("12-hour waits exceed over 4 hours total")

        # Check consistency between wait time distributions and totals
        wait_time_categories = [
            'zero_to_one_hour', 'one_to_two_hours', 'two_to_four_hours',
            'four_to_eight_hours', 'eight_to_twelve_hours', 'over_twelve_hours'
        ]

        wait_time_total = sum(
            ae_data.get(category, 0) or 0
            for category in wait_time_categories
        )

        if wait_time_total > 0 and total_attendances is not None:
            # Allow some variance for rounding or missing categories
            if abs(wait_time_total - total_attendances) > (total_attendances * 0.1):
                warnings.append(f"Wait time distribution total ({wait_time_total}) doesn't match total attendances ({total_attendances})")

        return warnings


def main():
    """Example usage of A&E Processor"""
    processor = AEProcessor()

    # Example processing (would need actual file)
    # results = processor.process_ae_file(Path("ae_data.xlsx"), "2024-01")

    print("A&E Processor initialized successfully")
    print(f"Configured for {len(processor.column_mappings)} metric types")
    print(f"Configured for {len(processor.department_types)} department types")


if __name__ == "__main__":
    main()
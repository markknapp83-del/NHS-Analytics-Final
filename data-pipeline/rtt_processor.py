#!/usr/bin/env python3
"""
RTT (Referral to Treatment) Data Processor
Specialized processor for NHS RTT waiting times Excel files
"""

import pandas as pd
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
import numpy as np
from dataclasses import dataclass


@dataclass
class RTTMetrics:
    """Container for processed RTT metrics"""
    trust_code: str
    period: str
    trust_total: Dict[str, Any]
    specialties: Dict[str, Dict[str, Any]]
    raw_data: pd.DataFrame


class RTTProcessor:
    """
    Processor for NHS RTT waiting times data
    Handles various Excel file formats and extracts trust-level and specialty-level metrics
    """

    def __init__(self):
        """Initialize RTT processor"""
        self.logger = self._setup_logging()

        # Standard RTT specialty mappings
        self.specialty_mappings = {
            'Total': 'trust_total',
            'General Surgery': 'general_surgery',
            'Urology': 'urology',
            'Trauma & Orthopaedics': 'trauma_orthopaedics',
            'ENT': 'ent',
            'Ophthalmology': 'ophthalmology',
            'Oral Surgery': 'oral_surgery',
            'Plastic Surgery': 'plastic_surgery',
            'Cardiothoracic Surgery': 'cardiothoracic_surgery',
            'Neurosurgery': 'neurosurgery',
            'Paediatric Surgery': 'paediatric_surgery',
            'General Medicine': 'general_medicine',
            'Gastroenterology': 'gastroenterology',
            'Cardiology': 'cardiology',
            'Dermatology': 'dermatology',
            'Thoracic Medicine': 'thoracic_medicine',
            'Neurology': 'neurology',
            'Rheumatology': 'rheumatology',
            'Paediatrics': 'paediatrics',
            'Geriatric Medicine': 'geriatric_medicine',
            'Gynaecology': 'gynaecology',
            'Obstetrics': 'obstetrics',
            'Other': 'other'
        }

        # Standard column mappings for RTT data
        self.column_mappings = {
            # Percentage metrics
            'percent_within_18_weeks': [
                'Percentage within 18 weeks',
                '% within 18 weeks',
                'Percentage achieving 18 weeks',
                'Achievement %'
            ],
            # Volume metrics
            'total_incomplete_pathways': [
                'Total Incomplete Pathways',
                'Incomplete Pathways',
                'Total Waiting',
                'Number Waiting'
            ],
            'total_52_plus_weeks': [
                'Total 52+ weeks',
                '52+ weeks',
                'Over 52 weeks',
                'Number waiting 52+ weeks'
            ],
            'total_65_plus_weeks': [
                'Total 65+ weeks',
                '65+ weeks',
                'Over 65 weeks',
                'Number waiting 65+ weeks'
            ],
            'total_78_plus_weeks': [
                'Total 78+ weeks',
                '78+ weeks',
                'Over 78 weeks',
                'Number waiting 78+ weeks'
            ],
            'total_104_plus_weeks': [
                'Total 104+ weeks',
                '104+ weeks',
                'Over 104 weeks',
                'Number waiting 104+ weeks'
            ],
            # Median wait time
            'median_wait_weeks': [
                'Median weeks',
                'Median wait',
                'Median waiting time',
                'Mean weeks'
            ]
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('rtt_processor')
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
        trust_code_columns = ['Trust Code', 'Provider Code', 'Org Code', 'Code']

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
                    # Value like "85.2%" -> should be stored as 0.852 (decimal format)
                    # for specialty data but 85.2 for trust totals
                    # Based on CLAUDE.md: specialty data stored as decimals, trust totals as percentages
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

    def _process_trust_row(self, row: pd.Series, specialty_name: str) -> Dict[str, Any]:
        """Process a single row of RTT data for a trust/specialty"""
        metrics = {}

        # Extract each metric
        for metric_key in self.column_mappings.keys():
            col_name = self._find_column_name(pd.DataFrame([row]), metric_key)
            if col_name and col_name in row.index:
                # Identify if this is a percentage field
                is_percentage = metric_key == 'percent_within_18_weeks' or 'percent' in metric_key.lower()
                value = self._clean_numeric_value(row[col_name], is_percentage_field=is_percentage)
                metrics[metric_key] = value

        return metrics

    def _identify_data_structure(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Identify the structure of the RTT data file"""
        structure = {
            'has_trust_column': False,
            'has_specialty_column': False,
            'trust_column': None,
            'specialty_column': None,
            'data_layout': 'unknown'  # 'trust_per_row', 'specialty_per_row', 'matrix'
        }

        # Look for trust identifier columns
        trust_columns = ['Trust Code', 'Provider Code', 'Org Code', 'Trust Name', 'Provider Name']
        for col in trust_columns:
            if col in df.columns:
                structure['has_trust_column'] = True
                structure['trust_column'] = col
                break

        # Look for specialty columns
        specialty_columns = ['Treatment Function', 'Specialty', 'Service', 'Treatment Function Code']
        for col in specialty_columns:
            if col in df.columns:
                structure['has_specialty_column'] = True
                structure['specialty_column'] = col
                break

        # Determine layout
        if structure['has_trust_column'] and structure['has_specialty_column']:
            structure['data_layout'] = 'matrix'
        elif structure['has_trust_column']:
            structure['data_layout'] = 'trust_per_row'
        elif structure['has_specialty_column']:
            structure['data_layout'] = 'specialty_per_row'

        return structure

    def process_rtt_file(self, file_path: Path, period: str) -> List[RTTMetrics]:
        """Process an RTT Excel file and extract metrics for all trusts"""
        self.logger.info(f"Processing RTT file: {file_path.name}")

        results = []

        try:
            # Try to read different sheets
            excel_file = pd.ExcelFile(file_path)

            # Look for the main data sheet
            data_sheet = None
            for sheet_name in excel_file.sheet_names:
                if any(keyword in sheet_name.lower() for keyword in ['provider', 'trust', 'incomplete', 'data']):
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
                if any(col_name in str(row.values).lower() for col_name in ['trust', 'provider', 'percentage', 'incomplete']):
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
            elif structure['data_layout'] == 'specialty_per_row':
                results = self._process_specialty_per_row_layout(df, structure, period)
            else:
                self.logger.warning(f"Unknown data layout, attempting generic processing")
                results = self._process_generic_layout(df, period)

            self.logger.info(f"Processed {len(results)} trust records from RTT file")

        except Exception as e:
            self.logger.error(f"Error processing RTT file {file_path.name}: {str(e)}")
            raise

        return results

    def _process_matrix_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[RTTMetrics]:
        """Process RTT data in matrix layout (trusts and specialties in same table)"""
        results = []

        trust_col = structure['trust_column']
        specialty_col = structure['specialty_column']

        # Group by trust
        for trust_code, trust_group in df.groupby(trust_col):
            if pd.isna(trust_code):
                continue

            trust_code = str(trust_code).strip()

            # Initialize trust metrics
            trust_total = {}
            specialties = {}

            # Process each specialty for this trust
            for _, row in trust_group.iterrows():
                specialty_raw = str(row[specialty_col]) if not pd.isna(row[specialty_col]) else 'Other'
                specialty_name = self._map_specialty_name(specialty_raw)

                metrics = self._process_trust_row(row, specialty_name)

                if specialty_name == 'trust_total' or specialty_raw.lower() == 'total':
                    trust_total = metrics
                else:
                    specialties[specialty_name] = metrics

            # Create RTT metrics object
            rtt_metrics = RTTMetrics(
                trust_code=trust_code,
                period=period,
                trust_total=trust_total,
                specialties=specialties,
                raw_data=trust_group
            )

            results.append(rtt_metrics)

        return results

    def _process_trust_per_row_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[RTTMetrics]:
        """Process RTT data with one trust per row"""
        results = []

        trust_col = structure['trust_column']

        for _, row in df.iterrows():
            trust_code = str(row[trust_col]) if not pd.isna(row[trust_col]) else None

            if not trust_code:
                continue

            trust_code = trust_code.strip()

            # Extract trust-level metrics
            trust_total = self._process_trust_row(row, 'trust_total')

            # For this layout, we typically only have trust totals
            rtt_metrics = RTTMetrics(
                trust_code=trust_code,
                period=period,
                trust_total=trust_total,
                specialties={},
                raw_data=pd.DataFrame([row])
            )

            results.append(rtt_metrics)

        return results

    def _process_specialty_per_row_layout(self, df: pd.DataFrame, structure: Dict, period: str) -> List[RTTMetrics]:
        """Process RTT data with one specialty per row (single trust file)"""
        results = []

        specialty_col = structure['specialty_column']

        # Extract trust code (should be consistent across all rows)
        trust_code = self._extract_trust_code(df)

        if not trust_code:
            self.logger.error("Could not extract trust code from specialty-per-row layout")
            return results

        # Initialize metrics
        trust_total = {}
        specialties = {}

        # Process each specialty
        for _, row in df.iterrows():
            specialty_raw = str(row[specialty_col]) if not pd.isna(row[specialty_col]) else 'Other'
            specialty_name = self._map_specialty_name(specialty_raw)

            metrics = self._process_trust_row(row, specialty_name)

            if specialty_name == 'trust_total' or specialty_raw.lower() == 'total':
                trust_total = metrics
            else:
                specialties[specialty_name] = metrics

        # Create single RTT metrics object for the trust
        rtt_metrics = RTTMetrics(
            trust_code=trust_code,
            period=period,
            trust_total=trust_total,
            specialties=specialties,
            raw_data=df
        )

        results.append(rtt_metrics)

        return results

    def _process_generic_layout(self, df: pd.DataFrame, period: str) -> List[RTTMetrics]:
        """Generic processing for unknown layouts"""
        results = []

        # Try to extract any trust codes we can find
        trust_code = self._extract_trust_code(df)

        if trust_code:
            # Process as single trust with aggregate metrics
            trust_total = {}

            # Try to extract any metrics from the first row
            if not df.empty:
                trust_total = self._process_trust_row(df.iloc[0], 'trust_total')

            rtt_metrics = RTTMetrics(
                trust_code=trust_code,
                period=period,
                trust_total=trust_total,
                specialties={},
                raw_data=df
            )

            results.append(rtt_metrics)

        return results

    def _map_specialty_name(self, specialty_raw: str) -> str:
        """Map raw specialty name to standardized key"""
        if not specialty_raw or pd.isna(specialty_raw):
            return 'other'

        specialty_clean = str(specialty_raw).strip()

        # Direct mapping
        if specialty_clean in self.specialty_mappings:
            return self.specialty_mappings[specialty_clean]

        # Case-insensitive mapping
        for key, value in self.specialty_mappings.items():
            if key.lower() == specialty_clean.lower():
                return value

        # Partial matching for common variations
        specialty_lower = specialty_clean.lower()

        if 'surgery' in specialty_lower:
            if 'general' in specialty_lower:
                return 'general_surgery'
            elif 'plastic' in specialty_lower:
                return 'plastic_surgery'
            elif 'oral' in specialty_lower:
                return 'oral_surgery'
            elif 'trauma' in specialty_lower or 'ortho' in specialty_lower:
                return 'trauma_orthopaedics'
            elif 'cardio' in specialty_lower:
                return 'cardiothoracic_surgery'
            elif 'neuro' in specialty_lower:
                return 'neurosurgery'
            elif 'paed' in specialty_lower:
                return 'paediatric_surgery'

        elif 'medicine' in specialty_lower:
            if 'general' in specialty_lower:
                return 'general_medicine'
            elif 'thoracic' in specialty_lower:
                return 'thoracic_medicine'
            elif 'geriatric' in specialty_lower:
                return 'geriatric_medicine'

        # Default to 'other' for unrecognized specialties
        return 'other'

    def validate_rtt_metrics(self, metrics: RTTMetrics) -> List[str]:
        """Validate RTT metrics for data quality"""
        warnings = []

        # Check if trust_total has data
        if not metrics.trust_total:
            warnings.append("No trust total metrics found")
        else:
            # Validate percentage metrics are within reasonable range
            percent_within_18_weeks = metrics.trust_total.get('percent_within_18_weeks')
            if percent_within_18_weeks is not None:
                if percent_within_18_weeks < 0 or percent_within_18_weeks > 100:
                    warnings.append(f"Invalid percentage within 18 weeks: {percent_within_18_weeks}")

            # Validate that 52+ weeks is less than total pathways
            total_pathways = metrics.trust_total.get('total_incomplete_pathways')
            total_52_plus = metrics.trust_total.get('total_52_plus_weeks')

            if total_pathways is not None and total_52_plus is not None:
                if total_52_plus > total_pathways:
                    warnings.append("52+ week waits exceed total incomplete pathways")

        # Check specialty data consistency
        if metrics.specialties:
            specialty_total = sum(
                spec_data.get('total_incomplete_pathways', 0) or 0
                for spec_data in metrics.specialties.values()
            )

            trust_total_pathways = metrics.trust_total.get('total_incomplete_pathways', 0) or 0

            # Allow some variance due to rounding or categorization differences
            if abs(specialty_total - trust_total_pathways) > (trust_total_pathways * 0.1):
                warnings.append(f"Specialty totals ({specialty_total}) don't match trust total ({trust_total_pathways})")

        return warnings


def main():
    """Example usage of RTT Processor"""
    processor = RTTProcessor()

    # Example processing (would need actual file)
    # results = processor.process_rtt_file(Path("rtt_data.xlsx"), "2024-01")

    print("RTT Processor initialized successfully")
    print(f"Configured for {len(processor.specialty_mappings)} specialties")
    print(f"Configured for {len(processor.column_mappings)} metric types")


if __name__ == "__main__":
    main()
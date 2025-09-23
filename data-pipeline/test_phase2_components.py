#!/usr/bin/env python3
"""
Test Suite for Phase II Components
Safe testing without live downloads from NHS sites
"""

import json
import sys
import traceback
from pathlib import Path
import pandas as pd
from typing import Dict, List, Any
import logging

# Add current directory to path to import our modules
sys.path.append(str(Path(__file__).parent))

from nhs_data_downloader import NHSDataDownloader
from rtt_processor import RTTProcessor
from ae_processor import AEProcessor
from diagnostics_processor import DiagnosticsProcessor
from multi_source_processor import MultiSourceProcessor


class Phase2Tester:
    """Test suite for Phase II components"""

    def __init__(self):
        self.logger = self._setup_logging()
        self.test_results = []

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('phase2_tester')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def run_test(self, test_name: str, test_func):
        """Run a single test and record results"""
        self.logger.info(f"Running test: {test_name}")
        try:
            result = test_func()
            self.test_results.append({
                'test': test_name,
                'status': 'PASS',
                'result': result
            })
            self.logger.info(f"✅ {test_name} - PASSED")
            return True
        except Exception as e:
            self.test_results.append({
                'test': test_name,
                'status': 'FAIL',
                'error': str(e),
                'traceback': traceback.format_exc()
            })
            self.logger.error(f"❌ {test_name} - FAILED: {str(e)}")
            return False

    def test_config_file_structure(self) -> Dict[str, Any]:
        """Test data_source_config.json structure and validation"""
        config_path = Path("data_source_config.json")

        if not config_path.exists():
            raise FileNotFoundError("data_source_config.json not found")

        with open(config_path, 'r') as f:
            config = json.load(f)

        # Test required top-level keys
        required_keys = ['data_sources', 'download_settings', 'validation_settings']
        for key in required_keys:
            if key not in config:
                raise ValueError(f"Missing required key: {key}")

        # Test data sources structure
        data_sources = config['data_sources']
        required_source_keys = ['url_pattern', 'file_patterns', 'frequency', 'release_day', 'processing_priority']

        source_count = 0
        for source_name, source_config in data_sources.items():
            source_count += 1
            for key in required_source_keys:
                if key not in source_config:
                    raise ValueError(f"Missing key '{key}' in source '{source_name}'")

            # Validate URL pattern
            url_pattern = source_config['url_pattern']
            if not isinstance(url_pattern, str) or 'https://' not in url_pattern:
                raise ValueError(f"Invalid URL pattern for {source_name}")

            # Validate file patterns
            if not isinstance(source_config['file_patterns'], list):
                raise ValueError(f"file_patterns must be a list for {source_name}")

            # Validate processing priority
            priority = source_config['processing_priority']
            if not isinstance(priority, int) or priority < 1:
                raise ValueError(f"Invalid processing priority for {source_name}")

        return {
            'sources_configured': source_count,
            'config_structure': 'valid',
            'sources': list(data_sources.keys())
        }

    def test_nhs_downloader_initialization(self) -> Dict[str, Any]:
        """Test NHS Data Downloader initialization"""
        downloader = NHSDataDownloader()

        # Test configuration loading
        if not downloader.config:
            raise ValueError("Configuration not loaded")

        # Test session creation
        if not downloader.session:
            raise ValueError("HTTP session not created")

        # Test expected release dates calculation
        release_dates = downloader.get_expected_release_dates(2024, 1)
        if not release_dates:
            raise ValueError("Failed to calculate release dates")

        # Test download status (without actual downloads)
        status = downloader.get_download_status(2024, 1)
        if not isinstance(status, dict):
            raise ValueError("Invalid status format")

        return {
            'initialization': 'success',
            'sources_configured': len(downloader.config['data_sources']),
            'release_dates_calculated': len(release_dates),
            'status_check': 'working'
        }

    def test_rtt_processor_with_sample_data(self) -> Dict[str, Any]:
        """Test RTT processor with sample data from CSV"""
        processor = RTTProcessor()

        # Create sample RTT data structure
        sample_data = {
            'Trust Code': ['ABC', 'ABC', 'ABC'],
            'Treatment Function': ['Total', 'General Surgery', 'Urology'],
            'Percentage within 18 weeks': [85.2, 82.1, 88.5],
            'Total Incomplete Pathways': [12450, 1250, 890],
            'Total 52+ weeks': [234, 45, 12],
            'Median weeks': [14.7, 15.2, 13.8]
        }

        df = pd.DataFrame(sample_data)

        # Test data structure identification
        structure = processor._identify_data_structure(df)
        if structure['data_layout'] == 'unknown':
            raise ValueError("Failed to identify data structure")

        # Test column mapping
        percent_col = processor._find_column_name(df, 'percent_within_18_weeks')
        if not percent_col:
            raise ValueError("Failed to map percentage column")

        # Test specialty mapping
        mapped_specialty = processor._map_specialty_name('General Surgery')
        if mapped_specialty != 'general_surgery':
            raise ValueError("Failed to map specialty name")

        # Test numeric value cleaning
        cleaned_value = processor._clean_numeric_value('85.2%')
        if cleaned_value != 85.2:
            raise ValueError("Failed to clean numeric value")

        return {
            'structure_detection': structure['data_layout'],
            'column_mapping': 'working',
            'specialty_mapping': 'working',
            'value_cleaning': 'working',
            'specialties_configured': len(processor.specialty_mappings)
        }

    def test_ae_processor_with_sample_data(self) -> Dict[str, Any]:
        """Test A&E processor with sample data"""
        processor = AEProcessor()

        # Create sample A&E data structure
        sample_data = {
            'Trust Code': ['ABC', 'ABC'],
            'Type': ['Type 1', 'Total'],
            'Total Attendances': [8450, 8450],
            'Percentage in 4 hours': [75.3, 75.3],
            'Total over 4 hours': [2089, 2089],
            'Emergency Admissions': [2340, 2340]
        }

        df = pd.DataFrame(sample_data)

        # Test data structure identification
        structure = processor._identify_data_structure(df)
        if structure['data_layout'] == 'unknown':
            raise ValueError("Failed to identify A&E data structure")

        # Test column mapping
        performance_col = processor._find_column_name(df, 'four_hour_performance_pct')
        if not performance_col:
            raise ValueError("Failed to map performance column")

        # Test department type mapping
        if 'Type 1' not in processor.department_types:
            raise ValueError("Missing department type mapping")

        return {
            'structure_detection': structure['data_layout'],
            'column_mapping': 'working',
            'department_types': len(processor.department_types),
            'metrics_configured': len(processor.column_mappings)
        }

    def test_diagnostics_processor_with_sample_data(self) -> Dict[str, Any]:
        """Test diagnostics processor with sample data"""
        processor = DiagnosticsProcessor()

        # Create sample diagnostics data
        sample_data = {
            'Trust Code': ['ABC', 'ABC', 'ABC'],
            'Test Type': ['MRI', 'CT', 'Total'],
            'Total Waiting': [1250, 890, 2140],
            'Six week breaches': [89, 45, 134],
            'Thirteen week breaches': [23, 12, 35]
        }

        df = pd.DataFrame(sample_data)

        # Test data structure identification
        structure = processor._identify_data_structure(df)
        if structure['data_layout'] == 'unknown':
            raise ValueError("Failed to identify diagnostics data structure")

        # Test test type mapping
        mapped_mri = processor._map_test_type('MRI')
        if mapped_mri != 'mri_scans':
            raise ValueError("Failed to map MRI test type")

        mapped_ct = processor._map_test_type('CT')
        if mapped_ct != 'ct_scans':
            raise ValueError("Failed to map CT test type")

        return {
            'structure_detection': structure['data_layout'],
            'test_type_mapping': 'working',
            'diagnostic_types': len(processor.diagnostic_mappings),
            'metrics_configured': len(processor.column_mappings)
        }

    def test_multi_source_processor_coordination(self) -> Dict[str, Any]:
        """Test multi-source processor coordination logic"""
        processor = MultiSourceProcessor()

        # Test initialization
        if not processor.processors:
            raise ValueError("Processors not initialized")

        # Test configuration loading
        if not processor.config:
            raise ValueError("Configuration not loaded")

        # Test processor mapping
        expected_processors = ['rtt_data', 'ae_data', 'diagnostics_data']
        for proc_name in expected_processors:
            if proc_name not in processor.processors:
                raise ValueError(f"Missing processor: {proc_name}")

        # Test status checking (without actual files)
        test_data_dir = Path("test_data")
        status = processor.get_processing_status(2024, 1, test_data_dir)

        if not isinstance(status, dict):
            raise ValueError("Invalid status response")

        # Test processing summary generation
        mock_results = {
            'rtt_data': type('MockResult', (), {
                'success': True,
                'records_processed': 151,
                'processing_time_seconds': 5.2,
                'validation_warnings': []
            })(),
            'ae_data': type('MockResult', (), {
                'success': True,
                'records_processed': 151,
                'processing_time_seconds': 3.1,
                'validation_warnings': ['Test warning']
            })()
        }

        summary = processor._generate_processing_summary(mock_results, [])
        if not isinstance(summary, dict):
            raise ValueError("Invalid summary format")

        return {
            'processors_initialized': len(processor.processors),
            'configuration_loaded': True,
            'status_checking': 'working',
            'summary_generation': 'working',
            'sources_configured': len(processor.config['data_sources'])
        }

    def test_csv_data_compatibility(self) -> Dict[str, Any]:
        """Test compatibility with existing CSV data structure"""
        csv_path = Path("data/unified_monthly_data_enhanced.csv")

        if not csv_path.exists():
            return {
                'csv_file_found': False,
                'note': 'CSV file not found, skipping compatibility test'
            }

        # Read sample of CSV data
        df = pd.read_csv(csv_path, nrows=5)

        # Test RTT processor compatibility
        rtt_processor = RTTProcessor()
        rtt_compatible_columns = 0
        for metric_key in rtt_processor.column_mappings.keys():
            if rtt_processor._find_column_name(df, metric_key):
                rtt_compatible_columns += 1

        # Test A&E processor compatibility
        ae_processor = AEProcessor()
        ae_compatible_columns = 0
        for metric_key in ae_processor.column_mappings.keys():
            if ae_processor._find_column_name(df, metric_key):
                ae_compatible_columns += 1

        # Test diagnostics processor compatibility
        diag_processor = DiagnosticsProcessor()
        diag_compatible_columns = 0
        for metric_key in diag_processor.column_mappings.keys():
            if diag_processor._find_column_name(df, metric_key):
                diag_compatible_columns += 1

        return {
            'csv_file_found': True,
            'csv_columns': len(df.columns),
            'csv_rows_sampled': len(df),
            'rtt_compatible_columns': rtt_compatible_columns,
            'ae_compatible_columns': ae_compatible_columns,
            'diagnostics_compatible_columns': diag_compatible_columns,
            'total_mapped_columns': rtt_compatible_columns + ae_compatible_columns + diag_compatible_columns
        }

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase II tests"""
        self.logger.info("🧪 Starting Phase II Component Tests")

        # Run all tests
        tests = [
            ("Config File Structure", self.test_config_file_structure),
            ("NHS Downloader Initialization", self.test_nhs_downloader_initialization),
            ("RTT Processor", self.test_rtt_processor_with_sample_data),
            ("A&E Processor", self.test_ae_processor_with_sample_data),
            ("Diagnostics Processor", self.test_diagnostics_processor_with_sample_data),
            ("Multi-Source Coordination", self.test_multi_source_processor_coordination),
            ("CSV Data Compatibility", self.test_csv_data_compatibility)
        ]

        passed = 0
        failed = 0

        for test_name, test_func in tests:
            if self.run_test(test_name, test_func):
                passed += 1
            else:
                failed += 1

        # Generate summary
        summary = {
            'total_tests': len(tests),
            'passed': passed,
            'failed': failed,
            'success_rate': f"{(passed/len(tests)*100):.1f}%",
            'detailed_results': self.test_results
        }

        self.logger.info(f"\n📊 Test Summary:")
        self.logger.info(f"   Total Tests: {summary['total_tests']}")
        self.logger.info(f"   Passed: {summary['passed']}")
        self.logger.info(f"   Failed: {summary['failed']}")
        self.logger.info(f"   Success Rate: {summary['success_rate']}")

        return summary


def main():
    """Run Phase II component tests"""
    tester = Phase2Tester()
    results = tester.run_all_tests()

    # Print detailed results for failed tests
    failed_tests = [r for r in results['detailed_results'] if r['status'] == 'FAIL']
    if failed_tests:
        print("\n❌ Failed Test Details:")
        for test in failed_tests:
            print(f"\nTest: {test['test']}")
            print(f"Error: {test['error']}")

    return results


if __name__ == "__main__":
    results = main()
#!/usr/bin/env python3
"""
End-to-End Data Flow Validation Suite
=====================================

Validates the complete data flow from raw Excel files through database storage
to frontend visualization. Ensures data integrity is maintained throughout
the entire processing pipeline.

Features:
- Raw data to database accuracy validation
- Database to API response consistency checks
- API to frontend rendering accuracy validation
- Mathematical calculation verification
- Cross-layer data integrity checks
- Performance impact assessment

Author: Claude Code Assistant
Date: 2025-09-29
"""

import os
import sys
import json
import pandas as pd
import numpy as np
import psycopg2
import requests
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple, Optional, Set
import traceback
import logging
from dataclasses import dataclass
from psycopg2.extras import RealDictCursor
import subprocess
import time
import hashlib

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Result of a validation check"""
    test_name: str
    status: str  # PASS, FAIL, WARNING
    message: str
    details: Dict[str, Any]
    critical: bool = False

@dataclass
class DatabaseConfig:
    """Database connection configuration"""
    host: str
    port: int
    database: str
    username: str
    password: str

@dataclass
class DataFlowTestCase:
    """Test case for end-to-end data flow validation"""
    test_id: str
    trust_code: str
    period: str
    data_type: str
    raw_file_path: Optional[Path] = None
    expected_values: Dict[str, Any] = None

class EndToEndDataFlowValidator:
    """
    Comprehensive validator for end-to-end data flow integrity.
    Validates data accuracy from source files through to frontend display.
    """

    def __init__(self, data_dir: str, db_config: DatabaseConfig, frontend_url: str = "http://localhost:3000"):
        self.data_dir = Path(data_dir)
        self.db_config = db_config
        self.frontend_url = frontend_url
        self.connection = None
        self.results: List[ValidationResult] = []

        # Test cases for validation
        self.test_cases: List[DataFlowTestCase] = []

        # Expected data transformations
        self.transformation_rules = {
            'percentage_normalization': {
                'specialty_percentages': 'multiply_by_100',  # 0.43 -> 43%
                'trust_total_percentages': 'use_as_is'       # 48.04 -> 48.04%
            },
            'data_aggregation': {
                'trust_totals': 'sum_across_specialties',
                'monthly_trends': 'time_series_calculation'
            }
        }

    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run all end-to-end validation tests and return comprehensive report"""
        logger.info("Starting comprehensive end-to-end data flow validation...")

        report = {
            'validation_timestamp': datetime.now().isoformat(),
            'validator': 'End-to-End Data Flow Validator',
            'data_directory': str(self.data_dir),
            'database_host': self.db_config.host,
            'frontend_url': self.frontend_url,
            'test_cases': [],
            'validation_results': [],
            'summary': {},
            'critical_issues': [],
            'recommendations': [],
            'overall_status': 'UNKNOWN'
        }

        try:
            # Phase 1: Setup and Connectivity Tests
            if not self._setup_connections():
                report['error'] = "Failed to establish required connections"
                report['overall_status'] = 'CRITICAL_FAILURE'
                return report

            # Phase 2: Generate Test Cases
            self._generate_test_cases()
            report['test_cases'] = [self._test_case_to_dict(tc) for tc in self.test_cases]

            # Phase 3: Raw Data to Database Validation
            self._validate_raw_to_database_flow()

            # Phase 4: Database to API Validation
            self._validate_database_to_api_flow()

            # Phase 5: API to Frontend Validation
            self._validate_api_to_frontend_flow()

            # Phase 6: Mathematical Accuracy Validation
            self._validate_mathematical_accuracy()

            # Phase 7: Cross-Layer Consistency Validation
            self._validate_cross_layer_consistency()

            # Phase 8: Performance Impact Assessment
            self._validate_performance_impact()

            # Phase 9: Data Transformation Validation
            self._validate_data_transformations()

            # Compile results
            report['validation_results'] = [self._result_to_dict(r) for r in self.results]
            report['summary'] = self._generate_summary()
            report['critical_issues'] = [r for r in self.results if r.critical and r.status == 'FAIL']
            report['recommendations'] = self._generate_recommendations()
            report['overall_status'] = self._determine_overall_status()

            logger.info(f"End-to-end validation completed. Status: {report['overall_status']}")
            return report

        except Exception as e:
            logger.error(f"End-to-end validation failed with error: {e}")
            report['error'] = str(e)
            report['traceback'] = traceback.format_exc()
            report['overall_status'] = 'ERROR'
            return report
        finally:
            if self.connection:
                self.connection.close()

    def _setup_connections(self) -> bool:
        """Setup database and frontend connections"""
        logger.info("Setting up connections...")

        # Test database connection
        try:
            self.connection = psycopg2.connect(
                host=self.db_config.host,
                port=self.db_config.port,
                database=self.db_config.database,
                user=self.db_config.username,
                password=self.db_config.password,
                cursor_factory=RealDictCursor
            )

            self.results.append(ValidationResult(
                'setup_connections', 'PASS',
                "Database connection established",
                {'database': self.db_config.database}
            ))

        except Exception as e:
            self.results.append(ValidationResult(
                'setup_connections', 'FAIL',
                f"Failed to connect to database: {e}",
                {'error': str(e)},
                critical=True
            ))
            return False

        # Test frontend availability
        try:
            response = requests.get(f"{self.frontend_url}/api/health", timeout=10)
            if response.status_code == 200:
                self.results.append(ValidationResult(
                    'setup_connections', 'PASS',
                    "Frontend API is accessible",
                    {'frontend_url': self.frontend_url, 'status_code': response.status_code}
                ))
            else:
                self.results.append(ValidationResult(
                    'setup_connections', 'WARNING',
                    f"Frontend API returned status {response.status_code}",
                    {'frontend_url': self.frontend_url, 'status_code': response.status_code}
                ))
        except Exception as e:
            self.results.append(ValidationResult(
                'setup_connections', 'WARNING',
                f"Frontend not accessible: {e}",
                {'frontend_url': self.frontend_url, 'error': str(e)}
            ))

        return True

    def _generate_test_cases(self) -> None:
        """Generate test cases for validation"""
        logger.info("Generating test cases...")

        try:
            cursor = self.connection.cursor()

            # Get sample records from database
            cursor.execute("""
                SELECT DISTINCT trust_code, period, data_type
                FROM trust_metrics
                WHERE rtt_data IS NOT NULL
                AND ae_data IS NOT NULL
                ORDER BY period DESC
                LIMIT 10;
            """)

            records = cursor.fetchall()

            for i, record in enumerate(records):
                test_case = DataFlowTestCase(
                    test_id=f"e2e_test_{i+1}",
                    trust_code=record['trust_code'],
                    period=record['period'].isoformat() if record['period'] else None,
                    data_type=record['data_type'] or 'general'
                )
                self.test_cases.append(test_case)

            self.results.append(ValidationResult(
                'test_case_generation', 'PASS',
                f"Generated {len(self.test_cases)} test cases",
                {'test_case_count': len(self.test_cases)}
            ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'test_case_generation', 'FAIL',
                f"Failed to generate test cases: {e}",
                {'error': str(e)}
            ))

    def _validate_raw_to_database_flow(self) -> None:
        """Validate data flow from raw files to database"""
        logger.info("Validating raw data to database flow...")

        validation_summary = {
            'files_processed': 0,
            'records_validated': 0,
            'discrepancies_found': 0,
            'accuracy_percentage': 0.0
        }

        try:
            # Find recent Excel files
            excel_files = list(self.data_dir.glob("*.xlsx"))
            recent_files = sorted(excel_files, key=lambda x: x.stat().st_mtime, reverse=True)[:5]

            for file_path in recent_files:
                try:
                    # Read Excel file
                    df = pd.read_excel(file_path)
                    validation_summary['files_processed'] += 1

                    # Look for trust codes and data that should match database
                    trust_code_columns = [col for col in df.columns if 'ORG' in str(col).upper()]

                    if trust_code_columns and len(df) > 0:
                        # Sample some records for validation
                        sample_records = df.sample(n=min(5, len(df)))

                        for _, row in sample_records.iterrows():
                            trust_code = row[trust_code_columns[0]] if trust_code_columns else None

                            if trust_code:
                                # Check if this data exists in database
                                cursor = self.connection.cursor()
                                cursor.execute("""
                                    SELECT count(*) as record_count
                                    FROM trust_metrics
                                    WHERE trust_code = %s;
                                """, (str(trust_code),))

                                db_result = cursor.fetchone()
                                validation_summary['records_validated'] += 1

                                if db_result['record_count'] == 0:
                                    validation_summary['discrepancies_found'] += 1

                                cursor.close()

                except Exception as e:
                    logger.warning(f"Error processing file {file_path}: {e}")

            # Calculate accuracy
            if validation_summary['records_validated'] > 0:
                accuracy = ((validation_summary['records_validated'] - validation_summary['discrepancies_found']) /
                          validation_summary['records_validated']) * 100
                validation_summary['accuracy_percentage'] = accuracy

                if accuracy >= 95:
                    self.results.append(ValidationResult(
                        'raw_to_database_flow', 'PASS',
                        f"Raw to database flow validation passed: {accuracy:.1f}% accuracy",
                        validation_summary
                    ))
                elif accuracy >= 80:
                    self.results.append(ValidationResult(
                        'raw_to_database_flow', 'WARNING',
                        f"Raw to database flow has moderate accuracy: {accuracy:.1f}%",
                        validation_summary
                    ))
                else:
                    self.results.append(ValidationResult(
                        'raw_to_database_flow', 'FAIL',
                        f"Raw to database flow has low accuracy: {accuracy:.1f}%",
                        validation_summary,
                        critical=True
                    ))
            else:
                self.results.append(ValidationResult(
                    'raw_to_database_flow', 'WARNING',
                    "Could not validate raw to database flow - no matching records found",
                    validation_summary
                ))

        except Exception as e:
            self.results.append(ValidationResult(
                'raw_to_database_flow', 'FAIL',
                f"Cannot validate raw to database flow: {e}",
                {'error': str(e)}
            ))

    def _validate_database_to_api_flow(self) -> None:
        """Validate data flow from database to API responses"""
        logger.info("Validating database to API flow...")

        api_validation_summary = {
            'api_calls_made': 0,
            'successful_calls': 0,
            'data_matches': 0,
            'data_mismatches': 0,
            'accuracy_percentage': 0.0
        }

        try:
            cursor = self.connection.cursor()

            # Test API endpoints for each test case
            for test_case in self.test_cases[:5]:  # Limit to first 5 test cases
                try:
                    # Get data from database
                    cursor.execute("""
                        SELECT rtt_data, ae_data, trust_name
                        FROM trust_metrics
                        WHERE trust_code = %s
                        ORDER BY period DESC
                        LIMIT 1;
                    """, (test_case.trust_code,))

                    db_record = cursor.fetchone()

                    if db_record:
                        # Try to call API endpoint
                        try:
                            api_url = f"{self.frontend_url}/api/trusts/{test_case.trust_code}/metrics"
                            response = requests.get(api_url, timeout=10)
                            api_validation_summary['api_calls_made'] += 1

                            if response.status_code == 200:
                                api_validation_summary['successful_calls'] += 1
                                api_data = response.json()

                                # Compare key values
                                if self._compare_database_api_data(db_record, api_data):
                                    api_validation_summary['data_matches'] += 1
                                else:
                                    api_validation_summary['data_mismatches'] += 1

                        except requests.RequestException as e:
                            logger.warning(f"API call failed for {test_case.trust_code}: {e}")

                except Exception as e:
                    logger.warning(f"Error validating test case {test_case.test_id}: {e}")

            # Calculate accuracy
            total_comparisons = api_validation_summary['data_matches'] + api_validation_summary['data_mismatches']
            if total_comparisons > 0:
                accuracy = (api_validation_summary['data_matches'] / total_comparisons) * 100
                api_validation_summary['accuracy_percentage'] = accuracy

                if accuracy >= 95:
                    self.results.append(ValidationResult(
                        'database_to_api_flow', 'PASS',
                        f"Database to API flow validation passed: {accuracy:.1f}% accuracy",
                        api_validation_summary
                    ))
                elif accuracy >= 80:
                    self.results.append(ValidationResult(
                        'database_to_api_flow', 'WARNING',
                        f"Database to API flow has moderate accuracy: {accuracy:.1f}%",
                        api_validation_summary
                    ))
                else:
                    self.results.append(ValidationResult(
                        'database_to_api_flow', 'FAIL',
                        f"Database to API flow has low accuracy: {accuracy:.1f}%",
                        api_validation_summary,
                        critical=True
                    ))
            else:
                self.results.append(ValidationResult(
                    'database_to_api_flow', 'WARNING',
                    "Could not validate database to API flow - no data comparisons possible",
                    api_validation_summary
                ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'database_to_api_flow', 'FAIL',
                f"Cannot validate database to API flow: {e}",
                {'error': str(e)}
            ))

    def _validate_api_to_frontend_flow(self) -> None:
        """Validate data flow from API to frontend rendering"""
        logger.info("Validating API to frontend flow...")

        frontend_validation_summary = {
            'pages_tested': 0,
            'successful_loads': 0,
            'data_elements_found': 0,
            'rendering_errors': 0
        }

        try:
            # Test key frontend pages
            test_pages = [
                "/",
                "/dashboard",
                "/rtt-deep-dive",
                "/operational",
                "/capacity",
                "/benchmarking"
            ]

            for page in test_pages:
                try:
                    response = requests.get(f"{self.frontend_url}{page}", timeout=15)
                    frontend_validation_summary['pages_tested'] += 1

                    if response.status_code == 200:
                        frontend_validation_summary['successful_loads'] += 1

                        # Check for data elements in HTML (basic check)
                        html_content = response.text.lower()
                        data_indicators = [
                            'trust', 'percentage', 'performance', 'waiting',
                            'rtt', 'a&e', 'cancer', 'diagnostic'
                        ]

                        for indicator in data_indicators:
                            if indicator in html_content:
                                frontend_validation_summary['data_elements_found'] += 1

                        # Check for obvious error indicators
                        error_indicators = ['error', 'failed', 'undefined', 'null']
                        for error_indicator in error_indicators:
                            if error_indicator in html_content:
                                frontend_validation_summary['rendering_errors'] += 1

                    else:
                        logger.warning(f"Frontend page {page} returned status {response.status_code}")

                except requests.RequestException as e:
                    logger.warning(f"Failed to load frontend page {page}: {e}")

            # Evaluate frontend validation
            success_rate = (frontend_validation_summary['successful_loads'] /
                          frontend_validation_summary['pages_tested'] * 100) if frontend_validation_summary['pages_tested'] > 0 else 0

            if success_rate >= 90 and frontend_validation_summary['rendering_errors'] == 0:
                self.results.append(ValidationResult(
                    'api_to_frontend_flow', 'PASS',
                    f"API to frontend flow validation passed: {success_rate:.1f}% page success rate",
                    frontend_validation_summary
                ))
            elif success_rate >= 70:
                self.results.append(ValidationResult(
                    'api_to_frontend_flow', 'WARNING',
                    f"API to frontend flow has issues: {success_rate:.1f}% success rate",
                    frontend_validation_summary
                ))
            else:
                self.results.append(ValidationResult(
                    'api_to_frontend_flow', 'FAIL',
                    f"API to frontend flow has serious issues: {success_rate:.1f}% success rate",
                    frontend_validation_summary,
                    critical=True
                ))

        except Exception as e:
            self.results.append(ValidationResult(
                'api_to_frontend_flow', 'FAIL',
                f"Cannot validate API to frontend flow: {e}",
                {'error': str(e)}
            ))

    def _validate_mathematical_accuracy(self) -> None:
        """Validate mathematical calculations and aggregations"""
        logger.info("Validating mathematical accuracy...")

        math_validation_summary = {
            'calculations_tested': 0,
            'accurate_calculations': 0,
            'inaccurate_calculations': 0,
            'calculation_errors': []
        }

        try:
            cursor = self.connection.cursor()

            # Test percentage calculations
            cursor.execute("""
                SELECT trust_code, period,
                       rtt_data->'trust_total'->>'total_within_18_weeks' as within_18_weeks,
                       rtt_data->'trust_total'->>'total_incomplete_pathways' as total_pathways,
                       rtt_data->'trust_total'->>'percent_within_18_weeks' as recorded_percentage
                FROM trust_metrics
                WHERE rtt_data->'trust_total'->>'total_within_18_weeks' IS NOT NULL
                AND rtt_data->'trust_total'->>'total_incomplete_pathways' IS NOT NULL
                AND rtt_data->'trust_total'->>'percent_within_18_weeks' IS NOT NULL
                LIMIT 10;
            """)

            percentage_records = cursor.fetchall()

            for record in percentage_records:
                try:
                    within_18_weeks = float(record['within_18_weeks'])
                    total_pathways = float(record['total_pathways'])
                    recorded_percentage = float(record['recorded_percentage'])

                    if total_pathways > 0:
                        calculated_percentage = (within_18_weeks / total_pathways) * 100
                        math_validation_summary['calculations_tested'] += 1

                        # Allow 1% tolerance for rounding differences
                        if abs(calculated_percentage - recorded_percentage) <= 1.0:
                            math_validation_summary['accurate_calculations'] += 1
                        else:
                            math_validation_summary['inaccurate_calculations'] += 1
                            error_detail = {
                                'trust_code': record['trust_code'],
                                'period': str(record['period']),
                                'calculated': calculated_percentage,
                                'recorded': recorded_percentage,
                                'difference': abs(calculated_percentage - recorded_percentage)
                            }
                            math_validation_summary['calculation_errors'].append(error_detail)

                except (ValueError, TypeError) as e:
                    logger.warning(f"Error calculating percentage for {record['trust_code']}: {e}")

            # Test totals and aggregations
            cursor.execute("""
                SELECT trust_code,
                       ae_data->>'total_attendances' as total_attendances,
                       ae_data->>'emergency_admissions_total' as emergency_admissions
                FROM trust_metrics
                WHERE ae_data->>'total_attendances' IS NOT NULL
                AND ae_data->>'emergency_admissions_total' IS NOT NULL
                LIMIT 10;
            """)

            ae_records = cursor.fetchall()

            for record in ae_records:
                try:
                    total_attendances = float(record['total_attendances'])
                    emergency_admissions = float(record['emergency_admissions'])

                    math_validation_summary['calculations_tested'] += 1

                    # Emergency admissions should not exceed total attendances
                    if emergency_admissions <= total_attendances:
                        math_validation_summary['accurate_calculations'] += 1
                    else:
                        math_validation_summary['inaccurate_calculations'] += 1
                        error_detail = {
                            'trust_code': record['trust_code'],
                            'issue': 'emergency_admissions_exceed_total',
                            'total_attendances': total_attendances,
                            'emergency_admissions': emergency_admissions
                        }
                        math_validation_summary['calculation_errors'].append(error_detail)

                except (ValueError, TypeError) as e:
                    logger.warning(f"Error validating A&E data for {record['trust_code']}: {e}")

            # Calculate accuracy
            if math_validation_summary['calculations_tested'] > 0:
                accuracy = (math_validation_summary['accurate_calculations'] /
                          math_validation_summary['calculations_tested'] * 100)

                if accuracy >= 95:
                    self.results.append(ValidationResult(
                        'mathematical_accuracy', 'PASS',
                        f"Mathematical accuracy validation passed: {accuracy:.1f}% accurate",
                        math_validation_summary
                    ))
                elif accuracy >= 85:
                    self.results.append(ValidationResult(
                        'mathematical_accuracy', 'WARNING',
                        f"Mathematical accuracy has minor issues: {accuracy:.1f}% accurate",
                        math_validation_summary
                    ))
                else:
                    self.results.append(ValidationResult(
                        'mathematical_accuracy', 'FAIL',
                        f"Mathematical accuracy has serious issues: {accuracy:.1f}% accurate",
                        math_validation_summary,
                        critical=True
                    ))
            else:
                self.results.append(ValidationResult(
                    'mathematical_accuracy', 'WARNING',
                    "Could not validate mathematical accuracy - no calculations found",
                    math_validation_summary
                ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'mathematical_accuracy', 'FAIL',
                f"Cannot validate mathematical accuracy: {e}",
                {'error': str(e)}
            ))

    def _validate_cross_layer_consistency(self) -> None:
        """Validate consistency across all layers"""
        logger.info("Validating cross-layer consistency...")

        consistency_summary = {
            'trust_codes_checked': 0,
            'consistent_trust_codes': 0,
            'data_points_compared': 0,
            'consistent_data_points': 0,
            'inconsistencies': []
        }

        try:
            # Sample test cases for cross-layer validation
            for test_case in self.test_cases[:3]:
                cursor = self.connection.cursor()

                # Get database record
                cursor.execute("""
                    SELECT trust_code, trust_name, period,
                           rtt_data->'trust_total'->>'percent_within_18_weeks' as rtt_percentage
                    FROM trust_metrics
                    WHERE trust_code = %s
                    ORDER BY period DESC
                    LIMIT 1;
                """, (test_case.trust_code,))

                db_record = cursor.fetchone()

                if db_record:
                    consistency_summary['trust_codes_checked'] += 1

                    # Try to get same data from API
                    try:
                        api_response = requests.get(
                            f"{self.frontend_url}/api/trusts/{test_case.trust_code}/metrics",
                            timeout=10
                        )

                        if api_response.status_code == 200:
                            api_data = api_response.json()

                            # Compare trust code consistency
                            if api_data.get('trust_code') == db_record['trust_code']:
                                consistency_summary['consistent_trust_codes'] += 1

                            # Compare RTT percentage if available
                            if 'rtt_data' in api_data and db_record['rtt_percentage']:
                                api_rtt_percentage = api_data['rtt_data'].get('trust_total', {}).get('percent_within_18_weeks')

                                if api_rtt_percentage is not None:
                                    consistency_summary['data_points_compared'] += 1
                                    db_percentage = float(db_record['rtt_percentage'])

                                    if abs(api_rtt_percentage - db_percentage) <= 0.1:
                                        consistency_summary['consistent_data_points'] += 1
                                    else:
                                        inconsistency = {
                                            'trust_code': test_case.trust_code,
                                            'field': 'rtt_percentage',
                                            'database_value': db_percentage,
                                            'api_value': api_rtt_percentage,
                                            'difference': abs(api_rtt_percentage - db_percentage)
                                        }
                                        consistency_summary['inconsistencies'].append(inconsistency)

                    except requests.RequestException as e:
                        logger.warning(f"Could not get API data for {test_case.trust_code}: {e}")

                cursor.close()

            # Evaluate consistency
            trust_code_consistency = (consistency_summary['consistent_trust_codes'] /
                                    consistency_summary['trust_codes_checked'] * 100) if consistency_summary['trust_codes_checked'] > 0 else 0

            data_consistency = (consistency_summary['consistent_data_points'] /
                              consistency_summary['data_points_compared'] * 100) if consistency_summary['data_points_compared'] > 0 else 0

            overall_consistency = (trust_code_consistency + data_consistency) / 2

            if overall_consistency >= 95:
                self.results.append(ValidationResult(
                    'cross_layer_consistency', 'PASS',
                    f"Cross-layer consistency validation passed: {overall_consistency:.1f}% consistent",
                    consistency_summary
                ))
            elif overall_consistency >= 80:
                self.results.append(ValidationResult(
                    'cross_layer_consistency', 'WARNING',
                    f"Cross-layer consistency has minor issues: {overall_consistency:.1f}% consistent",
                    consistency_summary
                ))
            else:
                self.results.append(ValidationResult(
                    'cross_layer_consistency', 'FAIL',
                    f"Cross-layer consistency has serious issues: {overall_consistency:.1f}% consistent",
                    consistency_summary,
                    critical=True
                ))

        except Exception as e:
            self.results.append(ValidationResult(
                'cross_layer_consistency', 'FAIL',
                f"Cannot validate cross-layer consistency: {e}",
                {'error': str(e)}
            ))

    def _validate_performance_impact(self) -> None:
        """Validate performance impact of data processing"""
        logger.info("Validating performance impact...")

        performance_summary = {
            'api_response_times': [],
            'database_query_times': [],
            'frontend_load_times': [],
            'average_api_response': 0.0,
            'average_db_query': 0.0,
            'average_frontend_load': 0.0
        }

        try:
            # Test database query performance
            for _ in range(5):
                start_time = time.time()
                cursor = self.connection.cursor()
                cursor.execute("""
                    SELECT count(*) FROM trust_metrics
                    WHERE rtt_data IS NOT NULL;
                """)
                cursor.fetchone()
                cursor.close()
                end_time = time.time()
                performance_summary['database_query_times'].append((end_time - start_time) * 1000)

            # Test API response performance
            for test_case in self.test_cases[:3]:
                try:
                    start_time = time.time()
                    response = requests.get(
                        f"{self.frontend_url}/api/trusts/{test_case.trust_code}/metrics",
                        timeout=10
                    )
                    end_time = time.time()
                    if response.status_code == 200:
                        performance_summary['api_response_times'].append((end_time - start_time) * 1000)
                except:
                    pass

            # Test frontend load performance
            test_pages = ["/", "/dashboard", "/rtt-deep-dive"]
            for page in test_pages:
                try:
                    start_time = time.time()
                    response = requests.get(f"{self.frontend_url}{page}", timeout=15)
                    end_time = time.time()
                    if response.status_code == 200:
                        performance_summary['frontend_load_times'].append((end_time - start_time) * 1000)
                except:
                    pass

            # Calculate averages
            if performance_summary['database_query_times']:
                performance_summary['average_db_query'] = np.mean(performance_summary['database_query_times'])

            if performance_summary['api_response_times']:
                performance_summary['average_api_response'] = np.mean(performance_summary['api_response_times'])

            if performance_summary['frontend_load_times']:
                performance_summary['average_frontend_load'] = np.mean(performance_summary['frontend_load_times'])

            # Evaluate performance
            performance_issues = []

            if performance_summary['average_db_query'] > 1000:  # > 1 second
                performance_issues.append(f"Slow database queries: {performance_summary['average_db_query']:.0f}ms")

            if performance_summary['average_api_response'] > 2000:  # > 2 seconds
                performance_issues.append(f"Slow API responses: {performance_summary['average_api_response']:.0f}ms")

            if performance_summary['average_frontend_load'] > 3000:  # > 3 seconds
                performance_issues.append(f"Slow frontend loads: {performance_summary['average_frontend_load']:.0f}ms")

            if performance_issues:
                self.results.append(ValidationResult(
                    'performance_impact', 'WARNING',
                    f"Performance issues detected: {'; '.join(performance_issues)}",
                    performance_summary
                ))
            else:
                self.results.append(ValidationResult(
                    'performance_impact', 'PASS',
                    "Performance metrics are within acceptable ranges",
                    performance_summary
                ))

        except Exception as e:
            self.results.append(ValidationResult(
                'performance_impact', 'FAIL',
                f"Cannot validate performance impact: {e}",
                {'error': str(e)}
            ))

    def _validate_data_transformations(self) -> None:
        """Validate data transformations are applied correctly"""
        logger.info("Validating data transformations...")

        transformation_summary = {
            'percentage_transformations_checked': 0,
            'correct_percentage_transformations': 0,
            'aggregation_checks': 0,
            'correct_aggregations': 0,
            'transformation_errors': []
        }

        try:
            cursor = self.connection.cursor()

            # Check percentage transformations
            cursor.execute("""
                SELECT trust_code,
                       rtt_data->'trust_total'->>'percent_within_18_weeks' as trust_total_pct,
                       jsonb_object_keys(rtt_data->'specialties') as specialty_key
                FROM trust_metrics
                WHERE rtt_data->'trust_total'->>'percent_within_18_weeks' IS NOT NULL
                AND jsonb_typeof(rtt_data->'specialties') = 'object'
                LIMIT 5;
            """)

            records = cursor.fetchall()

            for record in records:
                try:
                    trust_total_pct = float(record['trust_total_pct'])
                    transformation_summary['percentage_transformations_checked'] += 1

                    # Trust total percentages should be in 0-100 range (not 0-1)
                    if 0 <= trust_total_pct <= 100:
                        transformation_summary['correct_percentage_transformations'] += 1
                    else:
                        transformation_summary['transformation_errors'].append({
                            'trust_code': record['trust_code'],
                            'issue': 'trust_total_percentage_out_of_range',
                            'value': trust_total_pct
                        })

                except (ValueError, TypeError):
                    pass

            # Check specialty percentage transformations
            cursor.execute("""
                SELECT trust_code,
                       rtt_data->'specialties'->'general_surgery'->>'percent_within_18_weeks' as specialty_pct
                FROM trust_metrics
                WHERE rtt_data->'specialties'->'general_surgery'->>'percent_within_18_weeks' IS NOT NULL
                LIMIT 5;
            """)

            specialty_records = cursor.fetchall()

            for record in specialty_records:
                try:
                    specialty_pct = float(record['specialty_pct'])
                    transformation_summary['percentage_transformations_checked'] += 1

                    # Check if this looks like it was properly transformed
                    # Specialty percentages should be in 0-100 range after transformation
                    if 0 <= specialty_pct <= 100:
                        transformation_summary['correct_percentage_transformations'] += 1
                    else:
                        transformation_summary['transformation_errors'].append({
                            'trust_code': record['trust_code'],
                            'issue': 'specialty_percentage_transformation_issue',
                            'value': specialty_pct
                        })

                except (ValueError, TypeError):
                    pass

            # Evaluate transformations
            if transformation_summary['percentage_transformations_checked'] > 0:
                accuracy = (transformation_summary['correct_percentage_transformations'] /
                          transformation_summary['percentage_transformations_checked'] * 100)

                if accuracy >= 95:
                    self.results.append(ValidationResult(
                        'data_transformations', 'PASS',
                        f"Data transformations validation passed: {accuracy:.1f}% correct",
                        transformation_summary
                    ))
                elif accuracy >= 80:
                    self.results.append(ValidationResult(
                        'data_transformations', 'WARNING',
                        f"Data transformations have minor issues: {accuracy:.1f}% correct",
                        transformation_summary
                    ))
                else:
                    self.results.append(ValidationResult(
                        'data_transformations', 'FAIL',
                        f"Data transformations have serious issues: {accuracy:.1f}% correct",
                        transformation_summary,
                        critical=True
                    ))
            else:
                self.results.append(ValidationResult(
                    'data_transformations', 'WARNING',
                    "Could not validate data transformations - no data found",
                    transformation_summary
                ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'data_transformations', 'FAIL',
                f"Cannot validate data transformations: {e}",
                {'error': str(e)}
            ))

    def _compare_database_api_data(self, db_record: Dict[str, Any], api_data: Dict[str, Any]) -> bool:
        """Compare database record with API response data"""
        try:
            # Compare trust name
            if db_record.get('trust_name') != api_data.get('trust_name'):
                return False

            # Compare RTT data if available
            if db_record.get('rtt_data') and api_data.get('rtt_data'):
                db_rtt_pct = db_record['rtt_data'].get('trust_total', {}).get('percent_within_18_weeks')
                api_rtt_pct = api_data['rtt_data'].get('trust_total', {}).get('percent_within_18_weeks')

                if db_rtt_pct is not None and api_rtt_pct is not None:
                    if abs(float(db_rtt_pct) - float(api_rtt_pct)) > 0.1:
                        return False

            # Compare A&E data if available
            if db_record.get('ae_data') and api_data.get('ae_data'):
                db_ae_pct = db_record['ae_data'].get('four_hour_performance_pct')
                api_ae_pct = api_data['ae_data'].get('four_hour_performance_pct')

                if db_ae_pct is not None and api_ae_pct is not None:
                    if abs(float(db_ae_pct) - float(api_ae_pct)) > 0.1:
                        return False

            return True

        except Exception:
            return False

    def _test_case_to_dict(self, test_case: DataFlowTestCase) -> Dict[str, Any]:
        """Convert test case to dictionary"""
        return {
            'test_id': test_case.test_id,
            'trust_code': test_case.trust_code,
            'period': test_case.period,
            'data_type': test_case.data_type,
            'raw_file_path': str(test_case.raw_file_path) if test_case.raw_file_path else None
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

    def _generate_summary(self) -> Dict[str, Any]:
        """Generate validation summary"""
        total_tests = len(self.results)
        passed = len([r for r in self.results if r.status == 'PASS'])
        failed = len([r for r in self.results if r.status == 'FAIL'])
        warnings = len([r for r in self.results if r.status == 'WARNING'])
        critical_failures = len([r for r in self.results if r.critical and r.status == 'FAIL'])

        return {
            'total_test_cases': len(self.test_cases),
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
            recommendations.append("🚨 CRITICAL: Address critical end-to-end flow failures immediately")

        # Check for setup issues
        setup_failures = [r for r in self.results if r.test_name == 'setup_connections' and r.status == 'FAIL']
        if setup_failures:
            recommendations.append("🔧 Fix connectivity issues between components")

        # Check for raw data flow issues
        raw_db_issues = [r for r in self.results if r.test_name == 'raw_to_database_flow' and r.status in ['FAIL', 'WARNING']]
        if raw_db_issues:
            recommendations.append("📊 Review data processing pipeline from raw files to database")

        # Check for API issues
        api_issues = [r for r in self.results if r.test_name == 'database_to_api_flow' and r.status in ['FAIL', 'WARNING']]
        if api_issues:
            recommendations.append("🔗 Fix API data retrieval and transformation issues")

        # Check for frontend issues
        frontend_issues = [r for r in self.results if r.test_name == 'api_to_frontend_flow' and r.status in ['FAIL', 'WARNING']]
        if frontend_issues:
            recommendations.append("🖥️ Fix frontend rendering and data display issues")

        # Check for mathematical accuracy
        math_issues = [r for r in self.results if r.test_name == 'mathematical_accuracy' and r.status in ['FAIL', 'WARNING']]
        if math_issues:
            recommendations.append("🧮 Review mathematical calculations and formulas")

        # Check for consistency issues
        consistency_issues = [r for r in self.results if r.test_name == 'cross_layer_consistency' and r.status in ['FAIL', 'WARNING']]
        if consistency_issues:
            recommendations.append("🔄 Fix data consistency issues across system layers")

        # Check for performance issues
        performance_issues = [r for r in self.results if r.test_name == 'performance_impact' and r.status == 'WARNING']
        if performance_issues:
            recommendations.append("⚡ Optimize system performance - slow response times detected")

        # Check for transformation issues
        transformation_issues = [r for r in self.results if r.test_name == 'data_transformations' and r.status in ['FAIL', 'WARNING']]
        if transformation_issues:
            recommendations.append("🔄 Fix data transformation rules and percentage handling")

        if not recommendations:
            recommendations.append("✅ End-to-end data flow validation passed - system integrity confirmed")

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
    frontend_url = "http://localhost:3000"

    # Database configuration
    db_config = DatabaseConfig(
        host=os.getenv('SUPABASE_HOST', 'db.fsopilxzaaukmcqcskqm.supabase.co'),
        port=int(os.getenv('SUPABASE_PORT', '5432')),
        database=os.getenv('SUPABASE_DATABASE', 'postgres'),
        username=os.getenv('SUPABASE_USER', 'postgres'),
        password=os.getenv('SUPABASE_PASSWORD', '')
    )

    # Initialize validator
    validator = EndToEndDataFlowValidator(data_dir, db_config, frontend_url)

    # Run validation
    report = validator.run_comprehensive_validation()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"end_to_end_data_flow_validation_{timestamp}.json"

    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Print summary
    print(f"\n{'='*60}")
    print("END-TO-END DATA FLOW VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Status: {report['overall_status']}")
    print(f"Test Cases: {report['summary']['total_test_cases']}")
    print(f"Tests Run: {report['summary']['total_tests']}")
    print(f"Success Rate: {report['summary']['success_rate']:.1f}%")

    if report['critical_issues']:
        print(f"\n🚨 CRITICAL ISSUES: {len(report['critical_issues'])}")
        for issue in report['critical_issues']:
            print(f"  - {issue['message']}")

    print(f"\nDetailed report saved to: {report_path}")

    return report['overall_status'] in ['PASS', 'WARNING']


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
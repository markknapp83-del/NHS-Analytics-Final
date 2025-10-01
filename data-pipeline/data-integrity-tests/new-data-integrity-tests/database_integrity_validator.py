#!/usr/bin/env python3
"""
Database Integrity Validation Suite
===================================

Validates the integrity and consistency of NHS data stored in the Supabase database.
Ensures that processed data maintains accuracy and completeness from raw sources.

Features:
- Database connectivity and health validation
- Table structure and schema verification
- Data integrity checks (constraints, relationships, consistency)
- JSONB field structure validation
- Cross-table consistency verification
- Performance and index validation
- Backup and recovery readiness

Author: Claude Code Assistant
Date: 2025-09-29
"""

import os
import sys
import json
import psycopg2
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, date
from typing import Dict, List, Any, Tuple, Optional, Set
import traceback
import logging
from dataclasses import dataclass
from psycopg2.extras import RealDictCursor
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

class DatabaseIntegrityValidator:
    """
    Comprehensive validator for NHS database integrity.
    Validates data consistency, structure, and performance.
    """

    def __init__(self, db_config: DatabaseConfig):
        self.db_config = db_config
        self.connection = None
        self.results: List[ValidationResult] = []

        # Expected table structure
        self.expected_tables = {
            'trust_metrics': {
                'required_columns': [
                    'id', 'trust_code', 'trust_name', 'period', 'data_type',
                    'icb_code', 'icb_name', 'rtt_data', 'ae_data',
                    'diagnostics_data', 'community_health_data',
                    'cancer_data', 'capacity_data', 'created_at', 'updated_at'
                ],
                'jsonb_columns': [
                    'rtt_data', 'ae_data', 'diagnostics_data',
                    'community_health_data', 'cancer_data', 'capacity_data'
                ]
            }
        }

        # Expected JSONB structures
        self.expected_jsonb_structures = {
            'rtt_data': {
                'trust_total': ['percent_within_18_weeks', 'total_incomplete_pathways'],
                'specialties': ['general_surgery', 'urology', 'trauma_orthopaedics']
            },
            'ae_data': ['four_hour_performance_pct', 'total_attendances'],
            'diagnostics_data': ['mri_scans', 'ct_scans', 'ultrasound'],
            'cancer_data': ['treatment_pathways', 'waiting_times'],
            'capacity_data': ['virtual_ward_capacity', 'bed_occupancy']
        }

    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run all database validation tests and return comprehensive report"""
        logger.info("Starting comprehensive database validation...")

        report = {
            'validation_timestamp': datetime.now().isoformat(),
            'validator': 'Database Integrity Validator',
            'database_host': self.db_config.host,
            'database_name': self.db_config.database,
            'validation_results': [],
            'summary': {},
            'critical_issues': [],
            'recommendations': [],
            'overall_status': 'UNKNOWN'
        }

        try:
            # Phase 1: Database Connectivity
            if not self._connect_to_database():
                report['error'] = "Failed to connect to database"
                report['overall_status'] = 'CRITICAL_FAILURE'
                return report

            # Phase 2: Database Health Check
            self._validate_database_health()

            # Phase 3: Table Structure Validation
            self._validate_table_structure()

            # Phase 4: Data Integrity Validation
            self._validate_data_integrity()

            # Phase 5: JSONB Structure Validation
            self._validate_jsonb_structures()

            # Phase 6: Constraint and Relationship Validation
            self._validate_constraints_and_relationships()

            # Phase 7: Performance Validation
            self._validate_performance_indicators()

            # Phase 8: Data Consistency Validation
            self._validate_data_consistency()

            # Phase 9: Security and Access Validation
            self._validate_security_configuration()

            # Compile results
            report['validation_results'] = [self._result_to_dict(r) for r in self.results]
            report['summary'] = self._generate_summary()
            report['critical_issues'] = [r for r in self.results if r.critical and r.status == 'FAIL']
            report['recommendations'] = self._generate_recommendations()
            report['overall_status'] = self._determine_overall_status()

            logger.info(f"Database validation completed. Status: {report['overall_status']}")
            return report

        except Exception as e:
            logger.error(f"Database validation failed with error: {e}")
            report['error'] = str(e)
            report['traceback'] = traceback.format_exc()
            report['overall_status'] = 'ERROR'
            return report
        finally:
            if self.connection:
                self.connection.close()

    def _connect_to_database(self) -> bool:
        """Establish database connection"""
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
                'database_connectivity', 'PASS',
                "Successfully connected to database",
                {'host': self.db_config.host, 'database': self.db_config.database}
            ))
            logger.info("Database connection established")
            return True

        except Exception as e:
            self.results.append(ValidationResult(
                'database_connectivity', 'FAIL',
                f"Failed to connect to database: {e}",
                {'host': self.db_config.host, 'error': str(e)},
                critical=True
            ))
            logger.error(f"Failed to connect to database: {e}")
            return False

    def _validate_database_health(self) -> None:
        """Validate database health and basic metrics"""
        logger.info("Validating database health...")

        try:
            cursor = self.connection.cursor()

            # Check database version
            cursor.execute("SELECT version();")
            version_info = cursor.fetchone()

            # Check database size
            cursor.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size;
            """)
            db_size = cursor.fetchone()

            # Check active connections
            cursor.execute("""
                SELECT count(*) as active_connections
                FROM pg_stat_activity
                WHERE state = 'active';
            """)
            active_connections = cursor.fetchone()

            # Check for long-running queries
            cursor.execute("""
                SELECT count(*) as long_queries
                FROM pg_stat_activity
                WHERE state = 'active'
                AND now() - query_start > interval '5 minutes';
            """)
            long_queries = cursor.fetchone()

            health_details = {
                'database_version': version_info['version'] if version_info else 'Unknown',
                'database_size': db_size['size'] if db_size else 'Unknown',
                'active_connections': active_connections['active_connections'] if active_connections else 0,
                'long_running_queries': long_queries['long_queries'] if long_queries else 0
            }

            # Check for concerning metrics
            if health_details['long_running_queries'] > 0:
                self.results.append(ValidationResult(
                    'database_health', 'WARNING',
                    f"Found {health_details['long_running_queries']} long-running queries",
                    health_details
                ))
            elif health_details['active_connections'] > 100:
                self.results.append(ValidationResult(
                    'database_health', 'WARNING',
                    f"High number of active connections: {health_details['active_connections']}",
                    health_details
                ))
            else:
                self.results.append(ValidationResult(
                    'database_health', 'PASS',
                    "Database health metrics are normal",
                    health_details
                ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'database_health', 'FAIL',
                f"Cannot validate database health: {e}",
                {'error': str(e)}
            ))

    def _validate_table_structure(self) -> None:
        """Validate table structure and schema"""
        logger.info("Validating table structure...")

        try:
            cursor = self.connection.cursor()

            # Check for expected tables
            cursor.execute("""
                SELECT table_name, table_type
                FROM information_schema.tables
                WHERE table_schema = 'public';
            """)
            existing_tables = {row['table_name']: row['table_type'] for row in cursor.fetchall()}

            # Validate each expected table
            for table_name, table_config in self.expected_tables.items():
                if table_name not in existing_tables:
                    self.results.append(ValidationResult(
                        'table_structure', 'FAIL',
                        f"Required table '{table_name}' does not exist",
                        {'table_name': table_name},
                        critical=True
                    ))
                    continue

                # Check table columns
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s;
                """, (table_name,))

                columns_info = {row['column_name']: {
                    'data_type': row['data_type'],
                    'is_nullable': row['is_nullable']
                } for row in cursor.fetchall()}

                # Check for required columns
                missing_columns = []
                for required_col in table_config['required_columns']:
                    if required_col not in columns_info:
                        missing_columns.append(required_col)

                if missing_columns:
                    self.results.append(ValidationResult(
                        'table_structure', 'FAIL',
                        f"Table '{table_name}' missing required columns: {missing_columns}",
                        {'table_name': table_name, 'missing_columns': missing_columns},
                        critical=True
                    ))
                else:
                    # Check table statistics
                    cursor.execute(f"SELECT count(*) as row_count FROM {table_name};")
                    row_count = cursor.fetchone()['row_count']

                    structure_details = {
                        'table_name': table_name,
                        'columns': list(columns_info.keys()),
                        'row_count': row_count,
                        'column_details': columns_info
                    }

                    self.results.append(ValidationResult(
                        'table_structure', 'PASS',
                        f"Table '{table_name}' has valid structure with {row_count} rows",
                        structure_details
                    ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'table_structure', 'FAIL',
                f"Cannot validate table structure: {e}",
                {'error': str(e)}
            ))

    def _validate_data_integrity(self) -> None:
        """Validate data integrity and constraints"""
        logger.info("Validating data integrity...")

        try:
            cursor = self.connection.cursor()

            # Check for NULL values in critical columns
            for table_name in self.expected_tables.keys():
                # Check primary key integrity
                cursor.execute(f"""
                    SELECT count(*) as null_ids
                    FROM {table_name}
                    WHERE id IS NULL;
                """)
                null_ids = cursor.fetchone()['null_ids']

                if null_ids > 0:
                    self.results.append(ValidationResult(
                        'data_integrity', 'FAIL',
                        f"Table '{table_name}' has {null_ids} NULL primary keys",
                        {'table_name': table_name, 'null_ids': null_ids},
                        critical=True
                    ))

                # Check for NULL trust codes
                cursor.execute(f"""
                    SELECT count(*) as null_trust_codes
                    FROM {table_name}
                    WHERE trust_code IS NULL;
                """)
                null_trust_codes = cursor.fetchone()['null_trust_codes']

                if null_trust_codes > 0:
                    self.results.append(ValidationResult(
                        'data_integrity', 'WARNING',
                        f"Table '{table_name}' has {null_trust_codes} NULL trust codes",
                        {'table_name': table_name, 'null_trust_codes': null_trust_codes}
                    ))

                # Check for duplicate records
                cursor.execute(f"""
                    SELECT trust_code, period, count(*) as duplicate_count
                    FROM {table_name}
                    GROUP BY trust_code, period
                    HAVING count(*) > 1
                    LIMIT 10;
                """)
                duplicates = cursor.fetchall()

                if duplicates:
                    duplicate_details = [dict(row) for row in duplicates]
                    self.results.append(ValidationResult(
                        'data_integrity', 'WARNING',
                        f"Table '{table_name}' has duplicate records",
                        {'table_name': table_name, 'duplicates': duplicate_details}
                    ))

                # Check data freshness
                cursor.execute(f"""
                    SELECT max(created_at) as latest_record,
                           min(created_at) as earliest_record,
                           count(*) as total_records
                    FROM {table_name};
                """)
                freshness_info = cursor.fetchone()

                if freshness_info:
                    freshness_details = {
                        'table_name': table_name,
                        'latest_record': freshness_info['latest_record'].isoformat() if freshness_info['latest_record'] else None,
                        'earliest_record': freshness_info['earliest_record'].isoformat() if freshness_info['earliest_record'] else None,
                        'total_records': freshness_info['total_records']
                    }

                    # Check if data is recent (within last 30 days)
                    if freshness_info['latest_record']:
                        days_old = (datetime.now() - freshness_info['latest_record'].replace(tzinfo=None)).days
                        freshness_details['days_since_latest'] = days_old

                        if days_old > 30:
                            self.results.append(ValidationResult(
                                'data_integrity', 'WARNING',
                                f"Table '{table_name}' data is {days_old} days old",
                                freshness_details
                            ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'data_integrity', 'FAIL',
                f"Cannot validate data integrity: {e}",
                {'error': str(e)}
            ))

    def _validate_jsonb_structures(self) -> None:
        """Validate JSONB field structures"""
        logger.info("Validating JSONB structures...")

        try:
            cursor = self.connection.cursor()

            for table_name, table_config in self.expected_tables.items():
                for jsonb_column in table_config.get('jsonb_columns', []):
                    # Check for NULL JSONB values
                    cursor.execute(f"""
                        SELECT count(*) as null_count
                        FROM {table_name}
                        WHERE {jsonb_column} IS NULL;
                    """)
                    null_count = cursor.fetchone()['null_count']

                    # Check for empty JSONB objects
                    cursor.execute(f"""
                        SELECT count(*) as empty_count
                        FROM {table_name}
                        WHERE {jsonb_column} = '{{}}'::jsonb;
                    """)
                    empty_count = cursor.fetchone()['empty_count']

                    # Sample JSONB structure validation
                    cursor.execute(f"""
                        SELECT {jsonb_column}
                        FROM {table_name}
                        WHERE {jsonb_column} IS NOT NULL
                        AND {jsonb_column} != '{{}}'::jsonb
                        LIMIT 5;
                    """)
                    sample_records = cursor.fetchall()

                    jsonb_details = {
                        'table_name': table_name,
                        'column_name': jsonb_column,
                        'null_count': null_count,
                        'empty_count': empty_count,
                        'sample_count': len(sample_records)
                    }

                    # Validate structure of sample records
                    if sample_records and jsonb_column in self.expected_jsonb_structures:
                        expected_structure = self.expected_jsonb_structures[jsonb_column]
                        structure_issues = []

                        for record in sample_records:
                            jsonb_data = record[jsonb_column]

                            if isinstance(expected_structure, dict):
                                # Nested structure validation
                                for key, subkeys in expected_structure.items():
                                    if key not in jsonb_data:
                                        structure_issues.append(f"Missing key: {key}")
                                    elif isinstance(subkeys, list):
                                        for subkey in subkeys:
                                            if subkey not in jsonb_data.get(key, {}):
                                                structure_issues.append(f"Missing subkey: {key}.{subkey}")
                            elif isinstance(expected_structure, list):
                                # Simple key validation
                                for key in expected_structure:
                                    if key not in jsonb_data:
                                        structure_issues.append(f"Missing key: {key}")

                        if structure_issues:
                            jsonb_details['structure_issues'] = list(set(structure_issues))
                            self.results.append(ValidationResult(
                                'jsonb_structure', 'WARNING',
                                f"JSONB structure issues in {table_name}.{jsonb_column}",
                                jsonb_details
                            ))
                        else:
                            self.results.append(ValidationResult(
                                'jsonb_structure', 'PASS',
                                f"JSONB structure valid for {table_name}.{jsonb_column}",
                                jsonb_details
                            ))

                    # Check for high NULL/empty rates
                    cursor.execute(f"SELECT count(*) as total FROM {table_name};")
                    total_records = cursor.fetchone()['total']

                    if total_records > 0:
                        null_rate = (null_count / total_records) * 100
                        empty_rate = (empty_count / total_records) * 100

                        if null_rate > 50:
                            self.results.append(ValidationResult(
                                'jsonb_structure', 'WARNING',
                                f"High NULL rate ({null_rate:.1f}%) for {table_name}.{jsonb_column}",
                                {**jsonb_details, 'null_rate': null_rate}
                            ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'jsonb_structure', 'FAIL',
                f"Cannot validate JSONB structures: {e}",
                {'error': str(e)}
            ))

    def _validate_constraints_and_relationships(self) -> None:
        """Validate database constraints and relationships"""
        logger.info("Validating constraints and relationships...")

        try:
            cursor = self.connection.cursor()

            # Check for primary key constraints
            cursor.execute("""
                SELECT tc.table_name, tc.constraint_name, tc.constraint_type
                FROM information_schema.table_constraints tc
                WHERE tc.table_schema = 'public'
                AND tc.constraint_type = 'PRIMARY KEY';
            """)
            primary_keys = cursor.fetchall()

            pk_details = {
                'primary_key_count': len(primary_keys),
                'tables_with_pk': [row['table_name'] for row in primary_keys]
            }

            # Check for foreign key constraints
            cursor.execute("""
                SELECT tc.table_name, tc.constraint_name, tc.constraint_type
                FROM information_schema.table_constraints tc
                WHERE tc.table_schema = 'public'
                AND tc.constraint_type = 'FOREIGN KEY';
            """)
            foreign_keys = cursor.fetchall()

            fk_details = {
                'foreign_key_count': len(foreign_keys),
                'tables_with_fk': [row['table_name'] for row in foreign_keys]
            }

            # Check for unique constraints
            cursor.execute("""
                SELECT tc.table_name, tc.constraint_name, tc.constraint_type
                FROM information_schema.table_constraints tc
                WHERE tc.table_schema = 'public'
                AND tc.constraint_type = 'UNIQUE';
            """)
            unique_constraints = cursor.fetchall()

            unique_details = {
                'unique_constraint_count': len(unique_constraints),
                'tables_with_unique': [row['table_name'] for row in unique_constraints]
            }

            constraint_summary = {
                'primary_keys': pk_details,
                'foreign_keys': fk_details,
                'unique_constraints': unique_details
            }

            # Validate that critical tables have primary keys
            for table_name in self.expected_tables.keys():
                if table_name not in pk_details['tables_with_pk']:
                    self.results.append(ValidationResult(
                        'constraints_relationships', 'FAIL',
                        f"Table '{table_name}' missing primary key constraint",
                        {'table_name': table_name},
                        critical=True
                    ))

            self.results.append(ValidationResult(
                'constraints_relationships', 'PASS',
                "Database constraint validation completed",
                constraint_summary
            ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'constraints_relationships', 'FAIL',
                f"Cannot validate constraints: {e}",
                {'error': str(e)}
            ))

    def _validate_performance_indicators(self) -> None:
        """Validate database performance indicators"""
        logger.info("Validating performance indicators...")

        try:
            cursor = self.connection.cursor()

            # Check for indexes
            cursor.execute("""
                SELECT schemaname, tablename, indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public';
            """)
            indexes = cursor.fetchall()

            index_details = {
                'total_indexes': len(indexes),
                'indexes_by_table': {}
            }

            for index in indexes:
                table_name = index['tablename']
                if table_name not in index_details['indexes_by_table']:
                    index_details['indexes_by_table'][table_name] = []
                index_details['indexes_by_table'][table_name].append(index['indexname'])

            # Check query performance statistics
            cursor.execute("""
                SELECT query, calls, total_time, mean_time
                FROM pg_stat_statements
                WHERE query LIKE '%trust_metrics%'
                ORDER BY total_time DESC
                LIMIT 5;
            """)
            slow_queries = cursor.fetchall()

            performance_details = {
                'indexes': index_details,
                'slow_queries': [dict(row) for row in slow_queries] if slow_queries else []
            }

            # Check for missing indexes on important columns
            expected_indexes = ['trust_code', 'period', 'icb_code']
            missing_indexes = []

            for table_name in self.expected_tables.keys():
                table_indexes = index_details['indexes_by_table'].get(table_name, [])
                for expected_col in expected_indexes:
                    if not any(expected_col in idx for idx in table_indexes):
                        missing_indexes.append(f"{table_name}.{expected_col}")

            if missing_indexes:
                self.results.append(ValidationResult(
                    'performance_indicators', 'WARNING',
                    f"Missing indexes on important columns: {missing_indexes}",
                    {**performance_details, 'missing_indexes': missing_indexes}
                ))
            else:
                self.results.append(ValidationResult(
                    'performance_indicators', 'PASS',
                    "Database performance indicators are adequate",
                    performance_details
                ))

            cursor.close()

        except Exception as e:
            # pg_stat_statements might not be available
            if "pg_stat_statements" in str(e):
                self.results.append(ValidationResult(
                    'performance_indicators', 'WARNING',
                    "pg_stat_statements extension not available for query performance analysis",
                    {'error': str(e)}
                ))
            else:
                self.results.append(ValidationResult(
                    'performance_indicators', 'FAIL',
                    f"Cannot validate performance indicators: {e}",
                    {'error': str(e)}
                ))

    def _validate_data_consistency(self) -> None:
        """Validate data consistency across records"""
        logger.info("Validating data consistency...")

        try:
            cursor = self.connection.cursor()

            # Check for consistent trust information
            cursor.execute("""
                SELECT trust_code, count(DISTINCT trust_name) as name_variations
                FROM trust_metrics
                GROUP BY trust_code
                HAVING count(DISTINCT trust_name) > 1
                LIMIT 10;
            """)
            inconsistent_names = cursor.fetchall()

            if inconsistent_names:
                self.results.append(ValidationResult(
                    'data_consistency', 'WARNING',
                    f"Found {len(inconsistent_names)} trust codes with varying names",
                    {'inconsistent_names': [dict(row) for row in inconsistent_names]}
                ))

            # Check for logical data ranges
            cursor.execute("""
                SELECT
                    count(*) as records_with_negative_values
                FROM trust_metrics
                WHERE (rtt_data->>'trust_total'->>'total_incomplete_pathways')::numeric < 0
                OR (ae_data->>'total_attendances')::numeric < 0;
            """)
            negative_values = cursor.fetchone()

            if negative_values and negative_values['records_with_negative_values'] > 0:
                self.results.append(ValidationResult(
                    'data_consistency', 'WARNING',
                    f"Found {negative_values['records_with_negative_values']} records with negative values",
                    {'negative_values': negative_values['records_with_negative_values']}
                ))

            # Check for reasonable percentage values
            cursor.execute("""
                SELECT count(*) as invalid_percentages
                FROM trust_metrics
                WHERE (rtt_data->>'trust_total'->>'percent_within_18_weeks')::numeric > 100
                OR (rtt_data->>'trust_total'->>'percent_within_18_weeks')::numeric < 0;
            """)
            invalid_percentages = cursor.fetchone()

            if invalid_percentages and invalid_percentages['invalid_percentages'] > 0:
                self.results.append(ValidationResult(
                    'data_consistency', 'WARNING',
                    f"Found {invalid_percentages['invalid_percentages']} records with invalid percentage values",
                    {'invalid_percentages': invalid_percentages['invalid_percentages']}
                ))

            # If no consistency issues found
            consistency_checks = [
                len(inconsistent_names) == 0,
                negative_values['records_with_negative_values'] == 0 if negative_values else True,
                invalid_percentages['invalid_percentages'] == 0 if invalid_percentages else True
            ]

            if all(consistency_checks):
                self.results.append(ValidationResult(
                    'data_consistency', 'PASS',
                    "Data consistency checks passed",
                    {'checks_passed': len(consistency_checks)}
                ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'data_consistency', 'FAIL',
                f"Cannot validate data consistency: {e}",
                {'error': str(e)}
            ))

    def _validate_security_configuration(self) -> None:
        """Validate database security configuration"""
        logger.info("Validating security configuration...")

        try:
            cursor = self.connection.cursor()

            # Check RLS (Row Level Security) policies
            cursor.execute("""
                SELECT tablename, policyname, permissive, roles, cmd, qual
                FROM pg_policies
                WHERE schemaname = 'public';
            """)
            rls_policies = cursor.fetchall()

            # Check for roles and permissions
            cursor.execute("""
                SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
                FROM pg_roles
                WHERE rolname NOT LIKE 'pg_%'
                AND rolname != 'postgres';
            """)
            roles = cursor.fetchall()

            security_details = {
                'rls_policies': [dict(row) for row in rls_policies],
                'roles': [dict(row) for row in roles]
            }

            # Check if RLS is enabled on critical tables
            for table_name in self.expected_tables.keys():
                cursor.execute("""
                    SELECT relname, relrowsecurity
                    FROM pg_class
                    WHERE relname = %s AND relkind = 'r';
                """, (table_name,))
                table_rls = cursor.fetchone()

                if table_rls and not table_rls['relrowsecurity']:
                    self.results.append(ValidationResult(
                        'security_configuration', 'WARNING',
                        f"Table '{table_name}' does not have RLS enabled",
                        {'table_name': table_name}
                    ))

            self.results.append(ValidationResult(
                'security_configuration', 'PASS',
                "Security configuration validated",
                security_details
            ))

            cursor.close()

        except Exception as e:
            self.results.append(ValidationResult(
                'security_configuration', 'WARNING',
                f"Cannot fully validate security configuration: {e}",
                {'error': str(e)}
            ))

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
            recommendations.append("🚨 CRITICAL: Address critical database failures immediately")

        # Check for connectivity issues
        connectivity_failures = [r for r in self.results if r.test_name == 'database_connectivity' and r.status == 'FAIL']
        if connectivity_failures:
            recommendations.append("🔌 Fix database connectivity issues")

        # Check for structure issues
        structure_failures = [r for r in self.results if r.test_name == 'table_structure' and r.status == 'FAIL']
        if structure_failures:
            recommendations.append("🏗️ Repair database table structure issues")

        # Check for performance issues
        performance_warnings = [r for r in self.results if r.test_name == 'performance_indicators' and r.status == 'WARNING']
        if performance_warnings:
            recommendations.append("⚡ Consider adding database indexes for better performance")

        # Check for consistency issues
        consistency_warnings = [r for r in self.results if r.test_name == 'data_consistency' and r.status == 'WARNING']
        if consistency_warnings:
            recommendations.append("🔍 Investigate data consistency issues")

        # Check for security concerns
        security_warnings = [r for r in self.results if r.test_name == 'security_configuration' and r.status == 'WARNING']
        if security_warnings:
            recommendations.append("🔐 Review database security configuration")

        if not recommendations:
            recommendations.append("✅ Database integrity validation passed - no critical issues found")

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
    # Database configuration
    db_config = DatabaseConfig(
        host=os.getenv('SUPABASE_HOST', 'db.fsopilxzaaukmcqcskqm.supabase.co'),
        port=int(os.getenv('SUPABASE_PORT', '5432')),
        database=os.getenv('SUPABASE_DATABASE', 'postgres'),
        username=os.getenv('SUPABASE_USER', 'postgres'),
        password=os.getenv('SUPABASE_PASSWORD', '')
    )

    # Initialize validator
    validator = DatabaseIntegrityValidator(db_config)

    # Run validation
    report = validator.run_comprehensive_validation()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"database_integrity_validation_{timestamp}.json"

    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)

    # Print summary
    print(f"\n{'='*60}")
    print("DATABASE INTEGRITY VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Status: {report['overall_status']}")
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
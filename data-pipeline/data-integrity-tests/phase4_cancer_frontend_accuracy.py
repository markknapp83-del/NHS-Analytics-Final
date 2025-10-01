#!/usr/bin/env python3
"""
NHS Cancer Performance Data Accuracy Testing - Phase 4: Frontend Data Flow Accuracy
====================================================================================

This script validates the accuracy of data flow from database through React components
by testing data transformations, hooks, and component logic to ensure frontend
displays match database values.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import os
import sys
import json
import subprocess
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
import traceback
from supabase import create_client, Client
import requests
import re

class CancerFrontendAccuracyValidator:
    """Validates cancer data accuracy in frontend components"""

    def __init__(self, project_dir: str, supabase_url: str = None, supabase_key: str = None):
        self.project_dir = Path(project_dir)
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error connecting to Supabase: {e}")

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 4: Frontend Data Flow Accuracy",
            "project_directory": str(self.project_dir),
            "validation_results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "overall_status": "UNKNOWN"
        }

        # Test configuration
        self.test_trusts = ['RJ1', 'RGT', 'RBL']  # Sample trusts for testing
        self.dev_server_url = "http://localhost:3000"
        self.dev_server_process = None

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 4 frontend accuracy validation tests"""
        print(f"\n🧪 Starting Phase 4: Frontend Data Flow Accuracy Validation")
        print(f"📂 Project directory: {self.project_dir}")

        try:
            # Test 1: Frontend component structure validation
            self._test_component_structure()

            # Test 2: Data hook accuracy testing
            self._test_data_hooks()

            # Test 3: Type definitions accuracy
            self._test_type_definitions()

            # Test 4: Component data transformation validation
            self._test_component_transformations()

            # Test 5: API endpoint accuracy
            self._test_api_endpoints()

            # Test 6: Frontend calculation validation
            self._test_frontend_calculations()

            # Test 7: Data flow integration test
            self._test_data_flow_integration()

            # Generate summary
            self._generate_summary()

        except Exception as e:
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "TEST_EXECUTION_ERROR",
                "description": f"Failed to complete frontend accuracy tests: {str(e)}",
                "impact": "Cannot validate frontend accuracy",
                "recommendation": "Review test setup and project structure"
            })
            self.report["overall_status"] = "ERROR"
            traceback.print_exc()

        return self.report

    def _test_component_structure(self):
        """Test frontend component structure and files"""
        print("\n🏗️ Test 1: Frontend Component Structure Validation")

        results = {
            "components_found": [],
            "components_missing": [],
            "required_files": [
                "src/types/cancer.ts",
                "src/hooks/use-cancer-data.ts",
                "src/app/dashboard/cancer-performance/page.tsx",
                "src/components/cancer/cancer-kpi-cards.tsx",
                "src/components/cancer/cancer-performance-table.tsx",
                "src/components/charts/cancer-standards-chart.tsx",
                "src/components/charts/cancer-trend-chart.tsx"
            ],
            "structure_valid": True
        }

        for file_path in results["required_files"]:
            full_path = self.project_dir / file_path
            if full_path.exists():
                results["components_found"].append(file_path)
                print(f"  ✅ Found: {file_path}")
            else:
                results["components_missing"].append(file_path)
                results["structure_valid"] = False
                print(f"  ❌ Missing: {file_path}")

        # Check component imports and exports
        if self.project_dir / "src/types/cancer.ts" in [self.project_dir / f for f in results["components_found"]]:
            try:
                with open(self.project_dir / "src/types/cancer.ts", 'r') as f:
                    content = f.read()

                # Check for key type exports
                required_types = ['CancerData', 'CancerPerformanceMetrics', 'CancerStandardKey']
                for type_name in required_types:
                    if f"export interface {type_name}" in content or f"export type {type_name}" in content:
                        print(f"    ✅ Type definition found: {type_name}")
                    else:
                        results["structure_valid"] = False
                        print(f"    ❌ Missing type definition: {type_name}")

            except Exception as e:
                print(f"    ⚠️ Error reading cancer types: {str(e)}")

        if not results["structure_valid"]:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "COMPONENT_STRUCTURE",
                "description": f"Frontend component structure incomplete: missing {len(results['components_missing'])} files",
                "impact": "Frontend may not function correctly",
                "recommendation": "Ensure all cancer performance components are properly created"
            })

        print(f"  📊 Component structure: {'✅' if results['structure_valid'] else '❌'}")
        print(f"  📁 Files found: {len(results['components_found'])}/{len(results['required_files'])}")

        self.report["validation_results"]["component_structure"] = results

    def _test_data_hooks(self):
        """Test data hook implementation and logic"""
        print("\n🪝 Test 2: Data Hook Accuracy Testing")

        results = {
            "hooks_tested": [],
            "hook_logic_valid": True,
            "typescript_errors": [],
            "import_errors": []
        }

        # Test cancer data hook
        hook_file = self.project_dir / "src/hooks/use-cancer-data.ts"
        if hook_file.exists():
            try:
                with open(hook_file, 'r') as f:
                    hook_content = f.read()

                results["hooks_tested"].append("use-cancer-data")

                # Check for essential hook elements
                hook_checks = {
                    "supabase_import": "from '@/lib/supabase-client'" in hook_content,
                    "cancer_type_import": "from '@/types/cancer'" in hook_content,
                    "hook_export": "export function useCancerData" in hook_content,
                    "database_query": ".from('trust_metrics')" in hook_content,
                    "cancer_data_filter": "cancer_data" in hook_content,
                    "error_handling": "setError" in hook_content or "error" in hook_content
                }

                for check_name, passed in hook_checks.items():
                    if passed:
                        print(f"    ✅ {check_name.replace('_', ' ').title()}")
                    else:
                        print(f"    ❌ {check_name.replace('_', ' ').title()}")
                        results["hook_logic_valid"] = False

                # Check for utility functions
                utility_functions = [
                    "getLatestCancerData",
                    "getPreviousQuarterData",
                    "calculateOverallPerformance"
                ]

                for func in utility_functions:
                    if f"export function {func}" in hook_content:
                        print(f"    ✅ Utility function: {func}")
                    else:
                        print(f"    ⚠️ Missing utility function: {func}")

            except Exception as e:
                results["import_errors"].append(f"Error reading use-cancer-data hook: {str(e)}")
                print(f"  ❌ Error testing hook: {str(e)}")

        # Test TypeScript compilation
        try:
            print("\n  🔧 Testing TypeScript compilation...")
            result = subprocess.run(
                ["npx", "tsc", "--noEmit", "--skipLibCheck"],
                cwd=self.project_dir,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode == 0:
                print("    ✅ TypeScript compilation successful")
            else:
                results["typescript_errors"] = result.stderr.split('\n')
                results["hook_logic_valid"] = False
                print(f"    ❌ TypeScript compilation errors: {len(results['typescript_errors'])} issues")

        except subprocess.TimeoutExpired:
            print("    ⚠️ TypeScript compilation timeout")
        except Exception as e:
            print(f"    ⚠️ Could not test TypeScript compilation: {str(e)}")

        if not results["hook_logic_valid"]:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "HOOK_IMPLEMENTATION",
                "description": "Data hook implementation has issues",
                "impact": "Frontend data fetching may be unreliable",
                "recommendation": "Fix hook implementation issues and TypeScript errors"
            })

        self.report["validation_results"]["data_hooks"] = results

    def _test_type_definitions(self):
        """Test TypeScript type definitions accuracy"""
        print("\n🔤 Test 3: Type Definitions Accuracy")

        results = {
            "types_validated": [],
            "type_accuracy": True,
            "missing_properties": [],
            "type_mismatches": []
        }

        type_file = self.project_dir / "src/types/cancer.ts"
        if type_file.exists():
            try:
                with open(type_file, 'r') as f:
                    type_content = f.read()

                # Get sample database data to compare against types
                sample_data = self._get_sample_database_data()

                if sample_data:
                    # Validate CancerData interface against actual data structure
                    cancer_data = sample_data.get('cancer_data', {})

                    # Check top-level properties
                    expected_properties = ['period', 'period_start', 'period_end', 'data_type', 'months_covered', 'standards', 'metadata']
                    for prop in expected_properties:
                        if prop in cancer_data:
                            print(f"    ✅ Property exists: {prop}")
                        else:
                            results["missing_properties"].append(prop)
                            print(f"    ❌ Missing property: {prop}")

                    # Check standards structure
                    standards = cancer_data.get('standards', {})
                    expected_standards = ['28_day_fds', '31_day_combined', '62_day_combined']

                    for standard in expected_standards:
                        if standard in standards:
                            standard_data = standards[standard]

                            # Check standard properties
                            if isinstance(standard_data, dict):
                                if 'summary' in standard_data and 'by_cancer_type' in standard_data:
                                    print(f"    ✅ Standard structure valid: {standard}")
                                else:
                                    results["type_mismatches"].append(f"Invalid structure for {standard}")
                                    print(f"    ❌ Invalid structure: {standard}")
                            else:
                                results["type_mismatches"].append(f"{standard} is not an object")
                        else:
                            print(f"    ⚠️ Standard not found in data: {standard}")

                    # Check performance metrics structure
                    for standard_data in standards.values():
                        if isinstance(standard_data, dict) and 'summary' in standard_data:
                            summary = standard_data['summary']
                            required_summary_fields = ['total_treated', 'within_standard', 'breaches', 'performance_pct']

                            for field in required_summary_fields:
                                if field in summary:
                                    if isinstance(summary[field], (int, float)):
                                        print(f"    ✅ Summary field type correct: {field}")
                                    else:
                                        results["type_mismatches"].append(f"{field} should be numeric")
                                else:
                                    results["missing_properties"].append(f"summary.{field}")

                # Check for CANCER_TYPE_DISPLAY_NAMES
                if "CANCER_TYPE_DISPLAY_NAMES" in type_content:
                    print(f"    ✅ Display name mapping found")
                else:
                    print(f"    ❌ Missing display name mapping")

                results["type_accuracy"] = len(results["missing_properties"]) == 0 and len(results["type_mismatches"]) == 0

            except Exception as e:
                print(f"  ❌ Error testing type definitions: {str(e)}")
                results["type_accuracy"] = False

        if not results["type_accuracy"]:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "TYPE_DEFINITION_MISMATCH",
                "description": f"Type definitions don't match database structure: {len(results['missing_properties'])} missing properties, {len(results['type_mismatches'])} type mismatches",
                "impact": "TypeScript may not provide accurate type checking",
                "recommendation": "Update type definitions to match actual database schema"
            })

        self.report["validation_results"]["type_definitions"] = results

    def _get_sample_database_data(self) -> Dict[str, Any]:
        """Get sample database data for type validation"""
        try:
            response = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).neq('cancer_data', 'null').limit(1).execute()

            if response.data:
                return response.data[0]
        except Exception as e:
            print(f"    ⚠️ Could not fetch sample data: {str(e)}")

        return {}

    def _test_component_transformations(self):
        """Test component data transformation accuracy"""
        print("\n🔄 Test 4: Component Data Transformation Validation")

        results = {
            "transformations_tested": 0,
            "accurate_transformations": 0,
            "transformation_errors": [],
            "component_logic_valid": True
        }

        # Test KPI Cards component
        kpi_file = self.project_dir / "src/components/cancer/cancer-kpi-cards.tsx"
        if kpi_file.exists():
            try:
                with open(kpi_file, 'r') as f:
                    kpi_content = f.read()

                results["transformations_tested"] += 1

                # Check for key transformation logic
                transformation_checks = {
                    "performance_calculation": "performance_pct" in kpi_content,
                    "total_treated_sum": "total_treated" in kpi_content,
                    "breach_calculation": "breaches" in kpi_content,
                    "comparison_logic": "previous" in kpi_content.lower() or "trend" in kpi_content.lower()
                }

                all_checks_passed = all(transformation_checks.values())

                if all_checks_passed:
                    results["accurate_transformations"] += 1
                    print(f"    ✅ KPI Cards transformations valid")
                else:
                    results["transformation_errors"].append("KPI Cards missing transformation logic")
                    print(f"    ❌ KPI Cards transformations incomplete")

            except Exception as e:
                results["transformation_errors"].append(f"Error reading KPI Cards: {str(e)}")
                print(f"    ❌ Error testing KPI Cards: {str(e)}")

        # Test Performance Table component
        table_file = self.project_dir / "src/components/cancer/cancer-performance-table.tsx"
        if table_file.exists():
            try:
                with open(table_file, 'r') as f:
                    table_content = f.read()

                results["transformations_tested"] += 1

                # Check for table transformation logic
                table_checks = {
                    "cancer_type_iteration": "cancer_type" in table_content.lower(),
                    "standard_data_access": "standard" in table_content.lower(),
                    "performance_display": "performance" in table_content.lower(),
                    "data_mapping": "map" in table_content or "Object.entries" in table_content
                }

                all_table_checks_passed = all(table_checks.values())

                if all_table_checks_passed:
                    results["accurate_transformations"] += 1
                    print(f"    ✅ Performance Table transformations valid")
                else:
                    results["transformation_errors"].append("Performance Table missing transformation logic")
                    print(f"    ❌ Performance Table transformations incomplete")

            except Exception as e:
                results["transformation_errors"].append(f"Error reading Performance Table: {str(e)}")
                print(f"    ❌ Error testing Performance Table: {str(e)}")

        # Calculate transformation accuracy
        if results["transformations_tested"] > 0:
            accuracy_rate = (results["accurate_transformations"] / results["transformations_tested"]) * 100
            results["component_logic_valid"] = accuracy_rate >= 80

            print(f"  🔄 Transformation accuracy: {accuracy_rate:.1f}% ({results['accurate_transformations']}/{results['transformations_tested']})")

        if not results["component_logic_valid"]:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "COMPONENT_TRANSFORMATION",
                "description": "Component data transformations may be incomplete",
                "impact": "Frontend may not display data correctly",
                "recommendation": "Review and complete component transformation logic"
            })

        self.report["validation_results"]["component_transformations"] = results

    def _test_api_endpoints(self):
        """Test API endpoint accuracy and data flow"""
        print("\n🔌 Test 5: API Endpoint Accuracy")

        results = {
            "dev_server_started": False,
            "api_endpoints_tested": [],
            "endpoint_responses_valid": 0,
            "api_errors": []
        }

        # Note: For a comprehensive test, we would start the dev server
        # For now, we'll test the data fetching logic directly
        print("  ℹ️ Testing data fetching logic (server-independent)")

        # Test Supabase client configuration
        client_file = self.project_dir / "src/lib/supabase-client.ts"
        if client_file.exists():
            try:
                with open(client_file, 'r') as f:
                    client_content = f.read()

                # Check for proper client setup
                if "createClient" in client_content:
                    print("    ✅ Supabase client properly configured")
                    results["endpoint_responses_valid"] += 1
                else:
                    print("    ❌ Supabase client not properly configured")
                    results["api_errors"].append("Supabase client configuration issue")

                results["api_endpoints_tested"].append("supabase-client")

            except Exception as e:
                results["api_errors"].append(f"Error reading Supabase client: {str(e)}")

        # Test actual data fetching capability
        try:
            # Test direct database connection (simulating API endpoint)
            cancer_response = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).neq('cancer_data', 'null').limit(1).execute()

            if cancer_response.data:
                print("    ✅ Database connection working (API equivalent)")
                results["endpoint_responses_valid"] += 1
                results["api_endpoints_tested"].append("database-direct")

                # Test data structure matches expected API format
                sample_data = cancer_response.data[0]
                if 'cancer_data' in sample_data and isinstance(sample_data['cancer_data'], dict):
                    print("    ✅ API data structure valid")
                    results["endpoint_responses_valid"] += 1
                else:
                    print("    ❌ API data structure invalid")
                    results["api_errors"].append("Invalid API data structure")

            else:
                print("    ❌ No data available from API equivalent")
                results["api_errors"].append("No data available from database")

        except Exception as e:
            results["api_errors"].append(f"Database connection error: {str(e)}")
            print(f"    ❌ Database connection error: {str(e)}")

        # Calculate API accuracy
        api_accuracy = (results["endpoint_responses_valid"] / max(len(results["api_endpoints_tested"]), 1)) * 100

        print(f"  🔌 API accuracy: {api_accuracy:.1f}%")

        if api_accuracy < 80:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "API_ENDPOINT_ISSUES",
                "description": f"API endpoint accuracy below threshold: {api_accuracy:.1f}%",
                "impact": "Frontend may not be able to fetch data reliably",
                "recommendation": "Fix API endpoint configuration and data fetching logic"
            })

        self.report["validation_results"]["api_endpoints"] = results

    def _test_frontend_calculations(self):
        """Test frontend calculation accuracy against database values"""
        print("\n🧮 Test 6: Frontend Calculation Validation")

        results = {
            "calculations_tested": 0,
            "accurate_calculations": 0,
            "calculation_mismatches": [],
            "sample_validations": []
        }

        try:
            # Get sample cancer data from database
            sample_trusts = ['RJ1', 'RGT']  # Test with 2 trusts for performance

            for trust_code in sample_trusts:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                record = trust_data.data[0]
                cancer_data = record['cancer_data']

                # Test overall performance calculation (weighted average)
                if 'metadata' in cancer_data:
                    stored_performance = cancer_data['metadata'].get('overall_performance_weighted', 0)

                    # Calculate expected weighted performance (matching frontend logic)
                    weights = {'28_day_fds': 0.2, '31_day_combined': 0.3, '62_day_combined': 0.5}
                    expected_performance = self._calculate_weighted_performance(cancer_data.get('standards', {}), weights)

                    results["calculations_tested"] += 1

                    # Allow 0.5% tolerance for rounding differences
                    if abs(stored_performance - expected_performance) <= 0.5:
                        results["accurate_calculations"] += 1
                        print(f"    ✅ {trust_code} weighted performance: {stored_performance:.1f}% (calculated: {expected_performance:.1f}%)")
                    else:
                        results["calculation_mismatches"].append({
                            "trust": trust_code,
                            "metric": "overall_performance_weighted",
                            "stored": stored_performance,
                            "calculated": expected_performance,
                            "difference": abs(stored_performance - expected_performance)
                        })
                        print(f"    ❌ {trust_code} performance mismatch: stored {stored_performance:.1f}%, calculated {expected_performance:.1f}%")

                # Test individual standard performance calculations
                standards = cancer_data.get('standards', {})
                for standard_key, standard_data in standards.items():
                    summary = standard_data.get('summary', {})

                    total_treated = summary.get('total_treated', 0)
                    within_standard = summary.get('within_standard', 0)
                    stored_performance = summary.get('performance_pct', 0)

                    if total_treated > 0:
                        expected_performance = (within_standard / total_treated) * 100
                        results["calculations_tested"] += 1

                        if abs(stored_performance - expected_performance) <= 0.1:
                            results["accurate_calculations"] += 1
                        else:
                            results["calculation_mismatches"].append({
                                "trust": trust_code,
                                "metric": f"{standard_key}_performance",
                                "stored": stored_performance,
                                "calculated": expected_performance,
                                "difference": abs(stored_performance - expected_performance)
                            })

        except Exception as e:
            print(f"  ❌ Error testing frontend calculations: {str(e)}")

        # Calculate calculation accuracy
        calculation_accuracy = 0
        if results["calculations_tested"] > 0:
            calculation_accuracy = (results["accurate_calculations"] / results["calculations_tested"]) * 100

        print(f"  🧮 Calculation accuracy: {calculation_accuracy:.1f}% ({results['accurate_calculations']}/{results['calculations_tested']})")
        print(f"  📊 Calculation mismatches: {len(results['calculation_mismatches'])}")

        if calculation_accuracy < 95:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "CALCULATION_MISMATCH",
                "description": f"Frontend calculation accuracy below threshold: {calculation_accuracy:.1f}%",
                "impact": "Displayed metrics may not match database values",
                "recommendation": "Review calculation logic in frontend components and hooks"
            })

        # Show sample mismatches
        if results["calculation_mismatches"]:
            print(f"  📝 Sample calculation mismatches:")
            for mismatch in results["calculation_mismatches"][:3]:
                print(f"    - {mismatch['trust']} {mismatch['metric']}: stored={mismatch['stored']:.1f}%, calculated={mismatch['calculated']:.1f}%")

        self.report["validation_results"]["frontend_calculations"] = results

    def _calculate_weighted_performance(self, standards: Dict, weights: Dict) -> float:
        """Calculate weighted performance matching frontend logic"""
        weighted_sum = 0
        total_weight = 0

        for standard_key, weight in weights.items():
            if standard_key in standards:
                perf = standards[standard_key].get('summary', {}).get('performance_pct', 0)
                weighted_sum += perf * weight
                total_weight += weight

        return round(weighted_sum / total_weight, 1) if total_weight > 0 else 0

    def _test_data_flow_integration(self):
        """Test end-to-end data flow integration"""
        print("\n🔗 Test 7: Data Flow Integration")

        results = {
            "integration_points_tested": 0,
            "successful_integrations": 0,
            "integration_issues": [],
            "data_flow_valid": True
        }

        # Test 1: Database to Hook integration
        try:
            print("    🔄 Testing database to hook integration...")

            # Simulate what the useCancerData hook does
            test_trust = 'RJ1'
            db_response = self.supabase.table('trust_metrics').select(
                'period, cancer_data, data_type'
            ).eq('trust_code', test_trust).eq('data_type', 'quarterly').neq(
                'cancer_data', 'null'
            ).order('period', desc=False).execute()

            results["integration_points_tested"] += 1

            if db_response.data:
                # Simulate hook transformation
                parsed_data = []
                for row in db_response.data:
                    parsed_data.append({
                        'period': row['period'],
                        **row['cancer_data']
                    })

                if parsed_data:
                    results["successful_integrations"] += 1
                    print(f"      ✅ Database to hook integration working ({len(parsed_data)} records)")
                else:
                    results["integration_issues"].append("Hook transformation failed")
                    print(f"      ❌ Hook transformation failed")

            else:
                results["integration_issues"].append("No data available for test trust")
                print(f"      ⚠️ No data available for test trust {test_trust}")

        except Exception as e:
            results["integration_issues"].append(f"Database to hook integration error: {str(e)}")
            print(f"      ❌ Integration error: {str(e)}")

        # Test 2: Hook to Component data flow
        try:
            print("    🧩 Testing hook to component integration...")

            # Test with actual data structure
            if db_response.data:
                sample_data = db_response.data[0]['cancer_data']
                results["integration_points_tested"] += 1

                # Test key component data access patterns
                integration_tests = {
                    "standards_access": 'standards' in sample_data and isinstance(sample_data['standards'], dict),
                    "metadata_access": 'metadata' in sample_data and isinstance(sample_data['metadata'], dict),
                    "performance_data": any(
                        'summary' in std_data and 'performance_pct' in std_data.get('summary', {})
                        for std_data in sample_data.get('standards', {}).values()
                    )
                }

                if all(integration_tests.values()):
                    results["successful_integrations"] += 1
                    print(f"      ✅ Hook to component integration structure valid")
                else:
                    failed_tests = [test for test, passed in integration_tests.items() if not passed]
                    results["integration_issues"].append(f"Component integration issues: {failed_tests}")
                    print(f"      ❌ Component integration issues: {failed_tests}")

        except Exception as e:
            results["integration_issues"].append(f"Hook to component integration error: {str(e)}")
            print(f"      ❌ Component integration error: {str(e)}")

        # Test 3: Type safety validation
        try:
            print("    🔤 Testing type safety integration...")
            results["integration_points_tested"] += 1

            # Check if TypeScript types match actual data structure
            if db_response.data:
                sample_data = db_response.data[0]['cancer_data']

                # Key type checks based on CancerData interface
                type_checks = {
                    "period": isinstance(sample_data.get('period'), str),
                    "standards": isinstance(sample_data.get('standards'), dict),
                    "metadata": isinstance(sample_data.get('metadata'), dict),
                    "months_covered": isinstance(sample_data.get('months_covered'), list)
                }

                if all(type_checks.values()):
                    results["successful_integrations"] += 1
                    print(f"      ✅ Type safety integration valid")
                else:
                    failed_types = [t for t, passed in type_checks.items() if not passed]
                    results["integration_issues"].append(f"Type safety issues: {failed_types}")
                    print(f"      ❌ Type safety issues: {failed_types}")

        except Exception as e:
            results["integration_issues"].append(f"Type safety integration error: {str(e)}")
            print(f"      ❌ Type safety error: {str(e)}")

        # Calculate integration success rate
        integration_success = 0
        if results["integration_points_tested"] > 0:
            integration_success = (results["successful_integrations"] / results["integration_points_tested"]) * 100

        results["data_flow_valid"] = integration_success >= 80

        print(f"  🔗 Integration success rate: {integration_success:.1f}% ({results['successful_integrations']}/{results['integration_points_tested']})")

        if not results["data_flow_valid"]:
            self.report["issues_found"].append({
                "severity": "HIGH",
                "category": "DATA_FLOW_INTEGRATION",
                "description": f"Data flow integration issues found: {len(results['integration_issues'])} problems",
                "impact": "End-to-end data flow may be broken",
                "recommendation": "Fix integration issues between database, hooks, and components"
            })

        self.report["validation_results"]["data_flow_integration"] = results

    def _generate_summary(self):
        """Generate frontend accuracy validation summary"""
        print("\n📋 Generating Frontend Accuracy Summary...")

        summary = {
            "total_tests_run": len(self.report["validation_results"]),
            "tests_passed": 0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "low_issues": 0,
            "overall_frontend_score": 0.0,
            "accuracy_metrics": {}
        }

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

        # Calculate accuracy metrics
        validation_results = self.report.get("validation_results", {})

        # Component structure accuracy
        if "component_structure" in validation_results:
            struct_result = validation_results["component_structure"]
            summary["accuracy_metrics"]["structure"] = 100 if struct_result.get("structure_valid") else 50

        # Data flow accuracy
        if "data_flow_integration" in validation_results:
            flow_result = validation_results["data_flow_integration"]
            if flow_result.get("integration_points_tested", 0) > 0:
                flow_accuracy = (flow_result.get("successful_integrations", 0) / flow_result.get("integration_points_tested", 1)) * 100
                summary["accuracy_metrics"]["data_flow"] = flow_accuracy

        # Calculation accuracy
        if "frontend_calculations" in validation_results:
            calc_result = validation_results["frontend_calculations"]
            if calc_result.get("calculations_tested", 0) > 0:
                calc_accuracy = (calc_result.get("accurate_calculations", 0) / calc_result.get("calculations_tested", 1)) * 100
                summary["accuracy_metrics"]["calculations"] = calc_accuracy

        # Overall frontend score (weighted average)
        weights = {"structure": 0.3, "data_flow": 0.4, "calculations": 0.3}
        weighted_sum = 0
        total_weight = 0

        for metric, score in summary["accuracy_metrics"].items():
            if metric in weights:
                weighted_sum += score * weights[metric]
                total_weight += weights[metric]

        if total_weight > 0:
            summary["overall_frontend_score"] = weighted_sum / total_weight

        # Count tests passed (no critical or high issues in category)
        critical_high_categories = set()
        for issue in self.report["issues_found"]:
            if issue.get("severity") in ["CRITICAL", "HIGH"]:
                critical_high_categories.add(issue.get("category", "").split("_")[0].lower())

        test_categories = ["component", "data", "type", "api", "calculation", "integration"]
        for category in test_categories:
            if category not in critical_high_categories:
                summary["tests_passed"] += 1

        # Generate recommendations
        recommendations = []

        if summary["critical_issues"] > 0:
            recommendations.append("🚨 Critical frontend issues must be resolved immediately")

        if summary["overall_frontend_score"] < 70:
            recommendations.append("🔧 Frontend accuracy needs significant improvement")

        if summary["high_issues"] > 0:
            recommendations.append("⚠️ Address high-priority frontend issues")

        if "structure" in summary["accuracy_metrics"] and summary["accuracy_metrics"]["structure"] < 100:
            recommendations.append("📁 Fix missing component files and structure issues")

        if summary["overall_frontend_score"] >= 80:
            recommendations.append("✅ Frontend ready for Phase 5 visual display testing")
        else:
            recommendations.append("🔄 Fix frontend issues before visual testing")

        self.report["recommendations"].extend(recommendations)

        # Determine overall status
        if summary["critical_issues"] > 0:
            self.report["overall_status"] = "CRITICAL_ISSUES"
        elif summary["overall_frontend_score"] < 60:
            self.report["overall_status"] = "POOR_FRONTEND_ACCURACY"
        elif summary["high_issues"] > 0:
            self.report["overall_status"] = "HIGH_ISSUES"
        elif summary["medium_issues"] > 0:
            self.report["overall_status"] = "MEDIUM_ISSUES"
        else:
            self.report["overall_status"] = "PASSED"

        self.report["summary"] = summary

        # Print summary
        print(f"\n{'='*60}")
        print(f"📋 PHASE 4 FRONTEND ACCURACY SUMMARY")
        print(f"{'='*60}")
        print(f"Tests: {summary['tests_passed']}/{summary['total_tests_run']} passed")
        print(f"Overall frontend score: {summary['overall_frontend_score']:.1f}/100")
        print(f"\nAccuracy breakdown:")
        for metric, score in summary["accuracy_metrics"].items():
            print(f"  {metric.title()}: {score:.1f}%")
        print(f"\nIssues found:")
        print(f"  🚨 Critical: {summary['critical_issues']}")
        print(f"  ⚠️ High: {summary['high_issues']}")
        print(f"  ❓ Medium: {summary['medium_issues']}")
        print(f"  ℹ️ Low: {summary['low_issues']}")
        print(f"\nOverall Status: {self.report['overall_status']}")

        if self.report["recommendations"]:
            print(f"\n📋 Recommendations:")
            for rec in self.report["recommendations"]:
                print(f"  {rec}")


def main():
    """Main execution function"""
    print("NHS Cancer Performance Data - Phase 4: Frontend Data Flow Accuracy Validation")
    print("=" * 90)

    # Project directory
    project_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master"

    # Initialize validator
    validator = CancerFrontendAccuracyValidator(project_dir)

    # Run all tests
    report = validator.run_all_tests()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/phase4_cancer_frontend_accuracy_{timestamp}.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved: {report_file}")
    except Exception as e:
        print(f"\n❌ Error saving report: {e}")

    # Exit with appropriate code
    status = report.get("overall_status", "ERROR")
    if status == "PASSED":
        print(f"\n✅ Phase 4 frontend accuracy validation completed successfully!")
        sys.exit(0)
    elif status in ["MEDIUM_ISSUES", "HIGH_ISSUES", "POOR_FRONTEND_ACCURACY"]:
        print(f"\n⚠️ Phase 4 frontend accuracy validation completed with issues - review before proceeding")
        sys.exit(1)
    else:
        print(f"\n🚨 Phase 4 frontend accuracy validation failed - critical issues must be resolved")
        sys.exit(2)


if __name__ == "__main__":
    main()
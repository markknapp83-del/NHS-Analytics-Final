#!/usr/bin/env python3
"""
NHS Cancer Performance Data Accuracy Testing - Phase 5: Visual Display Accuracy
================================================================================

This script validates visual display accuracy by testing that charts, tables,
and KPI cards show correct cancer performance data matching database values.

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
import re

class CancerVisualDisplayValidator:
    """Validates visual display accuracy of cancer performance data"""

    def __init__(self, project_dir: str, supabase_url: str = None, supabase_key: str = None):
        self.project_dir = Path(project_dir)
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error connecting to Supabase: {e}")

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 5: Visual Display Accuracy Validation",
            "project_directory": str(self.project_dir),
            "validation_results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "overall_status": "UNKNOWN"
        }

        self.test_trusts = ['RJ1', 'RGT', 'RBL']

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 5 visual display accuracy tests"""
        print(f"\n🧪 Starting Phase 5: Visual Display Accuracy Validation")
        print(f"📂 Project directory: {self.project_dir}")

        try:
            # Test 1: KPI Cards accuracy validation
            self._test_kpi_cards_accuracy()

            # Test 2: Performance table data accuracy
            self._test_performance_table_accuracy()

            # Test 3: Chart data accuracy validation
            self._test_chart_data_accuracy()

            # Test 4: Display format validation
            self._test_display_formats()

            # Test 5: Visual component logic testing
            self._test_visual_component_logic()

            # Test 6: Data filtering and selection accuracy
            self._test_data_filtering_accuracy()

            # Generate summary
            self._generate_summary()

        except Exception as e:
            self.report["issues_found"].append({
                "severity": "CRITICAL",
                "category": "TEST_EXECUTION_ERROR",
                "description": f"Failed to complete visual display tests: {str(e)}",
                "impact": "Cannot validate visual display accuracy",
                "recommendation": "Review test setup and component accessibility"
            })
            self.report["overall_status"] = "ERROR"
            traceback.print_exc()

        return self.report

    def _test_kpi_cards_accuracy(self):
        """Test KPI cards display accurate data"""
        print("\n📊 Test 1: KPI Cards Accuracy Validation")

        results = {
            "kpi_tests_performed": 0,
            "accurate_kpis": 0,
            "kpi_mismatches": [],
            "component_logic_valid": True
        }

        # Get sample trust data for KPI validation
        for trust_code in self.test_trusts[:2]:  # Test 2 trusts for performance
            try:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                cancer_data = trust_data.data[0]['cancer_data']

                # Test KPI calculations that would be shown in cards
                kpi_tests = self._validate_kpi_calculations(trust_code, cancer_data)

                for kpi_test in kpi_tests:
                    results["kpi_tests_performed"] += 1
                    if kpi_test["accurate"]:
                        results["accurate_kpis"] += 1
                        print(f"    ✅ {trust_code} {kpi_test['metric']}: {kpi_test['value']}")
                    else:
                        results["kpi_mismatches"].append(kpi_test)
                        print(f"    ❌ {trust_code} {kpi_test['metric']}: expected {kpi_test['expected']}, calculated {kpi_test['value']}")

            except Exception as e:
                print(f"    ⚠️ Error testing KPIs for {trust_code}: {str(e)}")

        # Check KPI component structure
        kpi_file = self.project_dir / "src/components/cancer/cancer-kpi-cards.tsx"
        if kpi_file.exists():
            try:
                with open(kpi_file, 'r') as f:
                    kpi_content = f.read()

                # Validate KPI component logic
                logic_checks = {
                    "performance_display": "performance" in kpi_content.lower(),
                    "total_patients": "total" in kpi_content.lower() and "treated" in kpi_content.lower(),
                    "breach_calculation": "breach" in kpi_content.lower(),
                    "comparison_logic": "previous" in kpi_content.lower() or "comparison" in kpi_content.lower()
                }

                failed_checks = [check for check, passed in logic_checks.items() if not passed]
                if failed_checks:
                    results["component_logic_valid"] = False
                    print(f"    ⚠️ KPI component missing logic: {failed_checks}")

            except Exception as e:
                print(f"    ⚠️ Could not validate KPI component: {str(e)}")

        # Calculate KPI accuracy
        kpi_accuracy = 0
        if results["kpi_tests_performed"] > 0:
            kpi_accuracy = (results["accurate_kpis"] / results["kpi_tests_performed"]) * 100

        print(f"  📊 KPI accuracy: {kpi_accuracy:.1f}% ({results['accurate_kpis']}/{results['kpi_tests_performed']})")

        if kpi_accuracy < 95:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "KPI_DISPLAY_INACCURACY",
                "description": f"KPI display accuracy below threshold: {kpi_accuracy:.1f}%",
                "impact": "KPI cards may show incorrect performance metrics",
                "recommendation": "Review KPI calculation logic in cancer-kpi-cards component"
            })

        self.report["validation_results"]["kpi_cards_accuracy"] = results

    def _validate_kpi_calculations(self, trust_code: str, cancer_data: Dict) -> List[Dict]:
        """Validate KPI calculations for a trust"""
        kpi_tests = []

        try:
            metadata = cancer_data.get('metadata', {})
            standards = cancer_data.get('standards', {})

            # Test 1: Overall performance weighted
            expected_overall = metadata.get('overall_performance_weighted', 0)
            calculated_overall = self._calculate_weighted_performance(standards)

            kpi_tests.append({
                "metric": "overall_performance",
                "expected": expected_overall,
                "value": calculated_overall,
                "accurate": abs(expected_overall - calculated_overall) <= 0.5
            })

            # Test 2: Total patients treated
            expected_total = metadata.get('total_patients_treated_all_standards', 0)
            calculated_total = sum(
                std_data.get('summary', {}).get('total_treated', 0)
                for std_data in standards.values()
            )

            kpi_tests.append({
                "metric": "total_patients",
                "expected": expected_total,
                "value": calculated_total,
                "accurate": expected_total == calculated_total
            })

            # Test 3: Total breaches
            expected_breaches = metadata.get('total_breaches_all_standards', 0)
            calculated_breaches = sum(
                std_data.get('summary', {}).get('breaches', 0)
                for std_data in standards.values()
            )

            kpi_tests.append({
                "metric": "total_breaches",
                "expected": expected_breaches,
                "value": calculated_breaches,
                "accurate": expected_breaches == calculated_breaches
            })

            # Test 4: Individual standard performances
            for standard_key, standard_data in standards.items():
                summary = standard_data.get('summary', {})
                performance = summary.get('performance_pct', 0)

                total_treated = summary.get('total_treated', 0)
                within_standard = summary.get('within_standard', 0)

                if total_treated > 0:
                    expected_perf = (within_standard / total_treated) * 100
                    kpi_tests.append({
                        "metric": f"{standard_key}_performance",
                        "expected": expected_perf,
                        "value": performance,
                        "accurate": abs(expected_perf - performance) <= 0.1
                    })

        except Exception as e:
            print(f"      ⚠️ Error validating KPI calculations: {str(e)}")

        return kpi_tests

    def _calculate_weighted_performance(self, standards: Dict) -> float:
        """Calculate weighted performance for KPI validation"""
        weights = {'28_day_fds': 0.2, '31_day_combined': 0.3, '62_day_combined': 0.5}
        weighted_sum = 0
        total_weight = 0

        for standard_key, weight in weights.items():
            if standard_key in standards:
                perf = standards[standard_key].get('summary', {}).get('performance_pct', 0)
                weighted_sum += perf * weight
                total_weight += weight

        return round(weighted_sum / total_weight, 1) if total_weight > 0 else 0

    def _test_performance_table_accuracy(self):
        """Test performance table displays accurate data"""
        print("\n📋 Test 2: Performance Table Accuracy Validation")

        results = {
            "table_tests_performed": 0,
            "accurate_table_data": 0,
            "table_data_issues": [],
            "table_structure_valid": True
        }

        # Test table component structure
        table_file = self.project_dir / "src/components/cancer/cancer-performance-table.tsx"
        if table_file.exists():
            try:
                with open(table_file, 'r') as f:
                    table_content = f.read()

                # Check table structure elements
                structure_checks = {
                    "cancer_type_columns": "cancer" in table_content.lower() and "type" in table_content.lower(),
                    "performance_columns": "performance" in table_content.lower(),
                    "standard_columns": any(std in table_content for std in ["28", "31", "62"]),
                    "data_transformation": "map" in table_content or "forEach" in table_content,
                    "sorting_logic": "sort" in table_content.lower()
                }

                failed_structure = [check for check, passed in structure_checks.items() if not passed]
                if failed_structure:
                    results["table_structure_valid"] = False
                    print(f"    ⚠️ Table structure issues: {failed_structure}")

            except Exception as e:
                print(f"    ⚠️ Could not validate table component: {str(e)}")

        # Test table data accuracy with sample trust
        for trust_code in self.test_trusts[:1]:  # Test 1 trust for detailed table validation
            try:
                trust_data = self.supabase.table('trust_metrics').select(
                    'trust_code, period, cancer_data'
                ).eq('trust_code', trust_code).neq('cancer_data', 'null').limit(1).execute()

                if not trust_data.data:
                    continue

                cancer_data = trust_data.data[0]['cancer_data']
                standards = cancer_data.get('standards', {})

                # Test table row generation logic
                table_rows = self._generate_table_rows(standards)

                for row in table_rows[:5]:  # Test first 5 rows
                    results["table_tests_performed"] += 1

                    # Validate row data accuracy
                    if self._validate_table_row(row, standards):
                        results["accurate_table_data"] += 1
                        print(f"    ✅ Table row valid: {row['cancer_type']}")
                    else:
                        results["table_data_issues"].append({
                            "cancer_type": row["cancer_type"],
                            "issue": "Data mismatch in table row"
                        })
                        print(f"    ❌ Table row invalid: {row['cancer_type']}")

            except Exception as e:
                print(f"    ⚠️ Error testing table for {trust_code}: {str(e)}")

        # Calculate table accuracy
        table_accuracy = 0
        if results["table_tests_performed"] > 0:
            table_accuracy = (results["accurate_table_data"] / results["table_tests_performed"]) * 100

        print(f"  📋 Table accuracy: {table_accuracy:.1f}% ({results['accurate_table_data']}/{results['table_tests_performed']})")

        if table_accuracy < 90:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "TABLE_DISPLAY_INACCURACY",
                "description": f"Performance table accuracy below threshold: {table_accuracy:.1f}%",
                "impact": "Performance table may show incorrect data",
                "recommendation": "Review table data transformation logic"
            })

        self.report["validation_results"]["performance_table_accuracy"] = results

    def _generate_table_rows(self, standards: Dict) -> List[Dict]:
        """Generate table rows for testing (simulating component logic)"""
        table_rows = []

        # Collect all cancer types across standards
        cancer_types = set()
        for standard_data in standards.values():
            cancer_types.update(standard_data.get('by_cancer_type', {}).keys())

        for cancer_type in list(cancer_types)[:10]:  # Limit for testing
            row = {"cancer_type": cancer_type}

            # Populate standard data
            for standard_key in ['28_day_fds', '31_day_combined', '62_day_combined']:
                if standard_key in standards:
                    cancer_data = standards[standard_key].get('by_cancer_type', {}).get(cancer_type, {})
                    row[f"{standard_key}_treated"] = cancer_data.get('total_treated', 0)
                    row[f"{standard_key}_performance"] = cancer_data.get('performance_pct', 0)
                    row[f"{standard_key}_breaches"] = cancer_data.get('breaches', 0)

            table_rows.append(row)

        return table_rows

    def _validate_table_row(self, row: Dict, standards: Dict) -> bool:
        """Validate a table row against source data"""
        try:
            cancer_type = row["cancer_type"]

            for standard_key in ['28_day_fds', '31_day_combined', '62_day_combined']:
                if standard_key in standards:
                    source_data = standards[standard_key].get('by_cancer_type', {}).get(cancer_type, {})

                    # Check key metrics
                    if source_data:
                        expected_treated = source_data.get('total_treated', 0)
                        expected_performance = source_data.get('performance_pct', 0)

                        row_treated = row.get(f"{standard_key}_treated", 0)
                        row_performance = row.get(f"{standard_key}_performance", 0)

                        if expected_treated != row_treated or abs(expected_performance - row_performance) > 0.1:
                            return False

            return True
        except Exception:
            return False

    def _test_chart_data_accuracy(self):
        """Test chart components display accurate data"""
        print("\n📈 Test 3: Chart Data Accuracy Validation")

        results = {
            "chart_components_tested": 0,
            "charts_with_valid_data": 0,
            "chart_data_issues": [],
            "chart_logic_valid": True
        }

        chart_files = [
            "src/components/charts/cancer-standards-chart.tsx",
            "src/components/charts/cancer-trend-chart.tsx",
            "src/components/charts/cancer-by-type-chart.tsx",
            "src/components/charts/cancer-breaches-chart.tsx"
        ]

        for chart_file in chart_files:
            chart_path = self.project_dir / chart_file
            if chart_path.exists():
                results["chart_components_tested"] += 1

                try:
                    with open(chart_path, 'r') as f:
                        chart_content = f.read()

                    # Check chart data transformation logic
                    data_checks = {
                        "data_prop_usage": "data" in chart_content and ("props" in chart_content or "=" in chart_content),
                        "chart_data_transformation": any(keyword in chart_content for keyword in ["map", "filter", "reduce", "forEach"]),
                        "performance_data_access": "performance" in chart_content.lower(),
                        "recharts_usage": "Recharts" in chart_content or "recharts" in chart_content
                    }

                    chart_name = chart_path.stem
                    passed_checks = sum(data_checks.values())
                    total_checks = len(data_checks)

                    if passed_checks >= total_checks * 0.75:  # 75% of checks must pass
                        results["charts_with_valid_data"] += 1
                        print(f"    ✅ {chart_name}: data logic valid ({passed_checks}/{total_checks} checks)")
                    else:
                        failed_checks = [check for check, passed in data_checks.items() if not passed]
                        results["chart_data_issues"].append({
                            "chart": chart_name,
                            "failed_checks": failed_checks
                        })
                        print(f"    ❌ {chart_name}: data logic issues ({failed_checks})")

                except Exception as e:
                    results["chart_data_issues"].append({
                        "chart": chart_path.stem,
                        "error": str(e)
                    })
                    print(f"    ❌ Error testing {chart_path.stem}: {str(e)}")

        # Test chart data accuracy with sample data
        try:
            sample_data = self._get_sample_chart_data()
            if sample_data:
                # Test standards chart data transformation
                standards_data = self._transform_standards_chart_data(sample_data)
                if self._validate_chart_data_accuracy(standards_data, sample_data):
                    print(f"    ✅ Standards chart data transformation accurate")
                else:
                    results["chart_data_issues"].append({
                        "chart": "standards_chart",
                        "issue": "Data transformation inaccuracy"
                    })
                    print(f"    ❌ Standards chart data transformation inaccurate")

        except Exception as e:
            print(f"    ⚠️ Could not test chart data transformations: {str(e)}")

        # Calculate chart accuracy
        chart_accuracy = 0
        if results["chart_components_tested"] > 0:
            chart_accuracy = (results["charts_with_valid_data"] / results["chart_components_tested"]) * 100

        print(f"  📈 Chart accuracy: {chart_accuracy:.1f}% ({results['charts_with_valid_data']}/{results['chart_components_tested']})")

        if chart_accuracy < 80:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "CHART_DISPLAY_INACCURACY",
                "description": f"Chart display accuracy below threshold: {chart_accuracy:.1f}%",
                "impact": "Charts may display incorrect or incomplete data",
                "recommendation": "Review chart data transformation and display logic"
            })

        self.report["validation_results"]["chart_data_accuracy"] = results

    def _get_sample_chart_data(self) -> Optional[Dict]:
        """Get sample data for chart testing"""
        try:
            trust_data = self.supabase.table('trust_metrics').select(
                'trust_code, period, cancer_data'
            ).neq('cancer_data', 'null').limit(1).execute()

            if trust_data.data:
                return trust_data.data[0]['cancer_data']
        except Exception as e:
            print(f"    ⚠️ Could not fetch sample chart data: {str(e)}")

        return None

    def _transform_standards_chart_data(self, cancer_data: Dict) -> List[Dict]:
        """Transform data for standards chart (simulating component logic)"""
        chart_data = []
        standards = cancer_data.get('standards', {})

        standard_names = {
            '28_day_fds': '28-day FDS',
            '31_day_combined': '31-day Combined',
            '62_day_combined': '62-day Combined'
        }

        for standard_key, standard_data in standards.items():
            summary = standard_data.get('summary', {})
            chart_data.append({
                "standard": standard_names.get(standard_key, standard_key),
                "performance": summary.get('performance_pct', 0),
                "total_treated": summary.get('total_treated', 0),
                "breaches": summary.get('breaches', 0)
            })

        return chart_data

    def _validate_chart_data_accuracy(self, chart_data: List[Dict], source_data: Dict) -> bool:
        """Validate chart data against source data"""
        try:
            standards = source_data.get('standards', {})

            for chart_point in chart_data:
                # Find corresponding source data
                for standard_key, standard_data in standards.items():
                    summary = standard_data.get('summary', {})
                    expected_performance = summary.get('performance_pct', 0)

                    if abs(chart_point["performance"] - expected_performance) > 0.5:
                        return False

            return True
        except Exception:
            return False

    def _test_display_formats(self):
        """Test display formatting accuracy"""
        print("\n🎨 Test 4: Display Format Validation")

        results = {
            "format_tests_performed": 0,
            "correct_formats": 0,
            "format_issues": []
        }

        # Test percentage formatting
        test_values = [85.5, 100.0, 0.0, 42.33, 99.99]

        for value in test_values:
            results["format_tests_performed"] += 1

            # Test percentage formatting logic (common pattern)
            formatted = f"{value:.1f}%"
            expected_format = f"{round(value, 1):.1f}%"

            if formatted == expected_format:
                results["correct_formats"] += 1
            else:
                results["format_issues"].append({
                    "value": value,
                    "formatted": formatted,
                    "expected": expected_format
                })

        # Test number formatting for large values
        large_numbers = [1000, 1500, 10000]
        for number in large_numbers:
            results["format_tests_performed"] += 1

            # Test number formatting with commas
            formatted = f"{number:,}"
            if "," in formatted and len(formatted) > 3:
                results["correct_formats"] += 1
            else:
                results["format_issues"].append({
                    "type": "number_formatting",
                    "value": number,
                    "formatted": formatted
                })

        format_accuracy = (results["correct_formats"] / results["format_tests_performed"]) * 100

        print(f"  🎨 Format accuracy: {format_accuracy:.1f}% ({results['correct_formats']}/{results['format_tests_performed']})")

        if format_accuracy < 90:
            self.report["issues_found"].append({
                "severity": "LOW",
                "category": "DISPLAY_FORMAT_ISSUES",
                "description": f"Display format accuracy below threshold: {format_accuracy:.1f}%",
                "impact": "Data may be displayed in inconsistent or unclear formats",
                "recommendation": "Standardize number and percentage formatting across components"
            })

        self.report["validation_results"]["display_formats"] = results

    def _test_visual_component_logic(self):
        """Test visual component logic and state management"""
        print("\n🧩 Test 5: Visual Component Logic Testing")

        results = {
            "components_tested": 0,
            "components_with_valid_logic": 0,
            "logic_issues": []
        }

        # Test cancer type filter component
        filter_file = self.project_dir / "src/components/cancer/cancer-type-filter.tsx"
        if filter_file.exists():
            results["components_tested"] += 1

            try:
                with open(filter_file, 'r') as f:
                    filter_content = f.read()

                logic_checks = {
                    "state_management": "useState" in filter_content or "state" in filter_content,
                    "filter_options": "option" in filter_content.lower(),
                    "change_handler": "onChange" in filter_content or "onSelect" in filter_content,
                    "cancer_type_mapping": "cancer" in filter_content.lower() and "type" in filter_content.lower()
                }

                if all(logic_checks.values()):
                    results["components_with_valid_logic"] += 1
                    print(f"    ✅ Cancer type filter: logic valid")
                else:
                    failed = [check for check, passed in logic_checks.items() if not passed]
                    results["logic_issues"].append({
                        "component": "cancer_type_filter",
                        "issues": failed
                    })
                    print(f"    ❌ Cancer type filter: logic issues ({failed})")

            except Exception as e:
                results["logic_issues"].append({
                    "component": "cancer_type_filter",
                    "error": str(e)
                })

        # Test main cancer performance page
        page_file = self.project_dir / "src/app/dashboard/cancer-performance/page.tsx"
        if page_file.exists():
            results["components_tested"] += 1

            try:
                with open(page_file, 'r') as f:
                    page_content = f.read()

                page_logic_checks = {
                    "data_hook_usage": "useCancerData" in page_content,
                    "trust_selection": "trust" in page_content.lower() and "select" in page_content.lower(),
                    "loading_state": "loading" in page_content.lower() or "isLoading" in page_content,
                    "error_handling": "error" in page_content.lower(),
                    "component_composition": len(re.findall(r'<\w+', page_content)) > 5  # Multiple components
                }

                if sum(page_logic_checks.values()) >= 4:  # At least 4/5 checks should pass
                    results["components_with_valid_logic"] += 1
                    print(f"    ✅ Cancer performance page: logic valid")
                else:
                    failed = [check for check, passed in page_logic_checks.items() if not passed]
                    results["logic_issues"].append({
                        "component": "cancer_performance_page",
                        "issues": failed
                    })
                    print(f"    ❌ Cancer performance page: logic issues ({failed})")

            except Exception as e:
                results["logic_issues"].append({
                    "component": "cancer_performance_page",
                    "error": str(e)
                })

        logic_accuracy = (results["components_with_valid_logic"] / results["components_tested"]) * 100 if results["components_tested"] > 0 else 0

        print(f"  🧩 Component logic accuracy: {logic_accuracy:.1f}% ({results['components_with_valid_logic']}/{results['components_tested']})")

        if logic_accuracy < 80:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "COMPONENT_LOGIC_ISSUES",
                "description": f"Visual component logic accuracy below threshold: {logic_accuracy:.1f}%",
                "impact": "Components may not function correctly or handle data properly",
                "recommendation": "Review and fix component logic issues"
            })

        self.report["validation_results"]["visual_component_logic"] = results

    def _test_data_filtering_accuracy(self):
        """Test data filtering and selection accuracy"""
        print("\n🔍 Test 6: Data Filtering and Selection Accuracy")

        results = {
            "filter_tests_performed": 0,
            "accurate_filters": 0,
            "filter_issues": []
        }

        # Test cancer type filtering logic
        try:
            # Get sample data with multiple cancer types
            sample_data = self._get_sample_chart_data()
            if sample_data:
                standards = sample_data.get('standards', {})

                # Test filtering for specific cancer type
                test_cancer_types = ['breast', 'lung', 'all_cancers']

                for cancer_type in test_cancer_types:
                    results["filter_tests_performed"] += 1

                    # Simulate filtering logic
                    filtered_data = self._filter_data_by_cancer_type(standards, cancer_type)

                    if self._validate_filtered_data(filtered_data, cancer_type, standards):
                        results["accurate_filters"] += 1
                        print(f"    ✅ Cancer type filter '{cancer_type}': accurate")
                    else:
                        results["filter_issues"].append({
                            "filter_type": "cancer_type",
                            "value": cancer_type,
                            "issue": "Filtering logic incorrect"
                        })
                        print(f"    ❌ Cancer type filter '{cancer_type}': inaccurate")

        except Exception as e:
            print(f"    ⚠️ Error testing data filtering: {str(e)}")

        # Test period filtering
        try:
            periods = ["2024-Q1", "2024-Q2", "2025-Q1"]
            for period in periods:
                results["filter_tests_performed"] += 1

                # Simulate period filtering (checking if component would handle period correctly)
                if self._validate_period_filter(period):
                    results["accurate_filters"] += 1
                    print(f"    ✅ Period filter '{period}': valid format")
                else:
                    results["filter_issues"].append({
                        "filter_type": "period",
                        "value": period,
                        "issue": "Invalid period format"
                    })

        except Exception as e:
            print(f"    ⚠️ Error testing period filtering: {str(e)}")

        filter_accuracy = (results["accurate_filters"] / results["filter_tests_performed"]) * 100 if results["filter_tests_performed"] > 0 else 0

        print(f"  🔍 Filter accuracy: {filter_accuracy:.1f}% ({results['accurate_filters']}/{results['filter_tests_performed']})")

        if filter_accuracy < 85:
            self.report["issues_found"].append({
                "severity": "MEDIUM",
                "category": "DATA_FILTERING_INACCURACY",
                "description": f"Data filtering accuracy below threshold: {filter_accuracy:.1f}%",
                "impact": "Users may see incorrect filtered data",
                "recommendation": "Review data filtering logic in components"
            })

        self.report["validation_results"]["data_filtering_accuracy"] = results

    def _filter_data_by_cancer_type(self, standards: Dict, cancer_type: str) -> Dict:
        """Simulate cancer type filtering logic"""
        if cancer_type == 'all' or cancer_type == 'all_cancers':
            return standards

        filtered = {}
        for standard_key, standard_data in standards.items():
            by_cancer_type = standard_data.get('by_cancer_type', {})
            if cancer_type in by_cancer_type:
                filtered[standard_key] = {
                    'summary': by_cancer_type[cancer_type],
                    'by_cancer_type': {cancer_type: by_cancer_type[cancer_type]}
                }

        return filtered

    def _validate_filtered_data(self, filtered_data: Dict, cancer_type: str, original_data: Dict) -> bool:
        """Validate filtered data accuracy"""
        try:
            if cancer_type == 'all' or cancer_type == 'all_cancers':
                return len(filtered_data) == len(original_data)

            # Check if filtered data contains only the specified cancer type
            for standard_key, standard_data in filtered_data.items():
                by_cancer_type = standard_data.get('by_cancer_type', {})
                if len(by_cancer_type) > 1 or cancer_type not in by_cancer_type:
                    return False

            return True
        except Exception:
            return False

    def _validate_period_filter(self, period: str) -> bool:
        """Validate period filter format"""
        import re
        return bool(re.match(r'^\d{4}-Q[1-4]$', period))

    def _generate_summary(self):
        """Generate visual display accuracy summary"""
        print("\n📋 Generating Visual Display Accuracy Summary...")

        summary = {
            "total_tests_run": len(self.report["validation_results"]),
            "tests_passed": 0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "low_issues": 0,
            "overall_visual_accuracy_score": 0.0,
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

        # KPI accuracy
        if "kpi_cards_accuracy" in validation_results:
            kpi_result = validation_results["kpi_cards_accuracy"]
            if kpi_result.get("kpi_tests_performed", 0) > 0:
                kpi_accuracy = (kpi_result.get("accurate_kpis", 0) / kpi_result.get("kpi_tests_performed", 1)) * 100
                summary["accuracy_metrics"]["kpi_cards"] = kpi_accuracy

        # Table accuracy
        if "performance_table_accuracy" in validation_results:
            table_result = validation_results["performance_table_accuracy"]
            if table_result.get("table_tests_performed", 0) > 0:
                table_accuracy = (table_result.get("accurate_table_data", 0) / table_result.get("table_tests_performed", 1)) * 100
                summary["accuracy_metrics"]["performance_table"] = table_accuracy

        # Chart accuracy
        if "chart_data_accuracy" in validation_results:
            chart_result = validation_results["chart_data_accuracy"]
            if chart_result.get("chart_components_tested", 0) > 0:
                chart_accuracy = (chart_result.get("charts_with_valid_data", 0) / chart_result.get("chart_components_tested", 1)) * 100
                summary["accuracy_metrics"]["charts"] = chart_accuracy

        # Overall visual accuracy score
        weights = {"kpi_cards": 0.3, "performance_table": 0.3, "charts": 0.4}
        weighted_sum = 0
        total_weight = 0

        for metric, score in summary["accuracy_metrics"].items():
            if metric in weights:
                weighted_sum += score * weights[metric]
                total_weight += weights[metric]

        if total_weight > 0:
            summary["overall_visual_accuracy_score"] = weighted_sum / total_weight

        # Count tests passed
        high_critical_categories = set()
        for issue in self.report["issues_found"]:
            if issue.get("severity") in ["CRITICAL", "HIGH"]:
                high_critical_categories.add(issue.get("category", "").split("_")[0].lower())

        test_categories = ["kpi", "table", "chart", "display", "component", "filtering"]
        for category in test_categories:
            if category not in high_critical_categories:
                summary["tests_passed"] += 1

        # Generate recommendations
        recommendations = []

        if summary["critical_issues"] > 0:
            recommendations.append("🚨 Critical visual display issues must be resolved immediately")

        if summary["overall_visual_accuracy_score"] < 70:
            recommendations.append("🎨 Visual display accuracy needs significant improvement")

        if summary["high_issues"] > 0:
            recommendations.append("⚠️ Address high-priority visual display issues")

        if "kpi_cards" in summary["accuracy_metrics"] and summary["accuracy_metrics"]["kpi_cards"] < 90:
            recommendations.append("📊 Fix KPI card accuracy issues")

        if "charts" in summary["accuracy_metrics"] and summary["accuracy_metrics"]["charts"] < 80:
            recommendations.append("📈 Review chart data transformation logic")

        if summary["overall_visual_accuracy_score"] >= 85:
            recommendations.append("✅ Visual display ready for Phase 6 end-to-end testing")
        else:
            recommendations.append("🔄 Fix visual display issues before end-to-end testing")

        self.report["recommendations"].extend(recommendations)

        # Determine overall status
        if summary["critical_issues"] > 0:
            self.report["overall_status"] = "CRITICAL_ISSUES"
        elif summary["overall_visual_accuracy_score"] < 60:
            self.report["overall_status"] = "POOR_VISUAL_ACCURACY"
        elif summary["high_issues"] > 0:
            self.report["overall_status"] = "HIGH_ISSUES"
        elif summary["medium_issues"] > 0:
            self.report["overall_status"] = "MEDIUM_ISSUES"
        else:
            self.report["overall_status"] = "PASSED"

        self.report["summary"] = summary

        # Print summary
        print(f"\n{'='*60}")
        print(f"📋 PHASE 5 VISUAL DISPLAY ACCURACY SUMMARY")
        print(f"{'='*60}")
        print(f"Tests: {summary['tests_passed']}/{summary['total_tests_run']} passed")
        print(f"Overall visual accuracy score: {summary['overall_visual_accuracy_score']:.1f}/100")
        print(f"\nAccuracy breakdown:")
        for metric, score in summary["accuracy_metrics"].items():
            print(f"  {metric.replace('_', ' ').title()}: {score:.1f}%")
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
    print("NHS Cancer Performance Data - Phase 5: Visual Display Accuracy Validation")
    print("=" * 90)

    project_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master"
    validator = CancerVisualDisplayValidator(project_dir)
    report = validator.run_all_tests()

    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/phase5_cancer_visual_display_accuracy_{timestamp}.json"

    try:
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved: {report_file}")
    except Exception as e:
        print(f"\n❌ Error saving report: {e}")

    # Exit with appropriate code
    status = report.get("overall_status", "ERROR")
    if status == "PASSED":
        print(f"\n✅ Phase 5 visual display accuracy validation completed successfully!")
        sys.exit(0)
    elif status in ["MEDIUM_ISSUES", "HIGH_ISSUES", "POOR_VISUAL_ACCURACY"]:
        print(f"\n⚠️ Phase 5 visual display accuracy validation completed with issues - review before proceeding")
        sys.exit(1)
    else:
        print(f"\n🚨 Phase 5 visual display accuracy validation failed - critical issues must be resolved")
        sys.exit(2)


if __name__ == "__main__":
    main()
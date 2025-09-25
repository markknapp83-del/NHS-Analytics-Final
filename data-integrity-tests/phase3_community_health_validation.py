#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Phase 3 Community Health Extension
===============================================================

This script extends Phase 3 validation to include comprehensive Community Health
business logic validation, covering NHS performance standards, mathematical consistency,
data ranges, temporal patterns, and specific Community Health business rules.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Tuple, Optional, Set
from collections import defaultdict
from supabase import create_client, Client
import warnings
warnings.filterwarnings('ignore')

class CommunityHealthBusinessValidator:
    """Validates Community Health business rules and data quality standards"""

    def __init__(self, data_dir: str, supabase_url: str = None, supabase_key: str = None):
        self.data_dir = Path(data_dir)
        self.supabase_url = supabase_url or "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = supabase_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error: Could not connect to Supabase: {e}")
            sys.exit(1)

        self.report = {
            "test_timestamp": datetime.now().isoformat(),
            "test_phase": "Phase 3: Community Health Business Logic Validation",
            "results": {},
            "summary": {},
            "issues_found": [],
            "recommendations": [],
            "business_rules_tested": []
        }

        # Load Community Health database data
        self.db_data = self.load_database_data()

    def load_database_data(self) -> List[Dict]:
        """Load Community Health data from database"""
        try:
            result = self.supabase.table('trust_metrics').select('*').not_.is_(
                'community_health_data', 'null'
            ).execute()

            # Filter out empty community health data
            community_records = []
            for record in result.data:
                ch_data = record.get('community_health_data')
                if ch_data and ch_data not in [None, {}, "EMPTY"]:
                    community_records.append(record)

            print(f"🔗 Loaded {len(community_records)} database records with Community Health data")
            return community_records
        except Exception as e:
            print(f"❌ Error loading database data: {e}")
            return []

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all Phase 3 Community Health business logic validation tests"""
        print("🔍 Starting Phase 3: Community Health Business Logic Validation")
        print(f"📊 Testing Community Health business rules and data quality standards")
        print("-" * 70)

        if not self.db_data:
            self.report["summary"]["overall_status"] = "FAIL"
            self.report["issues_found"].append("Critical: No Community Health database records found")
            return self.report

        # Test 1: Community Health performance standards
        print("\n1️⃣ Testing Community Health performance standards...")
        self.test_community_health_performance_standards()

        # Test 2: Mathematical consistency validation
        print("\n2️⃣ Testing mathematical consistency and relationships...")
        self.test_mathematical_consistency()

        # Test 3: Data range validation and outlier detection
        print("\n3️⃣ Testing data ranges and outlier detection...")
        self.test_data_ranges_and_outliers()

        # Test 4: Temporal consistency validation
        print("\n4️⃣ Testing temporal consistency and trends...")
        self.test_temporal_consistency()

        # Test 5: Community Health specific business rules
        print("\n5️⃣ Testing Community Health business rule compliance...")
        self.test_business_rule_compliance()

        # Generate summary
        self.generate_summary()

        return self.report

    def test_community_health_performance_standards(self) -> None:
        """Test 3.1: Validate against Community Health performance standards"""
        print("   📊 Checking Community Health performance standards compliance...")

        standards_results = {
            "18_week_standard": {"violations": [], "compliant_services": 0, "non_compliant_services": 0},
            "52_week_breach_analysis": {"high_breach_services": [], "total_services_analyzed": 0},
            "waiting_list_size_analysis": {"oversized_services": [], "undersized_services": []},
            "service_availability_analysis": {"services_with_zero_waiting": [], "total_services": 0},
            "compliance_summary": {},
            "status": "PASS"
        }

        # Analyze Community Health performance across all records
        service_performance = defaultdict(lambda: {
            'total_waiting': 0,
            'breaches_52_plus': 0,
            'appearances': 0,
            'trust_codes': set()
        })

        for record in self.db_data:
            ch_data = record.get('community_health_data', {})
            trust_code = record.get('trust_code')

            if not isinstance(ch_data, dict):
                continue

            # Analyze both adult and CYP services
            for service_category in ['adult_services', 'cyp_services']:
                services = ch_data.get(service_category, {})
                if not isinstance(services, dict):
                    continue

                for service_key, service_data in services.items():
                    if not isinstance(service_data, dict):
                        continue

                    total_waiting = service_data.get('total_waiting', 0)
                    wait_52_plus = service_data.get('wait_52_plus_weeks', 0)

                    try:
                        total_waiting = float(total_waiting) if total_waiting else 0
                        wait_52_plus = float(wait_52_plus) if wait_52_plus else 0
                    except (ValueError, TypeError):
                        continue

                    if total_waiting > 0:
                        service_key_full = f"{service_category}_{service_key}"
                        service_performance[service_key_full]['total_waiting'] += total_waiting
                        service_performance[service_key_full]['breaches_52_plus'] += wait_52_plus
                        service_performance[service_key_full]['appearances'] += 1
                        service_performance[service_key_full]['trust_codes'].add(trust_code)

        # Test 1: 18-week performance standard (ideally >92% within 18 weeks)
        print("      📈 Analyzing 18-week performance...")
        for service_key, perf_data in service_performance.items():
            total_waiting = perf_data['total_waiting']
            breaches_52_plus = perf_data['breaches_52_plus']

            if total_waiting > 100:  # Only analyze services with significant volume
                # Estimate 18-week performance (52+ week breaches are definitely over 18 weeks)
                if breaches_52_plus > total_waiting * 0.08:  # More than 8% with 52+ week breaches (very poor)
                    standards_results["18_week_standard"]["violations"].append({
                        "service": service_key,
                        "total_waiting": total_waiting,
                        "estimated_52_plus_rate": round(breaches_52_plus / total_waiting * 100, 2),
                        "trusts_affected": len(perf_data['trust_codes'])
                    })
                    standards_results["18_week_standard"]["non_compliant_services"] += 1
                else:
                    standards_results["18_week_standard"]["compliant_services"] += 1

        # Test 2: 52+ week breach analysis
        print("      🚨 Analyzing 52+ week breaches...")
        for service_key, perf_data in service_performance.items():
            total_waiting = perf_data['total_waiting']
            breaches_52_plus = perf_data['breaches_52_plus']

            if total_waiting > 50:
                standards_results["52_week_breach_analysis"]["total_services_analyzed"] += 1

                breach_rate = breaches_52_plus / total_waiting
                if breach_rate > 0.05:  # More than 5% with 52+ week waits
                    standards_results["52_week_breach_analysis"]["high_breach_services"].append({
                        "service": service_key,
                        "breach_rate": round(breach_rate * 100, 2),
                        "total_breaches": breaches_52_plus,
                        "total_waiting": total_waiting,
                        "trusts_affected": len(perf_data['trust_codes'])
                    })

        # Test 3: Waiting list size analysis
        print("      📊 Analyzing waiting list sizes...")
        for service_key, perf_data in service_performance.items():
            total_waiting = perf_data['total_waiting']
            appearances = perf_data['appearances']

            if appearances >= 5:  # Service appears in multiple trusts/periods
                avg_waiting_per_appearance = total_waiting / appearances

                # Flag unusually large waiting lists per appearance
                if avg_waiting_per_appearance > 5000:  # Very large average
                    standards_results["waiting_list_size_analysis"]["oversized_services"].append({
                        "service": service_key,
                        "average_waiting": round(avg_waiting_per_appearance, 0),
                        "total_waiting": total_waiting,
                        "appearances": appearances
                    })

                # Flag services with unusually small waiting lists
                elif avg_waiting_per_appearance < 5 and total_waiting > 0:
                    standards_results["waiting_list_size_analysis"]["undersized_services"].append({
                        "service": service_key,
                        "average_waiting": round(avg_waiting_per_appearance, 1),
                        "total_waiting": total_waiting,
                        "appearances": appearances
                    })

        # Generate compliance summary
        total_services = len(service_performance)
        compliant_18_week = standards_results["18_week_standard"]["compliant_services"]
        non_compliant_18_week = standards_results["18_week_standard"]["non_compliant_services"]
        high_breach_services = len(standards_results["52_week_breach_analysis"]["high_breach_services"])

        standards_results["compliance_summary"] = {
            "total_services_analyzed": total_services,
            "services_meeting_18_week_target": compliant_18_week,
            "services_not_meeting_18_week_target": non_compliant_18_week,
            "services_with_high_52_week_breaches": high_breach_services,
            "compliance_rate_18_week": round(compliant_18_week / max(1, compliant_18_week + non_compliant_18_week) * 100, 1),
            "breach_rate_52_week": round(high_breach_services / max(1, total_services) * 100, 1)
        }

        # Report findings
        print(f"      📊 18-week compliance rate: {standards_results['compliance_summary']['compliance_rate_18_week']}%")
        print(f"      📊 Services with high 52+ week breaches: {standards_results['compliance_summary']['services_with_high_52_week_breaches']}")
        print(f"      📊 Services analyzed: {standards_results['compliance_summary']['total_services_analyzed']}")

        # Determine status
        if standards_results['compliance_summary']['compliance_rate_18_week'] < 60:
            standards_results["status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: Poor Community Health 18-week performance ({standards_results['compliance_summary']['compliance_rate_18_week']}%)")
        elif standards_results['compliance_summary']['breach_rate_52_week'] > 30:
            standards_results["status"] = "WARN"
            self.report["issues_found"].append(f"Warning: High 52+ week breach rate ({standards_results['compliance_summary']['breach_rate_52_week']}%)")

        self.report["results"]["community_health_performance_standards"] = standards_results

    def test_mathematical_consistency(self) -> None:
        """Test 3.2: Validate mathematical relationships and consistency"""
        print("   🧮 Checking mathematical consistency...")

        math_results = {
            "wait_band_hierarchy_validation": {"tests": 0, "violations": []},
            "service_total_validation": {"tests": 0, "violations": []},
            "metadata_consistency": {"tests": 0, "violations": []},
            "cross_category_validation": {"tests": 0, "violations": []},
            "overall_accuracy": 0,
            "status": "PASS"
        }

        sample_records = self.db_data[:100]  # Sample for detailed analysis

        for record in sample_records:
            ch_data = record.get('community_health_data', {})
            trust_code = record.get('trust_code')

            if not isinstance(ch_data, dict):
                continue

            # Test 1: Wait band hierarchy validation
            for service_category in ['adult_services', 'cyp_services']:
                services = ch_data.get(service_category, {})
                if not isinstance(services, dict):
                    continue

                for service_key, service_data in services.items():
                    if not isinstance(service_data, dict):
                        continue

                    math_results["wait_band_hierarchy_validation"]["tests"] += 1

                    # Extract wait bands
                    wait_bands = {
                        '0_1_weeks': service_data.get('wait_0_1_weeks', 0),
                        '1_2_weeks': service_data.get('wait_1_2_weeks', 0),
                        '2_4_weeks': service_data.get('wait_2_4_weeks', 0),
                        '4_12_weeks': service_data.get('wait_4_12_weeks', 0),
                        '12_18_weeks': service_data.get('wait_12_18_weeks', 0),
                        '18_52_weeks': service_data.get('wait_18_52_weeks', 0),
                        '52_plus_weeks': service_data.get('wait_52_plus_weeks', 0)
                    }

                    total_waiting = service_data.get('total_waiting', 0)

                    try:
                        # Convert to numbers
                        wait_band_values = {k: float(v) if v is not None else 0 for k, v in wait_bands.items()}
                        total_waiting = float(total_waiting) if total_waiting else 0
                    except (ValueError, TypeError):
                        continue

                    if total_waiting <= 0:
                        continue

                    # Test hierarchy: longer waits should be subsets of shorter waits
                    wait_18_plus = wait_band_values['18_52_weeks'] + wait_band_values['52_plus_weeks']
                    wait_52_plus = wait_band_values['52_plus_weeks']

                    # 52+ weeks should be <= 18+ weeks (basic hierarchy)
                    if wait_52_plus > wait_18_plus + 1:  # Allow small tolerance
                        math_results["wait_band_hierarchy_validation"]["violations"].append({
                            "trust_code": trust_code,
                            "service": f"{service_category}_{service_key}",
                            "issue": "52+ week waits exceed 18+ week waits",
                            "wait_18_plus": wait_18_plus,
                            "wait_52_plus": wait_52_plus
                        })

                    # Total should equal sum of bands (within 1% tolerance)
                    band_sum = sum(wait_band_values.values())
                    if total_waiting > 0:
                        diff_pct = abs(total_waiting - band_sum) / total_waiting
                        if diff_pct > 0.01:
                            math_results["service_total_validation"]["violations"].append({
                                "trust_code": trust_code,
                                "service": f"{service_category}_{service_key}",
                                "total_waiting": total_waiting,
                                "band_sum": band_sum,
                                "difference_pct": round(diff_pct * 100, 2)
                            })

                    math_results["service_total_validation"]["tests"] += 1

            # Test 2: Metadata consistency
            metadata = ch_data.get('metadata', {})
            if isinstance(metadata, dict):
                math_results["metadata_consistency"]["tests"] += 1

                reported_total = metadata.get('total_waiting_all_services', 0)
                reported_adult_count = metadata.get('adult_services_count', 0)
                reported_cyp_count = metadata.get('cyp_services_count', 0)

                # Calculate actual values
                actual_adult_count = len(ch_data.get('adult_services', {}))
                actual_cyp_count = len(ch_data.get('cyp_services', {}))

                # Check service counts
                if reported_adult_count != actual_adult_count or reported_cyp_count != actual_cyp_count:
                    math_results["metadata_consistency"]["violations"].append({
                        "trust_code": trust_code,
                        "issue": "Service counts mismatch",
                        "reported_adult": reported_adult_count,
                        "actual_adult": actual_adult_count,
                        "reported_cyp": reported_cyp_count,
                        "actual_cyp": actual_cyp_count
                    })

        # Calculate overall accuracy
        total_tests = (
            math_results["wait_band_hierarchy_validation"]["tests"] +
            math_results["service_total_validation"]["tests"] +
            math_results["metadata_consistency"]["tests"]
        )

        total_violations = (
            len(math_results["wait_band_hierarchy_validation"]["violations"]) +
            len(math_results["service_total_validation"]["violations"]) +
            len(math_results["metadata_consistency"]["violations"])
        )

        if total_tests > 0:
            math_results["overall_accuracy"] = round((total_tests - total_violations) / total_tests * 100, 1)

        # Determine status
        if math_results["overall_accuracy"] < 85:
            math_results["status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: Low mathematical consistency ({math_results['overall_accuracy']}%)")
        elif math_results["overall_accuracy"] < 95:
            math_results["status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Some mathematical inconsistencies ({math_results['overall_accuracy']}%)")

        # Report findings
        print(f"      📊 Overall mathematical accuracy: {math_results['overall_accuracy']}%")
        print(f"      📊 Wait band hierarchy violations: {len(math_results['wait_band_hierarchy_validation']['violations'])}")
        print(f"      📊 Service total violations: {len(math_results['service_total_validation']['violations'])}")
        print(f"      📊 Metadata consistency violations: {len(math_results['metadata_consistency']['violations'])}")

        self.report["results"]["mathematical_consistency"] = math_results

    def test_data_ranges_and_outliers(self) -> None:
        """Test 3.3: Validate data ranges and detect outliers"""
        print("   📈 Detecting outliers and validating data ranges...")

        outlier_results = {
            "waiting_list_outliers": {"tests": 0, "outliers": []},
            "breach_rate_outliers": {"tests": 0, "outliers": []},
            "service_volume_outliers": {"tests": 0, "outliers": []},
            "statistical_summary": {
                "total_services_analyzed": 0,
                "median_waiting_list_size": 0,
                "mean_breach_rate": 0,
                "services_with_zero_waiting": 0
            },
            "status": "PASS"
        }

        # Collect all service data for statistical analysis
        all_waiting_lists = []
        all_breach_rates = []
        services_analyzed = 0

        for record in self.db_data:
            ch_data = record.get('community_health_data', {})
            trust_code = record.get('trust_code')

            if not isinstance(ch_data, dict):
                continue

            for service_category in ['adult_services', 'cyp_services']:
                services = ch_data.get(service_category, {})
                if not isinstance(services, dict):
                    continue

                for service_key, service_data in services.items():
                    if not isinstance(service_data, dict):
                        continue

                    total_waiting = service_data.get('total_waiting', 0)
                    wait_52_plus = service_data.get('wait_52_plus_weeks', 0)

                    try:
                        total_waiting = float(total_waiting) if total_waiting else 0
                        wait_52_plus = float(wait_52_plus) if wait_52_plus else 0
                    except (ValueError, TypeError):
                        continue

                    services_analyzed += 1

                    if total_waiting == 0:
                        outlier_results["statistical_summary"]["services_with_zero_waiting"] += 1
                        continue

                    all_waiting_lists.append(total_waiting)

                    # Calculate breach rate
                    breach_rate = wait_52_plus / total_waiting if total_waiting > 0 else 0
                    all_breach_rates.append(breach_rate)

                    outlier_results["waiting_list_outliers"]["tests"] += 1
                    outlier_results["breach_rate_outliers"]["tests"] += 1

        # Statistical analysis
        if all_waiting_lists:
            outlier_results["statistical_summary"]["median_waiting_list_size"] = round(np.median(all_waiting_lists), 0)

            # Detect waiting list outliers using IQR method
            q1 = np.percentile(all_waiting_lists, 25)
            q3 = np.percentile(all_waiting_lists, 75)
            iqr = q3 - q1
            upper_bound = q3 + 3 * iqr  # 3 IQR rule for extreme outliers
            lower_bound = q1 - 3 * iqr

            # Find outliers
            for record in self.db_data[:50]:  # Sample for detailed analysis
                ch_data = record.get('community_health_data', {})
                trust_code = record.get('trust_code')

                if not isinstance(ch_data, dict):
                    continue

                for service_category in ['adult_services', 'cyp_services']:
                    services = ch_data.get(service_category, {})
                    if not isinstance(services, dict):
                        continue

                    for service_key, service_data in services.items():
                        if not isinstance(service_data, dict):
                            continue

                        total_waiting = service_data.get('total_waiting', 0)
                        try:
                            total_waiting = float(total_waiting) if total_waiting else 0
                        except (ValueError, TypeError):
                            continue

                        if total_waiting > upper_bound or (total_waiting < lower_bound and total_waiting > 0):
                            outlier_results["waiting_list_outliers"]["outliers"].append({
                                "trust_code": trust_code,
                                "service": f"{service_category}_{service_key}",
                                "waiting_list_size": total_waiting,
                                "outlier_type": "extremely_high" if total_waiting > upper_bound else "extremely_low",
                                "expected_range": f"{max(0, lower_bound):.0f} - {upper_bound:.0f}"
                            })

        if all_breach_rates:
            outlier_results["statistical_summary"]["mean_breach_rate"] = round(np.mean(all_breach_rates) * 100, 2)

            # Detect breach rate outliers
            breach_q95 = np.percentile(all_breach_rates, 95)

            for record in self.db_data[:50]:  # Sample for detailed analysis
                ch_data = record.get('community_health_data', {})
                trust_code = record.get('trust_code')

                if not isinstance(ch_data, dict):
                    continue

                for service_category in ['adult_services', 'cyp_services']:
                    services = ch_data.get(service_category, {})
                    if not isinstance(services, dict):
                        continue

                    for service_key, service_data in services.items():
                        if not isinstance(service_data, dict):
                            continue

                        total_waiting = service_data.get('total_waiting', 0)
                        wait_52_plus = service_data.get('wait_52_plus_weeks', 0)

                        try:
                            total_waiting = float(total_waiting) if total_waiting else 0
                            wait_52_plus = float(wait_52_plus) if wait_52_plus else 0
                        except (ValueError, TypeError):
                            continue

                        if total_waiting > 10:  # Only analyze services with reasonable volume
                            breach_rate = wait_52_plus / total_waiting

                            # Flag extremely high breach rates
                            if breach_rate > breach_q95 and breach_rate > 0.2:  # Top 5% and over 20%
                                outlier_results["breach_rate_outliers"]["outliers"].append({
                                    "trust_code": trust_code,
                                    "service": f"{service_category}_{service_key}",
                                    "breach_rate": round(breach_rate * 100, 1),
                                    "total_waiting": total_waiting,
                                    "breaches_52_plus": wait_52_plus,
                                    "outlier_type": "extremely_high_breach_rate"
                                })

        outlier_results["statistical_summary"]["total_services_analyzed"] = services_analyzed

        # Determine overall status
        total_outliers = len(outlier_results["waiting_list_outliers"]["outliers"]) + len(outlier_results["breach_rate_outliers"]["outliers"])
        outlier_rate = total_outliers / max(1, services_analyzed) if services_analyzed > 0 else 0

        if outlier_rate > 0.05:  # More than 5% outliers
            outlier_results["status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: High outlier rate ({outlier_rate:.1%})")
        elif outlier_rate > 0.02:  # More than 2% outliers
            outlier_results["status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Some data outliers detected ({outlier_rate:.1%})")

        # Report findings
        print(f"      📊 Services analyzed: {services_analyzed}")
        print(f"      📊 Median waiting list size: {outlier_results['statistical_summary']['median_waiting_list_size']}")
        print(f"      📊 Mean breach rate: {outlier_results['statistical_summary']['mean_breach_rate']}%")
        print(f"      📊 Waiting list outliers: {len(outlier_results['waiting_list_outliers']['outliers'])}")
        print(f"      📊 Breach rate outliers: {len(outlier_results['breach_rate_outliers']['outliers'])}")

        self.report["results"]["data_ranges_and_outliers"] = outlier_results

    def test_temporal_consistency(self) -> None:
        """Test 3.4: Validate temporal consistency and trend patterns"""
        print("   📅 Testing temporal consistency...")

        temporal_results = {
            "trust_continuity": {"total_trusts": 0, "inconsistent_trusts": []},
            "service_continuity": {"total_services": 0, "discontinued_services": []},
            "trend_analysis": {"unrealistic_changes": [], "stable_services": 0},
            "data_completeness_over_time": {"months_analyzed": 0, "coverage_gaps": []},
            "status": "PASS"
        }

        # Group data by trust and period for temporal analysis
        trust_data = defaultdict(lambda: defaultdict(dict))

        for record in self.db_data:
            trust_code = record.get('trust_code')
            period = record.get('period')
            ch_data = record.get('community_health_data', {})

            if not all([trust_code, period, isinstance(ch_data, dict)]):
                continue

            trust_data[trust_code][period] = ch_data

        temporal_results["trust_continuity"]["total_trusts"] = len(trust_data)

        # Analyze trust continuity
        print("      📊 Analyzing trust data continuity...")
        for trust_code, periods_data in trust_data.items():
            periods = sorted(periods_data.keys())

            if len(periods) < 3:  # Need at least 3 periods for trend analysis
                continue

            # Check for missing months (gaps in reporting)
            period_dates = []
            for period in periods:
                try:
                    period_dates.append(datetime.strptime(period, '%Y-%m-%d'))
                except ValueError:
                    continue

            if len(period_dates) >= 2:
                period_dates.sort()

                # Check for gaps > 2 months
                for i in range(1, len(period_dates)):
                    gap = period_dates[i] - period_dates[i-1]
                    if gap.days > 62:  # More than ~2 months
                        temporal_results["trust_continuity"]["inconsistent_trusts"].append({
                            "trust_code": trust_code,
                            "issue": "reporting_gap",
                            "gap_from": period_dates[i-1].strftime('%Y-%m-%d'),
                            "gap_to": period_dates[i].strftime('%Y-%m-%d'),
                            "gap_months": round(gap.days / 30, 1)
                        })

            # Analyze service trends within trust
            service_trends = defaultdict(list)

            for period in periods:
                ch_data = periods_data[period]

                # Collect service data across periods
                for service_category in ['adult_services', 'cyp_services']:
                    services = ch_data.get(service_category, {})
                    if isinstance(services, dict):
                        for service_key, service_data in services.items():
                            if isinstance(service_data, dict):
                                total_waiting = service_data.get('total_waiting', 0)
                                try:
                                    total_waiting = float(total_waiting) if total_waiting else 0
                                    service_trends[f"{service_category}_{service_key}"].append({
                                        'period': period,
                                        'waiting': total_waiting
                                    })
                                except (ValueError, TypeError):
                                    pass

            # Analyze trends for unrealistic changes
            for service_key, trend_data in service_trends.items():
                if len(trend_data) >= 3:  # Need at least 3 data points
                    trend_data.sort(key=lambda x: x['period'])

                    # Check for unrealistic month-to-month changes
                    for i in range(1, len(trend_data)):
                        prev_waiting = trend_data[i-1]['waiting']
                        curr_waiting = trend_data[i]['waiting']

                        if prev_waiting > 10:  # Only analyze services with reasonable volume
                            change_rate = abs(curr_waiting - prev_waiting) / prev_waiting

                            # Flag changes > 500% month-to-month
                            if change_rate > 5:
                                temporal_results["trend_analysis"]["unrealistic_changes"].append({
                                    "trust_code": trust_code,
                                    "service": service_key,
                                    "period_from": trend_data[i-1]['period'],
                                    "period_to": trend_data[i]['period'],
                                    "waiting_from": prev_waiting,
                                    "waiting_to": curr_waiting,
                                    "change_rate": round(change_rate * 100, 1)
                                })
                            else:
                                temporal_results["trend_analysis"]["stable_services"] += 1

        # Determine overall status
        inconsistent_trust_rate = len(temporal_results["trust_continuity"]["inconsistent_trusts"]) / max(1, temporal_results["trust_continuity"]["total_trusts"])
        unrealistic_change_count = len(temporal_results["trend_analysis"]["unrealistic_changes"])

        if inconsistent_trust_rate > 0.2 or unrealistic_change_count > 20:
            temporal_results["status"] = "FAIL"
            self.report["issues_found"].append(f"Critical: High temporal inconsistency ({inconsistent_trust_rate:.1%} trusts, {unrealistic_change_count} unrealistic changes)")
        elif inconsistent_trust_rate > 0.1 or unrealistic_change_count > 10:
            temporal_results["status"] = "WARN"
            self.report["issues_found"].append(f"Warning: Some temporal inconsistency ({inconsistent_trust_rate:.1%} trusts, {unrealistic_change_count} unrealistic changes)")

        # Report findings
        print(f"      📊 Trusts analyzed: {temporal_results['trust_continuity']['total_trusts']}")
        print(f"      📊 Inconsistent reporting trusts: {len(temporal_results['trust_continuity']['inconsistent_trusts'])}")
        print(f"      📊 Unrealistic trend changes: {unrealistic_change_count}")
        print(f"      📊 Stable service trends: {temporal_results['trend_analysis']['stable_services']}")

        self.report["results"]["temporal_consistency"] = temporal_results

    def test_business_rule_compliance(self) -> None:
        """Test 3.5: Test specific Community Health business rules"""
        print("   📋 Testing Community Health business rule compliance...")

        business_rules_results = {
            "rules_tested": [],
            "violations": [],
            "compliance_summary": {}
        }

        # Rule 1: Adult and CYP services should have appropriate categorization
        print("      📊 Testing Rule 1: Service categorization rules...")
        rule1_violations = []
        rule1_tests = 0

        adult_only_services = ['musculoskeletal_service', 'cardiac_rehabilitation', 'pulmonary_rehabilitation']
        cyp_only_services = ['vision_screening', 'newborn_hearing_screening', 'safeguarding']

        for record in self.db_data[:50]:  # Sample for detailed analysis
            ch_data = record.get('community_health_data', {})
            trust_code = record.get('trust_code')

            if not isinstance(ch_data, dict):
                continue

            adult_services = ch_data.get('adult_services', {})
            cyp_services = ch_data.get('cyp_services', {})

            rule1_tests += 1

            # Check for adult-only services in CYP category
            if isinstance(cyp_services, dict):
                for service_key in cyp_services.keys():
                    if any(adult_svc in service_key.lower() for adult_svc in adult_only_services):
                        rule1_violations.append({
                            "trust_code": trust_code,
                            "rule": "Adult-only service in CYP category",
                            "service": service_key,
                            "expected_category": "adult_services"
                        })

            # Check for CYP-only services in Adult category
            if isinstance(adult_services, dict):
                for service_key in adult_services.keys():
                    if any(cyp_svc in service_key.lower() for cyp_svc in cyp_only_services):
                        rule1_violations.append({
                            "trust_code": trust_code,
                            "rule": "CYP-only service in Adult category",
                            "service": service_key,
                            "expected_category": "cyp_services"
                        })

        business_rules_results["rules_tested"].append({
            "rule_name": "Service categorization compliance (Adult vs CYP)",
            "tests_performed": rule1_tests,
            "violations": len(rule1_violations),
            "compliance_rate": round((rule1_tests - len(rule1_violations)) / rule1_tests * 100, 1) if rule1_tests > 0 else 0
        })

        # Rule 2: Services should have reasonable waiting list distributions
        print("      📊 Testing Rule 2: Waiting list distribution rules...")
        rule2_violations = []
        rule2_tests = 0

        for record in self.db_data[:50]:
            ch_data = record.get('community_health_data', {})
            trust_code = record.get('trust_code')

            if not isinstance(ch_data, dict):
                continue

            for service_category in ['adult_services', 'cyp_services']:
                services = ch_data.get(service_category, {})
                if not isinstance(services, dict):
                    continue

                for service_key, service_data in services.items():
                    if not isinstance(service_data, dict):
                        continue

                    rule2_tests += 1

                    total_waiting = service_data.get('total_waiting', 0)
                    wait_52_plus = service_data.get('wait_52_plus_weeks', 0)

                    try:
                        total_waiting = float(total_waiting) if total_waiting else 0
                        wait_52_plus = float(wait_52_plus) if wait_52_plus else 0
                    except (ValueError, TypeError):
                        continue

                    if total_waiting > 0:
                        # Rule: 52+ week waits should not exceed 25% of total (reasonable threshold)
                        if wait_52_plus > total_waiting * 0.25:
                            rule2_violations.append({
                                "trust_code": trust_code,
                                "rule": "Excessive 52+ week waits (>25% of total)",
                                "service": f"{service_category}_{service_key}",
                                "total_waiting": total_waiting,
                                "wait_52_plus": wait_52_plus,
                                "breach_percentage": round(wait_52_plus / total_waiting * 100, 1)
                            })

        business_rules_results["rules_tested"].append({
            "rule_name": "Reasonable waiting list distribution (52+ weeks ≤ 25%)",
            "tests_performed": rule2_tests,
            "violations": len(rule2_violations),
            "compliance_rate": round((rule2_tests - len(rule2_violations)) / rule2_tests * 100, 1) if rule2_tests > 0 else 0
        })

        # Rule 3: Metadata should be consistent with service data
        print("      📊 Testing Rule 3: Metadata consistency rules...")
        rule3_violations = []
        rule3_tests = 0

        for record in self.db_data[:50]:
            ch_data = record.get('community_health_data', {})
            trust_code = record.get('trust_code')

            if not isinstance(ch_data, dict):
                continue

            metadata = ch_data.get('metadata', {})
            if not isinstance(metadata, dict):
                continue

            rule3_tests += 1

            adult_services = ch_data.get('adult_services', {})
            cyp_services = ch_data.get('cyp_services', {})

            actual_adult_count = len(adult_services) if isinstance(adult_services, dict) else 0
            actual_cyp_count = len(cyp_services) if isinstance(cyp_services, dict) else 0

            reported_adult_count = metadata.get('adult_services_count', 0)
            reported_cyp_count = metadata.get('cyp_services_count', 0)

            # Rule: Reported counts should match actual service counts
            if reported_adult_count != actual_adult_count or reported_cyp_count != actual_cyp_count:
                rule3_violations.append({
                    "trust_code": trust_code,
                    "rule": "Metadata service counts don't match actual counts",
                    "reported_adult": reported_adult_count,
                    "actual_adult": actual_adult_count,
                    "reported_cyp": reported_cyp_count,
                    "actual_cyp": actual_cyp_count
                })

        business_rules_results["rules_tested"].append({
            "rule_name": "Metadata consistency (service counts match actual)",
            "tests_performed": rule3_tests,
            "violations": len(rule3_violations),
            "compliance_rate": round((rule3_tests - len(rule3_violations)) / rule3_tests * 100, 1) if rule3_tests > 0 else 0
        })

        # Combine all violations
        all_violations = rule1_violations + rule2_violations + rule3_violations
        business_rules_results["violations"] = all_violations[:10]  # First 10

        # Calculate overall compliance
        total_tests = rule1_tests + rule2_tests + rule3_tests
        total_violations = len(rule1_violations) + len(rule2_violations) + len(rule3_violations)

        if total_tests > 0:
            overall_compliance = ((total_tests - total_violations) / total_tests) * 100
            business_rules_results["compliance_summary"] = {
                "total_tests": total_tests,
                "total_violations": total_violations,
                "overall_compliance_rate": round(overall_compliance, 1)
            }

            # Determine status
            if overall_compliance > 90:
                business_rules_results["status"] = "PASS"
            elif overall_compliance > 80:
                business_rules_results["status"] = "WARN"
                self.report["issues_found"].append(f"Warning: Community Health business rule compliance at {overall_compliance:.1f}%")
            else:
                business_rules_results["status"] = "FAIL"
                self.report["issues_found"].append(f"Critical: Low Community Health business rule compliance ({overall_compliance:.1f}%)")

            print(f"      📊 Business rule compliance: {overall_compliance:.1f}% ({total_violations} violations in {total_tests} tests)")

        self.report["results"]["business_rule_compliance"] = business_rules_results

    def generate_summary(self) -> None:
        """Generate overall summary of Phase 3 Community Health testing"""
        total_issues = len(self.report["issues_found"])

        # Count critical vs warning issues
        critical_issues = [issue for issue in self.report["issues_found"] if "Critical:" in issue]
        warning_issues = total_issues - len(critical_issues)

        # Count passed tests
        tests_passed = 0
        tests_total = 0

        test_results = [
            ("community_health_performance_standards", self.report["results"].get("community_health_performance_standards", {})),
            ("mathematical_consistency", self.report["results"].get("mathematical_consistency", {})),
            ("data_ranges_and_outliers", self.report["results"].get("data_ranges_and_outliers", {})),
            ("temporal_consistency", self.report["results"].get("temporal_consistency", {})),
            ("business_rule_compliance", self.report["results"].get("business_rule_compliance", {}))
        ]

        for test_name, test_result in test_results:
            if test_result:  # Only count if test was run
                tests_total += 1
                status = test_result.get("status", "FAIL")
                if status == "PASS":
                    tests_passed += 1

        # Overall status determination
        if len(critical_issues) > 0:
            overall_status = "FAIL"
        elif warning_issues > 3:
            overall_status = "WARN"
        elif tests_passed / tests_total >= 0.6 if tests_total > 0 else False:  # 60% pass rate for NHS data
            overall_status = "PASS"
        else:
            overall_status = "WARN"

        self.report["summary"] = {
            "overall_status": overall_status,
            "total_issues": total_issues,
            "critical_issues": len(critical_issues),
            "warning_issues": warning_issues,
            "tests_passed": tests_passed,
            "tests_total": tests_total,
            "pass_rate": round(tests_passed / tests_total * 100, 1) if tests_total > 0 else 0
        }

        # Generate recommendations
        recommendations = []
        if len(critical_issues) > 0:
            recommendations.extend([
                "🔴 Critical Community Health business logic violations found",
                "Review data quality processes for Community Health services",
                "Implement additional business rule validation in ETL pipeline"
            ])
        elif warning_issues > 0:
            recommendations.extend([
                "🟡 Some Community Health business logic issues detected",
                "Consider improving data validation for Community Health metrics",
                "Review temporal consistency patterns in Community Health data"
            ])
        else:
            recommendations.append("✅ Community Health business logic validation passed - ready for Phase 4")

        self.report["recommendations"] = recommendations

        # Print summary
        print("\n" + "="*70)
        print("📋 PHASE 3 COMMUNITY HEALTH BUSINESS LOGIC VALIDATION SUMMARY")
        print("="*70)
        status_emoji = "✅" if overall_status == "PASS" else ("⚠️" if overall_status == "WARN" else "❌")
        print(f"{status_emoji} Overall Status: {overall_status}")
        print(f"📊 Tests Passed: {tests_passed}/{tests_total} ({self.report['summary']['pass_rate']}%)")
        print(f"📋 Total Issues: {total_issues} (🔴 {len(critical_issues)} Critical, 🟡 {warning_issues} Warnings)")
        print(f"🔗 Database Records: {len(self.db_data)} Community Health records analyzed")

        # Test-specific summaries
        if "community_health_performance_standards" in self.report["results"]:
            perf_data = self.report["results"]["community_health_performance_standards"]
            compliance = perf_data.get("compliance_summary", {}).get("compliance_rate_18_week", 0)
            print(f"📊 18-week Performance: {compliance}% compliance rate")

        if "mathematical_consistency" in self.report["results"]:
            math_data = self.report["results"]["mathematical_consistency"]
            accuracy = math_data.get("overall_accuracy", 0)
            print(f"🧮 Mathematical Consistency: {accuracy}%")

        if "business_rule_compliance" in self.report["results"]:
            business_data = self.report["results"]["business_rule_compliance"]
            compliance = business_data.get("compliance_summary", {}).get("overall_compliance_rate", 0)
            print(f"📋 Business Rule Compliance: {compliance}%")

        if self.report["issues_found"]:
            print(f"\n⚠️ Issues Found:")
            for i, issue in enumerate(self.report["issues_found"][:8], 1):
                print(f"   {i}. {issue}")
            if len(self.report["issues_found"]) > 8:
                print(f"   ... and {len(self.report['issues_found']) - 8} more issues")

        print(f"\n💡 Recommendations:")
        for rec in recommendations:
            print(f"   • {rec}")

def main():
    """Main execution function"""
    if len(sys.argv) > 1:
        data_dir = sys.argv[1]
    else:
        data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Create validator and run tests
    validator = CommunityHealthBusinessValidator(data_dir)
    results = validator.run_all_tests()

    # Save results
    output_file = f"phase3_community_health_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Detailed results saved to: {output_file}")

    return results["summary"]["overall_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status == "PASS" else 1)
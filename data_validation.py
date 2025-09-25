#!/usr/bin/env python3
"""
Phase 4: Data Quality Validation
Ensure data integrity and completeness after batch processing
"""

import os
import sys
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from supabase import create_client, Client

@dataclass
class ValidationResult:
    """Track validation check results"""
    check_name: str
    passed: bool
    message: str
    details: Optional[Dict] = None

@dataclass
class TrustValidation:
    """Validation results for a single trust"""
    trust_code: str
    trust_name: str
    periods_with_data: int
    total_services: int
    total_waiting: int
    has_jsonb_structure: bool
    validation_issues: List[str]

class CommunityDataValidator:
    """
    Comprehensive validation of community health data integration
    """

    def __init__(self):
        self.supabase: Client = None
        self.validation_results = []
        self.trust_validations = []

        # Initialize Supabase client
        self._init_supabase()

    def _init_supabase(self):
        """Initialize Supabase client"""
        try:
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if not supabase_url or not supabase_key:
                raise ValueError("Missing Supabase credentials")

            self.supabase = create_client(supabase_url, supabase_key)
            print("✅ Supabase client initialized for validation")

        except Exception as e:
            print(f"❌ Failed to initialize Supabase: {e}")
            sys.exit(1)

    def validate_database_connectivity(self) -> ValidationResult:
        """Test basic database connectivity"""
        try:
            result = self.supabase.table('trust_metrics').select('count', count='exact').execute()

            if hasattr(result, 'count') and result.count is not None:
                return ValidationResult(
                    check_name="Database Connectivity",
                    passed=True,
                    message=f"Successfully connected - {result.count} total records",
                    details={"total_records": result.count}
                )
            else:
                return ValidationResult(
                    check_name="Database Connectivity",
                    passed=False,
                    message="Could not retrieve record count"
                )

        except Exception as e:
            return ValidationResult(
                check_name="Database Connectivity",
                passed=False,
                message=f"Connection failed: {str(e)}"
            )

    def validate_community_data_completeness(self) -> ValidationResult:
        """Check how many records have community_data populated"""
        try:
            # Get total records
            total_result = self.supabase.table('trust_metrics').select('count', count='exact').execute()
            total_records = total_result.count if hasattr(total_result, 'count') else 0

            # Get records with community_data
            community_result = self.supabase.table('trust_metrics').select('count', count='exact').neq('community_data', None).execute()
            community_records = community_result.count if hasattr(community_result, 'count') else 0

            # Get records with non-empty community_data
            non_empty_result = self.supabase.table('trust_metrics').select('count', count='exact').neq('community_data', '{}').execute()
            non_empty_records = non_empty_result.count if hasattr(non_empty_result, 'count') else 0

            percentage = (non_empty_records / total_records * 100) if total_records > 0 else 0

            return ValidationResult(
                check_name="Community Data Completeness",
                passed=percentage > 0,
                message=f"{non_empty_records}/{total_records} records have community data ({percentage:.1f}%)",
                details={
                    "total_records": total_records,
                    "records_with_community_data": community_records,
                    "records_with_non_empty_community_data": non_empty_records,
                    "percentage_populated": percentage
                }
            )

        except Exception as e:
            return ValidationResult(
                check_name="Community Data Completeness",
                passed=False,
                message=f"Validation failed: {str(e)}"
            )

    def validate_jsonb_structure(self) -> ValidationResult:
        """Validate JSONB structure integrity"""
        try:
            # Get sample records with community_data
            result = self.supabase.table('trust_metrics').select(
                'trust_code', 'trust_name', 'period', 'community_data'
            ).neq('community_data', None).limit(100).execute()

            if not result.data:
                return ValidationResult(
                    check_name="JSONB Structure",
                    passed=False,
                    message="No records with community_data found"
                )

            structure_issues = []
            valid_structures = 0

            expected_keys = ['adult_services', 'cyp_services', 'metadata']

            for record in result.data:
                trust_code = record['trust_code']
                community_data = record.get('community_data', {})

                if not isinstance(community_data, dict):
                    structure_issues.append(f"{trust_code}: community_data is not a dictionary")
                    continue

                # Check for expected top-level keys
                missing_keys = [key for key in expected_keys if key not in community_data]
                if missing_keys:
                    structure_issues.append(f"{trust_code}: Missing keys: {missing_keys}")

                # Check metadata structure
                metadata = community_data.get('metadata', {})
                if isinstance(metadata, dict):
                    expected_metadata = ['services_reported', 'total_waiting_all_services']
                    if all(key in metadata for key in expected_metadata):
                        valid_structures += 1

            success_rate = (valid_structures / len(result.data)) * 100

            return ValidationResult(
                check_name="JSONB Structure",
                passed=success_rate >= 90,
                message=f"{valid_structures}/{len(result.data)} records have valid structure ({success_rate:.1f}%)",
                details={
                    "valid_structures": valid_structures,
                    "total_checked": len(result.data),
                    "success_rate": success_rate,
                    "structure_issues": structure_issues[:10]  # First 10 issues
                }
            )

        except Exception as e:
            return ValidationResult(
                check_name="JSONB Structure",
                passed=False,
                message=f"Structure validation failed: {str(e)}"
            )

    def validate_trust_coverage(self) -> ValidationResult:
        """Validate that expected trusts have community data"""
        try:
            # Load trust mapping to know which trusts we expect
            with open('trust_mapping.json', 'r') as f:
                trust_mapping = json.load(f)

            expected_trusts = [trust['trust_code'] for trust in trust_mapping['matched_trusts']]

            # Get trusts with community data
            result = self.supabase.table('trust_metrics').select(
                'trust_code', 'trust_name'
            ).neq('community_data', None).neq('community_data', '{}').execute()

            trusts_with_data = set(record['trust_code'] for record in result.data)

            # Calculate coverage
            coverage = len(trusts_with_data) / len(expected_trusts) * 100
            missing_trusts = [code for code in expected_trusts if code not in trusts_with_data]

            return ValidationResult(
                check_name="Trust Coverage",
                passed=coverage >= 80,  # 80% minimum coverage
                message=f"{len(trusts_with_data)}/{len(expected_trusts)} trusts have community data ({coverage:.1f}%)",
                details={
                    "expected_trusts": len(expected_trusts),
                    "trusts_with_data": len(trusts_with_data),
                    "coverage_percentage": coverage,
                    "missing_trusts": missing_trusts[:10]  # First 10 missing
                }
            )

        except Exception as e:
            return ValidationResult(
                check_name="Trust Coverage",
                passed=False,
                message=f"Coverage validation failed: {str(e)}"
            )

    def validate_temporal_coverage(self) -> ValidationResult:
        """Check temporal coverage across 12 months"""
        try:
            # Get all periods with community data
            result = self.supabase.table('trust_metrics').select(
                'period'
            ).neq('community_data', None).neq('community_data', '{}').execute()

            if not result.data:
                return ValidationResult(
                    check_name="Temporal Coverage",
                    passed=False,
                    message="No records with community data found"
                )

            # Extract unique periods
            periods = set(record['period'] for record in result.data)
            period_dates = [datetime.fromisoformat(period.replace('Z', '+00:00')).date() for period in periods]
            period_months = set(date.strftime('%Y-%m') for date in period_dates)

            # Check if we have at least 10 months (allowing for some gaps)
            months_covered = len(period_months)
            target_months = 12

            return ValidationResult(
                check_name="Temporal Coverage",
                passed=months_covered >= 10,
                message=f"Community data spans {months_covered} months (target: {target_months})",
                details={
                    "months_covered": months_covered,
                    "target_months": target_months,
                    "coverage_percentage": (months_covered / target_months) * 100,
                    "covered_periods": sorted(list(period_months))
                }
            )

        except Exception as e:
            return ValidationResult(
                check_name="Temporal Coverage",
                passed=False,
                message=f"Temporal validation failed: {str(e)}"
            )

    def validate_data_quality_metrics(self) -> ValidationResult:
        """Validate data quality and calculate key metrics"""
        try:
            # Get sample of community data for analysis
            result = self.supabase.table('trust_metrics').select(
                'trust_code', 'trust_name', 'period', 'community_data'
            ).neq('community_data', None).neq('community_data', '{}').limit(200).execute()

            if not result.data:
                return ValidationResult(
                    check_name="Data Quality Metrics",
                    passed=False,
                    message="No community data records found"
                )

            metrics = {
                'total_records_analyzed': len(result.data),
                'total_patients_waiting': 0,
                'total_services_reported': 0,
                'trusts_with_52plus_breaches': 0,
                'average_services_per_trust': 0,
                'data_quality_issues': []
            }

            total_services = 0
            trusts_with_breaches = 0

            for record in result.data:
                community_data = record.get('community_data', {})
                metadata = community_data.get('metadata', {})

                # Accumulate metrics
                waiting = metadata.get('total_waiting_all_services', 0)
                services = metadata.get('services_reported', 0)

                if isinstance(waiting, (int, float)) and waiting > 0:
                    metrics['total_patients_waiting'] += waiting

                if isinstance(services, (int, float)) and services > 0:
                    total_services += services
                    metrics['total_services_reported'] += services

                # Check for 52+ week breaches
                has_breaches = False
                for service_type in ['adult_services', 'cyp_services']:
                    services_data = community_data.get(service_type, {})
                    for service_name, service_data in services_data.items():
                        if isinstance(service_data, dict):
                            breaches = service_data.get('wait_52_plus_weeks', 0)
                            if isinstance(breaches, (int, float)) and breaches > 0:
                                has_breaches = True
                                break
                    if has_breaches:
                        break

                if has_breaches:
                    trusts_with_breaches += 1

            # Calculate averages
            if len(result.data) > 0:
                metrics['average_services_per_trust'] = total_services / len(result.data)
                metrics['trusts_with_52plus_breaches'] = trusts_with_breaches

            return ValidationResult(
                check_name="Data Quality Metrics",
                passed=metrics['total_patients_waiting'] > 0,
                message=f"Analyzed {len(result.data)} records: {metrics['total_patients_waiting']:,} patients waiting across {metrics['total_services_reported']} service instances",
                details=metrics
            )

        except Exception as e:
            return ValidationResult(
                check_name="Data Quality Metrics",
                passed=False,
                message=f"Metrics validation failed: {str(e)}"
            )

    def validate_individual_trusts(self) -> List[TrustValidation]:
        """Validate individual trust data quality"""
        try:
            # Get all trusts with community data
            result = self.supabase.table('trust_metrics').select(
                'trust_code', 'trust_name', 'period', 'community_data'
            ).neq('community_data', None).neq('community_data', '{}').execute()

            if not result.data:
                return []

            # Group by trust
            trust_data = {}
            for record in result.data:
                trust_code = record['trust_code']
                if trust_code not in trust_data:
                    trust_data[trust_code] = {
                        'trust_name': record['trust_name'],
                        'records': []
                    }
                trust_data[trust_code]['records'].append(record)

            validations = []

            for trust_code, data in trust_data.items():
                trust_name = data['trust_name']
                records = data['records']

                issues = []
                total_services = 0
                total_waiting = 0
                valid_jsonb = True

                for record in records:
                    community_data = record.get('community_data', {})

                    # Check JSONB structure
                    if not isinstance(community_data, dict):
                        valid_jsonb = False
                        issues.append("Invalid JSONB structure")
                        continue

                    metadata = community_data.get('metadata', {})
                    if isinstance(metadata, dict):
                        services = metadata.get('services_reported', 0)
                        waiting = metadata.get('total_waiting_all_services', 0)

                        if isinstance(services, (int, float)):
                            total_services += services
                        if isinstance(waiting, (int, float)):
                            total_waiting += waiting

                    # Check for empty services
                    adult_services = community_data.get('adult_services', {})
                    cyp_services = community_data.get('cyp_services', {})

                    if not adult_services and not cyp_services:
                        issues.append("No service data in some periods")

                validation = TrustValidation(
                    trust_code=trust_code,
                    trust_name=trust_name,
                    periods_with_data=len(records),
                    total_services=total_services,
                    total_waiting=total_waiting,
                    has_jsonb_structure=valid_jsonb,
                    validation_issues=issues
                )

                validations.append(validation)

            return sorted(validations, key=lambda x: x.trust_code)

        except Exception as e:
            print(f"❌ Individual trust validation failed: {str(e)}")
            return []

    def run_all_validations(self) -> Dict:
        """Run all validation checks and return comprehensive results"""
        print("🔍 Starting comprehensive data validation...")

        # Database connectivity
        print("  • Checking database connectivity...")
        db_check = self.validate_database_connectivity()
        self.validation_results.append(db_check)

        # Community data completeness
        print("  • Validating community data completeness...")
        completeness_check = self.validate_community_data_completeness()
        self.validation_results.append(completeness_check)

        # JSONB structure
        print("  • Validating JSONB structure...")
        structure_check = self.validate_jsonb_structure()
        self.validation_results.append(structure_check)

        # Trust coverage
        print("  • Validating trust coverage...")
        trust_check = self.validate_trust_coverage()
        self.validation_results.append(trust_check)

        # Temporal coverage
        print("  • Validating temporal coverage...")
        temporal_check = self.validate_temporal_coverage()
        self.validation_results.append(temporal_check)

        # Data quality metrics
        print("  • Calculating data quality metrics...")
        metrics_check = self.validate_data_quality_metrics()
        self.validation_results.append(metrics_check)

        # Individual trust validation
        print("  • Validating individual trusts...")
        self.trust_validations = self.validate_individual_trusts()

        # Summary
        passed_checks = sum(1 for result in self.validation_results if result.passed)
        total_checks = len(self.validation_results)

        print(f"\n✅ Validation complete: {passed_checks}/{total_checks} checks passed")

        return {
            'validation_results': self.validation_results,
            'trust_validations': self.trust_validations,
            'summary': {
                'total_checks': total_checks,
                'passed_checks': passed_checks,
                'success_rate': (passed_checks / total_checks) * 100 if total_checks > 0 else 0,
                'timestamp': datetime.now().isoformat()
            }
        }

    def generate_validation_report(self, results: Dict) -> str:
        """Generate a comprehensive validation report"""
        report = []
        report.append("# Community Health Data Validation Report")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")

        # Summary
        summary = results['summary']
        report.append("## Validation Summary")
        report.append(f"- **Total Checks**: {summary['total_checks']}")
        report.append(f"- **Passed Checks**: {summary['passed_checks']}")
        report.append(f"- **Success Rate**: {summary['success_rate']:.1f}%")
        report.append("")

        # Individual check results
        report.append("## Detailed Results")
        for result in results['validation_results']:
            status = "✅ PASS" if result.passed else "❌ FAIL"
            report.append(f"### {result.check_name} - {status}")
            report.append(f"**Result**: {result.message}")

            if result.details:
                report.append("**Details**:")
                for key, value in result.details.items():
                    if isinstance(value, list) and len(value) > 5:
                        report.append(f"- {key}: {len(value)} items (showing first 5)")
                        for item in value[:5]:
                            report.append(f"  - {item}")
                    else:
                        report.append(f"- {key}: {value}")
            report.append("")

        # Trust validation summary
        trust_validations = results.get('trust_validations', [])
        if trust_validations:
            report.append("## Trust Validation Summary")
            report.append(f"**Total Trusts Validated**: {len(trust_validations)}")

            # Top trusts by service count
            top_trusts = sorted(trust_validations, key=lambda x: x.total_services, reverse=True)[:10]
            report.append("### Top 10 Trusts by Service Count")
            for trust in top_trusts:
                report.append(f"- **{trust.trust_code}** ({trust.trust_name}): {trust.total_services} services across {trust.periods_with_data} periods")

            # Trusts with issues
            trusts_with_issues = [t for t in trust_validations if t.validation_issues]
            if trusts_with_issues:
                report.append(f"### Trusts with Validation Issues ({len(trusts_with_issues)})")
                for trust in trusts_with_issues[:10]:
                    report.append(f"- **{trust.trust_code}**: {', '.join(trust.validation_issues)}")

        return "\n".join(report)

    def save_validation_results(self, results: Dict):
        """Save validation results to files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Save JSON results
        with open(f'data_validation_results_{timestamp}.json', 'w') as f:
            # Convert objects to dictionaries for JSON serialization
            json_results = {
                'validation_results': [
                    {
                        'check_name': r.check_name,
                        'passed': r.passed,
                        'message': r.message,
                        'details': r.details
                    }
                    for r in results['validation_results']
                ],
                'trust_validations': [
                    {
                        'trust_code': t.trust_code,
                        'trust_name': t.trust_name,
                        'periods_with_data': t.periods_with_data,
                        'total_services': t.total_services,
                        'total_waiting': t.total_waiting,
                        'has_jsonb_structure': t.has_jsonb_structure,
                        'validation_issues': t.validation_issues
                    }
                    for t in results['trust_validations']
                ],
                'summary': results['summary']
            }
            json.dump(json_results, f, indent=2)

        # Save markdown report
        report = self.generate_validation_report(results)
        with open(f'data_quality_report_{timestamp}.md', 'w') as f:
            f.write(report)

        print(f"💾 Validation results saved:")
        print(f"  - data_validation_results_{timestamp}.json")
        print(f"  - data_quality_report_{timestamp}.md")

def main():
    """Main validation execution"""
    # Load environment variables
    env_path = Path('.env.local')
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)

    try:
        # Initialize validator
        validator = CommunityDataValidator()

        # Run all validations
        results = validator.run_all_validations()

        # Generate and save report
        validator.save_validation_results(results)

        return results

    except Exception as e:
        print(f"💥 Validation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    results = main()
    if results:
        print("\n🎉 Validation completed successfully!")
        sys.exit(0)
    else:
        sys.exit(1)
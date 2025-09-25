#!/usr/bin/env python3
"""
Diagnostic Trust Analysis - Comprehensive Trust Migration Investigation
=====================================================================

This script performs detailed diagnostic analysis to identify why only 84/151 trusts
are in the database when all should be present from the CSV source.

Author: Claude Code Assistant
Date: 2025-09-24
"""

import pandas as pd
import json
from datetime import datetime
from supabase import create_client, Client
from typing import Dict, List, Set, Any

class TrustDiagnosticAnalyzer:
    """Comprehensive diagnostic analyzer for trust migration issues"""

    def __init__(self):
        # Initialize Supabase
        self.supabase_url = "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        # Load CSV data
        self.csv_data = pd.read_csv("Data/unified_monthly_data_enhanced.csv")

        self.results = {
            "timestamp": datetime.now().isoformat(),
            "database_trusts": [],
            "csv_trusts": [],
            "missing_trusts": [],
            "trust_analysis": {},
            "migration_issues": []
        }

    def step1_direct_database_query(self):
        """Step 1: Perform direct trust count query against Supabase"""
        print("🔍 STEP 1: Direct Supabase Trust Query")
        print("=" * 50)

        try:
            # Direct query for all distinct trust codes
            result = self.supabase.table('trust_metrics').select('trust_code').execute()

            # Extract unique trust codes
            db_trust_codes = sorted(set(record['trust_code'] for record in result.data))

            print(f"📊 Database Trust Query Results:")
            print(f"   Total Records Retrieved: {len(result.data)}")
            print(f"   Unique Trust Codes: {len(db_trust_codes)}")
            print(f"   First 10 Trusts: {db_trust_codes[:10]}")
            print(f"   Last 10 Trusts: {db_trust_codes[-10:]}")

            self.results["database_trusts"] = db_trust_codes

            # Also get record count per trust
            trust_counts = {}
            for record in result.data:
                trust_code = record['trust_code']
                trust_counts[trust_code] = trust_counts.get(trust_code, 0) + 1

            print(f"\n📈 Records per Trust (sample):")
            for i, (trust, count) in enumerate(sorted(trust_counts.items())[:10]):
                print(f"   {trust}: {count} records")
            if len(trust_counts) > 10:
                print(f"   ... and {len(trust_counts) - 10} more trusts")

            return db_trust_codes

        except Exception as e:
            print(f"❌ Database query failed: {e}")
            return []

    def step2_csv_comparison(self, db_trusts: List[str]):
        """Step 2: Compare against CSV source to identify missing trusts"""
        print(f"\n🔍 STEP 2: CSV vs Database Comparison")
        print("=" * 50)

        # Get CSV trust codes
        csv_trust_codes = sorted(self.csv_data['trust_code'].unique())

        # Find missing trusts
        csv_set = set(csv_trust_codes)
        db_set = set(db_trusts)

        missing_trusts = sorted(csv_set - db_set)
        extra_trusts = sorted(db_set - csv_set)

        print(f"📊 CSV Trust Analysis:")
        print(f"   Total CSV Trusts: {len(csv_trust_codes)}")
        print(f"   Total Database Trusts: {len(db_trusts)}")
        print(f"   Missing from Database: {len(missing_trusts)}")
        print(f"   Extra in Database: {len(extra_trusts)}")

        print(f"\n❌ Missing Trusts (first 20):")
        for trust in missing_trusts[:20]:
            # Get sample info for this trust
            trust_data = self.csv_data[self.csv_data['trust_code'] == trust]
            trust_name = trust_data['trust_name'].iloc[0] if len(trust_data) > 0 else "Unknown"
            record_count = len(trust_data)
            print(f"   {trust}: {trust_name[:50]}... ({record_count} records)")

        if len(missing_trusts) > 20:
            print(f"   ... and {len(missing_trusts) - 20} more missing trusts")

        if extra_trusts:
            print(f"\n➕ Extra Trusts in Database: {extra_trusts}")

        self.results["csv_trusts"] = csv_trust_codes
        self.results["missing_trusts"] = missing_trusts

        return missing_trusts

    def step3_data_quality_analysis(self, missing_trusts: List[str]):
        """Step 3: Check if missing trusts have data quality issues"""
        print(f"\n🔍 STEP 3: Data Quality Analysis for Missing Trusts")
        print("=" * 50)

        quality_issues = {}

        for trust_code in missing_trusts[:10]:  # Analyze first 10 for performance
            trust_data = self.csv_data[self.csv_data['trust_code'] == trust_code]

            if len(trust_data) == 0:
                continue

            issues = []

            # Check for data completeness
            null_counts = trust_data.isnull().sum()
            high_null_columns = null_counts[null_counts > len(trust_data) * 0.8].index.tolist()

            if len(high_null_columns) > 100:  # More than 100 columns with >80% nulls
                issues.append(f"High null rate: {len(high_null_columns)} columns >80% null")

            # Check for duplicate records
            duplicates = trust_data.duplicated(subset=['trust_code', 'period']).sum()
            if duplicates > 0:
                issues.append(f"Duplicate records: {duplicates}")

            # Check for data type issues
            numeric_cols = ['ae_attendances_total', 'trust_total_total_incomplete_pathways']
            for col in numeric_cols:
                if col in trust_data.columns:
                    non_numeric = pd.to_numeric(trust_data[col], errors='coerce').isnull().sum()
                    if non_numeric > 0:
                        issues.append(f"Non-numeric values in {col}: {non_numeric}")

            # Check period coverage
            periods = trust_data['period'].unique()
            if len(periods) < 12:
                issues.append(f"Incomplete period coverage: {len(periods)}/12 periods")

            quality_issues[trust_code] = {
                "trust_name": trust_data['trust_name'].iloc[0],
                "record_count": len(trust_data),
                "period_count": len(periods),
                "issues": issues,
                "sample_periods": sorted(periods)[:5]
            }

            print(f"   📋 {trust_code} ({trust_data['trust_name'].iloc[0][:30]}...):")
            print(f"      Records: {len(trust_data)}, Periods: {len(periods)}")
            if issues:
                for issue in issues:
                    print(f"      ⚠️ {issue}")
            else:
                print(f"      ✅ No obvious data quality issues found")

        self.results["trust_analysis"] = quality_issues
        return quality_issues

    def step4_migration_log_analysis(self):
        """Step 4: Examine migration logs for insertion failures"""
        print(f"\n🔍 STEP 4: Migration Log Analysis")
        print("=" * 50)

        try:
            # Look for recent migration log files
            import glob
            log_files = glob.glob("migration_fix_results_*.json")

            if log_files:
                # Get the most recent log file
                latest_log = sorted(log_files)[-1]
                print(f"📄 Analyzing migration log: {latest_log}")

                with open(latest_log, 'r') as f:
                    migration_data = json.load(f)

                successful = migration_data.get('successful_inserts', 0)
                failed = migration_data.get('failed_inserts', 0)
                errors = migration_data.get('errors', [])

                print(f"📊 Migration Log Summary:")
                print(f"   Successful Inserts: {successful}")
                print(f"   Failed Inserts: {failed}")
                print(f"   Total Errors: {len(errors)}")

                if errors:
                    print(f"\n❌ Error Analysis:")

                    # Categorize errors
                    error_types = {}
                    for error in errors[:20]:  # First 20 errors
                        if "duplicate key" in error:
                            error_types["duplicate_key"] = error_types.get("duplicate_key", 0) + 1
                        elif "null value" in error:
                            error_types["null_constraint"] = error_types.get("null_constraint", 0) + 1
                        elif "foreign key" in error:
                            error_types["foreign_key"] = error_types.get("foreign_key", 0) + 1
                        else:
                            error_types["other"] = error_types.get("other", 0) + 1

                    for error_type, count in error_types.items():
                        print(f"   {error_type}: {count} occurrences")

                    # Show sample errors
                    print(f"\n📝 Sample Errors:")
                    for error in errors[:5]:
                        print(f"   • {error[:100]}...")

                self.results["migration_issues"] = {
                    "log_file": latest_log,
                    "successful_inserts": successful,
                    "failed_inserts": failed,
                    "error_count": len(errors),
                    "error_sample": errors[:10]
                }

            else:
                print("📄 No migration log files found")

        except Exception as e:
            print(f"❌ Migration log analysis failed: {e}")

    def step5_comprehensive_solution(self, missing_trusts: List[str]):
        """Step 5: Provide comprehensive solution"""
        print(f"\n🔧 STEP 5: Comprehensive Solution Analysis")
        print("=" * 50)

        # Check what's actually preventing these trusts from being inserted
        solution_steps = []

        # Test if we can actually query these trusts individually
        print("🔍 Testing Individual Trust Queries:")

        for trust_code in missing_trusts[:5]:  # Test first 5
            try:
                # Check if trust exists in database under different conditions
                all_records = self.supabase.table('trust_metrics').select('*').eq('trust_code', trust_code).execute()

                if all_records.data:
                    print(f"   ⚠️ {trust_code}: Found {len(all_records.data)} records (should be included in counts!)")
                    solution_steps.append(f"Trust {trust_code} exists but not counted - query logic issue")
                else:
                    print(f"   ❌ {trust_code}: No records found")

                    # Try to insert one record for this trust to see what happens
                    csv_sample = self.csv_data[self.csv_data['trust_code'] == trust_code].iloc[0]

                    test_record = {
                        "trust_code": csv_sample['trust_code'],
                        "trust_name": csv_sample['trust_name'],
                        "period": csv_sample['period'],
                        "data_type": "monthly",
                        "rtt_data": {"test": "data"},
                        "ae_data": {"test": "data"},
                        "diagnostics_data": {"test": "data"},
                        "capacity_data": {"test": "data"}
                    }

                    print(f"      Testing insertion for {trust_code}...")
                    # Note: Not actually inserting to avoid duplicates, just testing the logic

            except Exception as e:
                print(f"   ❌ {trust_code}: Query failed - {str(e)[:100]}")

        return solution_steps

    def run_complete_diagnosis(self):
        """Run complete diagnostic analysis"""
        print("🩺 NHS TRUST MIGRATION DIAGNOSTIC ANALYSIS")
        print("=" * 60)
        print(f"🕐 Analysis Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # Step 1: Direct database query
        db_trusts = self.step1_direct_database_query()

        # Step 2: CSV comparison
        missing_trusts = self.step2_csv_comparison(db_trusts)

        # Step 3: Data quality analysis
        quality_analysis = self.step3_data_quality_analysis(missing_trusts)

        # Step 4: Migration log analysis
        self.step4_migration_log_analysis()

        # Step 5: Solution recommendations
        solutions = self.step5_comprehensive_solution(missing_trusts)

        # Save results
        output_file = f"trust_diagnostic_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        print(f"\n💾 Comprehensive diagnostic results saved to: {output_file}")

        return self.results

def main():
    """Main execution function"""
    analyzer = TrustDiagnosticAnalyzer()
    results = analyzer.run_complete_diagnosis()

    print(f"\n" + "=" * 60)
    print("🎯 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    print(f"📊 Database Trusts: {len(results['database_trusts'])}")
    print(f"📄 CSV Trusts: {len(results['csv_trusts'])}")
    print(f"❌ Missing Trusts: {len(results['missing_trusts'])}")
    print(f"🔧 Analysis Complete - Review detailed output above")

if __name__ == "__main__":
    main()
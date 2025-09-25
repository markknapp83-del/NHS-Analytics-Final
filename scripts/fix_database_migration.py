#!/usr/bin/env python3
"""
Fix Database Migration - Complete Missing Trust Data
==================================================

This script identifies and migrates missing trust data from CSV to Supabase database.
It addresses the critical issue of 67 missing NHS trusts identified in the integrity report.

Author: Claude Code Assistant
Date: 2025-09-24
"""

import os
import sys
import json
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from supabase import create_client, Client

class DatabaseMigrationFixer:
    """Fixes incomplete database migration by adding missing trust data"""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.supabase_url = "https://fsopilxzaaukmcqcskqm.supabase.co"
        self.supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

        # Initialize Supabase client
        try:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            print(f"❌ Error: Could not connect to Supabase: {e}")
            sys.exit(1)

        # Load CSV data
        self.csv_data = self.load_csv_data()

        self.results = {
            "timestamp": datetime.now().isoformat(),
            "missing_trusts_found": [],
            "migration_attempts": [],
            "successful_inserts": 0,
            "failed_inserts": 0,
            "errors": []
        }

    def load_csv_data(self) -> Optional[pd.DataFrame]:
        """Load the unified CSV data"""
        unified_csv_path = self.data_dir / "unified_monthly_data_enhanced.csv"

        if not unified_csv_path.exists():
            print("❌ Error: Could not find unified CSV file")
            return None

        try:
            df = pd.read_csv(unified_csv_path)
            print(f"📄 Loaded CSV: {len(df):,} records, {len(df.columns)} columns")
            return df
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return None

    def identify_missing_trusts(self) -> List[str]:
        """Identify trusts that exist in CSV but not in database"""
        if self.csv_data is None:
            return []

        # Get trusts from CSV
        csv_trusts = set(self.csv_data['trust_code'].unique())

        # Get trusts from database
        try:
            db_result = self.supabase.table('trust_metrics').select('trust_code').execute()
            db_trusts = set(record['trust_code'] for record in db_result.data)

            missing_trusts = list(csv_trusts - db_trusts)

            print(f"📊 CSV Trusts: {len(csv_trusts)}")
            print(f"🔗 Database Trusts: {len(db_trusts)}")
            print(f"❌ Missing Trusts: {len(missing_trusts)}")

            self.results["missing_trusts_found"] = missing_trusts

            return missing_trusts

        except Exception as e:
            print(f"❌ Error querying database: {e}")
            self.results["errors"].append(f"Database query error: {str(e)}")
            return []

    def migrate_missing_trust_data(self, missing_trusts: List[str]) -> None:
        """Migrate data for missing trusts from CSV to database"""
        print(f"\n🔄 Starting migration of {len(missing_trusts)} missing trusts...")

        for trust_code in missing_trusts:
            trust_records = self.csv_data[self.csv_data['trust_code'] == trust_code]
            print(f"\n🏥 Migrating {trust_code}: {len(trust_records)} records")

            for _, record in trust_records.iterrows():
                try:
                    db_record = self.convert_csv_to_db_record(record)

                    # Insert into database
                    result = self.supabase.table('trust_metrics').insert(db_record).execute()

                    if result.data:
                        self.results["successful_inserts"] += 1
                        print(f"  ✅ {trust_code} - {record['period']}")
                    else:
                        self.results["failed_inserts"] += 1
                        print(f"  ❌ {trust_code} - {record['period']} - No data returned")

                except Exception as e:
                    self.results["failed_inserts"] += 1
                    error_msg = f"Error inserting {trust_code} - {record.get('period', 'unknown')}: {str(e)}"
                    self.results["errors"].append(error_msg)
                    print(f"  ❌ {error_msg}")

    def convert_csv_to_db_record(self, csv_record) -> Dict[str, Any]:
        """Convert a CSV record to database format with JSONB fields"""

        # Extract RTT data
        rtt_data = self.extract_rtt_data(csv_record)

        # Extract A&E data
        ae_data = self.extract_ae_data(csv_record)

        # Extract diagnostics data
        diagnostics_data = self.extract_diagnostics_data(csv_record)

        # Extract capacity data
        capacity_data = self.extract_capacity_data(csv_record)

        db_record = {
            "trust_code": csv_record['trust_code'],
            "trust_name": csv_record['trust_name'],
            "period": csv_record['period'],
            "data_type": "monthly",  # Add required data_type field
            "rtt_data": rtt_data,
            "ae_data": ae_data,
            "diagnostics_data": diagnostics_data,
            "capacity_data": capacity_data,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        return db_record

    def extract_rtt_data(self, record) -> Dict[str, Any]:
        """Extract RTT data from CSV record"""

        # Extract specialty data
        specialties = {}
        specialty_map = {
            'general_surgery': 'rtt_general_surgery',
            'urology': 'rtt_urology',
            'trauma_orthopaedics': 'rtt_trauma_orthopaedics',
            'ent': 'rtt_ent',
            'ophthalmology': 'rtt_ophthalmology',
            'oral_surgery': 'rtt_oral_surgery',
            'cardiology': 'rtt_cardiology',
            'dermatology': 'rtt_dermatology',
            'gastroenterology': 'rtt_gastroenterology',
            'general_medicine': 'rtt_general_medicine',
            'gynecology': 'rtt_gynecology',
            'neurology': 'rtt_neurology',
            'rheumatology': 'rtt_rheumatology',
            'respiratory_medicine': 'rtt_respiratory_medicine',
            'pediatric_surgery': 'rtt_pediatric_surgery',
            'geriatric_medicine': 'rtt_geriatric_medicine',
            'medical_oncology': 'rtt_medical_oncology',
            'cardiothoracic_surgery': 'rtt_cardiothoracic_surgery',
            'restorative_dentistry': 'rtt_restorative_dentistry'
        }

        for specialty_key, csv_prefix in specialty_map.items():
            specialty_data = {}

            # Extract metrics for this specialty
            metrics = [
                'total_incomplete_pathways',
                'total_within_18_weeks',
                'total_over_18_weeks',
                'percent_within_18_weeks',
                'total_52_plus_weeks',
                'total_65_plus_weeks',
                'total_78_plus_weeks',
                'median_wait_weeks'
            ]

            for metric in metrics:
                csv_col = f"{csv_prefix}_{metric}"
                if csv_col in record.index:
                    value = record[csv_col]
                    if pd.notna(value) and value != '':
                        try:
                            # Convert numeric values
                            if 'percent' in metric:
                                specialty_data[metric] = float(value)
                            elif 'median' in metric:
                                specialty_data[metric] = float(value)
                            else:
                                specialty_data[metric] = int(float(value))
                        except (ValueError, TypeError):
                            specialty_data[metric] = None

            if specialty_data:
                specialties[specialty_key] = specialty_data

        # Extract trust total data
        trust_total = {}
        trust_metrics = [
            'trust_total_total_incomplete_pathways',
            'trust_total_total_within_18_weeks',
            'trust_total_total_over_18_weeks',
            'trust_total_percent_within_18_weeks',
            'trust_total_total_52_plus_weeks',
            'trust_total_total_65_plus_weeks',
            'trust_total_total_78_plus_weeks',
            'trust_total_median_wait_weeks'
        ]

        for metric in trust_metrics:
            if metric in record.index:
                value = record[metric]
                if pd.notna(value) and value != '':
                    try:
                        metric_key = metric.replace('trust_total_', '')
                        if 'percent' in metric_key:
                            trust_total[metric_key] = float(value)
                        elif 'median' in metric_key:
                            trust_total[metric_key] = float(value)
                        else:
                            trust_total[metric_key] = int(float(value))
                    except (ValueError, TypeError):
                        trust_total[metric_key] = None

        return {
            "specialties": specialties,
            "trust_total": trust_total
        }

    def extract_ae_data(self, record) -> Dict[str, Any]:
        """Extract A&E data from CSV record"""
        ae_data = {}

        ae_metrics = {
            'total_attendances': 'ae_attendances_total',
            'over_four_hours_total': 'ae_over_four_hours_total',
            'four_hour_performance_pct': 'ae_4hr_performance_pct',
            'emergency_admissions_total': 'ae_emergency_admissions_total',
            'twelve_hour_wait_admissions': 'ae_twelve_hour_wait_admissions'
        }

        for ae_key, csv_col in ae_metrics.items():
            if csv_col in record.index:
                value = record[csv_col]
                if pd.notna(value) and value != '':
                    try:
                        if 'pct' in ae_key:
                            ae_data[ae_key] = float(value)
                        else:
                            ae_data[ae_key] = int(float(value))
                    except (ValueError, TypeError):
                        ae_data[ae_key] = None

        return ae_data

    def extract_diagnostics_data(self, record) -> Dict[str, Any]:
        """Extract diagnostics data from CSV record"""
        diagnostics_data = {}

        # Diagnostic test types
        test_types = [
            'ct', 'mri', 'ultrasound', 'dexa', 'colonoscopy', 'gastroscopy',
            'cystoscopy', 'sigmoidoscopy', 'urodynamics', 'audiology',
            'echocardiography', 'neurophysiology', 'sleep_studies',
            'nuclear_medicine', 'electrophysiology'
        ]

        for test_type in test_types:
            test_data = {}

            metrics = [
                'total_waiting', 'waiting_list_total', 'planned_tests',
                'unscheduled_tests', '6week_breaches', '13week_breaches'
            ]

            for metric in metrics:
                csv_col = f"diag_{test_type}_{metric}"
                if csv_col in record.index:
                    value = record[csv_col]
                    if pd.notna(value) and value != '':
                        try:
                            test_data[metric] = int(float(value))
                        except (ValueError, TypeError):
                            test_data[metric] = None

            if test_data:
                diagnostics_data[test_type] = test_data

        return diagnostics_data

    def extract_capacity_data(self, record) -> Dict[str, Any]:
        """Extract capacity data from CSV record"""
        capacity_data = {}

        capacity_metrics = {
            'avg_daily_discharges': 'avg_daily_discharges',
            'virtual_ward_capacity': 'virtual_ward_capacity',
            'virtual_ward_occupancy_rate': 'virtual_ward_occupancy_rate'
        }

        for capacity_key, csv_col in capacity_metrics.items():
            if csv_col in record.index:
                value = record[csv_col]
                if pd.notna(value) and value != '':
                    try:
                        capacity_data[capacity_key] = float(value)
                    except (ValueError, TypeError):
                        capacity_data[capacity_key] = None

        return capacity_data

    def run_migration_fix(self) -> Dict[str, Any]:
        """Run the complete migration fix process"""
        print("🔧 NHS Data Migration Fix")
        print("=" * 50)

        # Identify missing trusts
        missing_trusts = self.identify_missing_trusts()

        if not missing_trusts:
            print("✅ No missing trusts found - migration appears complete")
            return self.results

        # Migrate missing trust data
        self.migrate_missing_trust_data(missing_trusts)

        # Summary
        print(f"\n📊 Migration Summary:")
        print(f"   ✅ Successful inserts: {self.results['successful_inserts']}")
        print(f"   ❌ Failed inserts: {self.results['failed_inserts']}")
        print(f"   🔧 Total trusts processed: {len(missing_trusts)}")

        if self.results["errors"]:
            print(f"   ⚠️ Errors encountered: {len(self.results['errors'])}")
            for error in self.results["errors"][:5]:  # Show first 5 errors
                print(f"      • {error}")

        return self.results

def main():
    """Main execution function"""
    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Run migration fix
    fixer = DatabaseMigrationFixer(data_dir)
    results = fixer.run_migration_fix()

    # Save results
    output_file = f"migration_fix_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n💾 Results saved to: {output_file}")

    return results["successful_inserts"] > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
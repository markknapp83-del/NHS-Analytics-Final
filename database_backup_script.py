#!/usr/bin/env python3
"""
NHS Database Backup Script - Phase 1.1
Creates complete backup of trust_metrics table before refresh operation
"""
import os
import json
from datetime import datetime
from supabase import create_client
import csv

def main():
    print("=== NHS Database Backup Script ===")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Connect to Supabase
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_KEY environment variables")
        return False

    try:
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase successfully")

        # Get current timestamp for backup directory
        backup_timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f"database_backups/refresh_{backup_timestamp}"

        # Ensure backup directory exists
        os.makedirs(backup_dir, exist_ok=True)

        # Export trust_metrics table
        print("\n📊 Exporting trust_metrics table...")
        response = supabase.table('trust_metrics').select('*').execute()

        if response.data:
            # Save as JSON
            json_file = f"{backup_dir}/trust_metrics_backup.json"
            with open(json_file, 'w') as f:
                json.dump(response.data, f, indent=2, default=str)

            # Save as CSV for human readability
            csv_file = f"{backup_dir}/trust_metrics_backup.csv"
            if response.data:
                with open(csv_file, 'w', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=response.data[0].keys())
                    writer.writeheader()
                    for row in response.data:
                        # Convert complex fields to strings for CSV
                        csv_row = {}
                        for key, value in row.items():
                            if isinstance(value, (dict, list)):
                                csv_row[key] = json.dumps(value)
                            else:
                                csv_row[key] = value
                        writer.writerow(csv_row)

            print(f"✅ Data exported to:")
            print(f"   - JSON: {json_file}")
            print(f"   - CSV:  {csv_file}")

            # Record statistics
            total_records = len(response.data)
            unique_trusts = len(set(row['trust_code'] for row in response.data if row.get('trust_code')))
            cancer_records = len([row for row in response.data if row.get('cancer_data')])

            stats = {
                'backup_timestamp': backup_timestamp,
                'total_records': total_records,
                'unique_trusts': unique_trusts,
                'cancer_records': cancer_records,
                'cancer_coverage_pct': round((cancer_records / total_records * 100), 2) if total_records > 0 else 0,
                'backup_files': [json_file, csv_file]
            }

            # Save statistics
            stats_file = f"{backup_dir}/backup_statistics.json"
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)

            print(f"\n📈 Backup Statistics:")
            print(f"   - Total Records: {total_records:,}")
            print(f"   - Unique Trusts: {unique_trusts}")
            print(f"   - Cancer Records: {cancer_records}")
            print(f"   - Cancer Coverage: {stats['cancer_coverage_pct']}%")
            print(f"   - Statistics saved: {stats_file}")

            # Validate backup file
            backup_size_mb = round(os.path.getsize(json_file) / (1024 * 1024), 2)
            print(f"\n✅ Backup Validation:")
            print(f"   - JSON file size: {backup_size_mb} MB")
            print(f"   - Records in backup: {total_records:,}")
            print(f"   - Backup directory: {backup_dir}")

            return True, backup_dir, stats

        else:
            print("❌ No data found in trust_metrics table")
            return False, None, None

    except Exception as e:
        print(f"❌ Error during backup: {str(e)}")
        return False, None, None

if __name__ == "__main__":
    success, backup_dir, stats = main()
    if not success:
        exit(1)
    print(f"\n🎉 Backup completed successfully!")
    print(f"Backup location: {backup_dir}")
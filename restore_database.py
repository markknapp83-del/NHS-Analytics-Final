#!/usr/bin/env python3
"""
Database restoration script for NHS Data Analytics Tool
Reads CSV backup and restores to Supabase with proper JSONB formatting
"""

import csv
import json
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import sys

# Database connection parameters
DB_URL = "postgresql://postgres.fsopilxzaaukmcqcskqm:Lj9f7Lm6Tg2RrJ7S@aws-0-eu-west-1.pooler.supabase.co:6543/postgres"

def parse_json_field(json_str):
    """Parse JSON string field, handling None/empty values"""
    if not json_str or json_str.strip() == '' or json_str.lower() == 'null':
        return None
    try:
        # Replace escaped quotes and parse JSON
        cleaned = json_str.replace('""', '"')
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Problematic string: {json_str[:200]}...")
        return None

def restore_database():
    """Main restoration function"""
    csv_file = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/database_backups/trust_metrics_rows (2).csv"

    if not os.path.exists(csv_file):
        print(f"Error: CSV file not found at {csv_file}")
        return False

    try:
        # Connect to database
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Clear existing data
        print("Clearing existing trust_metrics data...")
        cursor.execute("DELETE FROM trust_metrics")
        conn.commit()

        # Read and process CSV
        print("Reading CSV backup...")
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            batch_size = 100
            batch = []
            total_rows = 0

            for row in reader:
                # Parse JSON fields
                rtt_data = parse_json_field(row.get('rtt_data'))
                ae_data = parse_json_field(row.get('ae_data'))
                diagnostics_data = parse_json_field(row.get('diagnostics_data'))
                community_health_data = parse_json_field(row.get('community_health_data'))
                cancer_data = parse_json_field(row.get('cancer_data'))
                capacity_data = parse_json_field(row.get('capacity_data'))
                community_data = parse_json_field(row.get('community_data'))

                # Prepare record
                record = {
                    'id': row['id'],
                    'trust_code': row['trust_code'],
                    'trust_name': row['trust_name'],
                    'period': row['period'],
                    'data_type': row['data_type'],
                    'icb_code': row['icb_code'] if row['icb_code'] else None,
                    'icb_name': row['icb_name'] if row['icb_name'] else None,
                    'rtt_data': rtt_data,
                    'ae_data': ae_data,
                    'diagnostics_data': diagnostics_data,
                    'community_health_data': community_health_data,
                    'cancer_data': cancer_data,
                    'capacity_data': capacity_data,
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'community_data': community_data
                }

                batch.append(record)

                # Insert batch when it reaches batch_size
                if len(batch) >= batch_size:
                    insert_batch(cursor, batch)
                    conn.commit()
                    total_rows += len(batch)
                    print(f"Inserted {total_rows} rows...")
                    batch = []

            # Insert remaining records
            if batch:
                insert_batch(cursor, batch)
                conn.commit()
                total_rows += len(batch)

            print(f"Successfully restored {total_rows} records to trust_metrics table")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"Error during restoration: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def insert_batch(cursor, batch):
    """Insert a batch of records"""
    if not batch:
        return

    # Build INSERT statement
    columns = list(batch[0].keys())
    placeholders = ', '.join(['%s'] * len(columns))
    columns_str = ', '.join(columns)

    sql = f"""
        INSERT INTO trust_metrics ({columns_str})
        VALUES ({placeholders})
    """

    # Prepare values
    values_list = []
    for record in batch:
        values = []
        for col in columns:
            val = record[col]
            if col in ['rtt_data', 'ae_data', 'diagnostics_data', 'community_health_data', 'cancer_data', 'capacity_data', 'community_data']:
                # Convert dict to JSON string for JSONB fields
                values.append(json.dumps(val) if val is not None else None)
            else:
                values.append(val)
        values_list.append(tuple(values))

    # Execute batch insert
    cursor.executemany(sql, values_list)

if __name__ == "__main__":
    print("NHS Data Analytics Tool - Database Restoration")
    print("=" * 50)

    success = restore_database()

    if success:
        print("\n✅ Database restoration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Database restoration failed!")
        sys.exit(1)
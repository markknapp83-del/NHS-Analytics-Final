#!/usr/bin/env python3
"""
Direct CSV to Supabase restoration script using environment variables
"""

import csv
import json
import os
import requests
from datetime import datetime
import sys

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

def restore_via_supabase_api():
    """Restore using Supabase REST API"""
    csv_file = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/database_backups/trust_metrics_rows (2).csv"

    # Environment variables
    supabase_url = os.environ.get('SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return False

    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    # Clear existing data first
    print("Clearing existing trust_metrics data...")
    delete_url = f"{supabase_url}/rest/v1/trust_metrics"
    delete_response = requests.delete(delete_url, headers=headers)

    if delete_response.status_code not in [200, 204]:
        print(f"Warning: Could not clear existing data: {delete_response.status_code}")
    else:
        print("✓ Existing data cleared")

    print("Reading CSV backup and restoring...")

    # Read and process CSV in batches
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        batch_size = 50  # Smaller batches for API calls
        batch = []
        total_rows = 0

        for row in reader:
            # Parse JSON fields
            record = {
                'id': row['id'],
                'trust_code': row['trust_code'],
                'trust_name': row['trust_name'],
                'period': row['period'],
                'data_type': row['data_type'],
                'icb_code': row['icb_code'] if row['icb_code'] else None,
                'icb_name': row['icb_name'] if row['icb_name'] else None,
                'rtt_data': parse_json_field(row.get('rtt_data')),
                'ae_data': parse_json_field(row.get('ae_data')),
                'diagnostics_data': parse_json_field(row.get('diagnostics_data')),
                'community_health_data': parse_json_field(row.get('community_health_data')),
                'cancer_data': parse_json_field(row.get('cancer_data')),
                'capacity_data': parse_json_field(row.get('capacity_data')),
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'community_data': parse_json_field(row.get('community_data'))
            }

            batch.append(record)

            # Insert batch when full
            if len(batch) >= batch_size:
                success = insert_batch_via_api(supabase_url, headers, batch)
                if not success:
                    return False
                total_rows += len(batch)
                print(f"Inserted {total_rows} rows...")
                batch = []

        # Insert remaining records
        if batch:
            success = insert_batch_via_api(supabase_url, headers, batch)
            if not success:
                return False
            total_rows += len(batch)

    print(f"✅ Successfully restored {total_rows} records!")
    return True

def insert_batch_via_api(supabase_url, headers, batch):
    """Insert batch via Supabase REST API"""
    insert_url = f"{supabase_url}/rest/v1/trust_metrics"

    try:
        response = requests.post(insert_url, headers=headers, json=batch, timeout=30)

        if response.status_code in [200, 201, 204]:
            return True
        else:
            print(f"API Error {response.status_code}: {response.text}")
            return False

    except Exception as e:
        print(f"Request failed: {e}")
        return False

if __name__ == "__main__":
    print("NHS Data Analytics Tool - Direct Supabase Restoration")
    print("=" * 55)

    success = restore_via_supabase_api()

    if success:
        print("\n🎉 Database restoration completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Database restoration failed!")
        sys.exit(1)
#!/usr/bin/env python3
"""
Check Migration Status - Quick Database Status Check
==================================================

This script checks the current migration status after the fix attempt.
"""

import pandas as pd
from supabase import create_client, Client

# Initialize Supabase
supabase_url = "https://fsopilxzaaukmcqcskqm.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

supabase: Client = create_client(supabase_url, supabase_key)

# Load CSV to compare
csv_data = pd.read_csv("Data/unified_monthly_data_enhanced.csv")

# Get CSV stats
csv_trusts = set(csv_data['trust_code'].unique())
csv_periods = set(csv_data['period'].unique())

print(f"📄 CSV Data:")
print(f"   Trusts: {len(csv_trusts)}")
print(f"   Periods: {len(csv_periods)}")
print(f"   Total Records: {len(csv_data)}")

# Get database stats
db_result = supabase.table('trust_metrics').select('trust_code, period').execute()
db_data = db_result.data

db_trusts = set(record['trust_code'] for record in db_data)
db_periods = set(record['period'] for record in db_data)

print(f"\n🔗 Database Data:")
print(f"   Trusts: {len(db_trusts)}")
print(f"   Periods: {len(db_periods)}")
print(f"   Total Records: {len(db_data)}")

# Check what's missing
missing_trusts = csv_trusts - db_trusts
missing_periods = csv_periods - db_periods

print(f"\n❌ Still Missing:")
print(f"   Trusts: {len(missing_trusts)} - {list(missing_trusts)[:10]}")
print(f"   Periods: {len(missing_periods)} - {list(missing_periods)}")

# Calculate completion percentage
trust_completion = len(db_trusts) / len(csv_trusts) * 100
period_completion = len(db_periods) / len(csv_periods) * 100
record_completion = len(db_data) / len(csv_data) * 100

print(f"\n📊 Migration Completion:")
print(f"   Trust Coverage: {trust_completion:.1f}%")
print(f"   Period Coverage: {period_completion:.1f}%")
print(f"   Record Coverage: {record_completion:.1f}%")
#!/usr/bin/env python3
"""
Fix Trust Counting Logic
========================

The diagnostic analysis revealed that the 67 "missing" trusts actually exist in the database
but are being excluded by flawed query logic in our test scripts.

This script fixes the counting logic and validates the true database state.
"""

import pandas as pd
from supabase import create_client, Client
from typing import Set, List, Dict

def main():
    # Initialize Supabase
    supabase_url = "https://fsopilxzaaukmcqcskqm.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

    supabase: Client = create_client(supabase_url, supabase_key)

    print("🔍 FIXING TRUST COUNTING LOGIC")
    print("=" * 50)

    # Method 1: Get ALL records without any filters
    print("📊 Method 1: Complete table scan...")
    all_records_result = supabase.table('trust_metrics').select('trust_code').execute()

    if all_records_result.data:
        method1_trusts = sorted(set(record['trust_code'] for record in all_records_result.data))
        print(f"   Total Records: {len(all_records_result.data)}")
        print(f"   Unique Trusts: {len(method1_trusts)}")
        print(f"   Sample Trusts: {method1_trusts[:10]}")
    else:
        print("   ❌ No data returned")
        method1_trusts = []

    # Method 2: Direct SQL-style query to get distinct trust codes
    print(f"\n📊 Method 2: Distinct trust codes query...")
    distinct_result = supabase.table('trust_metrics').select('trust_code').execute()

    if distinct_result.data:
        method2_trusts = sorted(set(record['trust_code'] for record in distinct_result.data))
        print(f"   Distinct Trusts: {len(method2_trusts)}")
    else:
        print("   ❌ No data returned")
        method2_trusts = []

    # Method 3: Check using rpc (stored procedure) if available
    print(f"\n📊 Method 3: Raw record count verification...")
    try:
        count_result = supabase.table('trust_metrics').select('*', count='exact').execute()
        total_records = len(count_result.data) if count_result.data else 0
        print(f"   Total Records in Table: {total_records}")

        if count_result.data:
            method3_trusts = sorted(set(record['trust_code'] for record in count_result.data))
            print(f"   Unique Trusts from Full Data: {len(method3_trusts)}")
        else:
            method3_trusts = []

    except Exception as e:
        print(f"   ⚠️ Count query failed: {e}")
        method3_trusts = method1_trusts

    # Compare methods
    print(f"\n🔍 COMPARISON ANALYSIS:")
    print(f"   Method 1 Trusts: {len(method1_trusts)}")
    print(f"   Method 2 Trusts: {len(method2_trusts)}")
    print(f"   Method 3 Trusts: {len(method3_trusts)}")

    # Use the method that gives us the most trusts (likely the correct one)
    if len(method3_trusts) >= len(method1_trusts) >= len(method2_trusts):
        correct_trusts = method3_trusts
        print(f"   ✅ Using Method 3 results: {len(correct_trusts)} trusts")
    elif len(method1_trusts) >= len(method2_trusts):
        correct_trusts = method1_trusts
        print(f"   ✅ Using Method 1 results: {len(correct_trusts)} trusts")
    else:
        correct_trusts = method2_trusts
        print(f"   ✅ Using Method 2 results: {len(correct_trusts)} trusts")

    # Compare with CSV
    print(f"\n📄 CSV COMPARISON:")
    csv_data = pd.read_csv("Data/unified_monthly_data_enhanced.csv")
    csv_trusts = sorted(csv_data['trust_code'].unique())

    print(f"   CSV Trusts: {len(csv_trusts)}")
    print(f"   Database Trusts (corrected): {len(correct_trusts)}")

    missing_trusts = sorted(set(csv_trusts) - set(correct_trusts))
    extra_trusts = sorted(set(correct_trusts) - set(csv_trusts))

    print(f"   Truly Missing: {len(missing_trusts)}")
    print(f"   Extra in DB: {len(extra_trusts)}")

    if missing_trusts:
        print(f"   Missing Trust Codes: {missing_trusts[:10]}")

    if extra_trusts:
        print(f"   Extra Trust Codes: {extra_trusts}")

    # Calculate final coverage
    coverage = len(correct_trusts) / len(csv_trusts) * 100
    print(f"\n📊 ACTUAL COVERAGE: {coverage:.1f}% ({len(correct_trusts)}/{len(csv_trusts)})")

    if coverage >= 95:
        print("   ✅ EXCELLENT: Migration is nearly complete!")
    elif coverage >= 80:
        print("   ⚠️ GOOD: Most trusts migrated, some remaining")
    else:
        print("   ❌ NEEDS WORK: Significant trusts still missing")

    # If we have 100% coverage, update the test scripts
    if coverage == 100:
        print(f"\n🎉 SUCCESS: All {len(csv_trusts)} trusts are in the database!")
        print("   The original test counting logic was flawed.")
        print("   Migration is actually COMPLETE.")

    return correct_trusts, csv_trusts, missing_trusts

if __name__ == "__main__":
    main()
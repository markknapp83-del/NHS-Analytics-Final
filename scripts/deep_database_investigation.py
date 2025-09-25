#!/usr/bin/env python3
"""
Deep Database Investigation
==========================

The diagnostic revealed that some "missing" trusts actually exist, but our counts
are still inconsistent. Let's do a thorough investigation.
"""

import pandas as pd
from supabase import create_client, Client
from typing import Set, List, Dict

def main():
    # Initialize Supabase
    supabase_url = "https://fsopilxzaaukmcqcskqm.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5OTM2MzcsImV4cCI6MjA3MzU2OTYzN30.ifJjIprsjDoaBIJqsugmgTp4HBFoibEglArjUzjD1ZQ"

    supabase: Client = create_client(supabase_url, supabase_key)

    print("🕵️ DEEP DATABASE INVESTIGATION")
    print("=" * 50)

    # Test pagination - get ALL records with proper pagination
    print("📊 Testing Pagination Limits...")

    all_trust_codes = set()
    page_size = 1000
    page = 0
    total_records = 0

    while True:
        try:
            # Get records with pagination
            result = supabase.table('trust_metrics').select('trust_code').range(
                page * page_size, (page + 1) * page_size - 1
            ).execute()

            if not result.data or len(result.data) == 0:
                break

            page_trust_codes = set(record['trust_code'] for record in result.data)
            all_trust_codes.update(page_trust_codes)
            total_records += len(result.data)

            print(f"   Page {page + 1}: {len(result.data)} records, {len(page_trust_codes)} unique trusts")

            # If we got less than page_size records, we're at the end
            if len(result.data) < page_size:
                break

            page += 1

        except Exception as e:
            print(f"   ❌ Page {page + 1} failed: {e}")
            break

    print(f"\n📊 PAGINATION RESULTS:")
    print(f"   Total Records Retrieved: {total_records}")
    print(f"   Total Unique Trusts: {len(all_trust_codes)}")
    print(f"   Sample Trusts: {sorted(list(all_trust_codes))[:15]}")

    # Now test specific "missing" trusts that we found earlier
    print(f"\n🔍 TESTING SPECIFIC 'MISSING' TRUSTS:")
    test_trusts = ['RNQ', 'RNS', 'RNZ', 'RP4', 'RP5', 'RP6', 'RP7', 'RPA', 'RPC', 'RPG']

    found_trusts = []
    for trust_code in test_trusts:
        try:
            result = supabase.table('trust_metrics').select('trust_code, period, trust_name').eq(
                'trust_code', trust_code
            ).execute()

            if result.data:
                found_trusts.append(trust_code)
                print(f"   ✅ {trust_code}: {len(result.data)} records found")
                if result.data:
                    print(f"      Name: {result.data[0].get('trust_name', 'Unknown')}")
                    periods = sorted(set(record['period'] for record in result.data))
                    print(f"      Periods: {len(periods)} ({periods[0]} to {periods[-1]})")

                # Add to our all_trust_codes set if not already there
                all_trust_codes.add(trust_code)
            else:
                print(f"   ❌ {trust_code}: No records found")

        except Exception as e:
            print(f"   ❌ {trust_code}: Query failed - {e}")

    print(f"\n📊 UPDATED TOTALS:")
    print(f"   Trusts Found via Pagination: {len(all_trust_codes)}")
    print(f"   Additional Trusts Found: {len(found_trusts)}")

    # Final comparison with CSV
    csv_data = pd.read_csv("Data/unified_monthly_data_enhanced.csv")
    csv_trusts = set(csv_data['trust_code'].unique())

    print(f"\n📄 FINAL CSV COMPARISON:")
    print(f"   CSV Trusts: {len(csv_trusts)}")
    print(f"   Database Trusts (comprehensive): {len(all_trust_codes)}")

    missing_trusts = sorted(csv_trusts - all_trust_codes)
    extra_trusts = sorted(all_trust_codes - csv_trusts)

    print(f"   Actually Missing: {len(missing_trusts)}")
    if missing_trusts:
        print(f"   Missing Codes: {missing_trusts[:20]}")
        if len(missing_trusts) > 20:
            print(f"   ... and {len(missing_trusts) - 20} more")

    print(f"   Extra in Database: {len(extra_trusts)}")
    if extra_trusts:
        print(f"   Extra Codes: {extra_trusts}")

    # Calculate true coverage
    coverage = len(all_trust_codes) / len(csv_trusts) * 100
    print(f"\n🎯 TRUE MIGRATION COVERAGE: {coverage:.1f}% ({len(all_trust_codes)}/{len(csv_trusts)})")

    if coverage >= 99:
        print("   🎉 EXCELLENT: Migration is essentially complete!")
    elif coverage >= 90:
        print("   ✅ VERY GOOD: Most trusts successfully migrated")
    elif coverage >= 75:
        print("   ⚠️ GOOD: Majority migrated, some work remaining")
    else:
        print("   ❌ NEEDS SIGNIFICANT WORK: Many trusts still missing")

    return len(all_trust_codes), len(csv_trusts), missing_trusts

if __name__ == "__main__":
    main()
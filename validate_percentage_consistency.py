#!/usr/bin/env python3
"""
Percentage Consistency Validation Script
Validates that percentage values are consistently formatted across the system
"""

import pandas as pd
from supabase import create_client, Client
import os

# Initialize Supabase client
SUPABASE_URL = "https://fsopilxzaaukmcqcskqm.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzb3BpbHh6YWF1a21jcWNza3FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk5MzYzNywiZXhwIjoyMDczNTY5NjM3fQ.mDtWXZo-U4lyM-A73qCICQRDP5qOw7nc9ZOF2YcDagg"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def validate_percentage_consistency():
    """Validate percentage consistency in the database"""
    print("🔍 Validating percentage consistency...")

    # Query RTT data
    rtt_data = supabase.table('trust_metrics').select(
        'trust_code, rtt_data'
    ).neq('rtt_data', None).limit(10).execute()

    inconsistencies = []

    for record in rtt_data.data:
        trust_code = record['trust_code']
        rtt_data_field = record.get('rtt_data', {})

        trust_total_pct = rtt_data_field.get('trust_total', {}).get('percent_within_18_weeks')
        specialties = rtt_data_field.get('specialties', {})

        if trust_total_pct is not None:
            print(f"Trust {trust_code}: Trust total = {trust_total_pct}")

            # Check specialty percentages
            for specialty, data in specialties.items():
                specialty_pct = data.get('percent_within_18_weeks')
                if specialty_pct is not None:
                    print(f"  {specialty}: {specialty_pct}")

                    # Look for inconsistencies (trust total vs specialty scale difference)
                    if trust_total_pct > 1.0 and specialty_pct <= 1.0:
                        inconsistencies.append({
                            'trust_code': trust_code,
                            'issue': 'Scale mismatch',
                            'trust_total': trust_total_pct,
                            'specialty': specialty,
                            'specialty_value': specialty_pct
                        })

    if inconsistencies:
        print(f"❌ Found {len(inconsistencies)} percentage inconsistencies:")
        for issue in inconsistencies:
            print(f"  • {issue}")
    else:
        print("✅ No obvious percentage inconsistencies found")

    return inconsistencies

if __name__ == "__main__":
    validate_percentage_consistency()

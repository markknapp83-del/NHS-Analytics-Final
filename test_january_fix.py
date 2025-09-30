#!/usr/bin/env python3

import sys
import os
from pathlib import Path
from community_processor import process_single_month, load_trust_mapping

def test_january_processing():
    """Test processing the January file with the fix"""

    data_file = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data/Community-health-services-waiting-lists-2024-25-January.xlsx"

    print("🔍 Testing January file processing with the fix...")
    print("=" * 60)

    if not os.path.exists(data_file):
        print(f"❌ File not found: {data_file}")
        return False

    try:
        # Load trust mapping
        print("📋 Loading trust mapping...")
        matched_trusts = load_trust_mapping()
        print(f"✅ Loaded {len(matched_trusts)} trust mappings")

        # Process the file
        print("🔄 Processing January file...")
        result = process_single_month(data_file, matched_trusts)

        if result and len(result) > 0:
            print(f"✅ January processing SUCCESS!")
            print(f"   Records processed: {len(result)}")

            # Show a sample of the processed data
            sample_trust = list(result.keys())[0]
            sample_data = result[sample_trust]

            adult_services = len(sample_data.get('adult_services', {}))
            cyp_services = len(sample_data.get('cyp_services', {}))
            total_waiting = sample_data.get('metadata', {}).get('total_waiting_all_services', 0)

            print(f"   Sample trust {sample_trust}:")
            print(f"     Adult services: {adult_services}")
            print(f"     CYP services: {cyp_services}")
            print(f"     Total waiting: {total_waiting}")

            return True
        else:
            print(f"❌ January processing FAILED - no data returned")
            return False

    except Exception as e:
        print(f"❌ January processing FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_january_processing()
    sys.exit(0 if success else 1)
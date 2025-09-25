#!/usr/bin/env python3

import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Add the parent directory to the path to import our functions
sys.path.append(str(Path(__file__).parent))

from community_processor import (
    load_trust_mapping,
    read_community_tables,
    get_service_names,
    extract_provider_data,
    consolidate_trust_data,
    extract_period_from_filename
)

def init_supabase():
    """Initialize Supabase client"""
    try:
        # Load environment variables from hooks/.env
        env_path = Path(__file__).parent / "hooks" / ".env"
        if env_path.exists():
            load_dotenv(env_path)
            print("✅ Environment variables loaded")
        else:
            print(f"⚠️  Environment file not found at: {env_path}")
            return None

        url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not service_key:
            print("❌ Missing Supabase credentials in environment")
            return None

        supabase: Client = create_client(url, service_key)
        print("✅ Supabase client initialized successfully")
        return supabase

    except Exception as e:
        print(f"❌ Failed to initialize Supabase: {e}")
        return None

def update_trust_metrics(supabase: Client, trust_code, period, community_data):
    """Update community_data field in trust_metrics table"""
    try:
        result = supabase.table("trust_metrics").update({
            "community_data": community_data,
            "updated_at": datetime.now().isoformat()
        }).eq("trust_code", trust_code).eq("period", period).eq("data_type", "monthly").execute()

        if result.data and len(result.data) > 0:
            return True
        else:
            print(f"    ⚠️ No existing record found for {trust_code} {period}")
            return False

    except Exception as e:
        print(f"    ❌ Database update failed for {trust_code}: {e}")
        return False

def process_january_only():
    """Process only the January 2025 file and update the database"""

    print("🔄 Processing January 2025 community health data...")
    print("=" * 60)

    # Initialize Supabase
    supabase = init_supabase()
    if not supabase:
        return False

    # Load trust mapping
    matched_trusts = load_trust_mapping()

    # Process the January file
    january_file = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data/Community-health-services-waiting-lists-2024-25-January.xlsx"

    if not os.path.exists(january_file):
        print(f"❌ January file not found: {january_file}")
        return False

    try:
        filename = os.path.basename(january_file)
        period = extract_period_from_filename(filename)

        print(f"📅 Processing {filename} for period {period}")

        # Read all tables
        tables = read_community_tables(january_file)

        # Extract service names
        services = get_service_names(january_file)
        if len(services) == 0:
            print(f"❌ No services found in {filename}")
            return False

        # Extract provider data
        provider_data = extract_provider_data(tables, matched_trusts.keys())

        # Process each trust
        updated_count = 0
        for trust_code in provider_data.keys():
            trust_name = matched_trusts.get(trust_code, f"Unknown ({trust_code})")

            # Consolidate data
            community_data = consolidate_trust_data(trust_code, provider_data, services)

            if community_data:
                # Update database
                success = update_trust_metrics(supabase, trust_code, period, community_data)
                if success:
                    updated_count += 1
                    services_count = community_data['metadata']['services_reported']
                    total_waiting = community_data['metadata']['total_waiting_all_services']
                    print(f"  ✅ {trust_code} - {services_count} services, {total_waiting:,} waiting")

        print(f"\n🎉 January processing complete!")
        print(f"   Records updated: {updated_count}")
        print(f"   Period: {period}")

        return updated_count > 0

    except Exception as e:
        print(f"❌ Error processing January file: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = process_january_only()
    sys.exit(0 if success else 1)
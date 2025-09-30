#!/usr/bin/env python3

import pandas as pd
import os
import sys
from pathlib import Path

def find_service_header_row(file_path, sheet_name='Table 4'):
    """Find which row contains the service names by looking for (A) and (CYP) patterns"""

    try:
        # Read first 10 rows to find the header
        df_header = pd.read_excel(file_path, sheet_name=sheet_name, header=None, nrows=10)

        for row_idx in range(df_header.shape[0]):
            row_data = df_header.iloc[row_idx].astype(str)

            # Look for service patterns - should have both (A) and (CYP) services
            adult_services = row_data.str.contains(r'\(A\)', na=False).sum()
            cyp_services = row_data.str.contains(r'\(CYP\)', na=False).sum()

            if adult_services >= 10 and cyp_services >= 5:  # Should have many services
                print(f"✅ Found service header row at index {row_idx}")
                print(f"   Adult services: {adult_services}, CYP services: {cyp_services}")

                # Show sample services from this row
                services = []
                for col_idx in range(3, min(10, df_header.shape[1])):  # Start from column 3
                    val = df_header.iloc[row_idx, col_idx]
                    if pd.notna(val) and ('(A)' in str(val) or '(CYP)' in str(val)):
                        services.append(str(val).strip())

                print(f"   Sample services: {services[:3]}")
                return row_idx

        print("❌ Could not find service header row")
        return None

    except Exception as e:
        print(f"❌ Error finding service header: {e}")
        return None

def extract_services_robust(file_path):
    """Extract service names with robust row detection"""

    # First, find the correct row
    header_row = find_service_header_row(file_path)

    if header_row is None:
        return []

    try:
        # Read the header rows to get service names
        df_header = pd.read_excel(file_path, sheet_name='Table 4', header=None, nrows=header_row + 1)

        # Service names are in the detected row, starting from column 3
        service_row = df_header.iloc[header_row].values[3:]  # Skip first 3 columns (org type, code, name)

        # Clean up service names
        services = []
        for service in service_row:
            if pd.notna(service) and str(service).strip() != '':
                services.append(str(service).strip())

        print(f"✅ Extracted {len(services)} services from row {header_row}")
        print(f"   First 3 services: {services[:3]}")
        print(f"   Last 3 services: {services[-3:]}")

        return services

    except Exception as e:
        print(f"❌ Error extracting services: {e}")
        return []

def test_files():
    """Test both January and February files"""

    data_dir = Path("/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data")

    files_to_test = [
        "Community-health-services-waiting-lists-2024-25-January.xlsx",
        "Community-health-services-waiting-lists-2024-25-February.xlsx"
    ]

    for filename in files_to_test:
        file_path = data_dir / filename
        if file_path.exists():
            print(f"\n🔍 TESTING: {filename}")
            print("=" * 60)
            services = extract_services_robust(file_path)
            print(f"Total services found: {len(services)}")
        else:
            print(f"❌ File not found: {filename}")

if __name__ == "__main__":
    test_files()
#!/usr/bin/env python3

import pandas as pd
import sys
import os
from pathlib import Path

# Add the parent directory to the path to import our common functions
sys.path.append(str(Path(__file__).parent))

def debug_file_structure(file_path, table_name="Table 4"):
    """Debug the structure of an Excel file and its tables"""
    print(f"\n🔍 DEBUGGING FILE: {os.path.basename(file_path)}")
    print("=" * 80)

    try:
        # Load the Excel file
        excel_file = pd.ExcelFile(file_path)
        print(f"📊 Available sheets: {excel_file.sheet_names}")

        # Read the specific table
        df = pd.read_excel(file_path, sheet_name=table_name, header=None)
        print(f"\n📋 {table_name} - Shape: {df.shape}")

        # Show first few rows to understand structure
        print(f"\n📑 First 10 rows of {table_name}:")
        print(df.head(10).to_string())

        # Look for service columns (should be around column 3-4)
        print(f"\n🔍 Column analysis:")
        for col_idx in range(min(10, df.shape[1])):
            col_data = df.iloc[:, col_idx].dropna().unique()[:5]  # First 5 unique values
            print(f"  Column {col_idx}: {col_data}")

        # Try to find service names (look for patterns like "(A)" or "(CYP)")
        service_patterns = []
        for col_idx in range(df.shape[1]):
            col_values = df.iloc[:, col_idx].astype(str).str.strip()
            adult_services = col_values[col_values.str.contains(r'\(A\)', na=False)]
            cyp_services = col_values[col_values.str.contains(r'\(CYP\)', na=False)]

            if not adult_services.empty or not cyp_services.empty:
                print(f"\n🎯 Found service patterns in column {col_idx}:")
                if not adult_services.empty:
                    print(f"  Adult services sample: {adult_services.head(3).tolist()}")
                if not cyp_services.empty:
                    print(f"  CYP services sample: {cyp_services.head(3).tolist()}")
                service_patterns.append(col_idx)

        if not service_patterns:
            print(f"\n❌ No service patterns found with (A) or (CYP) markers")

            # Let's look for any column that might contain service names
            print(f"\n🔍 Looking for potential service columns...")
            for col_idx in range(df.shape[1]):
                col_values = df.iloc[:, col_idx].astype(str).str.strip()
                long_text_values = col_values[col_values.str.len() > 20]  # Service names are usually long
                if len(long_text_values) > 10:  # Should have many service names
                    print(f"  Column {col_idx} has {len(long_text_values)} long text values:")
                    print(f"    Sample: {long_text_values.head(3).tolist()}")

        # Check for provider/organization data
        print(f"\n🏥 Looking for provider data...")
        for col_idx in range(df.shape[1]):
            col_values = df.iloc[:, col_idx].astype(str).str.strip()
            provider_values = col_values[col_values.str.contains('Provider', na=False, case=False)]
            if not provider_values.empty:
                print(f"  Found 'Provider' in column {col_idx}: {len(provider_values)} instances")

        return df

    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return None

def compare_files():
    """Compare January file with a working file (February)"""
    data_dir = Path("/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data")

    january_file = data_dir / "Community-health-services-waiting-lists-2024-25-January.xlsx"
    february_file = data_dir / "Community-health-services-waiting-lists-2024-25-February.xlsx"

    if not january_file.exists():
        print(f"❌ January file not found: {january_file}")
        return

    if not february_file.exists():
        print(f"❌ February file not found: {february_file}")
        return

    print("🔬 COMPARATIVE ANALYSIS")
    print("=" * 80)

    # Debug both files
    jan_df = debug_file_structure(january_file, "Table 4")
    feb_df = debug_file_structure(february_file, "Table 4")

    if jan_df is not None and feb_df is not None:
        print(f"\n📊 COMPARISON SUMMARY:")
        print(f"  January shape: {jan_df.shape}")
        print(f"  February shape: {feb_df.shape}")
        print(f"  Shape difference: {'✅ Same' if jan_df.shape == feb_df.shape else '❌ Different'}")

        # Compare column structures
        if jan_df.shape[1] == feb_df.shape[1]:
            for col_idx in range(min(5, jan_df.shape[1])):  # Compare first 5 columns
                jan_sample = set(jan_df.iloc[:, col_idx].dropna().astype(str).head(10))
                feb_sample = set(feb_df.iloc[:, col_idx].dropna().astype(str).head(10))
                similarity = len(jan_sample.intersection(feb_sample)) / max(len(jan_sample), len(feb_sample), 1)
                print(f"  Column {col_idx} similarity: {similarity:.2%}")

if __name__ == "__main__":
    compare_files()
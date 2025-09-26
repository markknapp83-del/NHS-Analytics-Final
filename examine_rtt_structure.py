#!/usr/bin/env python3
"""
Examine RTT Excel file structure to understand the data layout
"""

import pandas as pd
from pathlib import Path
import os

def examine_rtt_file(file_path: str):
    """Examine the structure of an RTT Excel file"""
    print(f"\n=== Examining: {Path(file_path).name} ===")

    try:
        # Check what sheets are available
        excel_file = pd.ExcelFile(file_path)
        print(f"Available sheets: {excel_file.sheet_names}")

        # Read the first sheet
        df = pd.read_excel(file_path, sheet_name=0)
        print(f"\nDataFrame shape: {df.shape}")
        print(f"Columns ({len(df.columns)}):")

        for i, col in enumerate(df.columns):
            print(f"  {i+1:2d}. {col}")

        print(f"\nFirst few rows:")
        print(df.head(3).to_string())

        print(f"\nColumn data types:")
        print(df.dtypes)

        # Look for trust-related columns
        trust_cols = [col for col in df.columns if any(word in col.lower() for word in ['trust', 'provider', 'org', 'code', 'name'])]
        if trust_cols:
            print(f"\nTrust-related columns:")
            for col in trust_cols:
                print(f"  - {col}")
                if len(df[col].unique()) < 50:  # Show unique values if not too many
                    print(f"    Unique values ({len(df[col].unique())}): {list(df[col].unique()[:10])}")

        # Look for percentage/performance columns
        perf_cols = [col for col in df.columns if any(word in col.lower() for word in ['percent', '%', 'within', '18', 'week', 'performance'])]
        if perf_cols:
            print(f"\nPerformance-related columns:")
            for col in perf_cols:
                print(f"  - {col}")

        # Look for waiting list columns
        wait_cols = [col for col in df.columns if any(word in col.lower() for word in ['wait', 'incomplete', 'pathway', '52', '65', '78'])]
        if wait_cols:
            print(f"\nWaiting list columns:")
            for col in wait_cols:
                print(f"  - {col}")

        return df

    except Exception as e:
        print(f"Error examining file: {e}")
        return None

def main():
    """Main function to examine RTT file structure"""
    data_dir = Path(__file__).parent / 'Data'

    # Find the first RTT file
    rtt_files = sorted(list(data_dir.glob('Incomplete-Provider-*.xlsx')))

    if rtt_files:
        print("Examining RTT file structure...")
        df = examine_rtt_file(str(rtt_files[0]))

        if df is not None and len(rtt_files) > 1:
            print(f"\n" + "="*80)
            print("Comparing with second file for consistency...")
            df2 = examine_rtt_file(str(rtt_files[1]))
    else:
        print("No RTT files found in Data directory")

if __name__ == "__main__":
    main()
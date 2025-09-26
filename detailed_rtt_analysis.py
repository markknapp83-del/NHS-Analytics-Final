#!/usr/bin/env python3
"""
Detailed analysis of RTT Excel file to find the exact header structure
"""

import pandas as pd
from pathlib import Path

def find_header_row(file_path: str):
    """Find the row that contains the actual column headers"""
    print(f"\n=== Analyzing structure: {Path(file_path).name} ===")

    df = pd.read_excel(file_path, header=None)  # Read without headers
    print(f"Shape: {df.shape}")

    # Look for rows that contain key RTT terms
    key_terms = ['provider', 'trust', 'total', 'incomplete', 'pathways', 'percent', 'weeks']

    for row_idx in range(min(20, len(df))):  # Check first 20 rows
        row = df.iloc[row_idx]
        row_str = ' '.join([str(val).lower() for val in row if pd.notna(val)])

        if any(term in row_str for term in key_terms):
            print(f"\nRow {row_idx} contains potential headers:")
            for col_idx, val in enumerate(row):
                if pd.notna(val) and str(val).strip():
                    print(f"  Col {col_idx:3d}: {val}")

    # Also look for Trust/Provider data
    print(f"\nLooking for trust/provider patterns:")
    for row_idx in range(min(50, len(df))):
        row = df.iloc[row_idx]

        # Check if row contains trust codes (typically 3 letter codes)
        for col_idx, val in enumerate(row):
            if pd.notna(val) and isinstance(val, str):
                if len(val) == 3 and val.isupper():
                    print(f"Row {row_idx}, Col {col_idx}: Potential trust code '{val}'")
                    # Show surrounding context
                    context_cols = range(max(0, col_idx-2), min(len(row), col_idx+5))
                    context = [str(row.iloc[i]) if pd.notna(row.iloc[i]) else '' for i in context_cols]
                    print(f"  Context: {context}")
                    return row_idx  # This might be our data start row

    return None

def examine_data_structure(file_path: str, header_row: int = None):
    """Examine the actual data structure starting from the header row"""
    if header_row is None:
        # Try different header row positions
        for test_row in [12, 13, 14, 15, 16]:
            try:
                df = pd.read_excel(file_path, header=test_row)
                if len(df.columns) > 10:  # Should have many columns
                    print(f"\nTrying header at row {test_row}:")
                    print(f"Columns: {list(df.columns[:10])}...")  # First 10 columns
                    print(f"Shape: {df.shape}")

                    # Look for trust data in first few rows
                    for i in range(min(3, len(df))):
                        print(f"Row {i}: {list(df.iloc[i][:5])}")  # First 5 values

                    return df, test_row
            except:
                continue
    else:
        df = pd.read_excel(file_path, header=header_row)
        return df, header_row

    return None, None

def main():
    """Analyze RTT file structure"""
    data_dir = Path(__file__).parent / 'Data'
    rtt_files = sorted(list(data_dir.glob('Incomplete-Provider-*.xlsx')))

    if rtt_files:
        file_path = str(rtt_files[0])

        # First, find potential header row
        header_row = find_header_row(file_path)
        print(f"\nSuggested header row: {header_row}")

        # Then examine data structure
        df, actual_header_row = examine_data_structure(file_path, header_row)

        if df is not None:
            print(f"\n=== Final Analysis (header row {actual_header_row}) ===")
            print(f"Shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")

            # Look for trust/provider columns
            trust_cols = [col for col in df.columns if any(word in str(col).lower() for word in ['provider', 'trust', 'org', 'code', 'name'])]
            print(f"Trust-related columns: {trust_cols}")

            # Look for performance columns
            perf_cols = [col for col in df.columns if any(word in str(col).lower() for word in ['percent', '%', 'within', 'total', 'incomplete'])]
            print(f"Performance columns: {perf_cols}")

            # Show sample data
            print(f"\nSample data (first 3 rows):")
            if len(df) > 0:
                print(df.head(3))

if __name__ == "__main__":
    main()
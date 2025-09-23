#!/usr/bin/env python3
"""
Test CSV Data Compatibility with Processors
Tests how well our processors can handle the existing CSV data
"""

import json
import csv
from pathlib import Path
import sys


def load_csv_sample():
    """Load a sample of the CSV data"""
    csv_path = Path("../data/unified_monthly_data_enhanced.csv")

    if not csv_path.exists():
        print("❌ CSV file not found")
        return None, None

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)  # Get column headers

            # Read first few rows as sample data
            sample_rows = []
            for i, row in enumerate(reader):
                if i >= 3:  # Get 3 sample rows
                    break
                sample_rows.append(row)

        return headers, sample_rows

    except Exception as e:
        print(f"❌ Error reading CSV: {str(e)}")
        return None, None


def test_rtt_column_mapping(headers):
    """Test RTT column mapping against CSV headers"""
    print("🧪 Testing RTT column mapping...")

    # RTT column patterns we expect to find
    rtt_patterns = {
        'percent_within_18_weeks': [
            'percentage within 18 weeks',
            '% within 18 weeks',
            'rtt_18_weeks_performance',
            'eighteen_week_performance'
        ],
        'total_incomplete_pathways': [
            'total incomplete pathways',
            'incomplete pathways',
            'rtt_incomplete_pathways',
            'waiting_list_size'
        ],
        'total_52_plus_weeks': [
            '52+ weeks',
            'over 52 weeks',
            'rtt_52_plus_weeks',
            'long_waiters_52'
        ],
        'median_wait_weeks': [
            'median weeks',
            'median wait',
            'rtt_median_wait',
            'average_wait'
        ]
    }

    found_mappings = {}
    headers_lower = [h.lower() for h in headers]

    for metric, patterns in rtt_patterns.items():
        found = False
        for pattern in patterns:
            for i, header in enumerate(headers_lower):
                if pattern in header:
                    found_mappings[metric] = headers[i]
                    found = True
                    break
            if found:
                break

    print(f"RTT Column Mappings Found: {len(found_mappings)}/{len(rtt_patterns)}")
    for metric, column in found_mappings.items():
        print(f"  ✅ {metric} -> {column}")

    # Check for unmapped metrics
    unmapped = set(rtt_patterns.keys()) - set(found_mappings.keys())
    for metric in unmapped:
        print(f"  ❌ {metric} -> Not found")

    return found_mappings


def test_ae_column_mapping(headers):
    """Test A&E column mapping against CSV headers"""
    print("\n🧪 Testing A&E column mapping...")

    ae_patterns = {
        'total_attendances': [
            'total attendances',
            'ae attendances',
            'emergency attendances',
            'ae_total_attendances'
        ],
        'four_hour_performance_pct': [
            'percentage in 4 hours',
            '4 hour performance',
            'ae_4_hour_performance',
            'four_hour_target'
        ],
        'over_four_hours_total': [
            'over 4 hours',
            'breaches',
            'ae_breaches',
            'four_hour_breaches'
        ],
        'emergency_admissions_total': [
            'emergency admissions',
            'ae admissions',
            'emergency_admissions',
            'admissions_from_ae'
        ]
    }

    found_mappings = {}
    headers_lower = [h.lower() for h in headers]

    for metric, patterns in ae_patterns.items():
        found = False
        for pattern in patterns:
            for i, header in enumerate(headers_lower):
                if pattern in header:
                    found_mappings[metric] = headers[i]
                    found = True
                    break
            if found:
                break

    print(f"A&E Column Mappings Found: {len(found_mappings)}/{len(ae_patterns)}")
    for metric, column in found_mappings.items():
        print(f"  ✅ {metric} -> {column}")

    # Check for unmapped metrics
    unmapped = set(ae_patterns.keys()) - set(found_mappings.keys())
    for metric in unmapped:
        print(f"  ❌ {metric} -> Not found")

    return found_mappings


def test_diagnostics_column_mapping(headers):
    """Test diagnostics column mapping against CSV headers"""
    print("\n🧪 Testing Diagnostics column mapping...")

    diag_patterns = {
        'total_waiting': [
            'diagnostic waiting',
            'total waiting',
            'diagnostics_waiting_list',
            'diagnostic_queue'
        ],
        'six_week_breaches': [
            '6 week breaches',
            'six week breaches',
            'diagnostics_6_week_breaches',
            'diagnostic_breaches'
        ],
        'mri_scans': [
            'mri',
            'mri scans',
            'mri_waiting',
            'magnetic_resonance'
        ],
        'ct_scans': [
            'ct scans',
            'ct',
            'ct_waiting',
            'computed_tomography'
        ]
    }

    found_mappings = {}
    headers_lower = [h.lower() for h in headers]

    for metric, patterns in diag_patterns.items():
        found = False
        for pattern in patterns:
            for i, header in enumerate(headers_lower):
                if pattern in header:
                    found_mappings[metric] = headers[i]
                    found = True
                    break
            if found:
                break

    print(f"Diagnostics Column Mappings Found: {len(found_mappings)}/{len(diag_patterns)}")
    for metric, column in found_mappings.items():
        print(f"  ✅ {metric} -> {column}")

    # Check for unmapped metrics
    unmapped = set(diag_patterns.keys()) - set(found_mappings.keys())
    for metric in unmapped:
        print(f"  ❌ {metric} -> Not found")

    return found_mappings


def test_trust_code_identification(headers, sample_rows):
    """Test trust code identification"""
    print("\n🧪 Testing trust code identification...")

    trust_patterns = ['trust code', 'trust_code', 'provider code', 'org code', 'organisation_code']
    headers_lower = [h.lower() for h in headers]

    trust_column = None
    for pattern in trust_patterns:
        for i, header in enumerate(headers_lower):
            if pattern in header:
                trust_column = i
                break
        if trust_column is not None:
            break

    if trust_column is not None:
        print(f"✅ Trust code column found: {headers[trust_column]}")

        # Check sample trust codes
        if sample_rows:
            print("Sample trust codes:")
            for i, row in enumerate(sample_rows[:3]):
                if trust_column < len(row):
                    trust_code = row[trust_column]
                    print(f"  Row {i+1}: {trust_code}")

        return headers[trust_column]
    else:
        print("❌ Trust code column not found")
        return None


def analyze_column_patterns(headers):
    """Analyze overall column patterns"""
    print("\n🧪 Analyzing column patterns...")

    patterns = {
        'RTT related': ['rtt', 'referral', 'treatment', 'waiting', '18_weeks', 'incomplete'],
        'A&E related': ['ae', 'emergency', 'attendances', '4_hour', 'accident'],
        'Diagnostics related': ['diagnostic', 'mri', 'ct', 'scan', 'imaging', '6_week'],
        'Capacity related': ['bed', 'occupancy', 'capacity', 'discharge'],
        'Trust info': ['trust', 'provider', 'organisation', 'icb', 'region']
    }

    results = {}
    headers_lower = [h.lower() for h in headers]

    for category, keywords in patterns.items():
        matching_columns = []
        for keyword in keywords:
            for header in headers:
                if keyword in header.lower() and header not in matching_columns:
                    matching_columns.append(header)

        results[category] = matching_columns
        print(f"{category}: {len(matching_columns)} columns")
        if len(matching_columns) <= 5:  # Show all if 5 or fewer
            for col in matching_columns:
                print(f"  - {col}")
        else:  # Show first 3 and last 2
            for col in matching_columns[:3]:
                print(f"  - {col}")
            print(f"  ... and {len(matching_columns)-5} more ...")
            for col in matching_columns[-2:]:
                print(f"  - {col}")

    return results


def test_data_completeness(sample_rows, headers):
    """Test data completeness in sample rows"""
    print("\n🧪 Testing data completeness...")

    if not sample_rows:
        print("❌ No sample data available")
        return

    total_cells = 0
    empty_cells = 0
    numeric_cells = 0

    for row in sample_rows:
        for i, cell in enumerate(row):
            total_cells += 1

            if not cell or cell.strip() == '':
                empty_cells += 1
            else:
                # Try to determine if numeric
                cleaned = cell.replace(',', '').replace('%', '').strip()
                try:
                    float(cleaned)
                    numeric_cells += 1
                except ValueError:
                    pass

    if total_cells > 0:
        empty_rate = (empty_cells / total_cells) * 100
        numeric_rate = (numeric_cells / total_cells) * 100

        print(f"Total cells analyzed: {total_cells}")
        print(f"Empty cells: {empty_cells} ({empty_rate:.1f}%)")
        print(f"Numeric cells: {numeric_cells} ({numeric_rate:.1f}%)")

        if empty_rate < 20:
            print("✅ Good data completeness")
        elif empty_rate < 50:
            print("⚠️  Moderate data completeness")
        else:
            print("❌ Poor data completeness")


def main():
    """Run CSV compatibility tests"""
    print("🔍 CSV Data Compatibility Tests")
    print("=" * 50)

    # Load CSV data
    headers, sample_rows = load_csv_sample()

    if headers is None:
        print("❌ Cannot proceed without CSV data")
        return

    print(f"📊 CSV Analysis:")
    print(f"   Total columns: {len(headers)}")
    print(f"   Sample rows: {len(sample_rows) if sample_rows else 0}")

    # Run tests
    rtt_mappings = test_rtt_column_mapping(headers)
    ae_mappings = test_ae_column_mapping(headers)
    diag_mappings = test_diagnostics_column_mapping(headers)
    trust_column = test_trust_code_identification(headers, sample_rows)
    column_patterns = analyze_column_patterns(headers)
    test_data_completeness(sample_rows, headers)

    # Summary
    print("\n" + "=" * 50)
    print("📋 Compatibility Summary:")

    total_mappings = len(rtt_mappings) + len(ae_mappings) + len(diag_mappings)
    print(f"   Total column mappings found: {total_mappings}")
    print(f"   RTT mappings: {len(rtt_mappings)}")
    print(f"   A&E mappings: {len(ae_mappings)}")
    print(f"   Diagnostics mappings: {len(diag_mappings)}")
    print(f"   Trust identification: {'✅' if trust_column else '❌'}")

    if total_mappings >= 8:
        print("🎉 Excellent CSV compatibility!")
    elif total_mappings >= 5:
        print("✅ Good CSV compatibility")
    elif total_mappings >= 3:
        print("⚠️  Moderate CSV compatibility")
    else:
        print("❌ Poor CSV compatibility - significant mapping work needed")

    # Recommendations
    print("\n💡 Recommendations:")
    if len(rtt_mappings) < 3:
        print("   - Review RTT column mapping patterns")
    if len(ae_mappings) < 3:
        print("   - Review A&E column mapping patterns")
    if len(diag_mappings) < 2:
        print("   - Review diagnostics column mapping patterns")
    if not trust_column:
        print("   - Ensure trust code column is properly identified")

    return {
        'rtt_mappings': rtt_mappings,
        'ae_mappings': ae_mappings,
        'diag_mappings': diag_mappings,
        'trust_column': trust_column,
        'column_patterns': column_patterns
    }


if __name__ == "__main__":
    results = main()
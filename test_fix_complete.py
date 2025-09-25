#!/usr/bin/env python3

from community_processor import extract_period_from_filename, get_service_names

def test_period_extraction():
    """Test the fixed period extraction"""

    test_files = [
        ("Community-health-services-waiting-lists-2024-25-January.xlsx", "2025-01-01"),
        ("Community-health-services-waiting-lists-2024-25-February.xlsx", "2025-02-01"),
        ("Community-health-services-waiting-lists-2024-25-March.xlsx", "2025-03-01"),
        ("Community-health-services-waiting-lists-2024-25-August.xlsx", "2024-08-01"),
        ("Community-health-services-waiting-lists-2024-25-December.xlsx", "2024-12-01"),
    ]

    print("🗓️  Testing Period Extraction:")
    print("=" * 50)

    all_passed = True
    for filename, expected in test_files:
        result = extract_period_from_filename(filename)
        status = "✅" if result == expected else "❌"
        print(f"  {status} {filename}")
        print(f"     Expected: {expected}, Got: {result}")

        if result != expected:
            all_passed = False

    return all_passed

def test_service_extraction():
    """Test the fixed service extraction"""

    data_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"
    test_files = [
        f"{data_dir}/Community-health-services-waiting-lists-2024-25-January.xlsx",
        f"{data_dir}/Community-health-services-waiting-lists-2024-25-February.xlsx"
    ]

    print("\n📋 Testing Service Extraction:")
    print("=" * 50)

    all_passed = True
    for file_path in test_files:
        filename = file_path.split('/')[-1]
        services = get_service_names(file_path)

        if len(services) == 47:
            print(f"  ✅ {filename}: {len(services)} services extracted")
        else:
            print(f"  ❌ {filename}: {len(services)} services (expected 47)")
            all_passed = False

    return all_passed

if __name__ == "__main__":
    period_ok = test_period_extraction()
    service_ok = test_service_extraction()

    print(f"\n🎯 Overall Result:")
    print(f"   Period extraction: {'✅ PASS' if period_ok else '❌ FAIL'}")
    print(f"   Service extraction: {'✅ PASS' if service_ok else '❌ FAIL'}")
    print(f"   Overall: {'✅ ALL FIXED' if (period_ok and service_ok) else '❌ ISSUES REMAIN'}")
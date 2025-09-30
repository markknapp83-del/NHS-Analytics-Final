#!/usr/bin/env python3
"""
Phase 1: Trust Code Mapping & Validation
Extract trust codes from community data and create mapping to existing database trusts
"""

import os
import pandas as pd
import json
from pathlib import Path

def extract_community_trust_codes(data_directory):
    """Extract all trust codes from community health data files"""
    community_trusts = set()
    files_processed = 0

    print("🔍 Scanning community health data files...")

    for file_path in Path(data_directory).glob("Community-health-services-waiting-lists-*.xlsx"):
        try:
            print(f"  Processing: {file_path.name}")

            # Read Table 4 sheet specifically - this contains the main data
            df = pd.read_excel(file_path, sheet_name='Table 4', header=None, skiprows=3)

            # First row after skipping contains 'Organisation Type' in first column
            # So we need to find that row and use it as reference
            org_type_col = 0  # First column
            org_code_col = 1  # Second column should be organization codes

            # Find rows where first column is 'Provider'
            provider_mask = df[org_type_col] == 'Provider'
            provider_rows = df[provider_mask]

            if len(provider_rows) > 0:
                # Look for trust codes in the second column (organization codes)
                trust_codes = provider_rows[org_code_col].dropna().unique()

                # Filter for R-codes (NHS trusts)
                r_codes = [str(code) for code in trust_codes if str(code).startswith('R') and len(str(code)) == 3]
                community_trusts.update(r_codes)

                print(f"    Found {len(r_codes)} R-codes in this file")
                if len(r_codes) > 0:
                    print(f"    Sample codes: {r_codes[:5]}")
            else:
                print(f"    No Provider rows found - checking data structure...")
                print(f"    Unique values in first column: {df[org_type_col].dropna().unique()[:10]}")

            files_processed += 1

        except Exception as e:
            print(f"  ⚠️ Error processing {file_path.name}: {str(e)}")

    print(f"\n📊 Summary:")
    print(f"  Files processed: {files_processed}")
    print(f"  Unique trust codes found: {len(community_trusts)}")

    return sorted(list(community_trusts))

def create_trust_mapping(community_trusts, database_trusts):
    """Create mapping between community trusts and database trusts"""

    # Convert database trusts to dict for easier lookup
    db_trust_dict = {trust['trust_code']: trust['trust_name'] for trust in database_trusts}

    mapping = {
        "matched_trusts": [],
        "community_only": [],
        "database_only": [],
        "summary": {}
    }

    print("\n🔗 Creating trust code mapping...")

    # Find matches
    for trust_code in community_trusts:
        if trust_code in db_trust_dict:
            mapping["matched_trusts"].append({
                "trust_code": trust_code,
                "trust_name": db_trust_dict[trust_code],
                "source": "both"
            })
        else:
            mapping["community_only"].append({
                "trust_code": trust_code,
                "source": "community_only"
            })

    # Find database-only trusts
    for trust_code in db_trust_dict:
        if trust_code not in community_trusts:
            mapping["database_only"].append({
                "trust_code": trust_code,
                "trust_name": db_trust_dict[trust_code],
                "source": "database_only"
            })

    # Summary statistics
    mapping["summary"] = {
        "total_community_trusts": len(community_trusts),
        "total_database_trusts": len(database_trusts),
        "matched_trusts": len(mapping["matched_trusts"]),
        "community_only": len(mapping["community_only"]),
        "database_only": len(mapping["database_only"]),
        "match_percentage": round((len(mapping["matched_trusts"]) / len(community_trusts)) * 100, 1) if len(community_trusts) > 0 else 0
    }

    return mapping

def generate_validation_report(mapping):
    """Generate human-readable validation report"""

    report = f"""# Trust Code Mapping & Validation Report

## Summary Statistics
- **Total Community Trusts**: {mapping['summary']['total_community_trusts']}
- **Total Database Trusts**: {mapping['summary']['total_database_trusts']}
- **Matched Trusts**: {mapping['summary']['matched_trusts']}
- **Match Percentage**: {mapping['summary']['match_percentage']}%

## Trusts to Process (Matched)
These {len(mapping['matched_trusts'])} trusts will be updated with community data:

"""

    for trust in sorted(mapping['matched_trusts'], key=lambda x: x['trust_code']):
        report += f"- **{trust['trust_code']}**: {trust['trust_name']}\n"

    if mapping['community_only']:
        report += f"\n## Community-Only Trusts (Excluded)\nThese {len(mapping['community_only'])} trusts have community data but don't exist in our database:\n\n"
        for trust in sorted(mapping['community_only'], key=lambda x: x['trust_code']):
            report += f"- {trust['trust_code']}\n"

    if mapping['database_only']:
        report += f"\n## Database-Only Trusts (No Community Data)\nThese {len(mapping['database_only'])} trusts are in our database but have no community data:\n\n"
        for trust in sorted(mapping['database_only'], key=lambda x: x['trust_code'])[:10]:  # Show first 10
            report += f"- **{trust['trust_code']}**: {trust['trust_name']}\n"
        if len(mapping['database_only']) > 10:
            report += f"- ... and {len(mapping['database_only']) - 10} more\n"

    report += f"""
## Phase 2 Ready
✅ Trust mapping complete - ready to process community data for {len(mapping['matched_trusts'])} trusts.
"""

    return report

def main():
    # Configuration
    data_directory = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/Data"

    # Database trusts (from Supabase query)
    database_trusts = [
        {"trust_code": "R0A", "trust_name": "MANCHESTER UNIVERSITY NHS FOUNDATION TRUST"},
        {"trust_code": "R0B", "trust_name": "SOUTH TYNESIDE AND SUNDERLAND NHS FOUNDATION TRUST"},
        {"trust_code": "R0D", "trust_name": "UNIVERSITY HOSPITALS DORSET NHS FOUNDATION TRUST"},
        {"trust_code": "R1A", "trust_name": "HEREFORDSHIRE AND WORCESTERSHIRE HEALTH AND CARE NHS TRUST"},
        {"trust_code": "R1D", "trust_name": "SHROPSHIRE COMMUNITY HEALTH NHS TRUST"},
        {"trust_code": "R1F", "trust_name": "ISLE OF WIGHT NHS TRUST"},
        {"trust_code": "R1H", "trust_name": "BARTS HEALTH NHS TRUST"},
        {"trust_code": "R1K", "trust_name": "LONDON NORTH WEST UNIVERSITY HEALTHCARE NHS TRUST"},
        {"trust_code": "RA2", "trust_name": "ROYAL SURREY COUNTY HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RA7", "trust_name": "UNIVERSITY HOSPITALS BRISTOL AND WESTON NHS FOUNDATION TRUST"},
        {"trust_code": "RA9", "trust_name": "TORBAY AND SOUTH DEVON NHS FOUNDATION TRUST"},
        {"trust_code": "RAE", "trust_name": "BRADFORD TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RAJ", "trust_name": "MID AND SOUTH ESSEX NHS FOUNDATION TRUST"},
        {"trust_code": "RAL", "trust_name": "ROYAL FREE LONDON NHS FOUNDATION TRUST"},
        {"trust_code": "RAN", "trust_name": "ROYAL NATIONAL ORTHOPAEDIC HOSPITAL NHS TRUST"},
        {"trust_code": "RAS", "trust_name": "THE HILLINGDON HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RAX", "trust_name": "KINGSTON AND RICHMOND NHS FOUNDATION TRUST"},
        {"trust_code": "RBD", "trust_name": "DORSET COUNTY HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RBK", "trust_name": "WALSALL HEALTHCARE NHS TRUST"},
        {"trust_code": "RBL", "trust_name": "WIRRAL UNIVERSITY TEACHING HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RBN", "trust_name": "MERSEY AND WEST LANCASHIRE TEACHING HOSPITALS NHS TRUST"},
        {"trust_code": "RBQ", "trust_name": "LIVERPOOL HEART AND CHEST HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RBS", "trust_name": "ALDER HEY CHILDREN'S NHS FOUNDATION TRUST"},
        {"trust_code": "RBT", "trust_name": "MID CHESHIRE HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RBV", "trust_name": "THE CHRISTIE NHS FOUNDATION TRUST"},
        {"trust_code": "RC9", "trust_name": "BEDFORDSHIRE HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RCB", "trust_name": "YORK AND SCARBOROUGH TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RCD", "trust_name": "HARROGATE AND DISTRICT NHS FOUNDATION TRUST"},
        {"trust_code": "RCF", "trust_name": "AIREDALE NHS FOUNDATION TRUST"},
        {"trust_code": "RCU", "trust_name": "SHEFFIELD CHILDREN'S NHS FOUNDATION TRUST"},
        {"trust_code": "RCX", "trust_name": "THE QUEEN ELIZABETH HOSPITAL, KING'S LYNN, NHS FOUNDATION TRUST"},
        {"trust_code": "RD1", "trust_name": "ROYAL UNITED HOSPITALS BATH NHS FOUNDATION TRUST"},
        {"trust_code": "RD8", "trust_name": "MILTON KEYNES UNIVERSITY HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RDE", "trust_name": "EAST SUFFOLK AND NORTH ESSEX NHS FOUNDATION TRUST"},
        {"trust_code": "RDR", "trust_name": "SUSSEX COMMUNITY NHS FOUNDATION TRUST"},
        {"trust_code": "RDU", "trust_name": "FRIMLEY HEALTH NHS FOUNDATION TRUST"},
        {"trust_code": "REF", "trust_name": "ROYAL CORNWALL HOSPITALS NHS TRUST"},
        {"trust_code": "REM", "trust_name": "LIVERPOOL UNIVERSITY HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "REN", "trust_name": "THE CLATTERBRIDGE CANCER CENTRE NHS FOUNDATION TRUST"},
        {"trust_code": "REP", "trust_name": "LIVERPOOL WOMEN'S NHS FOUNDATION TRUST"},
        {"trust_code": "RET", "trust_name": "THE WALTON CENTRE NHS FOUNDATION TRUST"},
        {"trust_code": "RF4", "trust_name": "BARKING, HAVERING AND REDBRIDGE UNIVERSITY HOSPITALS NHS TRUST"},
        {"trust_code": "RFF", "trust_name": "BARNSLEY HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RFR", "trust_name": "THE ROTHERHAM NHS FOUNDATION TRUST"},
        {"trust_code": "RFS", "trust_name": "CHESTERFIELD ROYAL HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RGM", "trust_name": "ROYAL PAPWORTH HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RGN", "trust_name": "NORTH WEST ANGLIA NHS FOUNDATION TRUST"},
        {"trust_code": "RGP", "trust_name": "JAMES PAGET UNIVERSITY HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RGR", "trust_name": "WEST SUFFOLK NHS FOUNDATION TRUST"},
        {"trust_code": "RGT", "trust_name": "CAMBRIDGE UNIVERSITY HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RH5", "trust_name": "SOMERSET NHS FOUNDATION TRUST"},
        {"trust_code": "RH8", "trust_name": "ROYAL DEVON UNIVERSITY HEALTHCARE NHS FOUNDATION TRUST"},
        {"trust_code": "RHM", "trust_name": "UNIVERSITY HOSPITAL SOUTHAMPTON NHS FOUNDATION TRUST"},
        {"trust_code": "RHQ", "trust_name": "SHEFFIELD TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RHU", "trust_name": "PORTSMOUTH HOSPITALS UNIVERSITY NHS TRUST"},
        {"trust_code": "RHW", "trust_name": "ROYAL BERKSHIRE NHS FOUNDATION TRUST"},
        {"trust_code": "RJ1", "trust_name": "GUY'S AND ST THOMAS' NHS FOUNDATION TRUST"},
        {"trust_code": "RJ2", "trust_name": "LEWISHAM AND GREENWICH NHS TRUST"},
        {"trust_code": "RJ6", "trust_name": "CROYDON HEALTH SERVICES NHS TRUST"},
        {"trust_code": "RJ7", "trust_name": "ST GEORGE'S UNIVERSITY HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RJ8", "trust_name": "CORNWALL PARTNERSHIP NHS FOUNDATION TRUST"},
        {"trust_code": "RJC", "trust_name": "SOUTH WARWICKSHIRE UNIVERSITY NHS FOUNDATION TRUST"},
        {"trust_code": "RJE", "trust_name": "UNIVERSITY HOSPITALS OF NORTH MIDLANDS NHS TRUST"},
        {"trust_code": "RJL", "trust_name": "NORTHERN LINCOLNSHIRE AND GOOLE NHS FOUNDATION TRUST"},
        {"trust_code": "RJN", "trust_name": "EAST CHESHIRE NHS TRUST"},
        {"trust_code": "RJR", "trust_name": "COUNTESS OF CHESTER HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RJZ", "trust_name": "KING'S COLLEGE HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RK5", "trust_name": "SHERWOOD FOREST HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RK9", "trust_name": "UNIVERSITY HOSPITALS PLYMOUTH NHS TRUST"},
        {"trust_code": "RKB", "trust_name": "UNIVERSITY HOSPITALS COVENTRY AND WARWICKSHIRE NHS TRUST"},
        {"trust_code": "RKE", "trust_name": "WHITTINGTON HEALTH NHS TRUST"},
        {"trust_code": "RL1", "trust_name": "THE ROBERT JONES AND AGNES HUNT ORTHOPAEDIC HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RL4", "trust_name": "THE ROYAL WOLVERHAMPTON NHS TRUST"},
        {"trust_code": "RLQ", "trust_name": "WYE VALLEY NHS TRUST"},
        {"trust_code": "RLT", "trust_name": "GEORGE ELIOT HOSPITAL NHS TRUST"},
        {"trust_code": "RM1", "trust_name": "NORFOLK AND NORWICH UNIVERSITY HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RM3", "trust_name": "NORTHERN CARE ALLIANCE NHS FOUNDATION TRUST"},
        {"trust_code": "RMC", "trust_name": "BOLTON NHS FOUNDATION TRUST"},
        {"trust_code": "RMP", "trust_name": "TAMESIDE AND GLOSSOP INTEGRATED CARE NHS FOUNDATION TRUST"},
        {"trust_code": "RN3", "trust_name": "GREAT WESTERN HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RN5", "trust_name": "HAMPSHIRE HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RN7", "trust_name": "DARTFORD AND GRAVESHAM NHS TRUST"},
        {"trust_code": "RNA", "trust_name": "THE DUDLEY GROUP NHS FOUNDATION TRUST"},
        {"trust_code": "RNN", "trust_name": "NORTH CUMBRIA INTEGRATED CARE NHS FOUNDATION TRUST"},
        {"trust_code": "RNQ", "trust_name": "KETTERING GENERAL HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RNS", "trust_name": "NORTHAMPTON GENERAL HOSPITAL NHS TRUST"},
        {"trust_code": "RNZ", "trust_name": "SALISBURY NHS FOUNDATION TRUST"},
        {"trust_code": "RP4", "trust_name": "GREAT ORMOND STREET HOSPITAL FOR CHILDREN NHS FOUNDATION TRUST"},
        {"trust_code": "RP5", "trust_name": "DONCASTER AND BASSETLAW TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RP6", "trust_name": "MOORFIELDS EYE HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RP7", "trust_name": "LINCOLNSHIRE PARTNERSHIP NHS FOUNDATION TRUST"},
        {"trust_code": "RPA", "trust_name": "MEDWAY NHS FOUNDATION TRUST"},
        {"trust_code": "RPC", "trust_name": "QUEEN VICTORIA HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RPG", "trust_name": "OXLEAS NHS FOUNDATION TRUST"},
        {"trust_code": "RPY", "trust_name": "THE ROYAL MARSDEN NHS FOUNDATION TRUST"},
        {"trust_code": "RQ3", "trust_name": "BIRMINGHAM WOMEN'S AND CHILDREN'S NHS FOUNDATION TRUST"},
        {"trust_code": "RQM", "trust_name": "CHELSEA AND WESTMINSTER HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RQW", "trust_name": "THE PRINCESS ALEXANDRA HOSPITAL NHS TRUST"},
        {"trust_code": "RQX", "trust_name": "HOMERTON HEALTHCARE NHS FOUNDATION TRUST"},
        {"trust_code": "RR7", "trust_name": "GATESHEAD HEALTH NHS FOUNDATION TRUST"},
        {"trust_code": "RR8", "trust_name": "LEEDS TEACHING HOSPITALS NHS TRUST"},
        {"trust_code": "RRE", "trust_name": "MIDLANDS PARTNERSHIP NHS FOUNDATION TRUST"},
        {"trust_code": "RRF", "trust_name": "WRIGHTINGTON, WIGAN AND LEIGH NHS FOUNDATION TRUST"},
        {"trust_code": "RRJ", "trust_name": "THE ROYAL ORTHOPAEDIC HOSPITAL NHS FOUNDATION TRUST"},
        {"trust_code": "RRK", "trust_name": "UNIVERSITY HOSPITALS BIRMINGHAM NHS FOUNDATION TRUST"},
        {"trust_code": "RRV", "trust_name": "UNIVERSITY COLLEGE LONDON HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RT1", "trust_name": "CAMBRIDGESHIRE AND PETERBOROUGH NHS FOUNDATION TRUST"},
        {"trust_code": "RTD", "trust_name": "THE NEWCASTLE UPON TYNE HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RTE", "trust_name": "GLOUCESTERSHIRE HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RTF", "trust_name": "NORTHUMBRIA HEALTHCARE NHS FOUNDATION TRUST"},
        {"trust_code": "RTG", "trust_name": "UNIVERSITY HOSPITALS OF DERBY AND BURTON NHS FOUNDATION TRUST"},
        {"trust_code": "RTH", "trust_name": "OXFORD UNIVERSITY HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RTK", "trust_name": "ASHFORD AND ST PETER'S HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RTP", "trust_name": "SURREY AND SUSSEX HEALTHCARE NHS TRUST"},
        {"trust_code": "RTR", "trust_name": "SOUTH TEES HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RTX", "trust_name": "UNIVERSITY HOSPITALS OF MORECAMBE BAY NHS FOUNDATION TRUST"},
        {"trust_code": "RVJ", "trust_name": "NORTH BRISTOL NHS TRUST"},
        {"trust_code": "RVR", "trust_name": "EPSOM AND ST HELIER UNIVERSITY HOSPITALS NHS TRUST"},
        {"trust_code": "RVV", "trust_name": "EAST KENT HOSPITALS UNIVERSITY NHS FOUNDATION TRUST"},
        {"trust_code": "RVW", "trust_name": "NORTH TEES AND HARTLEPOOL NHS FOUNDATION TRUST"},
        {"trust_code": "RW1", "trust_name": "HAMPSHIRE AND ISLE OF WIGHT HEALTHCARE NHS FOUNDATION TRUST"},
        {"trust_code": "RW4", "trust_name": "MERSEY CARE NHS FOUNDATION TRUST"},
        {"trust_code": "RW5", "trust_name": "LANCASHIRE & SOUTH CUMBRIA NHS FOUNDATION TRUST"},
        {"trust_code": "RWA", "trust_name": "HULL UNIVERSITY TEACHING HOSPITALS NHS TRUST"},
        {"trust_code": "RWD", "trust_name": "UNITED LINCOLNSHIRE TEACHING HOSPITALS NHS TRUST"},
        {"trust_code": "RWE", "trust_name": "UNIVERSITY HOSPITALS OF LEICESTER NHS TRUST"},
        {"trust_code": "RWF", "trust_name": "MAIDSTONE AND TUNBRIDGE WELLS NHS TRUST"},
        {"trust_code": "RWG", "trust_name": "WEST HERTFORDSHIRE TEACHING HOSPITALS NHS TRUST"},
        {"trust_code": "RWH", "trust_name": "EAST AND NORTH HERTFORDSHIRE NHS TRUST"},
        {"trust_code": "RWJ", "trust_name": "STOCKPORT NHS FOUNDATION TRUST"},
        {"trust_code": "RWP", "trust_name": "WORCESTERSHIRE ACUTE HOSPITALS NHS TRUST"},
        {"trust_code": "RWW", "trust_name": "WARRINGTON AND HALTON TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RWX", "trust_name": "BERKSHIRE HEALTHCARE NHS FOUNDATION TRUST"},
        {"trust_code": "RWY", "trust_name": "CALDERDALE AND HUDDERSFIELD NHS FOUNDATION TRUST"},
        {"trust_code": "RX1", "trust_name": "NOTTINGHAM UNIVERSITY HOSPITALS NHS TRUST"},
        {"trust_code": "RX4", "trust_name": "CUMBRIA, NORTHUMBERLAND, TYNE AND WEAR NHS FOUNDATION TRUST"},
        {"trust_code": "RXC", "trust_name": "EAST SUSSEX HEALTHCARE NHS TRUST"},
        {"trust_code": "RXF", "trust_name": "MID YORKSHIRE TEACHING NHS TRUST"},
        {"trust_code": "RXG", "trust_name": "SOUTH WEST YORKSHIRE PARTNERSHIP NHS FOUNDATION TRUST"},
        {"trust_code": "RXK", "trust_name": "SANDWELL AND WEST BIRMINGHAM HOSPITALS NHS TRUST"},
        {"trust_code": "RXL", "trust_name": "BLACKPOOL TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RXN", "trust_name": "LANCASHIRE TEACHING HOSPITALS NHS FOUNDATION TRUST"},
        {"trust_code": "RXP", "trust_name": "COUNTY DURHAM AND DARLINGTON NHS FOUNDATION TRUST"},
        {"trust_code": "RXQ", "trust_name": "BUCKINGHAMSHIRE HEALTHCARE NHS TRUST"},
        {"trust_code": "RXR", "trust_name": "EAST LANCASHIRE HOSPITALS NHS TRUST"},
        {"trust_code": "RXW", "trust_name": "THE SHREWSBURY AND TELFORD HOSPITAL NHS TRUST"},
        {"trust_code": "RYJ", "trust_name": "IMPERIAL COLLEGE HEALTHCARE NHS TRUST"},
        {"trust_code": "RYR", "trust_name": "UNIVERSITY HOSPITALS SUSSEX NHS FOUNDATION TRUST"},
        {"trust_code": "RYW", "trust_name": "BIRMINGHAM COMMUNITY HEALTHCARE NHS FOUNDATION TRUST"},
        {"trust_code": "RYY", "trust_name": "KENT COMMUNITY HEALTH NHS FOUNDATION TRUST"},
        {"trust_code": "TAD", "trust_name": "BRADFORD DISTRICT CARE NHS FOUNDATION TRUST"}
    ]

    print("🏥 NHS Community Data Trust Mapping - Phase 1")
    print("=" * 50)

    # Step 1: Extract community trust codes
    community_trusts = extract_community_trust_codes(data_directory)

    # Step 2: Create mapping
    mapping = create_trust_mapping(community_trusts, database_trusts)

    # Step 3: Save outputs
    print("\n💾 Saving outputs...")

    # Save mapping JSON
    with open("trust_mapping.json", "w") as f:
        json.dump(mapping, f, indent=2)
    print("  ✅ trust_mapping.json created")

    # Generate and save report
    report = generate_validation_report(mapping)
    with open("trust_coverage_report.md", "w") as f:
        f.write(report)
    print("  ✅ trust_coverage_report.md created")

    # Print summary
    print(f"\n🎯 Phase 1 Complete!")
    print(f"  Matched trusts: {mapping['summary']['matched_trusts']}")
    print(f"  Match rate: {mapping['summary']['match_percentage']}%")
    print(f"  Ready for Phase 2 processing")

if __name__ == "__main__":
    main()
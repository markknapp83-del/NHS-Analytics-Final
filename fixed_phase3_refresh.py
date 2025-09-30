#!/usr/bin/env python3
"""
FIXED Phase 3 Priority Data Refresh - RTT, A&E, Diagnostics
Fixed version that properly handles the actual file formats.
"""

import os
import sys
import glob
import json
import pandas as pd
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import re
from supabase import create_client, Client

class FixedPhase3Refresh:
    """
    Fixed version of Phase 3 data processing with proper file format handling
    """

    def __init__(self, data_directory: str = "./Data"):
        self.data_directory = Path(data_directory)
        self.logger = self._setup_logging()

        # Initialize Supabase client
        self._init_supabase()

        # Processing results
        self.results = {
            'rtt': {'success': 0, 'failed': 0, 'errors': []},
            'ae': {'success': 0, 'failed': 0, 'errors': []},
            'diagnostics': {'success': 0, 'failed': 0, 'errors': []}
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging"""
        logger = logging.getLogger('fixed_phase3_refresh')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)

        return logger

    def _init_supabase(self):
        """Initialize Supabase client"""
        try:
            # Try loading from .env.local first
            env_path = Path('.env.local')
            if env_path.exists():
                from dotenv import load_dotenv
                load_dotenv(env_path)

            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if not supabase_url or not supabase_key:
                raise ValueError("Missing Supabase credentials in environment variables")

            self.supabase: Client = create_client(supabase_url, supabase_key)
            self.logger.info("✅ Supabase client initialized successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Supabase client: {e}")
            sys.exit(1)

    def _clean_numeric_value(self, value: Any, is_percentage: bool = False) -> Optional[float]:
        """Clean and convert values to numeric with percentage handling"""
        if pd.isna(value) or value is None:
            return None

        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, str):
            # Handle suppressed data
            if value.strip().lower() in ['*', '-', 'n/a', 'na', 'suppressed', '']:
                return None

            # Check for percentage symbol
            has_percent = '%' in value

            # Clean the value
            cleaned = value.replace(',', '').replace('%', '').replace('*', '').strip()

            try:
                numeric_value = float(cleaned)

                # Apply percentage conversion - store percentages as decimals for consistency
                if is_percentage and has_percent:
                    # "85.2%" -> 0.852
                    return numeric_value / 100.0
                elif is_percentage and not has_percent and numeric_value <= 1.0:
                    # "0.852" -> 0.852 (already decimal)
                    return numeric_value
                elif is_percentage and not has_percent and numeric_value > 1.0:
                    # "85.2" -> 0.852 (assume percentage)
                    return numeric_value / 100.0
                else:
                    return numeric_value

            except ValueError:
                return None

        return None

    def _extract_period_from_filename(self, filename: str) -> Optional[str]:
        """Extract period from various filename formats"""
        filename_lower = filename.lower()

        # Month mapping
        month_map = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12',
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }

        # Try different patterns
        patterns = [
            r'(\w+)-(\d{4})',  # Month-2024
            r'(\d{4})-(\w+)',  # 2024-Month
            r'(\w+)(\d{4})',   # Month2024
            r'(\w+)-?(\d{2})',  # MonthYY or Month-YY
        ]

        for pattern in patterns:
            match = re.search(pattern, filename_lower)
            if match:
                part1, part2 = match.groups()

                # Determine which part is month and which is year
                if part1 in month_map:
                    month = month_map[part1]
                    year = part2 if len(part2) == 4 else f"20{part2}"
                elif part2 in month_map:
                    month = month_map[part2]
                    year = part1 if len(part1) == 4 else f"20{part1}"
                else:
                    continue

                return f"{year}-{month}-01"

        return None

    def _update_trust_metrics(self, trust_code: str, period: str, data_field: str, data: dict) -> bool:
        """Update specific data field in trust_metrics table"""
        try:
            # Check if record exists
            existing = self.supabase.table('trust_metrics').select('id').eq('trust_code', trust_code).eq('period', period).eq('data_type', 'monthly').execute()

            if existing.data:
                # Update existing record
                result = self.supabase.table('trust_metrics').update({
                    data_field: data,
                    'updated_at': 'now()'
                }).eq('trust_code', trust_code).eq('period', period).eq('data_type', 'monthly').execute()
            else:
                # Create new record
                record = {
                    'trust_code': trust_code,
                    'period': period,
                    'data_type': 'monthly',
                    data_field: data,
                    'created_at': 'now()',
                    'updated_at': 'now()'
                }
                result = self.supabase.table('trust_metrics').insert(record).execute()

            return bool(result.data)

        except Exception as e:
            self.logger.error(f"Database update failed for {trust_code}/{period}: {str(e)}")
            return False

    def process_rtt_data(self) -> Dict[str, Any]:
        """Process all RTT files with proper format handling"""
        self.logger.info("🔄 Starting RTT data processing...")

        # Find RTT files
        rtt_files = list(self.data_directory.glob("Incomplete-Provider-*.xlsx"))
        self.logger.info(f"Found {len(rtt_files)} RTT files")

        if not rtt_files:
            self.logger.warning("No RTT files found!")
            return self.results['rtt']

        for file_path in rtt_files:
            try:
                self.logger.info(f"Processing RTT file: {file_path.name}")

                # Extract period from filename
                period = self._extract_period_from_filename(file_path.name)
                if not period:
                    self.logger.warning(f"Could not extract period from {file_path.name}")
                    continue

                # Read the Provider sheet starting from the correct row
                df = pd.read_excel(file_path, sheet_name='Provider', header=13)
                self.logger.info(f"RTT data shape: {df.shape}")

                # Clean column names
                df.columns = df.columns.astype(str).str.strip()

                # Group by Provider Code (trust code)
                trust_groups = df.groupby('Provider Code')

                for trust_code, trust_data in trust_groups:
                    if pd.isna(trust_code) or len(str(trust_code).strip()) != 3:
                        continue

                    trust_code = str(trust_code).strip()

                    # Build RTT data structure
                    trust_total = {}
                    specialties = {}

                    # Calculate trust-level totals
                    numeric_columns = []
                    for col in df.columns:
                        if any(keyword in str(col).lower() for keyword in ['>', 'weeks', 'total', 'median']):
                            numeric_columns.append(col)

                    # Process each specialty (Treatment Function) for this trust
                    for _, row in trust_data.iterrows():
                        specialty_name = str(row.get('Treatment Function', 'Unknown')).lower().replace(' ', '_')

                        specialty_metrics = {}
                        for col in numeric_columns:
                            value = self._clean_numeric_value(row.get(col), is_percentage='%' in str(col))
                            if value is not None:
                                clean_col_name = str(col).lower().replace('>', 'over_').replace('-', '_to_').replace(' ', '_').replace('+', '_plus')
                                specialty_metrics[clean_col_name] = value

                        if specialty_metrics:
                            specialties[specialty_name] = specialty_metrics

                    # Calculate trust totals from specialties
                    if specialties:
                        for metric in next(iter(specialties.values())).keys():
                            total_value = sum(spec.get(metric, 0) for spec in specialties.values() if spec.get(metric) is not None)
                            if total_value > 0:
                                trust_total[metric] = total_value

                    rtt_data = {
                        'trust_total': trust_total,
                        'specialties': specialties,
                        'metadata': {
                            'file_source': file_path.name,
                            'specialties_count': len(specialties),
                            'processing_timestamp': datetime.now().isoformat()
                        }
                    }

                    # Update database
                    success = self._update_trust_metrics(
                        trust_code,
                        period,
                        'rtt_data',
                        rtt_data
                    )

                    if success:
                        self.results['rtt']['success'] += 1
                        self.logger.info(f"  ✅ {trust_code} RTT data updated ({len(specialties)} specialties)")
                    else:
                        self.results['rtt']['failed'] += 1
                        self.logger.error(f"  ❌ {trust_code} RTT data failed")

            except Exception as e:
                error_msg = f"Error processing RTT file {file_path.name}: {str(e)}"
                self.logger.error(error_msg)
                self.results['rtt']['errors'].append(error_msg)
                self.results['rtt']['failed'] += 1

        self.logger.info(f"RTT processing complete: {self.results['rtt']['success']} success, {self.results['rtt']['failed']} failed")
        return self.results['rtt']

    def process_ae_data(self) -> Dict[str, Any]:
        """Process all A&E CSV files"""
        self.logger.info("🔄 Starting A&E data processing...")

        # Find A&E files (CSV format)
        ae_files = list(self.data_directory.glob("Monthly-AE-*.csv"))
        self.logger.info(f"Found {len(ae_files)} A&E files")

        if not ae_files:
            self.logger.warning("No A&E files found!")
            return self.results['ae']

        for file_path in ae_files:
            try:
                self.logger.info(f"Processing A&E file: {file_path.name}")

                # Extract period from filename
                period = self._extract_period_from_filename(file_path.name)
                if not period:
                    self.logger.warning(f"Could not extract period from {file_path.name}")
                    continue

                # Read CSV file
                df = pd.read_csv(file_path)
                self.logger.info(f"A&E data shape: {df.shape}")

                # Process each trust
                for _, row in df.iterrows():
                    org_code = str(row.get('Org Code', '')).strip()

                    # Only process 3-character trust codes
                    if len(org_code) != 3 or not org_code.isalpha():
                        continue

                    # Build A&E data structure
                    ae_data = {}

                    # Extract numeric columns
                    for col in df.columns:
                        if col not in ['Period', 'Org Code', 'Parent Org', 'Org name']:
                            value = self._clean_numeric_value(row.get(col))
                            if value is not None:
                                clean_col_name = col.lower().replace(' ', '_').replace('&', 'and').replace('-', '_').replace('+', '_plus')
                                ae_data[clean_col_name] = value

                    # Calculate key metrics
                    total_attendances = (
                        ae_data.get('aande_attendances_type_1', 0) +
                        ae_data.get('aande_attendances_type_2', 0) +
                        ae_data.get('aande_attendances_other_aande_department', 0)
                    )

                    total_over_4hrs = (
                        ae_data.get('attendances_over_4hrs_type_1', 0) +
                        ae_data.get('attendances_over_4hrs_type_2', 0) +
                        ae_data.get('attendances_over_4hrs_other_department', 0)
                    )

                    # Calculate 4-hour performance percentage
                    if total_attendances > 0:
                        ae_data['four_hour_performance_pct'] = (total_attendances - total_over_4hrs) / total_attendances
                        ae_data['total_attendances'] = total_attendances
                        ae_data['over_four_hours_total'] = total_over_4hrs

                    # Update database
                    success = self._update_trust_metrics(
                        org_code,
                        period,
                        'ae_data',
                        ae_data
                    )

                    if success:
                        self.results['ae']['success'] += 1
                        self.logger.info(f"  ✅ {org_code} A&E data updated")
                    else:
                        self.results['ae']['failed'] += 1
                        self.logger.error(f"  ❌ {org_code} A&E data failed")

            except Exception as e:
                error_msg = f"Error processing A&E file {file_path.name}: {str(e)}"
                self.logger.error(error_msg)
                self.results['ae']['errors'].append(error_msg)
                self.results['ae']['failed'] += 1

        self.logger.info(f"A&E processing complete: {self.results['ae']['success']} success, {self.results['ae']['failed']} failed")
        return self.results['ae']

    def process_diagnostics_data(self) -> Dict[str, Any]:
        """Process all diagnostics XLS files"""
        self.logger.info("🔄 Starting Diagnostics data processing...")

        # Find diagnostics files (XLS format)
        diagnostics_files = list(self.data_directory.glob("Monthly-Diagnostics-*.xls"))
        self.logger.info(f"Found {len(diagnostics_files)} Diagnostics files")

        if not diagnostics_files:
            self.logger.warning("No Diagnostics files found!")
            return self.results['diagnostics']

        for file_path in diagnostics_files:
            try:
                self.logger.info(f"Processing Diagnostics file: {file_path.name}")

                # Extract period from filename
                period = self._extract_period_from_filename(file_path.name)
                if not period:
                    self.logger.warning(f"Could not extract period from {file_path.name}")
                    continue

                # Read XLS file - try different sheets
                try:
                    excel_file = pd.ExcelFile(file_path)
                    sheet_names = excel_file.sheet_names

                    # Look for the main data sheet
                    data_sheet = None
                    for sheet_name in sheet_names:
                        if any(keyword in sheet_name.lower() for keyword in ['provider', 'trust', 'data']):
                            data_sheet = sheet_name
                            break

                    if not data_sheet:
                        data_sheet = sheet_names[0]  # Use first sheet as fallback

                    df = pd.read_excel(file_path, sheet_name=data_sheet, engine='xlrd')
                    self.logger.info(f"Diagnostics data shape: {df.shape}")

                    # Find header row (similar to RTT)
                    header_row = 0
                    for i in range(min(20, len(df))):
                        if any('provider' in str(df.iloc[i, j]).lower() for j in range(min(5, len(df.columns)))):
                            header_row = i
                            break

                    if header_row > 0:
                        df = pd.read_excel(file_path, sheet_name=data_sheet, header=header_row, engine='xlrd')

                    # Clean column names
                    df.columns = df.columns.astype(str).str.strip()

                    # Process by provider
                    for _, row in df.iterrows():
                        provider_code = None

                        # Look for provider/trust code
                        for col in df.columns:
                            if 'provider' in col.lower() or 'trust' in col.lower() or 'code' in col.lower():
                                code_value = str(row.get(col, '')).strip()
                                if len(code_value) == 3 and code_value.isalpha():
                                    provider_code = code_value
                                    break

                        if not provider_code:
                            continue

                        # Build diagnostics data structure
                        diagnostics_data = {}

                        # Extract diagnostic metrics
                        for col in df.columns:
                            if any(keyword in col.lower() for keyword in ['waiting', 'breach', 'median', 'weeks', 'total']):
                                value = self._clean_numeric_value(row.get(col))
                                if value is not None:
                                    clean_col_name = col.lower().replace(' ', '_').replace('-', '_').replace('%', '_pct')
                                    diagnostics_data[clean_col_name] = value

                        if diagnostics_data:
                            # Update database
                            success = self._update_trust_metrics(
                                provider_code,
                                period,
                                'diagnostics_data',
                                diagnostics_data
                            )

                            if success:
                                self.results['diagnostics']['success'] += 1
                                self.logger.info(f"  ✅ {provider_code} Diagnostics data updated")
                            else:
                                self.results['diagnostics']['failed'] += 1
                                self.logger.error(f"  ❌ {provider_code} Diagnostics data failed")

                except Exception as e:
                    raise e

            except Exception as e:
                error_msg = f"Error processing Diagnostics file {file_path.name}: {str(e)}"
                self.logger.error(error_msg)
                self.results['diagnostics']['errors'].append(error_msg)
                self.results['diagnostics']['failed'] += 1

        self.logger.info(f"Diagnostics processing complete: {self.results['diagnostics']['success']} success, {self.results['diagnostics']['failed']} failed")
        return self.results['diagnostics']

    def run_fixed_refresh(self) -> Dict[str, Any]:
        """Run fixed Phase 3 data refresh"""
        start_time = datetime.now()
        self.logger.info("🚀 Starting FIXED Phase 3 Priority Data Refresh")
        self.logger.info(f"Start time: {start_time}")

        # Process in priority order
        print("\n" + "="*60)
        print("PHASE 3.2: RTT DATA PROCESSING (HIGH PRIORITY)")
        print("="*60)
        rtt_results = self.process_rtt_data()

        print("\n" + "="*60)
        print("PHASE 3.3: A&E DATA PROCESSING")
        print("="*60)
        ae_results = self.process_ae_data()

        print("\n" + "="*60)
        print("PHASE 3.4: DIAGNOSTICS DATA PROCESSING")
        print("="*60)
        diagnostics_results = self.process_diagnostics_data()

        # Calculate totals
        total_success = sum(r['success'] for r in self.results.values())
        total_failed = sum(r['failed'] for r in self.results.values())
        total_errors = sum(len(r['errors']) for r in self.results.values())

        end_time = datetime.now()
        duration = end_time - start_time

        # Final summary
        print("\n" + "="*60)
        print("🎉 FIXED PHASE 3 PRIORITY REFRESH COMPLETE")
        print("="*60)
        print(f"⏱️  Duration: {duration}")
        print(f"✅ Total Success: {total_success}")
        print(f"❌ Total Failed: {total_failed}")
        print(f"⚠️  Total Errors: {total_errors}")
        if total_success + total_failed > 0:
            print(f"📊 Success Rate: {total_success/(total_success + total_failed)*100:.1f}%")

        print("\nBreakdown by data source:")
        for source, results in self.results.items():
            print(f"  {source.upper()}: {results['success']} success, {results['failed']} failed")

        if total_errors > 0:
            print(f"\n⚠️  First 5 errors:")
            all_errors = []
            for results in self.results.values():
                all_errors.extend(results['errors'])
            for error in all_errors[:5]:
                print(f"  • {error}")

        return {
            'summary': {
                'total_success': total_success,
                'total_failed': total_failed,
                'total_errors': total_errors,
                'duration_seconds': duration.total_seconds(),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat()
            },
            'detailed_results': self.results
        }

def main():
    """Main execution function"""
    try:
        # Initialize processor
        processor = FixedPhase3Refresh()

        # Run fixed refresh
        results = processor.run_fixed_refresh()

        # Save results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        with open(f'fixed_phase3_results_{timestamp}.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n💾 Results saved to: fixed_phase3_results_{timestamp}.json")

        return results

    except KeyboardInterrupt:
        print("\n⏸️  Process interrupted by user")
        return None
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    results = main()
    if results:
        sys.exit(0)
    else:
        sys.exit(1)
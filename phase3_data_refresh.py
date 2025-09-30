#!/usr/bin/env python3
"""
Phase 3 Data Refresh - Complete Database Re-population
Re-implements Phase 3 of the NHS database refresh plan for RTT, A&E, Diagnostics, and Community Health data.
Excludes cancer data (3.1) as it's already loaded.
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

# Import processors from data-pipeline directory
sys.path.append('./data-pipeline')
from rtt_processor import RTTProcessor, RTTMetrics
from ae_processor import AEProcessor, AEMetrics
from diagnostics_processor import DiagnosticsProcessor, DiagnosticsMetrics

class Phase3DataRefresh:
    """
    Orchestrates the complete re-processing of Phase 3 data sources
    """

    def __init__(self, data_directory: str = "./Data"):
        self.data_directory = Path(data_directory)
        self.logger = self._setup_logging()

        # Initialize processors
        self.rtt_processor = RTTProcessor()
        self.ae_processor = AEProcessor()
        self.diagnostics_processor = DiagnosticsProcessor()

        # Initialize Supabase client
        self._init_supabase()

        # Processing results
        self.results = {
            'rtt': {'success': 0, 'failed': 0, 'errors': []},
            'ae': {'success': 0, 'failed': 0, 'errors': []},
            'diagnostics': {'success': 0, 'failed': 0, 'errors': []},
            'community': {'success': 0, 'failed': 0, 'errors': []}
        }

    def _setup_logging(self) -> logging.Logger:
        """Setup comprehensive logging"""
        logger = logging.getLogger('phase3_refresh')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)

            # File handler
            file_handler = logging.FileHandler(f'phase3_refresh_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
            file_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)

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

    # RTT Processing (Priority #1)
    def process_rtt_data(self) -> Dict[str, Any]:
        """Process all RTT files (Incomplete-Provider-*)"""
        self.logger.info("🔄 Starting RTT data processing...")

        # Find RTT files
        rtt_files = list(self.data_directory.glob("Incomplete-Provider-*.xlsx"))
        self.logger.info(f"Found {len(rtt_files)} RTT files")

        for file_path in rtt_files:
            try:
                self.logger.info(f"Processing RTT file: {file_path.name}")

                # Extract period from filename
                period = self._extract_period_from_filename(file_path.name)
                if not period:
                    self.logger.warning(f"Could not extract period from {file_path.name}")
                    continue

                # Process the file
                rtt_results = self.rtt_processor.process_rtt_file(file_path, period)

                # Upload each trust's data
                for rtt_metrics in rtt_results:
                    # Build RTT data structure
                    rtt_data = {
                        'trust_total': rtt_metrics.trust_total,
                        'specialties': rtt_metrics.specialties,
                        'metadata': {
                            'file_source': file_path.name,
                            'specialties_count': len(rtt_metrics.specialties),
                            'processing_timestamp': datetime.now().isoformat()
                        }
                    }

                    # Update database
                    success = self._update_trust_metrics(
                        rtt_metrics.trust_code,
                        rtt_metrics.period,
                        'rtt_data',
                        rtt_data
                    )

                    if success:
                        self.results['rtt']['success'] += 1
                        self.logger.info(f"  ✅ {rtt_metrics.trust_code} RTT data updated")
                    else:
                        self.results['rtt']['failed'] += 1
                        self.logger.error(f"  ❌ {rtt_metrics.trust_code} RTT data failed")

            except Exception as e:
                error_msg = f"Error processing RTT file {file_path.name}: {str(e)}"
                self.logger.error(error_msg)
                self.results['rtt']['errors'].append(error_msg)
                self.results['rtt']['failed'] += 1

        self.logger.info(f"RTT processing complete: {self.results['rtt']['success']} success, {self.results['rtt']['failed']} failed")
        return self.results['rtt']

    def process_ae_data(self) -> Dict[str, Any]:
        """Process all A&E files (Monthly-AE-*)"""
        self.logger.info("🔄 Starting A&E data processing...")

        # Find A&E files (CSV format)
        ae_files = list(self.data_directory.glob("Monthly-AE-*.csv"))
        self.logger.info(f"Found {len(ae_files)} A&E files")

        for file_path in ae_files:
            try:
                self.logger.info(f"Processing A&E file: {file_path.name}")

                # Extract period from filename
                period = self._extract_period_from_filename(file_path.name)
                if not period:
                    self.logger.warning(f"Could not extract period from {file_path.name}")
                    continue

                # Process the CSV file
                ae_results = self.ae_processor.process_ae_file(file_path, period)

                # Upload each trust's data
                for ae_metrics in ae_results:
                    # Update database
                    success = self._update_trust_metrics(
                        ae_metrics.trust_code,
                        ae_metrics.period,
                        'ae_data',
                        ae_metrics.ae_data
                    )

                    if success:
                        self.results['ae']['success'] += 1
                        self.logger.info(f"  ✅ {ae_metrics.trust_code} A&E data updated")
                    else:
                        self.results['ae']['failed'] += 1
                        self.logger.error(f"  ❌ {ae_metrics.trust_code} A&E data failed")

            except Exception as e:
                error_msg = f"Error processing A&E file {file_path.name}: {str(e)}"
                self.logger.error(error_msg)
                self.results['ae']['errors'].append(error_msg)
                self.results['ae']['failed'] += 1

        self.logger.info(f"A&E processing complete: {self.results['ae']['success']} success, {self.results['ae']['failed']} failed")
        return self.results['ae']

    def process_diagnostics_data(self) -> Dict[str, Any]:
        """Process all diagnostics files (Monthly-Diagnostics-*)"""
        self.logger.info("🔄 Starting Diagnostics data processing...")

        # Find diagnostics files (XLS format)
        diagnostics_files = list(self.data_directory.glob("Monthly-Diagnostics-*.xls"))
        self.logger.info(f"Found {len(diagnostics_files)} Diagnostics files")

        for file_path in diagnostics_files:
            try:
                self.logger.info(f"Processing Diagnostics file: {file_path.name}")

                # Extract period from filename
                period = self._extract_period_from_filename(file_path.name)
                if not period:
                    self.logger.warning(f"Could not extract period from {file_path.name}")
                    continue

                # Process the file
                diagnostics_results = self.diagnostics_processor.process_diagnostics_file(file_path, period)

                # Upload each trust's data
                for diag_metrics in diagnostics_results:
                    # Update database
                    success = self._update_trust_metrics(
                        diag_metrics.trust_code,
                        diag_metrics.period,
                        'diagnostics_data',
                        diag_metrics.diagnostics_data
                    )

                    if success:
                        self.results['diagnostics']['success'] += 1
                        self.logger.info(f"  ✅ {diag_metrics.trust_code} Diagnostics data updated")
                    else:
                        self.results['diagnostics']['failed'] += 1
                        self.logger.error(f"  ❌ {diag_metrics.trust_code} Diagnostics data failed")

            except Exception as e:
                error_msg = f"Error processing Diagnostics file {file_path.name}: {str(e)}"
                self.logger.error(error_msg)
                self.results['diagnostics']['errors'].append(error_msg)
                self.results['diagnostics']['failed'] += 1

        self.logger.info(f"Diagnostics processing complete: {self.results['diagnostics']['success']} success, {self.results['diagnostics']['failed']} failed")
        return self.results['diagnostics']

    def process_community_health_data(self) -> Dict[str, Any]:
        """Process community health data using existing batch processor"""
        self.logger.info("🔄 Starting Community Health data processing...")

        try:
            # Import and run the batch processor
            from batch_backfill import CommunityDataBatchProcessor

            processor = CommunityDataBatchProcessor("./Data", "./trust_mapping.json")
            batch_results = processor.process_all_files()

            self.results['community']['success'] = batch_results.successful_updates
            self.results['community']['failed'] = batch_results.failed_updates
            self.results['community']['errors'] = batch_results.errors

            self.logger.info(f"Community Health processing complete: {self.results['community']['success']} success, {self.results['community']['failed']} failed")

        except Exception as e:
            error_msg = f"Error processing Community Health data: {str(e)}"
            self.logger.error(error_msg)
            self.results['community']['errors'].append(error_msg)
            self.results['community']['failed'] = 1

        return self.results['community']

    def run_full_refresh(self) -> Dict[str, Any]:
        """Run complete Phase 3 data refresh"""
        start_time = datetime.now()
        self.logger.info("🚀 Starting Phase 3 Data Refresh (excluding cancer data)")
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

        print("\n" + "="*60)
        print("PHASE 3.5: COMMUNITY HEALTH DATA PROCESSING")
        print("="*60)
        community_results = self.process_community_health_data()

        # Calculate totals
        total_success = sum(r['success'] for r in self.results.values())
        total_failed = sum(r['failed'] for r in self.results.values())
        total_errors = sum(len(r['errors']) for r in self.results.values())

        end_time = datetime.now()
        duration = end_time - start_time

        # Final summary
        print("\n" + "="*60)
        print("🎉 PHASE 3 DATA REFRESH COMPLETE")
        print("="*60)
        print(f"⏱️  Duration: {duration}")
        print(f"✅ Total Success: {total_success}")
        print(f"❌ Total Failed: {total_failed}")
        print(f"⚠️  Total Errors: {total_errors}")
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
        processor = Phase3DataRefresh()

        # Run full refresh
        results = processor.run_full_refresh()

        # Save results
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        with open(f'phase3_refresh_results_{timestamp}.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)

        print(f"\n💾 Results saved to: phase3_refresh_results_{timestamp}.json")

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
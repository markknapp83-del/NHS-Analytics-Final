#!/usr/bin/env python3
"""
Phase 3: 12-Month Historical Backfill
Process all 12 months of community data and update database with comprehensive
batch processing, temporal alignment, and validation.
"""

import os
import sys
import glob
import json
import pandas as pd
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import re
import time
from supabase import create_client, Client

# Import the community processor functions
from community_processor import (
    ADULT_SERVICE_MAPPING,
    CYP_SERVICE_MAPPING,
    extract_provider_data,
    consolidate_trust_data,
    load_trust_mapping,
    read_community_tables,
    get_service_names
)

@dataclass
class ProcessingResult:
    """Track results of processing a single file/trust"""
    trust_code: str
    trust_name: str
    period: datetime
    filename: str
    success: bool
    services_count: int
    total_waiting: int
    error_message: Optional[str] = None
    processing_time: float = 0.0

@dataclass
class BatchResults:
    """Overall batch processing results"""
    total_files: int
    successful_updates: int
    failed_updates: int
    processing_time: float
    coverage_matrix: Dict[str, Dict[str, bool]]  # trust_code -> {period -> success}
    errors: List[str]

class CommunityDataBatchProcessor:
    """
    Process multiple months of community health data files and update database
    """

    def __init__(self, data_directory: str, trust_mapping_file: str):
        self.data_directory = Path(data_directory)
        self.trust_mapping_file = trust_mapping_file
        self.trust_mapping = {}
        self.results = []
        self.coverage_matrix = {}
        self.errors = []

        # Initialize Supabase client
        self._init_supabase()

        # Load trust mapping
        self._load_trust_mapping()

    def _init_supabase(self):
        """Initialize Supabase client with environment variables"""
        try:
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if not supabase_url or not supabase_key:
                raise ValueError("Missing Supabase credentials in environment variables")

            self.supabase: Client = create_client(supabase_url, supabase_key)
            print("✅ Supabase client initialized successfully")

        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            sys.exit(1)

    def _load_trust_mapping(self):
        """Load trust mapping from JSON file"""
        try:
            with open(self.trust_mapping_file, 'r') as f:
                mapping_data = json.load(f)

            # Convert to simple dict for quick lookup
            self.trust_mapping = {
                trust['trust_code']: trust['trust_name']
                for trust in mapping_data['matched_trusts']
            }

            print(f"✅ Loaded {len(self.trust_mapping)} trust mappings")

        except Exception as e:
            print(f"❌ Failed to load trust mapping: {e}")
            sys.exit(1)

    def discover_community_files(self) -> List[Tuple[str, datetime]]:
        """
        Discover all community health Excel files and extract their periods
        Returns list of (filename, period_date) tuples
        """
        files = []
        pattern = self.data_directory / "Community-health-services-waiting-lists-*.xlsx"

        for filepath in glob.glob(str(pattern)):
            filename = Path(filepath).name
            period = self._extract_period_from_filename(filename)

            if period:
                files.append((filepath, period))
                print(f"📅 Discovered: {filename} -> {period.strftime('%Y-%m-%d')}")
            else:
                print(f"⚠️  Could not extract period from: {filename}")

        # Sort by period date
        files.sort(key=lambda x: x[1])
        return files

    def _extract_period_from_filename(self, filename: str) -> Optional[datetime]:
        """
        Extract period date from filename patterns like:
        - Community-health-services-waiting-lists-2024-25-March.xlsx
        - Community-health-services-waiting-lists-2025-26-June.xlsx
        """
        try:
            # Extract year and month from filename
            match = re.search(r'(\d{4})-\d{2}-(\w+)\.xlsx$', filename)
            if not match:
                return None

            year_str = match.group(1)
            month_str = match.group(2)

            # Convert month name to number
            month_map = {
                'January': 1, 'February': 2, 'March': 3, 'April': 4,
                'May': 5, 'June': 6, 'July': 7, 'August': 8,
                'September': 9, 'October': 10, 'November': 11, 'December': 12
            }

            if month_str not in month_map:
                return None

            # For NHS financial year, April-March spans two calendar years
            # Files named 2024-25 contain data from April 2024 to March 2025
            year = int(year_str)
            month = month_map[month_str]

            # Adjust year based on month for financial year
            if month >= 4:  # April-December: use first year
                period_date = datetime(year, month, 1)
            else:  # January-March: use second year
                period_date = datetime(year + 1, month, 1)

            return period_date

        except Exception as e:
            print(f"⚠️  Error parsing filename {filename}: {e}")
            return None

    def process_single_file(self, filepath: str, period: datetime) -> List[ProcessingResult]:
        """
        Process a single Excel file and return results for all trusts
        """
        start_time = time.time()
        filename = Path(filepath).name
        results = []

        print(f"\n🔄 Processing {filename} for period {period.strftime('%Y-%m-%d')}")

        try:
            # Read all community tables from Excel file
            tables = read_community_tables(filepath)
            if not tables:
                error_msg = f"No tables could be read from {filename}"
                print(f"❌ {error_msg}")
                self.errors.append(error_msg)
                return results

            # Extract provider data for all trusts in our mapping
            trust_codes = list(self.trust_mapping.keys())
            provider_data = extract_provider_data(tables, trust_codes)

            if not provider_data:
                error_msg = f"No provider data extracted from {filename}"
                print(f"❌ {error_msg}")
                self.errors.append(error_msg)
                return results

            # Get service names
            services = get_service_names(filepath)
            if not services:
                error_msg = f"No service names extracted from {filename}"
                print(f"❌ {error_msg}")
                self.errors.append(error_msg)
                return results

            # Process each trust's data
            for trust_code in provider_data.keys():
                trust_start = time.time()
                trust_name = self.trust_mapping.get(trust_code, "Unknown")

                try:
                    # Build JSONB structure
                    community_data = consolidate_trust_data(trust_code, provider_data, services)

                    if not community_data:
                        continue

                    # Update database
                    success = self._update_trust_metrics(trust_code, period, community_data)

                    # Calculate metrics for reporting
                    metadata = community_data.get('metadata', {})
                    services_count = metadata.get('services_reported', 0)
                    total_waiting = metadata.get('total_waiting_all_services', 0)

                    result = ProcessingResult(
                        trust_code=trust_code,
                        trust_name=trust_name,
                        period=period,
                        filename=filename,
                        success=success,
                        services_count=services_count,
                        total_waiting=total_waiting,
                        processing_time=time.time() - trust_start
                    )

                    if success:
                        print(f"  ✅ {trust_code} - {services_count} services, {total_waiting:,} waiting")
                    else:
                        print(f"  ❌ {trust_code} - Database update failed")

                    results.append(result)

                except Exception as e:
                    error_msg = f"Error processing {trust_code} in {filename}: {str(e)}"
                    print(f"  ❌ {trust_code} - {error_msg}")
                    self.errors.append(error_msg)

                    result = ProcessingResult(
                        trust_code=trust_code,
                        trust_name=trust_name,
                        period=period,
                        filename=filename,
                        success=False,
                        services_count=0,
                        total_waiting=0,
                        error_message=str(e),
                        processing_time=time.time() - trust_start
                    )
                    results.append(result)

        except Exception as e:
            error_msg = f"Failed to process file {filename}: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors.append(error_msg)

        processing_time = time.time() - start_time
        print(f"📊 File processed in {processing_time:.2f}s - {len(results)} trusts")

        return results

    def _update_trust_metrics(self, trust_code: str, period: datetime, community_data: dict) -> bool:
        """
        Update community_data field in trust_metrics table
        """
        try:
            # Format period as first day of month
            period_str = period.strftime('%Y-%m-%d')

            # Update query
            result = self.supabase.table('trust_metrics').update({
                'community_health_data': community_data,
                'updated_at': 'now()'
            }).eq('trust_code', trust_code).eq('period', period_str).eq('data_type', 'monthly').execute()

            # Check if update was successful
            if hasattr(result, 'data') and result.data:
                return True
            else:
                # Log what happened
                print(f"    ⚠️  No rows updated for {trust_code} on {period_str}")
                return False

        except Exception as e:
            print(f"    ❌ Database error for {trust_code}: {str(e)}")
            return False

    def build_coverage_matrix(self, all_results: List[ProcessingResult]) -> Dict[str, Dict[str, bool]]:
        """
        Build coverage matrix showing which trusts were successfully processed for each period
        """
        matrix = {}

        for result in all_results:
            trust_code = result.trust_code
            period_key = result.period.strftime('%Y-%m')

            if trust_code not in matrix:
                matrix[trust_code] = {}

            matrix[trust_code][period_key] = result.success

        return matrix

    def generate_coverage_report(self) -> str:
        """
        Generate a coverage matrix CSV showing trust x month success/failure
        """
        if not self.results:
            return ""

        # Get all unique periods
        periods = sorted(set(r.period.strftime('%Y-%m') for r in self.results))
        trust_codes = sorted(set(r.trust_code for r in self.results))

        # Create CSV content
        csv_content = []

        # Header row
        header = ['Trust Code', 'Trust Name'] + periods
        csv_content.append(header)

        # Data rows
        for trust_code in trust_codes:
            trust_name = self.trust_mapping.get(trust_code, 'Unknown')
            row = [trust_code, trust_name]

            for period in periods:
                # Find result for this trust/period combination
                success = False
                for result in self.results:
                    if (result.trust_code == trust_code and
                        result.period.strftime('%Y-%m') == period):
                        success = result.success
                        break

                row.append('✅' if success else '❌')

            csv_content.append(row)

        # Convert to CSV string
        output = []
        for row in csv_content:
            output.append(','.join(str(cell) for cell in row))

        return '\n'.join(output)

    def process_all_files(self) -> BatchResults:
        """
        Process all discovered community health files
        """
        start_time = time.time()

        print("🚀 Starting 12-month community data backfill...")

        # Discover all files
        files = self.discover_community_files()

        if not files:
            print("❌ No community health files found!")
            return BatchResults(0, 0, 0, 0, {}, ["No files found"])

        print(f"📁 Found {len(files)} files to process")

        # Process each file
        all_results = []
        for filepath, period in files:
            file_results = self.process_single_file(filepath, period)
            all_results.extend(file_results)

        self.results = all_results

        # Build coverage matrix
        self.coverage_matrix = self.build_coverage_matrix(all_results)

        # Calculate summary statistics
        successful_updates = sum(1 for r in all_results if r.success)
        failed_updates = sum(1 for r in all_results if not r.success)
        total_time = time.time() - start_time

        return BatchResults(
            total_files=len(files),
            successful_updates=successful_updates,
            failed_updates=failed_updates,
            processing_time=total_time,
            coverage_matrix=self.coverage_matrix,
            errors=self.errors
        )

    def save_results(self, results: BatchResults):
        """
        Save processing results to JSON files
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Save detailed results
        results_data = {
            'summary': {
                'total_files': results.total_files,
                'successful_updates': results.successful_updates,
                'failed_updates': results.failed_updates,
                'processing_time': results.processing_time,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': [
                {
                    'trust_code': r.trust_code,
                    'trust_name': r.trust_name,
                    'period': r.period.isoformat(),
                    'filename': r.filename,
                    'success': r.success,
                    'services_count': r.services_count,
                    'total_waiting': r.total_waiting,
                    'error_message': r.error_message,
                    'processing_time': r.processing_time
                }
                for r in self.results
            ],
            'errors': results.errors
        }

        # Save backfill results
        with open(f'backfill_results_{timestamp}.json', 'w') as f:
            json.dump(results_data, f, indent=2, default=str)

        # Save coverage matrix as CSV
        coverage_csv = self.generate_coverage_report()
        with open(f'coverage_matrix_{timestamp}.csv', 'w') as f:
            f.write(coverage_csv)

        print(f"💾 Results saved:")
        print(f"  - backfill_results_{timestamp}.json")
        print(f"  - coverage_matrix_{timestamp}.csv")

def main():
    """
    Main execution function
    """
    # Configuration
    data_directory = "./Data"
    trust_mapping_file = "./trust_mapping.json"

    # Load environment variables
    env_path = Path('.env.local')
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)
        print("✅ Environment variables loaded")
    else:
        print("⚠️  No .env.local file found - using system environment")

    try:
        # Initialize processor
        processor = CommunityDataBatchProcessor(data_directory, trust_mapping_file)

        # Process all files
        results = processor.process_all_files()

        # Print summary
        print("\n" + "="*60)
        print("🎉 BATCH PROCESSING COMPLETE")
        print("="*60)
        print(f"📁 Files processed: {results.total_files}")
        print(f"✅ Successful updates: {results.successful_updates}")
        print(f"❌ Failed updates: {results.failed_updates}")
        print(f"⏱️  Total time: {results.processing_time:.2f}s")
        print(f"📊 Success rate: {(results.successful_updates/(results.successful_updates + results.failed_updates)*100):.1f}%")

        if results.errors:
            print(f"\n⚠️  {len(results.errors)} errors encountered:")
            for error in results.errors[:5]:  # Show first 5 errors
                print(f"  • {error}")
            if len(results.errors) > 5:
                print(f"  • ... and {len(results.errors) - 5} more")

        # Save results
        processor.save_results(results)

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
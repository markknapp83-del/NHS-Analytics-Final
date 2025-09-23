#!/usr/bin/env python3
"""
Multi-Source NHS Data Processor
Coordinates processing of all NHS data sources (RTT, A&E, Diagnostics, etc.)
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import pandas as pd

from rtt_processor import RTTProcessor, RTTMetrics
from ae_processor import AEProcessor, AEMetrics
from diagnostics_processor import DiagnosticsProcessor, DiagnosticsMetrics


@dataclass
class ProcessingResult:
    """Result of processing a data source"""
    source_name: str
    success: bool
    records_processed: int
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_seconds: Optional[float] = None
    validation_warnings: List[str] = None


@dataclass
class TrustMetricsRecord:
    """Unified trust metrics record for database insertion"""
    trust_code: str
    period: str
    data_type: str
    rtt_data: Optional[Dict[str, Any]] = None
    ae_data: Optional[Dict[str, Any]] = None
    diagnostics_data: Optional[Dict[str, Any]] = None
    capacity_data: Optional[Dict[str, Any]] = None
    quality_data: Optional[Dict[str, Any]] = None
    finance_data: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MultiSourceProcessor:
    """
    Coordinates processing of multiple NHS data sources
    Combines data from different processors into unified trust metrics
    """

    def __init__(self, config_path: str = "data_source_config.json"):
        """Initialize multi-source processor"""
        self.config = self._load_config(config_path)
        self.logger = self._setup_logging()

        # Initialize individual processors
        self.rtt_processor = RTTProcessor()
        self.ae_processor = AEProcessor()
        self.diagnostics_processor = DiagnosticsProcessor()

        # Processor mapping
        self.processors = {
            'rtt_data': self.rtt_processor,
            'ae_data': self.ae_processor,
            'diagnostics_data': self.diagnostics_processor
        }

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON in configuration file: {config_path}")

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('multi_source_processor')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def process_monthly_data(self, year: int, month: int, data_directory: Path) -> Dict[str, ProcessingResult]:
        """Process all available data sources for a specific month"""
        self.logger.info(f"Processing monthly data for {year}/{month:02d}")

        period = f"{year}-{month:02d}"
        results = {}

        # Process each data source based on priority
        sources = sorted(
            self.config['data_sources'].items(),
            key=lambda x: x[1]['processing_priority']
        )

        for source_name, source_config in sources:
            try:
                result = self.process_data_source(source_name, year, month, data_directory)
                results[source_name] = result
            except Exception as e:
                self.logger.error(f"Failed to process {source_name}: {str(e)}")
                results[source_name] = ProcessingResult(
                    source_name=source_name,
                    success=False,
                    records_processed=0,
                    error_message=str(e)
                )

        return results

    def process_data_source(self, source_name: str, year: int, month: int, data_directory: Path) -> ProcessingResult:
        """Process a single data source"""
        self.logger.info(f"Processing {source_name} for {year}/{month:02d}")

        start_time = datetime.now()
        period = f"{year}-{month:02d}"

        try:
            # Find data files for this source
            files = self._find_data_files(source_name, year, month, data_directory)

            if not files:
                return ProcessingResult(
                    source_name=source_name,
                    success=False,
                    records_processed=0,
                    error_message="No data files found"
                )

            # Process files with appropriate processor
            all_metrics = []
            all_warnings = []

            for file_path in files:
                self.logger.info(f"Processing file: {file_path.name}")

                if source_name == 'rtt_data':
                    metrics = self.rtt_processor.process_rtt_file(file_path, period)
                    # Validate each metric record
                    for metric in metrics:
                        warnings = self.rtt_processor.validate_rtt_metrics(metric)
                        all_warnings.extend(warnings)
                    all_metrics.extend(metrics)

                elif source_name == 'ae_data':
                    metrics = self.ae_processor.process_ae_file(file_path, period)
                    # Validate each metric record
                    for metric in metrics:
                        warnings = self.ae_processor.validate_ae_metrics(metric)
                        all_warnings.extend(warnings)
                    all_metrics.extend(metrics)

                elif source_name == 'diagnostics_data':
                    metrics = self.diagnostics_processor.process_diagnostics_file(file_path, period)
                    # Validate each metric record
                    for metric in metrics:
                        warnings = self.diagnostics_processor.validate_diagnostics_metrics(metric)
                        all_warnings.extend(warnings)
                    all_metrics.extend(metrics)

                else:
                    self.logger.warning(f"No processor configured for {source_name}")
                    continue

            processing_time = (datetime.now() - start_time).total_seconds()

            return ProcessingResult(
                source_name=source_name,
                success=True,
                records_processed=len(all_metrics),
                file_path=str(files[0]) if files else None,
                processing_time_seconds=processing_time,
                validation_warnings=all_warnings
            )

        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            self.logger.error(f"Error processing {source_name}: {str(e)}")

            return ProcessingResult(
                source_name=source_name,
                success=False,
                records_processed=0,
                error_message=str(e),
                processing_time_seconds=processing_time
            )

    def _find_data_files(self, source_name: str, year: int, month: int, data_directory: Path) -> List[Path]:
        """Find data files for a specific source and month"""
        source_config = self.config['data_sources'][source_name]
        file_patterns = source_config['file_patterns']

        files = []
        month_dir = data_directory / str(year) / f"{month:02d}"

        if not month_dir.exists():
            # Try alternative directory structures
            month_dir = data_directory / f"{year}-{month:02d}"

        if not month_dir.exists():
            self.logger.warning(f"Data directory not found: {month_dir}")
            return files

        for pattern in file_patterns:
            filename = pattern.format(year=year, month=f"{month:02d}")
            file_path = month_dir / filename

            if file_path.exists():
                files.append(file_path)
            else:
                # Try variations of the filename
                for file in month_dir.glob(f"*{filename.split('-')[-1]}"):
                    if source_name.split('_')[0].lower() in file.name.lower():
                        files.append(file)
                        break

        return files

    def combine_trust_metrics(self, processing_results: Dict[str, ProcessingResult],
                            year: int, month: int) -> List[TrustMetricsRecord]:
        """Combine metrics from all sources into unified trust records"""
        self.logger.info("Combining metrics from all sources")

        period = f"{year}-{month:02d}"
        trust_data = {}  # trust_code -> combined metrics

        # Collect all trust codes
        all_trust_codes = set()

        for source_name, result in processing_results.items():
            if result.success:
                # Get metrics from the appropriate processor cache
                # (This would need to be implemented to store results temporarily)
                pass

        # For now, return empty list - this would be implemented
        # to actually combine the metrics from different sources
        combined_records = []

        return combined_records

    def process_and_export_monthly_data(self, year: int, month: int,
                                      data_directory: Path,
                                      output_path: Optional[Path] = None) -> Dict[str, Any]:
        """Process monthly data and export to JSON/CSV"""
        # Process all sources
        processing_results = self.process_monthly_data(year, month, data_directory)

        # Combine into unified records
        combined_records = self.combine_trust_metrics(processing_results, year, month)

        # Generate summary report
        summary = self._generate_processing_summary(processing_results, combined_records)

        # Export if output path provided
        if output_path:
            self._export_results(combined_records, output_path, year, month)

        return {
            'processing_results': processing_results,
            'combined_records': combined_records,
            'summary': summary
        }

    def _generate_processing_summary(self, processing_results: Dict[str, ProcessingResult],
                                   combined_records: List[TrustMetricsRecord]) -> Dict[str, Any]:
        """Generate summary of processing results"""
        summary = {
            'total_sources_processed': len(processing_results),
            'successful_sources': sum(1 for r in processing_results.values() if r.success),
            'failed_sources': sum(1 for r in processing_results.values() if not r.success),
            'total_records_processed': sum(r.records_processed for r in processing_results.values()),
            'combined_trust_records': len(combined_records),
            'processing_time_seconds': sum(
                r.processing_time_seconds or 0 for r in processing_results.values()
            ),
            'sources': {}
        }

        for source_name, result in processing_results.items():
            summary['sources'][source_name] = {
                'success': result.success,
                'records_processed': result.records_processed,
                'processing_time_seconds': result.processing_time_seconds,
                'validation_warnings': len(result.validation_warnings or []),
                'error_message': result.error_message
            }

        return summary

    def _export_results(self, records: List[TrustMetricsRecord],
                       output_path: Path, year: int, month: int) -> None:
        """Export processing results to files"""
        output_path.mkdir(parents=True, exist_ok=True)

        # Export as JSON
        json_file = output_path / f"trust_metrics_{year}_{month:02d}.json"
        with open(json_file, 'w') as f:
            json.dump([asdict(record) for record in records], f, indent=2, default=str)

        self.logger.info(f"Exported {len(records)} records to {json_file}")

        # Export as CSV for easier analysis
        if records:
            df = pd.DataFrame([asdict(record) for record in records])
            csv_file = output_path / f"trust_metrics_{year}_{month:02d}.csv"
            df.to_csv(csv_file, index=False)
            self.logger.info(f"Exported {len(records)} records to {csv_file}")

    def get_processing_status(self, year: int, month: int, data_directory: Path) -> Dict[str, Any]:
        """Get status of available data for processing"""
        status = {
            'year': year,
            'month': month,
            'data_directory': str(data_directory),
            'sources': {}
        }

        for source_name, source_config in self.config['data_sources'].items():
            files = self._find_data_files(source_name, year, month, data_directory)

            source_status = {
                'expected_files': len(source_config['file_patterns']),
                'available_files': len(files),
                'ready_for_processing': len(files) > 0,
                'files': [str(f) for f in files]
            }

            status['sources'][source_name] = source_status

        status['overall_ready'] = all(
            s['ready_for_processing'] for s in status['sources'].values()
        )

        return status

    def validate_data_consistency(self, combined_records: List[TrustMetricsRecord]) -> List[str]:
        """Validate consistency across data sources"""
        warnings = []

        # Group records by trust
        trust_groups = {}
        for record in combined_records:
            if record.trust_code not in trust_groups:
                trust_groups[record.trust_code] = []
            trust_groups[record.trust_code].append(record)

        # Check each trust's data consistency
        for trust_code, trust_records in trust_groups.items():
            # Check for duplicate periods
            periods = [r.period for r in trust_records]
            if len(periods) != len(set(periods)):
                warnings.append(f"Duplicate periods found for trust {trust_code}")

            # Check cross-domain consistency
            for record in trust_records:
                record_warnings = self._validate_cross_domain_consistency(record)
                warnings.extend(record_warnings)

        return warnings

    def _validate_cross_domain_consistency(self, record: TrustMetricsRecord) -> List[str]:
        """Validate consistency between different data domains"""
        warnings = []

        # Example: Check if A&E admissions are reasonable compared to total activity
        if record.ae_data and record.rtt_data:
            ae_admissions = record.ae_data.get('emergency_admissions_total')
            rtt_pathways = record.rtt_data.get('trust_total', {}).get('total_incomplete_pathways')

            if ae_admissions and rtt_pathways:
                # Emergency admissions shouldn't be more than 50% of RTT pathways typically
                if ae_admissions > (rtt_pathways * 0.5):
                    warnings.append(
                        f"Trust {record.trust_code}: A&E admissions ({ae_admissions}) "
                        f"unusually high compared to RTT pathways ({rtt_pathways})"
                    )

        return warnings


def main():
    """Example usage of Multi-Source Processor"""
    try:
        processor = MultiSourceProcessor()

        # Example processing for current month
        year = 2024
        month = 1
        data_directory = Path("data/downloads")

        print(f"Multi-Source Processor initialized")
        print(f"Configured for {len(processor.processors)} data sources")

        # Check processing status
        status = processor.get_processing_status(year, month, data_directory)
        print(f"\nProcessing Status for {year}/{month:02d}:")
        print(f"Overall ready: {status['overall_ready']}")

        for source_name, source_status in status['sources'].items():
            available = source_status['available_files']
            expected = source_status['expected_files']
            print(f"  {source_name}: {available}/{expected} files available")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
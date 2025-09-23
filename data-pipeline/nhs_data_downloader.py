#!/usr/bin/env python3
"""
NHS Data Downloader
Automated download system for NHS England statistical data sources
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import hashlib
from dataclasses import dataclass


@dataclass
class DownloadResult:
    """Result of a file download attempt"""
    success: bool
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    error_message: Optional[str] = None
    http_status: Optional[int] = None
    duration_seconds: Optional[float] = None


class NHSDataDownloader:
    """
    Robust NHS data downloader with retry logic, validation, and monitoring
    """

    def __init__(self, config_path: str = "data_source_config.json"):
        """Initialize downloader with configuration"""
        self.config = self._load_config(config_path)
        self.session = self._create_session()
        self.logger = self._setup_logging()

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON in configuration file: {config_path}")

    def _create_session(self) -> requests.Session:
        """Create HTTP session with retry strategy"""
        session = requests.Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=self.config['download_settings']['max_retries'],
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS"]
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # Set user agent
        session.headers.update({
            'User-Agent': self.config['download_settings']['user_agent']
        })

        return session

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('nhs_data_downloader')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def get_expected_release_dates(self, year: int, month: int) -> Dict[str, datetime]:
        """Calculate expected release dates for each data source"""
        base_date = datetime(year, month, 1)

        # Move to next month for release dates
        if month == 12:
            release_month = datetime(year + 1, 1, 1)
        else:
            release_month = datetime(year, month + 1, 1)

        release_dates = {}
        for source_name, source_config in self.config['data_sources'].items():
            release_day = source_config['release_day']
            release_date = release_month.replace(day=release_day)
            release_dates[source_name] = release_date

        return release_dates

    def _build_download_urls(self, source_name: str, year: int, month: int) -> List[str]:
        """Build download URLs for a data source"""
        source_config = self.config['data_sources'][source_name]
        url_pattern = source_config['url_pattern']
        file_patterns = source_config['file_patterns']

        # Format base URL
        base_url = url_pattern.format(year=year, month=f"{month:02d}")

        # Build file URLs
        urls = []
        for file_pattern in file_patterns:
            filename = file_pattern.format(year=year, month=f"{month:02d}")
            full_url = urljoin(base_url, filename)
            urls.append(full_url)

        return urls

    def _create_download_directory(self, year: int, month: int) -> Path:
        """Create and return download directory path"""
        download_dir = self.config['download_settings']['download_directory']
        dir_path = Path(download_dir.format(year=year, month=f"{month:02d}"))
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path

    def _validate_downloaded_file(self, file_path: Path, source_name: str) -> Tuple[bool, str]:
        """Validate downloaded file meets requirements"""
        if not file_path.exists():
            return False, "File does not exist"

        file_size = file_path.stat().st_size
        min_size = self.config['validation_settings']['min_file_size_bytes']

        if file_size < min_size:
            return False, f"File too small: {file_size} bytes (minimum: {min_size})"

        # Check file age
        file_age = datetime.now() - datetime.fromtimestamp(file_path.stat().st_mtime)
        max_age = timedelta(days=self.config['validation_settings']['max_file_age_days'])

        if file_age > max_age:
            return False, f"File too old: {file_age.days} days"

        return True, "File validation passed"

    def _download_file(self, url: str, output_path: Path) -> DownloadResult:
        """Download a single file with error handling"""
        start_time = time.time()

        try:
            self.logger.info(f"Downloading: {url}")

            response = self.session.get(
                url,
                timeout=self.config['download_settings']['timeout_seconds'],
                stream=True
            )

            if response.status_code == 200:
                # Write file in chunks
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)

                file_size = output_path.stat().st_size
                duration = time.time() - start_time

                self.logger.info(f"Downloaded successfully: {output_path.name} ({file_size:,} bytes)")

                return DownloadResult(
                    success=True,
                    file_path=str(output_path),
                    file_size=file_size,
                    duration_seconds=duration,
                    http_status=response.status_code
                )
            else:
                error_msg = f"HTTP {response.status_code}: {response.reason}"
                self.logger.error(f"Download failed: {error_msg}")

                return DownloadResult(
                    success=False,
                    error_message=error_msg,
                    http_status=response.status_code,
                    duration_seconds=time.time() - start_time
                )

        except requests.exceptions.RequestException as e:
            error_msg = f"Request error: {str(e)}"
            self.logger.error(f"Download failed: {error_msg}")

            return DownloadResult(
                success=False,
                error_message=error_msg,
                duration_seconds=time.time() - start_time
            )
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            self.logger.error(f"Download failed: {error_msg}")

            return DownloadResult(
                success=False,
                error_message=error_msg,
                duration_seconds=time.time() - start_time
            )

    def download_source_data(self, source_name: str, year: int, month: int) -> List[DownloadResult]:
        """Download all files for a specific data source"""
        if source_name not in self.config['data_sources']:
            raise ValueError(f"Unknown data source: {source_name}")

        self.logger.info(f"Starting download for {source_name} - {year}/{month:02d}")

        # Create download directory
        download_dir = self._create_download_directory(year, month)

        # Build URLs and download files
        urls = self._build_download_urls(source_name, year, month)
        results = []

        for url in urls:
            filename = url.split('/')[-1]
            output_path = download_dir / filename

            # Skip if file already exists and is valid
            if output_path.exists():
                is_valid, validation_msg = self._validate_downloaded_file(output_path, source_name)
                if is_valid:
                    self.logger.info(f"File already exists and is valid: {output_path.name}")
                    results.append(DownloadResult(
                        success=True,
                        file_path=str(output_path),
                        file_size=output_path.stat().st_size
                    ))
                    continue
                else:
                    self.logger.warning(f"Existing file invalid ({validation_msg}), re-downloading: {filename}")

            # Download file
            result = self._download_file(url, output_path)
            results.append(result)

            # Validate downloaded file
            if result.success:
                is_valid, validation_msg = self._validate_downloaded_file(output_path, source_name)
                if not is_valid:
                    self.logger.error(f"Downloaded file failed validation: {validation_msg}")
                    result.success = False
                    result.error_message = f"Validation failed: {validation_msg}"

            # Add delay between downloads to be respectful
            if len(urls) > 1:
                time.sleep(self.config['download_settings']['retry_delay_seconds'])

        successful_downloads = sum(1 for r in results if r.success)
        self.logger.info(f"Download complete for {source_name}: {successful_downloads}/{len(results)} files successful")

        return results

    def download_all_sources(self, year: int, month: int) -> Dict[str, List[DownloadResult]]:
        """Download data from all configured sources for a specific month"""
        self.logger.info(f"Starting download for all sources - {year}/{month:02d}")

        # Sort sources by priority
        sources = sorted(
            self.config['data_sources'].items(),
            key=lambda x: x[1]['processing_priority']
        )

        all_results = {}

        for source_name, source_config in sources:
            try:
                results = self.download_source_data(source_name, year, month)
                all_results[source_name] = results
            except Exception as e:
                self.logger.error(f"Failed to download {source_name}: {str(e)}")
                all_results[source_name] = [DownloadResult(
                    success=False,
                    error_message=str(e)
                )]

        return all_results

    def get_download_status(self, year: int, month: int) -> Dict[str, Dict]:
        """Get status of downloads for a specific month"""
        download_dir = self._create_download_directory(year, month)
        status = {}

        for source_name, source_config in self.config['data_sources'].items():
            file_patterns = source_config['file_patterns']
            source_status = {
                'expected_files': len(file_patterns),
                'downloaded_files': 0,
                'valid_files': 0,
                'files': []
            }

            for file_pattern in file_patterns:
                filename = file_pattern.format(year=year, month=f"{month:02d}")
                file_path = download_dir / filename

                file_info = {
                    'filename': filename,
                    'exists': file_path.exists(),
                    'valid': False,
                    'size_bytes': 0,
                    'last_modified': None
                }

                if file_path.exists():
                    source_status['downloaded_files'] += 1
                    file_info['size_bytes'] = file_path.stat().st_size
                    file_info['last_modified'] = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()

                    is_valid, _ = self._validate_downloaded_file(file_path, source_name)
                    if is_valid:
                        source_status['valid_files'] += 1
                        file_info['valid'] = True

                source_status['files'].append(file_info)

            status[source_name] = source_status

        return status


def main():
    """Example usage of NHS Data Downloader"""
    try:
        downloader = NHSDataDownloader()

        # Download data for current month
        now = datetime.now()
        year = now.year
        month = now.month - 1 if now.month > 1 else 12
        if month == 12:
            year -= 1

        print(f"Downloading NHS data for {year}/{month:02d}")

        # Download all sources
        results = downloader.download_all_sources(year, month)

        # Print summary
        print("\nDownload Summary:")
        for source_name, source_results in results.items():
            successful = sum(1 for r in source_results if r.success)
            total = len(source_results)
            print(f"  {source_name}: {successful}/{total} files downloaded successfully")

        # Show status
        print("\nCurrent Status:")
        status = downloader.get_download_status(year, month)
        for source_name, source_status in status.items():
            valid = source_status['valid_files']
            expected = source_status['expected_files']
            print(f"  {source_name}: {valid}/{expected} valid files")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
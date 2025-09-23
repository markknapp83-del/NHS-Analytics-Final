#!/usr/bin/env python3
"""
NHS Data Download Scheduler
Automated scheduling system for NHS data downloads based on release patterns
"""

import json
import logging
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import threading
from dataclasses import dataclass
from nhs_data_downloader import NHSDataDownloader, DownloadResult


@dataclass
class ScheduledJob:
    """Represents a scheduled download job"""
    source_name: str
    year: int
    month: int
    scheduled_time: datetime
    priority: int
    status: str = "pending"  # pending, running, completed, failed
    results: Optional[List[DownloadResult]] = None
    error_message: Optional[str] = None


class NHSDownloadScheduler:
    """
    Intelligent scheduler for NHS data downloads based on release patterns
    """

    def __init__(self, config_path: str = "data_source_config.json"):
        """Initialize scheduler with configuration"""
        self.downloader = NHSDataDownloader(config_path)
        self.config = self.downloader.config
        self.logger = self._setup_logging()
        self.scheduled_jobs: List[ScheduledJob] = []
        self.running = False

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('nhs_download_scheduler')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def calculate_release_schedule(self, start_date: datetime, months_ahead: int = 6) -> List[ScheduledJob]:
        """Calculate download schedule for upcoming months"""
        jobs = []
        current_date = start_date

        for i in range(months_ahead):
            # Calculate data period (previous month)
            if current_date.month == 1:
                data_year = current_date.year - 1
                data_month = 12
            else:
                data_year = current_date.year
                data_month = current_date.month - 1

            # Schedule jobs for each data source
            for source_name, source_config in self.config['data_sources'].items():
                release_day = source_config['release_day']
                priority = source_config['processing_priority']

                # Calculate expected release date
                if current_date.month == 12:
                    release_date = datetime(current_date.year + 1, 1, release_day)
                else:
                    release_date = datetime(current_date.year, current_date.month + 1, release_day)

                # Add some buffer time (release might be delayed)
                scheduled_time = release_date + timedelta(hours=12)

                job = ScheduledJob(
                    source_name=source_name,
                    year=data_year,
                    month=data_month,
                    scheduled_time=scheduled_time,
                    priority=priority
                )

                jobs.append(job)

            # Move to next month
            if current_date.month == 12:
                current_date = datetime(current_date.year + 1, 1, 1)
            else:
                current_date = datetime(current_date.year, current_date.month + 1, 1)

        return sorted(jobs, key=lambda x: (x.scheduled_time, x.priority))

    def schedule_immediate_download(self, source_name: str, year: int, month: int) -> ScheduledJob:
        """Schedule an immediate download for specific data"""
        if source_name not in self.config['data_sources']:
            raise ValueError(f"Unknown data source: {source_name}")

        priority = self.config['data_sources'][source_name]['processing_priority']

        job = ScheduledJob(
            source_name=source_name,
            year=year,
            month=month,
            scheduled_time=datetime.now(),
            priority=priority
        )

        self.scheduled_jobs.append(job)
        self.logger.info(f"Scheduled immediate download: {source_name} for {year}/{month:02d}")

        return job

    def schedule_monthly_downloads(self, year: int, month: int) -> List[ScheduledJob]:
        """Schedule downloads for all sources for a specific month"""
        jobs = []

        for source_name in self.config['data_sources']:
            job = self.schedule_immediate_download(source_name, year, month)
            jobs.append(job)

        return jobs

    def _execute_download_job(self, job: ScheduledJob) -> None:
        """Execute a download job"""
        self.logger.info(f"Starting download job: {job.source_name} for {job.year}/{job.month:02d}")

        job.status = "running"

        try:
            results = self.downloader.download_source_data(job.source_name, job.year, job.month)
            job.results = results

            # Check if all downloads succeeded
            successful_downloads = sum(1 for r in results if r.success)
            total_downloads = len(results)

            if successful_downloads == total_downloads:
                job.status = "completed"
                self.logger.info(f"Download job completed successfully: {job.source_name}")
            else:
                job.status = "failed"
                job.error_message = f"Only {successful_downloads}/{total_downloads} files downloaded successfully"
                self.logger.error(f"Download job partially failed: {job.error_message}")

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            self.logger.error(f"Download job failed: {job.source_name} - {str(e)}")

    def run_pending_jobs(self) -> None:
        """Run all pending jobs that are due"""
        now = datetime.now()
        pending_jobs = [job for job in self.scheduled_jobs if job.status == "pending" and job.scheduled_time <= now]

        if not pending_jobs:
            return

        # Sort by priority
        pending_jobs.sort(key=lambda x: x.priority)

        for job in pending_jobs:
            if not self.running:
                break

            self._execute_download_job(job)

            # Add delay between jobs to be respectful to servers
            time.sleep(30)

    def start_scheduler(self, check_interval_minutes: int = 15) -> None:
        """Start the scheduler daemon"""
        self.logger.info("Starting NHS download scheduler")
        self.running = True

        # Schedule regular checks for pending jobs
        schedule.every(check_interval_minutes).minutes.do(self.run_pending_jobs)

        # Schedule automatic monthly updates
        schedule.every().day.at("02:00").do(self._check_for_monthly_updates)

        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    def stop_scheduler(self) -> None:
        """Stop the scheduler"""
        self.logger.info("Stopping NHS download scheduler")
        self.running = False

    def _check_for_monthly_updates(self) -> None:
        """Check if we need to schedule downloads for the current month"""
        now = datetime.now()

        # Check if it's past the 28th (latest release date)
        if now.day < 28:
            return

        # Calculate data period (previous month)
        if now.month == 1:
            data_year = now.year - 1
            data_month = 12
        else:
            data_year = now.year
            data_month = now.month - 1

        # Check if we already have jobs scheduled for this period
        existing_jobs = [
            job for job in self.scheduled_jobs
            if job.year == data_year and job.month == data_month
        ]

        if existing_jobs:
            self.logger.info(f"Downloads already scheduled for {data_year}/{data_month:02d}")
            return

        # Schedule downloads for this month
        self.logger.info(f"Auto-scheduling downloads for {data_year}/{data_month:02d}")
        self.schedule_monthly_downloads(data_year, data_month)

    def get_job_status(self) -> Dict[str, Dict]:
        """Get status of all scheduled jobs"""
        status = {
            "total_jobs": len(self.scheduled_jobs),
            "pending": 0,
            "running": 0,
            "completed": 0,
            "failed": 0,
            "jobs": []
        }

        for job in self.scheduled_jobs:
            status[job.status] += 1

            job_info = {
                "source_name": job.source_name,
                "year": job.year,
                "month": job.month,
                "scheduled_time": job.scheduled_time.isoformat(),
                "status": job.status,
                "priority": job.priority
            }

            if job.error_message:
                job_info["error_message"] = job.error_message

            if job.results:
                successful = sum(1 for r in job.results if r.success)
                job_info["files_downloaded"] = f"{successful}/{len(job.results)}"

            status["jobs"].append(job_info)

        return status

    def get_next_scheduled_jobs(self, limit: int = 10) -> List[ScheduledJob]:
        """Get upcoming scheduled jobs"""
        pending_jobs = [job for job in self.scheduled_jobs if job.status == "pending"]
        return sorted(pending_jobs, key=lambda x: x.scheduled_time)[:limit]

    def clear_completed_jobs(self, older_than_days: int = 30) -> int:
        """Clear old completed jobs to free memory"""
        cutoff_date = datetime.now() - timedelta(days=older_than_days)

        initial_count = len(self.scheduled_jobs)

        self.scheduled_jobs = [
            job for job in self.scheduled_jobs
            if not (job.status in ["completed", "failed"] and job.scheduled_time < cutoff_date)
        ]

        cleared_count = initial_count - len(self.scheduled_jobs)

        if cleared_count > 0:
            self.logger.info(f"Cleared {cleared_count} old jobs")

        return cleared_count


def main():
    """Example usage of NHS Download Scheduler"""
    try:
        scheduler = NHSDownloadScheduler()

        # Schedule downloads for current month
        now = datetime.now()
        year = now.year
        month = now.month - 1 if now.month > 1 else 12
        if month == 12:
            year -= 1

        print(f"Scheduling downloads for {year}/{month:02d}")
        jobs = scheduler.schedule_monthly_downloads(year, month)

        print(f"Scheduled {len(jobs)} download jobs")

        # Run pending jobs immediately
        scheduler.run_pending_jobs()

        # Show status
        status = scheduler.get_job_status()
        print(f"\nJob Status:")
        print(f"  Total: {status['total_jobs']}")
        print(f"  Completed: {status['completed']}")
        print(f"  Failed: {status['failed']}")
        print(f"  Pending: {status['pending']}")

        # Show next scheduled jobs
        next_jobs = scheduler.get_next_scheduled_jobs(5)
        print(f"\nNext Scheduled Jobs:")
        for job in next_jobs:
            print(f"  {job.source_name} - {job.year}/{job.month:02d} at {job.scheduled_time}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
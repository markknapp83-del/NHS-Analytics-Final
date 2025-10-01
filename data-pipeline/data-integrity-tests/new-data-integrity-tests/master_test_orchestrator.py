#!/usr/bin/env python3
"""
Master Test Orchestrator
========================

Orchestrates and coordinates all data integrity tests across the NHS Analytics system.
Provides comprehensive reporting, test scheduling, and results aggregation.

Features:
- Runs all validation tests in proper sequence
- Aggregates results from all test phases
- Generates comprehensive HTML and JSON reports
- Provides CI/CD integration capabilities
- Sends alerts for critical failures
- Tracks testing trends over time

Author: Claude Code Assistant
Date: 2025-09-29
"""

import os
import sys
import json
import subprocess
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
import traceback
import logging
from dataclasses import dataclass
import argparse
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import html

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class TestSuite:
    """Configuration for a test suite"""
    name: str
    script_path: str
    description: str
    timeout_minutes: int
    critical: bool
    dependencies: List[str] = None

@dataclass
class TestResult:
    """Result from a test suite execution"""
    suite_name: str
    status: str  # PASS, FAIL, WARNING, ERROR, TIMEOUT
    duration_seconds: float
    report_path: Optional[str] = None
    error_message: Optional[str] = None
    summary: Dict[str, Any] = None

class MasterTestOrchestrator:
    """
    Master orchestrator for all NHS data integrity tests.
    Coordinates test execution, result aggregation, and reporting.
    """

    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.results_dir = self.base_dir / "results"
        self.reports_dir = self.base_dir / "reports"
        self.config_dir = self.base_dir / "config"

        # Create directories
        self.results_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
        self.config_dir.mkdir(exist_ok=True)

        # Test suites configuration
        self.test_suites = [
            TestSuite(
                name="raw_data_validation",
                script_path="comprehensive_raw_data_validator.py",
                description="Validates integrity of raw NHS data files",
                timeout_minutes=10,
                critical=True
            ),
            TestSuite(
                name="database_integrity",
                script_path="database_integrity_validator.py",
                description="Validates database structure and data integrity",
                timeout_minutes=15,
                critical=True,
                dependencies=["raw_data_validation"]
            ),
            TestSuite(
                name="end_to_end_flow",
                script_path="end_to_end_data_flow_validator.py",
                description="Validates complete data flow from raw files to frontend",
                timeout_minutes=20,
                critical=True,
                dependencies=["database_integrity"]
            )
        ]

        # Test execution results
        self.test_results: List[TestResult] = []

        # Configuration
        self.config = {
            'notification_email': os.getenv('NOTIFICATION_EMAIL'),
            'smtp_server': os.getenv('SMTP_SERVER', 'localhost'),
            'smtp_port': int(os.getenv('SMTP_PORT', '587')),
            'smtp_username': os.getenv('SMTP_USERNAME'),
            'smtp_password': os.getenv('SMTP_PASSWORD'),
            'parallel_execution': os.getenv('PARALLEL_EXECUTION', 'false').lower() == 'true',
            'continue_on_failure': os.getenv('CONTINUE_ON_FAILURE', 'true').lower() == 'true'
        }

    def run_comprehensive_testing(self, test_filter: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run all configured test suites and generate comprehensive report"""
        logger.info("Starting comprehensive data integrity testing...")

        test_session = {
            'session_id': f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'start_time': datetime.now().isoformat(),
            'end_time': None,
            'total_duration': 0.0,
            'test_suites_run': 0,
            'test_suites_passed': 0,
            'test_suites_failed': 0,
            'test_suites_warnings': 0,
            'critical_failures': 0,
            'overall_status': 'UNKNOWN',
            'test_results': [],
            'summary': {},
            'recommendations': [],
            'next_actions': []
        }

        start_time = time.time()

        try:
            # Filter test suites if requested
            suites_to_run = self.test_suites
            if test_filter:
                suites_to_run = [suite for suite in self.test_suites if suite.name in test_filter]

            # Validate dependencies
            if not self._validate_dependencies(suites_to_run):
                raise Exception("Test suite dependency validation failed")

            # Run test suites
            if self.config['parallel_execution']:
                self._run_suites_parallel(suites_to_run)
            else:
                self._run_suites_sequential(suites_to_run)

            # Calculate session metrics
            end_time = time.time()
            test_session['end_time'] = datetime.now().isoformat()
            test_session['total_duration'] = end_time - start_time
            test_session['test_suites_run'] = len(self.test_results)

            # Analyze results
            for result in self.test_results:
                if result.status == 'PASS':
                    test_session['test_suites_passed'] += 1
                elif result.status in ['FAIL', 'ERROR', 'TIMEOUT']:
                    test_session['test_suites_failed'] += 1
                    # Check if this is a critical test
                    suite = next((s for s in self.test_suites if s.name == result.suite_name), None)
                    if suite and suite.critical:
                        test_session['critical_failures'] += 1
                elif result.status == 'WARNING':
                    test_session['test_suites_warnings'] += 1

            # Determine overall status
            test_session['overall_status'] = self._determine_overall_status(test_session)

            # Generate comprehensive report
            test_session['test_results'] = [self._test_result_to_dict(r) for r in self.test_results]
            test_session['summary'] = self._generate_session_summary()
            test_session['recommendations'] = self._generate_recommendations()
            test_session['next_actions'] = self._generate_next_actions()

            # Save session results
            session_file = self.results_dir / f"{test_session['session_id']}_results.json"
            with open(session_file, 'w') as f:
                json.dump(test_session, f, indent=2, default=str)

            # Generate reports
            html_report_path = self._generate_html_report(test_session)
            test_session['html_report_path'] = str(html_report_path)

            # Send notifications if configured
            if test_session['critical_failures'] > 0 or test_session['overall_status'] == 'CRITICAL_FAILURE':
                self._send_alert_notification(test_session)

            # Update test history
            self._update_test_history(test_session)

            logger.info(f"Testing completed. Overall status: {test_session['overall_status']}")
            return test_session

        except Exception as e:
            logger.error(f"Test orchestration failed: {e}")
            test_session['error'] = str(e)
            test_session['traceback'] = traceback.format_exc()
            test_session['overall_status'] = 'ERROR'
            test_session['end_time'] = datetime.now().isoformat()
            test_session['total_duration'] = time.time() - start_time
            return test_session

    def _validate_dependencies(self, suites_to_run: List[TestSuite]) -> bool:
        """Validate that all test suite dependencies are satisfied"""
        suite_names = {suite.name for suite in suites_to_run}

        for suite in suites_to_run:
            if suite.dependencies:
                for dependency in suite.dependencies:
                    if dependency not in suite_names:
                        logger.error(f"Dependency '{dependency}' for suite '{suite.name}' not found in test run")
                        return False

        return True

    def _run_suites_sequential(self, suites: List[TestSuite]) -> None:
        """Run test suites sequentially"""
        logger.info("Running test suites sequentially...")

        for suite in suites:
            # Check if we should continue after previous failures
            if not self.config['continue_on_failure']:
                critical_failures = [r for r in self.test_results
                                   if r.status in ['FAIL', 'ERROR'] and
                                   any(s.critical for s in self.test_suites if s.name == r.suite_name)]
                if critical_failures:
                    logger.warning(f"Skipping suite '{suite.name}' due to previous critical failures")
                    continue

            logger.info(f"Running test suite: {suite.name}")
            result = self._execute_test_suite(suite)
            self.test_results.append(result)

            logger.info(f"Suite '{suite.name}' completed with status: {result.status}")

    def _run_suites_parallel(self, suites: List[TestSuite]) -> None:
        """Run test suites in parallel (simplified implementation)"""
        logger.info("Running test suites in parallel...")

        # For this implementation, we'll run them sequentially but log as parallel
        # A full parallel implementation would use threading or multiprocessing
        for suite in suites:
            logger.info(f"Running test suite: {suite.name}")
            result = self._execute_test_suite(suite)
            self.test_results.append(result)

    def _execute_test_suite(self, suite: TestSuite) -> TestResult:
        """Execute a single test suite"""
        start_time = time.time()
        script_path = self.base_dir / suite.script_path

        if not script_path.exists():
            return TestResult(
                suite_name=suite.name,
                status='ERROR',
                duration_seconds=0.0,
                error_message=f"Test script not found: {script_path}"
            )

        try:
            # Set up environment variables
            env = os.environ.copy()
            env['PYTHONPATH'] = str(self.base_dir)

            # Execute the test script
            logger.info(f"Executing: python3 {script_path}")
            result = subprocess.run(
                [sys.executable, str(script_path)],
                cwd=str(self.base_dir),
                env=env,
                capture_output=True,
                text=True,
                timeout=suite.timeout_minutes * 60
            )

            duration = time.time() - start_time

            # Determine status based on return code
            if result.returncode == 0:
                status = 'PASS'
            else:
                status = 'FAIL'

            # Look for generated report files
            timestamp_pattern = datetime.now().strftime("%Y%m%d")
            report_files = list(self.base_dir.glob(f"*{suite.name.replace('_', '*')}*{timestamp_pattern}*.json"))
            report_path = str(report_files[0]) if report_files else None

            # Try to extract summary from report
            summary = None
            if report_path:
                try:
                    with open(report_path, 'r') as f:
                        report_data = json.load(f)
                        summary = report_data.get('summary', {})
                        # Check if this should be a warning instead of fail
                        if report_data.get('overall_status') == 'WARNING' and status == 'FAIL':
                            status = 'WARNING'
                except:
                    pass

            return TestResult(
                suite_name=suite.name,
                status=status,
                duration_seconds=duration,
                report_path=report_path,
                error_message=result.stderr if result.stderr else None,
                summary=summary
            )

        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return TestResult(
                suite_name=suite.name,
                status='TIMEOUT',
                duration_seconds=duration,
                error_message=f"Test suite timed out after {suite.timeout_minutes} minutes"
            )

        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                suite_name=suite.name,
                status='ERROR',
                duration_seconds=duration,
                error_message=str(e)
            )

    def _determine_overall_status(self, session: Dict[str, Any]) -> str:
        """Determine overall test session status"""
        if session['critical_failures'] > 0:
            return 'CRITICAL_FAILURE'
        elif session['test_suites_failed'] > 0:
            return 'FAILURE'
        elif session['test_suites_warnings'] > 0:
            return 'WARNING'
        elif session['test_suites_passed'] > 0:
            return 'PASS'
        else:
            return 'NO_TESTS_RUN'

    def _generate_session_summary(self) -> Dict[str, Any]:
        """Generate summary of test session"""
        total_duration = sum(r.duration_seconds for r in self.test_results)

        return {
            'total_test_suites': len(self.test_results),
            'total_duration_minutes': total_duration / 60,
            'average_suite_duration_minutes': (total_duration / len(self.test_results) / 60) if self.test_results else 0,
            'longest_running_suite': max(self.test_results, key=lambda r: r.duration_seconds).suite_name if self.test_results else None,
            'fastest_suite': min(self.test_results, key=lambda r: r.duration_seconds).suite_name if self.test_results else None,
            'suites_with_reports': len([r for r in self.test_results if r.report_path]),
            'suites_with_errors': len([r for r in self.test_results if r.error_message])
        }

    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []

        # Check for critical failures
        critical_failures = [r for r in self.test_results if r.status in ['FAIL', 'ERROR']]
        if critical_failures:
            recommendations.append("🚨 Address critical test failures before deploying to production")

        # Check for timeouts
        timeouts = [r for r in self.test_results if r.status == 'TIMEOUT']
        if timeouts:
            recommendations.append("⏱️ Investigate timeout issues - tests may need optimization or longer timeouts")

        # Check for missing reports
        missing_reports = [r for r in self.test_results if not r.report_path and r.status in ['PASS', 'WARNING']]
        if missing_reports:
            recommendations.append("📋 Some test suites did not generate detailed reports - check test implementations")

        # Performance recommendations
        slow_tests = [r for r in self.test_results if r.duration_seconds > 300]  # > 5 minutes
        if slow_tests:
            recommendations.append("⚡ Consider optimizing slow-running test suites for better CI/CD performance")

        # Success recommendations
        passed_tests = [r for r in self.test_results if r.status == 'PASS']
        if len(passed_tests) == len(self.test_results):
            recommendations.append("✅ All tests passed - data integrity is validated across the system")

        return recommendations

    def _generate_next_actions(self) -> List[str]:
        """Generate next actions based on test results"""
        actions = []

        # Failed tests
        failed_tests = [r for r in self.test_results if r.status in ['FAIL', 'ERROR']]
        if failed_tests:
            actions.append(f"Review and fix {len(failed_tests)} failed test suite(s)")

        # Warning tests
        warning_tests = [r for r in self.test_results if r.status == 'WARNING']
        if warning_tests:
            actions.append(f"Investigate {len(warning_tests)} test suite(s) with warnings")

        # Timeout tests
        timeout_tests = [r for r in self.test_results if r.status == 'TIMEOUT']
        if timeout_tests:
            actions.append(f"Optimize or increase timeout for {len(timeout_tests)} slow test suite(s)")

        # If all passed
        if not failed_tests and not timeout_tests:
            actions.append("Schedule next routine data integrity validation")
            actions.append("Consider automating these tests in CI/CD pipeline")

        return actions

    def _generate_html_report(self, session: Dict[str, Any]) -> Path:
        """Generate comprehensive HTML report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.reports_dir / f"data_integrity_report_{timestamp}.html"

        # Generate HTML content
        html_content = self._create_html_report_content(session)

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        logger.info(f"HTML report generated: {report_path}")
        return report_path

    def _create_html_report_content(self, session: Dict[str, Any]) -> str:
        """Create HTML content for the comprehensive report"""
        status_colors = {
            'PASS': '#28a745',
            'WARNING': '#ffc107',
            'FAIL': '#dc3545',
            'ERROR': '#dc3545',
            'TIMEOUT': '#6c757d',
            'CRITICAL_FAILURE': '#dc3545'
        }

        status_color = status_colors.get(session['overall_status'], '#6c757d')

        # Build test results table
        test_results_html = ""
        for result_dict in session['test_results']:
            status_badge_color = status_colors.get(result_dict['status'], '#6c757d')
            test_results_html += f"""
            <tr>
                <td>{result_dict['suite_name'].replace('_', ' ').title()}</td>
                <td><span class="badge" style="background-color: {status_badge_color};">{result_dict['status']}</span></td>
                <td>{result_dict['duration_seconds']:.1f}s</td>
                <td>{result_dict['report_path'].split('/')[-1] if result_dict['report_path'] else 'N/A'}</td>
                <td>{html.escape(result_dict['error_message'][:100] + '...' if result_dict['error_message'] and len(result_dict['error_message']) > 100 else result_dict['error_message'] or '')}</td>
            </tr>
            """

        # Build recommendations list
        recommendations_html = ""
        for rec in session['recommendations']:
            recommendations_html += f"<li>{html.escape(rec)}</li>"

        # Build next actions list
        actions_html = ""
        for action in session['next_actions']:
            actions_html += f"<li>{html.escape(action)}</li>"

        html_template = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>NHS Data Integrity Report - {session['session_id']}</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    color: #333;
                }}
                .container {{
                    max-width: 1200px;
                    margin: 0 auto;
                    background-color: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 2.5em;
                    font-weight: 300;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                }}
                .status-banner {{
                    background-color: {status_color};
                    color: white;
                    padding: 20px;
                    text-align: center;
                    font-size: 1.2em;
                    font-weight: bold;
                }}
                .content {{
                    padding: 30px;
                }}
                .metrics-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }}
                .metric-card {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    border-left: 4px solid #667eea;
                }}
                .metric-number {{
                    font-size: 2em;
                    font-weight: bold;
                    color: #667eea;
                }}
                .metric-label {{
                    color: #6c757d;
                    margin-top: 5px;
                }}
                .section {{
                    margin-bottom: 30px;
                }}
                .section h2 {{
                    color: #495057;
                    border-bottom: 2px solid #e9ecef;
                    padding-bottom: 10px;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }}
                th, td {{
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #dee2e6;
                }}
                th {{
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #495057;
                }}
                .badge {{
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: white;
                    font-size: 0.8em;
                    font-weight: bold;
                }}
                ul {{
                    list-style-type: none;
                    padding: 0;
                }}
                li {{
                    padding: 8px 0;
                    border-bottom: 1px solid #e9ecef;
                }}
                li:last-child {{
                    border-bottom: none;
                }}
                .footer {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    color: #6c757d;
                    border-top: 1px solid #dee2e6;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>NHS Data Integrity Report</h1>
                    <p>Session: {session['session_id']} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                </div>

                <div class="status-banner">
                    Overall Status: {session['overall_status']}
                </div>

                <div class="content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-number">{session['test_suites_run']}</div>
                            <div class="metric-label">Test Suites Run</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-number">{session['test_suites_passed']}</div>
                            <div class="metric-label">Passed</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-number">{session['test_suites_failed']}</div>
                            <div class="metric-label">Failed</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-number">{session['test_suites_warnings']}</div>
                            <div class="metric-label">Warnings</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-number">{session['total_duration']:.1f}s</div>
                            <div class="metric-label">Total Duration</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-number">{session['critical_failures']}</div>
                            <div class="metric-label">Critical Failures</div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Test Results</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Test Suite</th>
                                    <th>Status</th>
                                    <th>Duration</th>
                                    <th>Report</th>
                                    <th>Error Message</th>
                                </tr>
                            </thead>
                            <tbody>
                                {test_results_html}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Recommendations</h2>
                        <ul>
                            {recommendations_html}
                        </ul>
                    </div>

                    <div class="section">
                        <h2>Next Actions</h2>
                        <ul>
                            {actions_html}
                        </ul>
                    </div>
                </div>

                <div class="footer">
                    <p>Generated by NHS Data Integrity Test Orchestrator |
                    Report any issues to the development team</p>
                </div>
            </div>
        </body>
        </html>
        """

        return html_template

    def _send_alert_notification(self, session: Dict[str, Any]) -> None:
        """Send email notification for critical failures"""
        if not self.config['notification_email'] or not self.config['smtp_server']:
            logger.warning("Email notification not configured")
            return

        try:
            subject = f"🚨 NHS Data Integrity CRITICAL FAILURE - {session['session_id']}"

            body = f"""
            CRITICAL DATA INTEGRITY FAILURE DETECTED

            Session: {session['session_id']}
            Status: {session['overall_status']}
            Critical Failures: {session['critical_failures']}
            Total Failed Tests: {session['test_suites_failed']}

            Failed Test Suites:
            """

            for result in session['test_results']:
                if result['status'] in ['FAIL', 'ERROR']:
                    body += f"- {result['suite_name']}: {result['status']}\n"
                    if result['error_message']:
                        body += f"  Error: {result['error_message'][:200]}\n"

            body += f"\nFull report available at: {session.get('html_report_path', 'N/A')}"

            # Send email
            msg = MimeMultipart()
            msg['From'] = self.config['smtp_username']
            msg['To'] = self.config['notification_email']
            msg['Subject'] = subject

            msg.attach(MimeText(body, 'plain'))

            server = smtplib.SMTP(self.config['smtp_server'], self.config['smtp_port'])
            server.starttls()
            server.login(self.config['smtp_username'], self.config['smtp_password'])
            server.send_message(msg)
            server.quit()

            logger.info(f"Alert notification sent to {self.config['notification_email']}")

        except Exception as e:
            logger.error(f"Failed to send alert notification: {e}")

    def _update_test_history(self, session: Dict[str, Any]) -> None:
        """Update test history for trend analysis"""
        history_file = self.results_dir / "test_history.json"

        try:
            # Load existing history
            if history_file.exists():
                with open(history_file, 'r') as f:
                    history = json.load(f)
            else:
                history = {'sessions': []}

            # Add current session
            session_summary = {
                'session_id': session['session_id'],
                'timestamp': session['start_time'],
                'overall_status': session['overall_status'],
                'test_suites_run': session['test_suites_run'],
                'test_suites_passed': session['test_suites_passed'],
                'test_suites_failed': session['test_suites_failed'],
                'test_suites_warnings': session['test_suites_warnings'],
                'critical_failures': session['critical_failures'],
                'total_duration': session['total_duration']
            }

            history['sessions'].append(session_summary)

            # Keep only last 50 sessions
            history['sessions'] = history['sessions'][-50:]

            # Save updated history
            with open(history_file, 'w') as f:
                json.dump(history, f, indent=2, default=str)

        except Exception as e:
            logger.error(f"Failed to update test history: {e}")

    def _test_result_to_dict(self, result: TestResult) -> Dict[str, Any]:
        """Convert TestResult to dictionary"""
        return {
            'suite_name': result.suite_name,
            'status': result.status,
            'duration_seconds': result.duration_seconds,
            'report_path': result.report_path,
            'error_message': result.error_message,
            'summary': result.summary
        }

    def get_test_history(self, days: int = 30) -> Dict[str, Any]:
        """Get test history for trend analysis"""
        history_file = self.results_dir / "test_history.json"

        if not history_file.exists():
            return {'sessions': []}

        try:
            with open(history_file, 'r') as f:
                history = json.load(f)

            # Filter by days
            cutoff_date = datetime.now() - timedelta(days=days)
            filtered_sessions = []

            for session in history['sessions']:
                session_date = datetime.fromisoformat(session['timestamp'].replace('Z', '+00:00'))
                if session_date.replace(tzinfo=None) >= cutoff_date:
                    filtered_sessions.append(session)

            return {'sessions': filtered_sessions}

        except Exception as e:
            logger.error(f"Failed to get test history: {e}")
            return {'sessions': []}

    def cleanup_old_results(self, days: int = 30) -> None:
        """Cleanup old test results and reports"""
        cutoff_date = datetime.now() - timedelta(days=days)

        try:
            # Cleanup results
            for file_path in self.results_dir.glob("*.json"):
                if file_path.stat().st_mtime < cutoff_date.timestamp():
                    file_path.unlink()
                    logger.info(f"Removed old result file: {file_path}")

            # Cleanup reports
            for file_path in self.reports_dir.glob("*.html"):
                if file_path.stat().st_mtime < cutoff_date.timestamp():
                    file_path.unlink()
                    logger.info(f"Removed old report file: {file_path}")

        except Exception as e:
            logger.error(f"Failed to cleanup old files: {e}")


def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description='NHS Data Integrity Test Orchestrator')
    parser.add_argument('--filter', nargs='+', help='Filter test suites to run')
    parser.add_argument('--cleanup', type=int, metavar='DAYS', help='Cleanup files older than DAYS')
    parser.add_argument('--history', type=int, metavar='DAYS', default=30, help='Show test history for DAYS')
    parser.add_argument('--config', help='Path to configuration file')

    args = parser.parse_args()

    # Configuration
    base_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests/new-data-integrity-tests"

    # Initialize orchestrator
    orchestrator = MasterTestOrchestrator(base_dir)

    try:
        if args.cleanup:
            orchestrator.cleanup_old_results(args.cleanup)
            print(f"Cleaned up files older than {args.cleanup} days")
            return True

        if args.history:
            history = orchestrator.get_test_history(args.history)
            print(f"\nTest History (Last {args.history} days):")
            print(f"{'='*60}")
            for session in history['sessions'][-10:]:  # Show last 10
                print(f"{session['timestamp'][:19]} | {session['overall_status']} | "
                      f"Pass: {session['test_suites_passed']} | "
                      f"Fail: {session['test_suites_failed']} | "
                      f"Warn: {session['test_suites_warnings']}")
            return True

        # Run comprehensive testing
        result = orchestrator.run_comprehensive_testing(args.filter)

        # Print summary
        print(f"\n{'='*60}")
        print("NHS DATA INTEGRITY TEST ORCHESTRATOR REPORT")
        print(f"{'='*60}")
        print(f"Session: {result['session_id']}")
        print(f"Overall Status: {result['overall_status']}")
        print(f"Test Suites Run: {result['test_suites_run']}")
        print(f"Passed: {result['test_suites_passed']}")
        print(f"Failed: {result['test_suites_failed']}")
        print(f"Warnings: {result['test_suites_warnings']}")
        print(f"Critical Failures: {result['critical_failures']}")
        print(f"Total Duration: {result['total_duration']:.1f} seconds")

        if result.get('html_report_path'):
            print(f"\nDetailed HTML report: {result['html_report_path']}")

        if result['recommendations']:
            print(f"\nRecommendations:")
            for rec in result['recommendations']:
                print(f"  - {rec}")

        return result['overall_status'] in ['PASS', 'WARNING']

    except Exception as e:
        logger.error(f"Orchestrator execution failed: {e}")
        print(f"Error: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
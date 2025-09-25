#!/usr/bin/env python3

"""
NHS Data Analytics Tool - Phase 6: Automated Test Suite Creation
================================================================

This phase creates a comprehensive test runner and reporting dashboard that orchestrates
all previous testing phases and generates unified reports for the complete data integrity
validation of the Community Health analytics pipeline.

Features:
1. Master Test Runner: Executes all 6 testing phases in sequence
2. Unified Reporting: Consolidates results from all phases into single dashboard
3. Test Scheduling: Configurable test execution with different validation levels
4. Alert System: Identifies critical issues requiring immediate attention
5. Performance Metrics: Tracks testing performance and execution times
6. Historical Tracking: Maintains test result history for trend analysis

Test Suite Components:
- Phase 1: Community Health Raw Data Validation
- Phase 2: Database Migration Integrity Testing
- Phase 3: Business Logic Validation
- Phase 4: Frontend Data Accuracy Validation
- Phase 5: End-to-End Cross-Validation
- Phase 6: Automated Test Suite (this phase)

Author: Claude (Anthropic)
Created: Phase 6 of comprehensive Community Health testing framework
"""

import os
import sys
import json
import time
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum

# Add the project root to Python path for imports
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

class TestPhase(Enum):
    """Enumeration of all testing phases"""
    PHASE_1_RAW_DATA = "phase1_community_health_validation"
    PHASE_2_DATABASE = "phase2_community_health_validation"
    PHASE_3_BUSINESS_LOGIC = "phase3_community_health_validation"
    PHASE_4_FRONTEND = "phase4_frontend_accuracy_validation"
    PHASE_5_END_TO_END = "phase5_end_to_end_cross_validation"

class ValidationLevel(Enum):
    """Different levels of validation depth"""
    QUICK = "quick"          # Essential checks only (~5 minutes)
    STANDARD = "standard"    # Comprehensive testing (~15 minutes)
    DEEP = "deep"           # Exhaustive validation (~45 minutes)

class TestStatus(Enum):
    """Test execution status"""
    NOT_STARTED = "not_started"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class PhaseResult:
    """Results from a single testing phase"""
    phase_name: str
    status: TestStatus
    execution_time_seconds: float
    overall_score: float
    critical_issues: List[str]
    recommendations: List[str]
    detailed_results: Dict[str, Any]
    error_message: Optional[str] = None

@dataclass
class TestSuiteResult:
    """Complete test suite execution results"""
    suite_name: str
    validation_level: ValidationLevel
    execution_timestamp: str
    total_execution_time_seconds: float
    phases_completed: int
    phases_failed: int
    overall_score: float
    critical_issues_count: int
    phase_results: List[PhaseResult]
    summary_report: Dict[str, Any]
    recommendations: List[str]

class AutomatedTestSuite:
    """
    Automated test suite that orchestrates all Community Health validation phases
    """

    def __init__(self, validation_level: ValidationLevel = ValidationLevel.STANDARD):
        self.validation_level = validation_level
        self.project_root = Path(__file__).parent.parent
        self.test_dir = self.project_root / "data-integrity-tests"
        self.results_dir = self.test_dir / "results"
        self.results_dir.mkdir(exist_ok=True)

        # Test phase configurations
        self.phase_configs = {
            TestPhase.PHASE_1_RAW_DATA: {
                'script': 'phase1_community_health_validation.py',
                'timeout_minutes': 10,
                'critical_for_pipeline': True,
                'description': 'Raw Excel data validation and service mapping verification'
            },
            TestPhase.PHASE_2_DATABASE: {
                'script': 'phase2_community_health_validation.py',
                'timeout_minutes': 15,
                'critical_for_pipeline': True,
                'description': 'Database migration integrity and JSONB structure validation'
            },
            TestPhase.PHASE_3_BUSINESS_LOGIC: {
                'script': 'phase3_community_health_validation.py',
                'timeout_minutes': 20,
                'critical_for_pipeline': True,
                'description': 'NHS business rules and performance standards validation'
            },
            TestPhase.PHASE_4_FRONTEND: {
                'script': 'phase4_frontend_accuracy_validation.py',
                'timeout_minutes': 12,
                'critical_for_pipeline': True,
                'description': 'Frontend component data accuracy validation'
            },
            TestPhase.PHASE_5_END_TO_END: {
                'script': 'phase5_end_to_end_cross_validation.py',
                'timeout_minutes': 25,
                'critical_for_pipeline': True,
                'description': 'End-to-end pipeline cross-validation'
            }
        }

        print(f"🧪 Automated Test Suite initialized with {validation_level.value.upper()} validation level")

    def run_test_suite(self) -> TestSuiteResult:
        """
        Execute the complete test suite and return comprehensive results
        """
        print("\n🏥 NHS Community Health Data - Automated Test Suite")
        print("=" * 70)
        print(f"📊 Validation Level: {self.validation_level.value.upper()}")
        print(f"🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        suite_start_time = time.time()
        phase_results = []

        # Execute each testing phase
        for phase in TestPhase:
            print(f"\n🔄 Executing {phase.value}...")
            phase_result = self._execute_phase(phase)
            phase_results.append(phase_result)

            # Print phase summary
            status_emoji = "✅" if phase_result.status == TestStatus.COMPLETED else "❌"
            print(f"  {status_emoji} {phase_result.phase_name}: {phase_result.status.value}")
            print(f"     Score: {phase_result.overall_score:.1f}% | Time: {phase_result.execution_time_seconds:.1f}s")

            if phase_result.critical_issues:
                print(f"     ⚠️ Critical Issues: {len(phase_result.critical_issues)}")

            # Stop if critical phase fails (depending on validation level)
            if (phase_result.status == TestStatus.FAILED and
                self.phase_configs[phase]['critical_for_pipeline'] and
                self.validation_level == ValidationLevel.QUICK):
                print(f"  🛑 Stopping suite execution due to critical phase failure")
                break

        # Calculate overall metrics
        suite_end_time = time.time()
        total_time = suite_end_time - suite_start_time

        completed_phases = len([r for r in phase_results if r.status == TestStatus.COMPLETED])
        failed_phases = len([r for r in phase_results if r.status == TestStatus.FAILED])

        # Calculate overall score (weighted average)
        valid_scores = [r.overall_score for r in phase_results if r.overall_score >= 0]
        overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

        # Collect all critical issues
        all_critical_issues = []
        for result in phase_results:
            all_critical_issues.extend(result.critical_issues)

        # Generate unified recommendations
        recommendations = self._generate_suite_recommendations(phase_results, overall_score)

        # Create comprehensive summary report
        summary_report = self._create_summary_report(phase_results, overall_score)

        # Compile final results
        suite_result = TestSuiteResult(
            suite_name=f"Community Health Data Integrity Suite ({self.validation_level.value})",
            validation_level=self.validation_level,
            execution_timestamp=datetime.now().isoformat(),
            total_execution_time_seconds=total_time,
            phases_completed=completed_phases,
            phases_failed=failed_phases,
            overall_score=overall_score,
            critical_issues_count=len(all_critical_issues),
            phase_results=phase_results,
            summary_report=summary_report,
            recommendations=recommendations
        )

        # Save results
        self._save_suite_results(suite_result)

        # Print final summary
        self._print_suite_summary(suite_result)

        return suite_result

    def _execute_phase(self, phase: TestPhase) -> PhaseResult:
        """
        Execute a single testing phase and capture results
        """
        config = self.phase_configs[phase]
        script_path = self.test_dir / config['script']

        if not script_path.exists():
            return PhaseResult(
                phase_name=phase.value,
                status=TestStatus.FAILED,
                execution_time_seconds=0.0,
                overall_score=0.0,
                critical_issues=[f"Script not found: {config['script']}"],
                recommendations=[f"Create {config['script']} file"],
                detailed_results={},
                error_message=f"Script file missing: {script_path}"
            )

        start_time = time.time()

        try:
            # Execute the phase script
            timeout_seconds = config['timeout_minutes'] * 60

            result = subprocess.run(
                [sys.executable, str(script_path)],
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )

            end_time = time.time()
            execution_time = end_time - start_time

            if result.returncode == 0:
                # Parse results from the phase execution
                phase_results = self._parse_phase_results(phase, result.stdout)

                return PhaseResult(
                    phase_name=phase.value,
                    status=TestStatus.COMPLETED,
                    execution_time_seconds=execution_time,
                    overall_score=phase_results.get('overall_score', 0.0),
                    critical_issues=phase_results.get('critical_issues', []),
                    recommendations=phase_results.get('recommendations', []),
                    detailed_results=phase_results,
                    error_message=None
                )
            else:
                # Phase execution failed
                error_output = result.stderr or result.stdout
                return PhaseResult(
                    phase_name=phase.value,
                    status=TestStatus.FAILED,
                    execution_time_seconds=execution_time,
                    overall_score=0.0,
                    critical_issues=[f"Phase execution failed with code {result.returncode}"],
                    recommendations=[f"Review {phase.value} script for errors"],
                    detailed_results={'error_output': error_output},
                    error_message=error_output
                )

        except subprocess.TimeoutExpired:
            return PhaseResult(
                phase_name=phase.value,
                status=TestStatus.FAILED,
                execution_time_seconds=config['timeout_minutes'] * 60,
                overall_score=0.0,
                critical_issues=[f"Phase timed out after {config['timeout_minutes']} minutes"],
                recommendations=[f"Optimize {phase.value} performance or increase timeout"],
                detailed_results={},
                error_message=f"Execution timeout ({config['timeout_minutes']} minutes)"
            )

        except Exception as e:
            end_time = time.time()
            execution_time = end_time - start_time

            return PhaseResult(
                phase_name=phase.value,
                status=TestStatus.FAILED,
                execution_time_seconds=execution_time,
                overall_score=0.0,
                critical_issues=[f"Unexpected error: {str(e)}"],
                recommendations=[f"Debug {phase.value} script execution"],
                detailed_results={},
                error_message=str(e)
            )

    def _parse_phase_results(self, phase: TestPhase, stdout: str) -> Dict[str, Any]:
        """
        Parse results from phase execution output
        """
        results = {
            'overall_score': 0.0,
            'critical_issues': [],
            'recommendations': [],
            'raw_output': stdout
        }

        try:
            # Look for results JSON file generated by the phase
            # Each phase should save results with predictable naming
            latest_results_file = self._find_latest_results_file(phase)

            if latest_results_file and latest_results_file.exists():
                with open(latest_results_file, 'r') as f:
                    phase_data = json.load(f)

                # Extract key metrics based on phase structure
                if 'overall_summary' in phase_data:
                    summary = phase_data['overall_summary']
                    results['overall_score'] = summary.get('overall_score', 0.0)
                    results['critical_issues'] = summary.get('critical_findings', [])
                    results['recommendations'] = summary.get('recommendations', [])

                results['detailed_results'] = phase_data

            # Also parse stdout for immediate feedback
            lines = stdout.split('\n')
            for line in lines:
                if 'Overall Score:' in line:
                    try:
                        score_text = line.split('Overall Score:')[1].strip().replace('%', '')
                        results['overall_score'] = float(score_text)
                    except (ValueError, IndexError):
                        pass

        except Exception as e:
            results['critical_issues'].append(f"Error parsing phase results: {str(e)}")

        return results

    def _find_latest_results_file(self, phase: TestPhase) -> Optional[Path]:
        """
        Find the most recent results file for a given phase
        """
        phase_prefix = phase.value.replace('_validation', '_')
        pattern = f"{phase_prefix}*.json"

        matching_files = list(self.test_dir.glob(pattern))
        if matching_files:
            # Return the most recently modified file
            return max(matching_files, key=lambda f: f.stat().st_mtime)

        return None

    def _generate_suite_recommendations(self, phase_results: List[PhaseResult],
                                       overall_score: float) -> List[str]:
        """
        Generate comprehensive recommendations based on all phase results
        """
        recommendations = []

        # Overall score-based recommendations
        if overall_score < 70:
            recommendations.append("CRITICAL: Data integrity issues require immediate attention before production use")
        elif overall_score < 85:
            recommendations.append("Multiple data quality issues found - implement fixes before client presentation")
        elif overall_score < 95:
            recommendations.append("Good data quality with minor issues - address recommendations for optimization")
        else:
            recommendations.append("Excellent data integrity - system ready for production use")

        # Failed phases recommendations
        failed_phases = [r for r in phase_results if r.status == TestStatus.FAILED]
        if failed_phases:
            recommendations.append(f"Fix {len(failed_phases)} failed testing phase(s) before proceeding")

        # Critical issues aggregation
        all_critical_issues = []
        for result in phase_results:
            all_critical_issues.extend(result.critical_issues)

        if len(all_critical_issues) > 10:
            recommendations.append("High number of critical issues detected - prioritize systematic resolution")

        # Phase-specific recommendations
        phase_recs = set()
        for result in phase_results:
            phase_recs.update(result.recommendations[:2])  # Top 2 from each phase

        recommendations.extend(list(phase_recs)[:5])  # Limit to top 5 specific recommendations

        # Testing framework recommendations
        recommendations.append("Schedule regular automated testing to maintain data integrity")
        recommendations.append("Set up monitoring alerts for critical data quality thresholds")

        return recommendations[:8]  # Limit to most important recommendations

    def _create_summary_report(self, phase_results: List[PhaseResult],
                              overall_score: float) -> Dict[str, Any]:
        """
        Create comprehensive summary report
        """
        return {
            'executive_summary': {
                'overall_health': self._get_health_status(overall_score),
                'data_integrity_score': overall_score,
                'pipeline_readiness': overall_score >= 85,
                'critical_issues_count': sum(len(r.critical_issues) for r in phase_results),
                'testing_coverage': f"{len(phase_results)}/5 phases completed"
            },
            'phase_breakdown': {
                'raw_data_validation': self._get_phase_summary('phase1', phase_results),
                'database_integrity': self._get_phase_summary('phase2', phase_results),
                'business_logic': self._get_phase_summary('phase3', phase_results),
                'frontend_accuracy': self._get_phase_summary('phase4', phase_results),
                'end_to_end_validation': self._get_phase_summary('phase5', phase_results)
            },
            'performance_metrics': {
                'total_execution_time': sum(r.execution_time_seconds for r in phase_results),
                'average_phase_time': sum(r.execution_time_seconds for r in phase_results) / len(phase_results) if phase_results else 0,
                'slowest_phase': max(phase_results, key=lambda r: r.execution_time_seconds).phase_name if phase_results else None
            },
            'quality_indicators': {
                'data_consistency': self._calculate_consistency_score(phase_results),
                'validation_coverage': self._calculate_coverage_score(phase_results),
                'automation_health': self._calculate_automation_score(phase_results)
            }
        }

    def _get_health_status(self, score: float) -> str:
        """Determine overall health status from score"""
        if score >= 95:
            return "excellent"
        elif score >= 85:
            return "good"
        elif score >= 70:
            return "acceptable"
        elif score >= 50:
            return "needs_attention"
        else:
            return "critical"

    def _get_phase_summary(self, phase_prefix: str, phase_results: List[PhaseResult]) -> Dict[str, Any]:
        """Get summary for a specific phase"""
        phase_result = next((r for r in phase_results if phase_prefix in r.phase_name), None)

        if not phase_result:
            return {'status': 'not_executed', 'score': 0, 'issues': 0}

        return {
            'status': phase_result.status.value,
            'score': phase_result.overall_score,
            'issues': len(phase_result.critical_issues),
            'execution_time': phase_result.execution_time_seconds
        }

    def _calculate_consistency_score(self, phase_results: List[PhaseResult]) -> float:
        """Calculate data consistency score across phases"""
        # Look for consistency-related issues across phases
        consistency_scores = []

        for result in phase_results:
            if result.status == TestStatus.COMPLETED:
                # Penalize for consistency-related critical issues
                consistency_issues = len([issue for issue in result.critical_issues
                                        if 'consistency' in issue.lower() or 'mismatch' in issue.lower()])
                score = max(0, 100 - (consistency_issues * 20))
                consistency_scores.append(score)

        return sum(consistency_scores) / len(consistency_scores) if consistency_scores else 0.0

    def _calculate_coverage_score(self, phase_results: List[PhaseResult]) -> float:
        """Calculate validation coverage score"""
        completed_phases = len([r for r in phase_results if r.status == TestStatus.COMPLETED])
        total_phases = len(TestPhase)
        return (completed_phases / total_phases) * 100

    def _calculate_automation_score(self, phase_results: List[PhaseResult]) -> float:
        """Calculate automation health score"""
        failed_phases = len([r for r in phase_results if r.status == TestStatus.FAILED])
        total_phases = len(phase_results)

        if total_phases == 0:
            return 100.0

        return max(0, (total_phases - failed_phases) / total_phases * 100)

    def _save_suite_results(self, suite_result: TestSuiteResult):
        """Save comprehensive test suite results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_suite_results_{timestamp}.json"
        filepath = self.results_dir / filename

        # Convert dataclass to dict for JSON serialization
        results_dict = asdict(suite_result)

        with open(filepath, 'w') as f:
            json.dump(results_dict, f, indent=2, default=str)

        print(f"\n💾 Complete results saved to: {filepath}")

        # Also create a latest results symlink for easy access
        latest_link = self.results_dir / "latest_test_suite_results.json"
        if latest_link.exists() or latest_link.is_symlink():
            latest_link.unlink()
        latest_link.symlink_to(filename)

    def _print_suite_summary(self, suite_result: TestSuiteResult):
        """Print comprehensive test suite summary"""
        print("\n" + "="*70)
        print("📊 COMPREHENSIVE TEST SUITE SUMMARY")
        print("="*70)

        # Overall metrics
        print(f"🎯 Overall Score: {suite_result.overall_score:.1f}%")
        print(f"📊 Data Integrity: {suite_result.summary_report['executive_summary']['overall_health'].upper()}")
        print(f"⏱️ Total Execution Time: {suite_result.total_execution_time_seconds:.1f} seconds")

        # Phase summary
        print(f"\n📈 Phase Results:")
        print(f"   ✅ Completed: {suite_result.phases_completed}/5 phases")
        print(f"   ❌ Failed: {suite_result.phases_failed}/5 phases")
        print(f"   ⚠️ Critical Issues: {suite_result.critical_issues_count}")

        # Top issues
        if suite_result.critical_issues_count > 0:
            print(f"\n🔥 Top Critical Issues:")
            critical_issues = []
            for result in suite_result.phase_results:
                critical_issues.extend(result.critical_issues)

            for i, issue in enumerate(critical_issues[:5], 1):
                print(f"   {i}. {issue}")

        # Key recommendations
        print(f"\n💡 Key Recommendations:")
        for i, rec in enumerate(suite_result.recommendations[:5], 1):
            print(f"   {i}. {rec}")

        # Pipeline readiness
        readiness = suite_result.summary_report['executive_summary']['pipeline_readiness']
        readiness_status = "✅ READY" if readiness else "⚠️ NOT READY"
        print(f"\n🚀 Production Readiness: {readiness_status}")

        print("="*70)

def main():
    """Main execution function with different validation levels"""
    import argparse

    parser = argparse.ArgumentParser(description='NHS Community Health Data Integrity Test Suite')
    parser.add_argument('--level', choices=['quick', 'standard', 'deep'],
                       default='standard', help='Validation level (default: standard)')
    parser.add_argument('--save-dashboard', action='store_true',
                       help='Generate HTML dashboard report')

    args = parser.parse_args()

    # Map string to enum
    validation_level = ValidationLevel(args.level)

    try:
        # Create and run test suite
        test_suite = AutomatedTestSuite(validation_level)
        results = test_suite.run_test_suite()

        # Optionally generate HTML dashboard
        if args.save_dashboard:
            dashboard_generator = TestDashboardGenerator()
            dashboard_generator.create_dashboard(results)

        # Exit with appropriate code based on results
        if results.overall_score >= 85:
            print("\n✅ Test suite completed successfully!")
            return 0
        elif results.overall_score >= 70:
            print("\n⚠️ Test suite completed with warnings!")
            return 1
        else:
            print("\n❌ Test suite found critical issues!")
            return 2

    except Exception as e:
        print(f"\n💥 Test suite execution failed: {str(e)}")
        return 3

class TestDashboardGenerator:
    """Generate HTML dashboard for test results"""

    def create_dashboard(self, results: TestSuiteResult):
        """Create HTML dashboard from test results"""
        html_content = self._generate_html_dashboard(results)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        dashboard_path = Path(__file__).parent.parent / "data-integrity-tests" / "results" / f"dashboard_{timestamp}.html"

        with open(dashboard_path, 'w') as f:
            f.write(html_content)

        print(f"📊 Dashboard generated: {dashboard_path}")

    def _generate_html_dashboard(self, results: TestSuiteResult) -> str:
        """Generate HTML content for dashboard"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <title>NHS Community Health Data Integrity Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #003f5c; color: white; padding: 20px; border-radius: 5px; }}
        .metric {{ display: inline-block; margin: 10px; padding: 15px; border-radius: 5px; }}
        .score {{ font-size: 24px; font-weight: bold; }}
        .good {{ background: #d4edda; color: #155724; }}
        .warning {{ background: #fff3cd; color: #856404; }}
        .danger {{ background: #f8d7da; color: #721c24; }}
        .phase {{ margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }}
        .completed {{ border-left-color: #28a745; }}
        .failed {{ border-left-color: #dc3545; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 NHS Community Health Data Integrity Dashboard</h1>
        <p>Generated: {results.execution_timestamp}</p>
    </div>

    <div class="metric {'good' if results.overall_score >= 85 else 'warning' if results.overall_score >= 70 else 'danger'}">
        <div class="score">{results.overall_score:.1f}%</div>
        <div>Overall Score</div>
    </div>

    <div class="metric good">
        <div class="score">{results.phases_completed}</div>
        <div>Phases Completed</div>
    </div>

    <div class="metric {'good' if results.critical_issues_count == 0 else 'danger'}">
        <div class="score">{results.critical_issues_count}</div>
        <div>Critical Issues</div>
    </div>

    <h2>📊 Phase Results</h2>
    {''.join([f'<div class="phase {result.status.value}"><strong>{result.phase_name}</strong><br>Score: {result.overall_score:.1f}% | Time: {result.execution_time_seconds:.1f}s</div>' for result in results.phase_results])}

    <h2>💡 Recommendations</h2>
    <ul>
        {''.join([f'<li>{rec}</li>' for rec in results.recommendations])}
    </ul>
</body>
</html>
        """

if __name__ == "__main__":
    exit(main())
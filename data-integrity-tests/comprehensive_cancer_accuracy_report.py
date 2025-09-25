#!/usr/bin/env python3
"""
NHS Cancer Performance Data - Comprehensive Accuracy Report Generator
====================================================================

This script generates a comprehensive data accuracy report by aggregating results
from all 6 phases of cancer performance data testing and providing an executive
summary with confidence scores and actionable recommendations.

Author: Claude Code Assistant
Date: 2025-09-25
"""

import os
import sys
import json
import glob
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import traceback

class CancerAccuracyReportGenerator:
    """Generates comprehensive cancer data accuracy report"""

    def __init__(self, test_results_dir: str, output_dir: str = None):
        self.test_results_dir = Path(test_results_dir)
        self.output_dir = Path(output_dir) if output_dir else self.test_results_dir

        self.master_report = {
            "report_timestamp": datetime.now().isoformat(),
            "report_type": "Comprehensive Cancer Performance Data Accuracy Report",
            "test_results_directory": str(self.test_results_dir),
            "phase_results": {},
            "executive_summary": {},
            "confidence_assessment": {},
            "recommendations": {},
            "action_plan": {},
            "overall_status": "UNKNOWN"
        }

        # Phase descriptions
        self.phase_descriptions = {
            "phase1": {
                "name": "Raw Excel File Validation",
                "description": "Validates completeness and integrity of raw NHS CWT Excel files",
                "weight": 0.15
            },
            "phase2": {
                "name": "Data Processing Accuracy",
                "description": "Tests Excel → JSONB transformation and calculation accuracy",
                "weight": 0.20
            },
            "phase3": {
                "name": "Database Integrity Validation",
                "description": "Validates cancer data integrity in Supabase database",
                "weight": 0.20
            },
            "phase4": {
                "name": "Frontend Data Flow Accuracy",
                "description": "Tests data flow from database through React components",
                "weight": 0.15
            },
            "phase5": {
                "name": "Visual Display Accuracy",
                "description": "Validates visual component display accuracy and formatting",
                "weight": 0.15
            },
            "phase6": {
                "name": "End-to-End Pipeline Validation",
                "description": "Comprehensive pipeline validation from Excel to frontend",
                "weight": 0.15
            }
        }

    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive accuracy report from all phase results"""
        print(f"\n📊 Generating Comprehensive Cancer Data Accuracy Report")
        print(f"📂 Test results directory: {self.test_results_dir}")

        try:
            # Load all phase results
            self._load_phase_results()

            # Generate executive summary
            self._generate_executive_summary()

            # Generate confidence assessment
            self._generate_confidence_assessment()

            # Generate recommendations
            self._generate_recommendations()

            # Generate action plan
            self._generate_action_plan()

            # Create final report files
            self._create_report_files()

        except Exception as e:
            print(f"❌ Error generating comprehensive report: {e}")
            traceback.print_exc()

        return self.master_report

    def _load_phase_results(self):
        """Load results from all phase test files"""
        print(f"\n📋 Loading Phase Results...")

        phase_patterns = {
            "phase1": "phase1_cancer_*validation*.json",
            "phase2": "phase2_cancer_*accuracy*.json",
            "phase3": "phase3_cancer_*integrity*.json",
            "phase4": "phase4_cancer_*accuracy*.json",
            "phase5": "phase5_cancer_*accuracy*.json",
            "phase6": "phase6_cancer_*validation*.json"
        }

        for phase_key, pattern in phase_patterns.items():
            try:
                # Find the most recent file for this phase
                pattern_path = self.test_results_dir / pattern
                matching_files = glob.glob(str(pattern_path))

                if matching_files:
                    # Sort by modification time, get most recent
                    latest_file = max(matching_files, key=os.path.getmtime)

                    with open(latest_file, 'r') as f:
                        phase_data = json.load(f)

                    self.master_report["phase_results"][phase_key] = {
                        "source_file": latest_file,
                        "data": phase_data,
                        "loaded": True
                    }

                    print(f"  ✅ {phase_key.upper()}: Loaded from {Path(latest_file).name}")

                else:
                    self.master_report["phase_results"][phase_key] = {
                        "source_file": None,
                        "data": None,
                        "loaded": False,
                        "error": f"No files found matching pattern: {pattern}"
                    }

                    print(f"  ❌ {phase_key.upper()}: No results found")

            except Exception as e:
                self.master_report["phase_results"][phase_key] = {
                    "source_file": None,
                    "data": None,
                    "loaded": False,
                    "error": str(e)
                }
                print(f"  ❌ {phase_key.upper()}: Error loading - {str(e)}")

    def _generate_executive_summary(self):
        """Generate executive summary of all test results"""
        print(f"\n📊 Generating Executive Summary...")

        summary = {
            "test_overview": {
                "phases_completed": 0,
                "total_phases": len(self.phase_descriptions),
                "tests_run": 0,
                "overall_pass_rate": 0.0
            },
            "issue_summary": {
                "critical_issues": 0,
                "high_issues": 0,
                "medium_issues": 0,
                "low_issues": 0,
                "total_issues": 0
            },
            "phase_summaries": {},
            "key_findings": [],
            "data_quality_metrics": {}
        }

        # Aggregate results from all phases
        total_tests = 0
        total_passed = 0

        for phase_key, phase_result in self.master_report["phase_results"].items():
            if not phase_result.get("loaded", False):
                continue

            summary["test_overview"]["phases_completed"] += 1
            phase_data = phase_result["data"]

            # Extract phase summary
            phase_summary = phase_data.get("summary", {})
            phase_issues = phase_data.get("issues_found", [])

            # Count issues by severity
            phase_issue_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
            for issue in phase_issues:
                severity = issue.get("severity", "LOW").lower()
                if severity == "critical":
                    phase_issue_counts["critical"] += 1
                    summary["issue_summary"]["critical_issues"] += 1
                elif severity == "high":
                    phase_issue_counts["high"] += 1
                    summary["issue_summary"]["high_issues"] += 1
                elif severity == "medium":
                    phase_issue_counts["medium"] += 1
                    summary["issue_summary"]["medium_issues"] += 1
                else:
                    phase_issue_counts["low"] += 1
                    summary["issue_summary"]["low_issues"] += 1

            # Extract test counts
            tests_run = phase_summary.get("total_tests_run", phase_summary.get("files_tested", 1))
            tests_passed = phase_summary.get("tests_passed", 0)

            total_tests += tests_run
            total_passed += tests_passed

            # Phase-specific summary
            phase_info = self.phase_descriptions[phase_key]
            summary["phase_summaries"][phase_key] = {
                "name": phase_info["name"],
                "status": phase_data.get("overall_status", "UNKNOWN"),
                "tests_run": tests_run,
                "tests_passed": tests_passed,
                "pass_rate": (tests_passed / tests_run * 100) if tests_run > 0 else 0,
                "issues": phase_issue_counts,
                "key_metrics": self._extract_phase_key_metrics(phase_key, phase_data)
            }

        # Calculate overall metrics
        summary["test_overview"]["tests_run"] = total_tests
        summary["test_overview"]["overall_pass_rate"] = (total_passed / total_tests * 100) if total_tests > 0 else 0
        summary["issue_summary"]["total_issues"] = sum(summary["issue_summary"].values())

        # Generate key findings
        summary["key_findings"] = self._generate_key_findings()

        # Generate data quality metrics
        summary["data_quality_metrics"] = self._calculate_data_quality_metrics()

        self.master_report["executive_summary"] = summary

        print(f"  📊 Phases completed: {summary['test_overview']['phases_completed']}/{summary['test_overview']['total_phases']}")
        print(f"  📈 Overall pass rate: {summary['test_overview']['overall_pass_rate']:.1f}%")
        print(f"  🚨 Total issues: {summary['issue_summary']['total_issues']}")

    def _extract_phase_key_metrics(self, phase_key: str, phase_data: Dict) -> Dict:
        """Extract key metrics from each phase"""
        key_metrics = {}

        try:
            summary = phase_data.get("summary", {})
            validation_results = phase_data.get("validation_results", {})

            if phase_key == "phase1":
                # Raw data validation metrics
                key_metrics["files_found"] = summary.get("files_found", 0)
                key_metrics["files_processable"] = summary.get("files_processable", 0)
                key_metrics["data_quality_score"] = summary.get("overall_data_quality", 0)

            elif phase_key == "phase2":
                # Processing accuracy metrics
                key_metrics["transformation_accuracy"] = summary.get("accuracy_metrics", {}).get("transformation", 0)
                key_metrics["calculation_accuracy"] = summary.get("accuracy_metrics", {}).get("calculations", 0)
                key_metrics["overall_accuracy"] = summary.get("overall_accuracy_score", 0)

            elif phase_key == "phase3":
                # Database integrity metrics
                key_metrics["data_coverage"] = summary.get("coverage_metrics", {}).get("data_coverage_pct", 0)
                key_metrics["trusts_with_data"] = summary.get("coverage_metrics", {}).get("trusts_with_data", 0)
                key_metrics["integrity_score"] = summary.get("overall_integrity_score", 0)

            elif phase_key == "phase4":
                # Frontend accuracy metrics
                key_metrics["frontend_score"] = summary.get("overall_frontend_score", 0)
                key_metrics["structure_accuracy"] = summary.get("accuracy_metrics", {}).get("structure", 0)
                key_metrics["data_flow_accuracy"] = summary.get("accuracy_metrics", {}).get("data_flow", 0)

            elif phase_key == "phase5":
                # Visual display metrics
                key_metrics["visual_accuracy"] = summary.get("overall_visual_accuracy_score", 0)
                key_metrics["kpi_accuracy"] = summary.get("accuracy_metrics", {}).get("kpi_cards", 0)
                key_metrics["chart_accuracy"] = summary.get("accuracy_metrics", {}).get("charts", 0)

            elif phase_key == "phase6":
                # End-to-end metrics
                key_metrics["pipeline_integrity"] = summary.get("pipeline_integrity_score", 0)
                key_metrics["confidence_level"] = phase_data.get("confidence_level", 0)
                key_metrics["traceability"] = summary.get("confidence_metrics", {}).get("traceability", 0)

        except Exception as e:
            key_metrics["error"] = str(e)

        return key_metrics

    def _generate_key_findings(self) -> List[str]:
        """Generate key findings from all phases"""
        findings = []

        # Analyze critical issues across phases
        critical_phases = []
        high_issue_phases = []

        for phase_key, summary in self.master_report["executive_summary"]["phase_summaries"].items():
            if summary["issues"]["critical"] > 0:
                critical_phases.append(self.phase_descriptions[phase_key]["name"])
            if summary["issues"]["high"] > 3:  # More than 3 high issues
                high_issue_phases.append(self.phase_descriptions[phase_key]["name"])

        if critical_phases:
            findings.append(f"Critical issues found in: {', '.join(critical_phases)}")

        if high_issue_phases:
            findings.append(f"High number of issues in: {', '.join(high_issue_phases)}")

        # Analyze overall system health
        total_issues = self.master_report["executive_summary"]["issue_summary"]["total_issues"]
        if total_issues == 0:
            findings.append("No issues found - excellent data quality across all phases")
        elif total_issues < 5:
            findings.append("Minimal issues found - good overall data quality")
        elif total_issues < 15:
            findings.append("Moderate number of issues - data quality needs improvement")
        else:
            findings.append("High number of issues - significant data quality concerns")

        # Check for standout phases
        best_phase = None
        worst_phase = None
        best_score = 0
        worst_score = 100

        for phase_key, summary in self.master_report["executive_summary"]["phase_summaries"].items():
            pass_rate = summary["pass_rate"]
            if pass_rate > best_score:
                best_score = pass_rate
                best_phase = self.phase_descriptions[phase_key]["name"]
            if pass_rate < worst_score:
                worst_score = pass_rate
                worst_phase = self.phase_descriptions[phase_key]["name"]

        if best_phase and best_score > 90:
            findings.append(f"Excellent performance in {best_phase} ({best_score:.1f}%)")
        if worst_phase and worst_score < 70:
            findings.append(f"Poor performance in {worst_phase} ({worst_score:.1f}%) - needs attention")

        return findings

    def _calculate_data_quality_metrics(self) -> Dict:
        """Calculate overall data quality metrics"""
        metrics = {
            "pipeline_completeness": 0.0,
            "data_accuracy": 0.0,
            "system_reliability": 0.0,
            "frontend_quality": 0.0,
            "overall_quality_score": 0.0
        }

        try:
            phase_summaries = self.master_report["executive_summary"]["phase_summaries"]

            # Pipeline completeness (phases 1-3)
            pipeline_phases = ["phase1", "phase2", "phase3"]
            pipeline_scores = []
            for phase in pipeline_phases:
                if phase in phase_summaries:
                    pipeline_scores.append(phase_summaries[phase]["pass_rate"])
            metrics["pipeline_completeness"] = sum(pipeline_scores) / len(pipeline_scores) if pipeline_scores else 0

            # Data accuracy (phases 2, 3, 6)
            accuracy_phases = ["phase2", "phase3", "phase6"]
            accuracy_scores = []
            for phase in accuracy_phases:
                if phase in phase_summaries:
                    key_metrics = phase_summaries[phase]["key_metrics"]
                    if phase == "phase2":
                        accuracy_scores.append(key_metrics.get("overall_accuracy", 0))
                    elif phase == "phase3":
                        accuracy_scores.append(key_metrics.get("integrity_score", 0))
                    elif phase == "phase6":
                        accuracy_scores.append(key_metrics.get("confidence_level", 0))
            metrics["data_accuracy"] = sum(accuracy_scores) / len(accuracy_scores) if accuracy_scores else 0

            # System reliability (phase 6)
            if "phase6" in phase_summaries:
                metrics["system_reliability"] = phase_summaries["phase6"]["key_metrics"].get("pipeline_integrity", 0)

            # Frontend quality (phases 4, 5)
            frontend_phases = ["phase4", "phase5"]
            frontend_scores = []
            for phase in frontend_phases:
                if phase in phase_summaries:
                    key_metrics = phase_summaries[phase]["key_metrics"]
                    if phase == "phase4":
                        frontend_scores.append(key_metrics.get("frontend_score", 0))
                    elif phase == "phase5":
                        frontend_scores.append(key_metrics.get("visual_accuracy", 0))
            metrics["frontend_quality"] = sum(frontend_scores) / len(frontend_scores) if frontend_scores else 0

            # Overall quality score (weighted average)
            weights = {
                "pipeline_completeness": 0.3,
                "data_accuracy": 0.4,
                "system_reliability": 0.2,
                "frontend_quality": 0.1
            }

            weighted_sum = sum(metrics[metric] * weight for metric, weight in weights.items())
            metrics["overall_quality_score"] = weighted_sum

        except Exception as e:
            print(f"  ⚠️ Error calculating data quality metrics: {e}")

        return metrics

    def _generate_confidence_assessment(self):
        """Generate confidence assessment and scoring"""
        print(f"\n🎯 Generating Confidence Assessment...")

        assessment = {
            "confidence_level": "UNKNOWN",
            "confidence_score": 0.0,
            "confidence_factors": {},
            "risk_assessment": {},
            "production_readiness": "NOT_ASSESSED"
        }

        try:
            # Get end-to-end confidence if available
            phase6_data = self.master_report["phase_results"].get("phase6", {}).get("data", {})
            if phase6_data:
                base_confidence = phase6_data.get("confidence_level", 0)
                assessment["confidence_score"] = base_confidence
            else:
                # Calculate confidence from other phases
                base_confidence = self._calculate_composite_confidence()
                assessment["confidence_score"] = base_confidence

            # Determine confidence level
            if base_confidence >= 90:
                assessment["confidence_level"] = "VERY_HIGH"
                assessment["production_readiness"] = "READY"
            elif base_confidence >= 80:
                assessment["confidence_level"] = "HIGH"
                assessment["production_readiness"] = "READY_WITH_MONITORING"
            elif base_confidence >= 70:
                assessment["confidence_level"] = "MODERATE"
                assessment["production_readiness"] = "CONDITIONAL"
            elif base_confidence >= 60:
                assessment["confidence_level"] = "LOW"
                assessment["production_readiness"] = "NOT_READY"
            else:
                assessment["confidence_level"] = "VERY_LOW"
                assessment["production_readiness"] = "NOT_READY"

            # Generate confidence factors
            assessment["confidence_factors"] = self._analyze_confidence_factors()

            # Generate risk assessment
            assessment["risk_assessment"] = self._generate_risk_assessment()

            print(f"  🎯 Confidence level: {assessment['confidence_level']}")
            print(f"  📊 Confidence score: {assessment['confidence_score']:.1f}%")
            print(f"  🚀 Production readiness: {assessment['production_readiness']}")

        except Exception as e:
            print(f"  ❌ Error generating confidence assessment: {e}")

        self.master_report["confidence_assessment"] = assessment

    def _calculate_composite_confidence(self) -> float:
        """Calculate composite confidence score from all phases"""
        weighted_scores = []

        for phase_key, phase_info in self.phase_descriptions.items():
            phase_result = self.master_report["phase_results"].get(phase_key, {})
            if not phase_result.get("loaded", False):
                continue

            phase_data = phase_result["data"]
            phase_summary = phase_data.get("summary", {})

            # Get phase score based on pass rate and issues
            tests_run = phase_summary.get("total_tests_run", 1)
            tests_passed = phase_summary.get("tests_passed", 0)
            pass_rate = (tests_passed / tests_run) * 100 if tests_run > 0 else 0

            # Reduce score based on critical/high issues
            critical_issues = len([i for i in phase_data.get("issues_found", []) if i.get("severity") == "CRITICAL"])
            high_issues = len([i for i in phase_data.get("issues_found", []) if i.get("severity") == "HIGH"])

            issue_penalty = (critical_issues * 20) + (high_issues * 10)
            phase_score = max(0, pass_rate - issue_penalty)

            weighted_scores.append(phase_score * phase_info["weight"])

        return sum(weighted_scores) if weighted_scores else 0

    def _analyze_confidence_factors(self) -> Dict:
        """Analyze factors affecting confidence"""
        factors = {
            "positive_factors": [],
            "negative_factors": [],
            "neutral_factors": []
        }

        try:
            # Analyze each phase for confidence factors
            for phase_key, summary in self.master_report["executive_summary"]["phase_summaries"].items():
                phase_name = self.phase_descriptions[phase_key]["name"]

                if summary["issues"]["critical"] == 0 and summary["pass_rate"] > 90:
                    factors["positive_factors"].append(f"{phase_name}: Excellent performance ({summary['pass_rate']:.1f}%)")
                elif summary["issues"]["critical"] > 0:
                    factors["negative_factors"].append(f"{phase_name}: Critical issues found ({summary['issues']['critical']})")
                elif summary["pass_rate"] < 70:
                    factors["negative_factors"].append(f"{phase_name}: Low pass rate ({summary['pass_rate']:.1f}%)")
                elif summary["issues"]["high"] > 3:
                    factors["negative_factors"].append(f"{phase_name}: High number of issues ({summary['issues']['high']} high)")
                else:
                    factors["neutral_factors"].append(f"{phase_name}: Acceptable performance")

        except Exception as e:
            factors["error"] = str(e)

        return factors

    def _generate_risk_assessment(self) -> Dict:
        """Generate risk assessment"""
        risks = {
            "high_risks": [],
            "medium_risks": [],
            "low_risks": [],
            "overall_risk_level": "UNKNOWN"
        }

        try:
            total_critical = self.master_report["executive_summary"]["issue_summary"]["critical_issues"]
            total_high = self.master_report["executive_summary"]["issue_summary"]["high_issues"]
            confidence_score = self.master_report["confidence_assessment"]["confidence_score"]

            # High risks
            if total_critical > 0:
                risks["high_risks"].append(f"Critical data accuracy issues detected ({total_critical})")
            if confidence_score < 60:
                risks["high_risks"].append("Very low confidence in data accuracy")

            # Medium risks
            if total_high > 5:
                risks["medium_risks"].append(f"High number of significant issues ({total_high})")
            if 60 <= confidence_score < 80:
                risks["medium_risks"].append("Moderate confidence level may affect reliability")

            # Low risks
            if total_high > 0 and total_high <= 5:
                risks["low_risks"].append("Some issues present but manageable")
            if 80 <= confidence_score < 90:
                risks["low_risks"].append("Good confidence level with minor concerns")

            # Overall risk level
            if risks["high_risks"]:
                risks["overall_risk_level"] = "HIGH"
            elif risks["medium_risks"]:
                risks["overall_risk_level"] = "MEDIUM"
            elif risks["low_risks"]:
                risks["overall_risk_level"] = "LOW"
            else:
                risks["overall_risk_level"] = "MINIMAL"

        except Exception as e:
            risks["error"] = str(e)

        return risks

    def _generate_recommendations(self):
        """Generate actionable recommendations"""
        print(f"\n💡 Generating Recommendations...")

        recommendations = {
            "immediate_actions": [],
            "short_term_improvements": [],
            "long_term_enhancements": [],
            "monitoring_requirements": []
        }

        try:
            confidence_score = self.master_report["confidence_assessment"]["confidence_score"]
            total_critical = self.master_report["executive_summary"]["issue_summary"]["critical_issues"]
            total_high = self.master_report["executive_summary"]["issue_summary"]["high_issues"]

            # Immediate actions (critical issues)
            if total_critical > 0:
                recommendations["immediate_actions"].append("🚨 CRITICAL: Resolve all critical data accuracy issues before production deployment")
                recommendations["immediate_actions"].append("🔍 Review and fix data processing pipeline errors")

            if confidence_score < 60:
                recommendations["immediate_actions"].append("🛑 STOP: Do not deploy to production until confidence level improves")

            # Short-term improvements
            if total_high > 0:
                recommendations["short_term_improvements"].append(f"🔧 Address {total_high} high-priority issues within 1-2 weeks")

            if confidence_score < 80:
                recommendations["short_term_improvements"].append("📊 Improve data validation and processing accuracy")
                recommendations["short_term_improvements"].append("🧪 Run targeted tests on problem areas")

            # Long-term enhancements
            recommendations["long_term_enhancements"].append("🔄 Implement automated testing pipeline for continuous validation")
            recommendations["long_term_enhancements"].append("📈 Establish data quality monitoring dashboards")
            recommendations["long_term_enhancements"].append("🎯 Set up regular accuracy validation schedules")

            # Monitoring requirements
            if confidence_score >= 80:
                recommendations["monitoring_requirements"].append("📊 Monitor key performance indicators weekly")
                recommendations["monitoring_requirements"].append("🔍 Run monthly accuracy spot checks")
            else:
                recommendations["monitoring_requirements"].append("📊 Monitor key performance indicators daily until confidence improves")
                recommendations["monitoring_requirements"].append("🔍 Run weekly comprehensive accuracy checks")

            # Phase-specific recommendations
            for phase_key, summary in self.master_report["executive_summary"]["phase_summaries"].items():
                if summary["issues"]["critical"] > 0 or summary["pass_rate"] < 70:
                    phase_name = self.phase_descriptions[phase_key]["name"]
                    recommendations["short_term_improvements"].append(
                        f"🎯 Focus improvement efforts on {phase_name}"
                    )

        except Exception as e:
            recommendations["error"] = str(e)

        self.master_report["recommendations"] = recommendations

        print(f"  💡 Immediate actions: {len(recommendations['immediate_actions'])}")
        print(f"  🔧 Short-term improvements: {len(recommendations['short_term_improvements'])}")

    def _generate_action_plan(self):
        """Generate detailed action plan with priorities and timelines"""
        print(f"\n📋 Generating Action Plan...")

        action_plan = {
            "priority_1_critical": [],
            "priority_2_high": [],
            "priority_3_medium": [],
            "timeline": {},
            "resource_requirements": [],
            "success_metrics": []
        }

        try:
            confidence_score = self.master_report["confidence_assessment"]["confidence_score"]
            recommendations = self.master_report["recommendations"]

            # Priority 1 - Critical (0-1 week)
            if recommendations.get("immediate_actions"):
                action_plan["priority_1_critical"].extend(recommendations["immediate_actions"])
                action_plan["timeline"]["week_1"] = "Resolve all critical issues"

            # Priority 2 - High (1-4 weeks)
            if recommendations.get("short_term_improvements"):
                action_plan["priority_2_high"].extend(recommendations["short_term_improvements"])
                action_plan["timeline"]["weeks_2_4"] = "Address high-priority improvements"

            # Priority 3 - Medium (1-3 months)
            if recommendations.get("long_term_enhancements"):
                action_plan["priority_3_medium"].extend(recommendations["long_term_enhancements"])
                action_plan["timeline"]["months_1_3"] = "Implement long-term enhancements"

            # Resource requirements
            if confidence_score < 70:
                action_plan["resource_requirements"].append("🧑‍💻 Dedicated data engineer for 2-4 weeks")
                action_plan["resource_requirements"].append("🧪 QA specialist for comprehensive testing")
            elif confidence_score < 85:
                action_plan["resource_requirements"].append("🧑‍💻 Part-time data engineer for 1-2 weeks")

            action_plan["resource_requirements"].append("📊 Business analyst for requirement validation")

            # Success metrics
            action_plan["success_metrics"].extend([
                "🎯 Achieve >90% confidence score",
                "🚨 Zero critical issues",
                "⚠️ <5 high-priority issues",
                "✅ >95% test pass rate across all phases",
                "📊 Consistent performance metrics"
            ])

        except Exception as e:
            action_plan["error"] = str(e)

        self.master_report["action_plan"] = action_plan

    def _create_report_files(self):
        """Create final report files in multiple formats"""
        print(f"\n📄 Creating Report Files...")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        try:
            # JSON report (complete data)
            json_file = self.output_dir / f"comprehensive_cancer_accuracy_report_{timestamp}.json"
            with open(json_file, 'w') as f:
                json.dump(self.master_report, f, indent=2)
            print(f"  📄 JSON report: {json_file.name}")

            # Markdown executive summary
            md_file = self.output_dir / f"cancer_accuracy_executive_summary_{timestamp}.md"
            self._create_markdown_summary(md_file)
            print(f"  📝 Markdown summary: {md_file.name}")

            # CSV summary for spreadsheet analysis
            csv_file = self.output_dir / f"cancer_accuracy_summary_{timestamp}.csv"
            self._create_csv_summary(csv_file)
            print(f"  📊 CSV summary: {csv_file.name}")

        except Exception as e:
            print(f"  ❌ Error creating report files: {e}")

    def _create_markdown_summary(self, file_path: Path):
        """Create executive summary in Markdown format"""

        summary = self.master_report["executive_summary"]
        confidence = self.master_report["confidence_assessment"]
        recommendations = self.master_report["recommendations"]
        action_plan = self.master_report["action_plan"]

        md_content = f"""# NHS Cancer Performance Data - Accuracy Report

**Report Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary

### Overall Results
- **Phases Completed:** {summary['test_overview']['phases_completed']}/{summary['test_overview']['total_phases']}
- **Overall Pass Rate:** {summary['test_overview']['overall_pass_rate']:.1f}%
- **Total Tests Run:** {summary['test_overview']['tests_run']}
- **Confidence Score:** {confidence['confidence_score']:.1f}%
- **Confidence Level:** {confidence['confidence_level'].replace('_', ' ').title()}
- **Production Readiness:** {confidence['production_readiness'].replace('_', ' ').title()}

### Issues Summary
- 🚨 **Critical Issues:** {summary['issue_summary']['critical_issues']}
- ⚠️ **High Issues:** {summary['issue_summary']['high_issues']}
- ❓ **Medium Issues:** {summary['issue_summary']['medium_issues']}
- ℹ️ **Low Issues:** {summary['issue_summary']['low_issues']}
- **Total Issues:** {summary['issue_summary']['total_issues']}

## Data Quality Metrics
- **Pipeline Completeness:** {summary['data_quality_metrics']['pipeline_completeness']:.1f}%
- **Data Accuracy:** {summary['data_quality_metrics']['data_accuracy']:.1f}%
- **System Reliability:** {summary['data_quality_metrics']['system_reliability']:.1f}%
- **Frontend Quality:** {summary['data_quality_metrics']['frontend_quality']:.1f}%
- **Overall Quality Score:** {summary['data_quality_metrics']['overall_quality_score']:.1f}%

## Phase Results

"""

        for phase_key, phase_summary in summary["phase_summaries"].items():
            phase_info = self.phase_descriptions[phase_key]
            md_content += f"""### {phase_info['name']}
- **Status:** {phase_summary['status']}
- **Pass Rate:** {phase_summary['pass_rate']:.1f}%
- **Tests:** {phase_summary['tests_passed']}/{phase_summary['tests_run']}
- **Issues:** {phase_summary['issues']['critical']} Critical, {phase_summary['issues']['high']} High

"""

        md_content += f"""## Key Findings
"""
        for finding in summary.get("key_findings", []):
            md_content += f"- {finding}\n"

        md_content += f"""
## Risk Assessment
- **Overall Risk Level:** {confidence['risk_assessment']['overall_risk_level']}

### High Risks
"""
        for risk in confidence['risk_assessment'].get('high_risks', []):
            md_content += f"- 🔴 {risk}\n"

        md_content += f"""
### Medium Risks
"""
        for risk in confidence['risk_assessment'].get('medium_risks', []):
            md_content += f"- 🟡 {risk}\n"

        md_content += f"""
## Immediate Actions Required
"""
        for action in recommendations.get("immediate_actions", []):
            md_content += f"- {action}\n"

        md_content += f"""
## Short-Term Improvements
"""
        for improvement in recommendations.get("short_term_improvements", []):
            md_content += f"- {improvement}\n"

        md_content += f"""
## Action Plan Timeline
"""
        for period, description in action_plan.get("timeline", {}).items():
            md_content += f"- **{period.replace('_', ' ').title()}:** {description}\n"

        md_content += f"""
## Success Metrics
"""
        for metric in action_plan.get("success_metrics", []):
            md_content += f"- {metric}\n"

        # Confidence interpretation
        confidence_score = confidence['confidence_score']
        md_content += f"""
## Confidence Interpretation

**Current Confidence Level: {confidence_score:.1f}%**

"""

        if confidence_score >= 90:
            md_content += "✅ **EXCELLENT (90%+):** Cancer data is highly accurate and reliable - ready for production deployment."
        elif confidence_score >= 80:
            md_content += "👍 **GOOD (80-89%):** Cancer data is generally accurate with minor issues - suitable for production with monitoring."
        elif confidence_score >= 70:
            md_content += "⚠️ **ACCEPTABLE (70-79%):** Cancer data is usable but needs improvement - conditional production readiness."
        elif confidence_score >= 60:
            md_content += "⚠️ **CONCERNING (60-69%):** Cancer data has significant accuracy issues - not recommended for production."
        else:
            md_content += "🚨 **CRITICAL (<60%):** Cancer data accuracy is unacceptable for production use - major fixes required."

        with open(file_path, 'w') as f:
            f.write(md_content)

    def _create_csv_summary(self, file_path: Path):
        """Create CSV summary for spreadsheet analysis"""

        import csv

        summary = self.master_report["executive_summary"]

        with open(file_path, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)

            # Header
            writer.writerow([
                'Phase', 'Name', 'Status', 'Tests_Run', 'Tests_Passed', 'Pass_Rate',
                'Critical_Issues', 'High_Issues', 'Medium_Issues', 'Low_Issues'
            ])

            # Phase data
            for phase_key, phase_summary in summary["phase_summaries"].items():
                writer.writerow([
                    phase_key,
                    self.phase_descriptions[phase_key]['name'],
                    phase_summary['status'],
                    phase_summary['tests_run'],
                    phase_summary['tests_passed'],
                    f"{phase_summary['pass_rate']:.1f}%",
                    phase_summary['issues']['critical'],
                    phase_summary['issues']['high'],
                    phase_summary['issues']['medium'],
                    phase_summary['issues']['low']
                ])

            # Summary row
            writer.writerow([])
            writer.writerow([
                'OVERALL', 'All Phases',
                self.master_report["confidence_assessment"]["confidence_level"],
                summary["test_overview"]["tests_run"],
                '-',
                f"{summary['test_overview']['overall_pass_rate']:.1f}%",
                summary["issue_summary"]["critical_issues"],
                summary["issue_summary"]["high_issues"],
                summary["issue_summary"]["medium_issues"],
                summary["issue_summary"]["low_issues"]
            ])

def main():
    """Main execution function"""
    print("NHS Cancer Performance Data - Comprehensive Accuracy Report Generator")
    print("=" * 80)

    # Test results directory
    test_results_dir = "/Users/markknapp/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master/data-integrity-tests"

    # Initialize report generator
    generator = CancerAccuracyReportGenerator(test_results_dir)

    # Generate comprehensive report
    master_report = generator.generate_comprehensive_report()

    # Print final summary
    print(f"\n🎉 Comprehensive Report Generation Complete!")
    print(f"📊 Confidence Score: {master_report.get('confidence_assessment', {}).get('confidence_score', 0):.1f}%")
    print(f"🎯 Production Readiness: {master_report.get('confidence_assessment', {}).get('production_readiness', 'UNKNOWN')}")
    print(f"📁 Report files saved to: {generator.output_dir}")

    # Exit with appropriate code
    confidence_score = master_report.get('confidence_assessment', {}).get('confidence_score', 0)
    critical_issues = master_report.get('executive_summary', {}).get('issue_summary', {}).get('critical_issues', 0)

    if confidence_score >= 85 and critical_issues == 0:
        print(f"\n🚀 RECOMMENDATION: Cancer data is ready for production deployment!")
        sys.exit(0)
    elif confidence_score >= 70 and critical_issues == 0:
        print(f"\n✅ RECOMMENDATION: Cancer data is acceptable for production with monitoring")
        sys.exit(0)
    elif critical_issues > 0:
        print(f"\n🚨 RECOMMENDATION: Do NOT deploy to production - critical issues must be resolved")
        sys.exit(2)
    else:
        print(f"\n⚠️ RECOMMENDATION: Significant improvements needed before production deployment")
        sys.exit(1)

if __name__ == "__main__":
    main()
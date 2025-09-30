#!/usr/bin/env python3
"""
NHS Data Integrity Testing - Comprehensive Report Generator
==========================================================

This script consolidates findings from all testing phases and generates
a comprehensive data integrity report with executive summary,
detailed findings, and actionable recommendations.

Author: Claude Code Assistant
Date: 2025-09-24
"""

import os
import sys
import json
import glob
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import pandas as pd

class ComprehensiveReportGenerator:
    """Generates comprehensive data integrity report from all test phases"""

    def __init__(self, test_results_dir: str = "."):
        self.test_results_dir = Path(test_results_dir)
        self.report_timestamp = datetime.now()

        # Load all phase results
        self.phase_results = {}
        self.load_phase_results()

        # Initialize comprehensive report structure
        self.comprehensive_report = {
            "report_metadata": {
                "generation_timestamp": self.report_timestamp.isoformat(),
                "report_type": "NHS Data Analytics - Comprehensive Data Integrity Assessment",
                "test_phases_included": list(self.phase_results.keys()),
                "assessment_scope": "Source data verification, database migration integrity, business logic validation"
            },
            "executive_summary": {},
            "detailed_findings": {},
            "data_quality_assessment": {},
            "risk_analysis": {},
            "recommendations": {},
            "action_plan": {},
            "appendices": {}
        }

    def load_phase_results(self) -> None:
        """Load results from all completed test phases"""
        print("📊 Loading test phase results...")

        # Look for result files from each phase
        phase_patterns = {
            "phase1": "phase1_results_*.json",
            "phase2": "phase2_results_*.json",
            "phase3": "phase3_results_*.json"
        }

        for phase_name, pattern in phase_patterns.items():
            result_files = list(self.test_results_dir.glob(pattern))
            if result_files:
                # Take the most recent result file
                latest_file = max(result_files, key=lambda x: x.stat().st_mtime)
                try:
                    with open(latest_file, 'r') as f:
                        self.phase_results[phase_name] = json.load(f)
                    print(f"   ✅ Loaded {phase_name} results from {latest_file.name}")
                except Exception as e:
                    print(f"   ❌ Failed to load {phase_name} results: {e}")
            else:
                print(f"   ⚠️ No results found for {phase_name}")

    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate the complete comprehensive report"""
        print("📋 Generating comprehensive data integrity report...")
        print("-" * 60)

        # Generate each section
        print("\n1️⃣ Generating executive summary...")
        self.generate_executive_summary()

        print("\n2️⃣ Generating detailed findings...")
        self.generate_detailed_findings()

        print("\n3️⃣ Generating data quality assessment...")
        self.generate_data_quality_assessment()

        print("\n4️⃣ Generating risk analysis...")
        self.generate_risk_analysis()

        print("\n5️⃣ Generating recommendations...")
        self.generate_recommendations()

        print("\n6️⃣ Generating action plan...")
        self.generate_action_plan()

        print("\n7️⃣ Generating appendices...")
        self.generate_appendices()

        return self.comprehensive_report

    def generate_executive_summary(self) -> None:
        """Generate executive summary with key findings and overall assessment"""

        # Collect overall status from each phase
        phase_statuses = {}
        total_critical_issues = 0
        total_warning_issues = 0
        total_issues = 0

        for phase_name, results in self.phase_results.items():
            summary = results.get("summary", {})
            phase_statuses[phase_name] = {
                "status": summary.get("overall_status", "UNKNOWN"),
                "critical_issues": summary.get("critical_issues", 0),
                "warning_issues": summary.get("warning_issues", 0),
                "total_issues": summary.get("total_issues", 0),
                "pass_rate": summary.get("pass_rate", 0)
            }

            total_critical_issues += summary.get("critical_issues", 0)
            total_warning_issues += summary.get("warning_issues", 0)
            total_issues += summary.get("total_issues", 0)

        # Determine overall system status
        if total_critical_issues > 0:
            overall_system_status = "CRITICAL"
            confidence_level = "LOW"
        elif total_warning_issues > 10:
            overall_system_status = "NEEDS_ATTENTION"
            confidence_level = "MEDIUM"
        else:
            overall_system_status = "GOOD"
            confidence_level = "HIGH"

        # Key metrics summary
        phase1_results = self.phase_results.get("phase1", {}).get("results", {})
        phase2_results = self.phase_results.get("phase2", {}).get("results", {})

        csv_records = phase1_results.get("unified_csv", {}).get("total_records", "N/A")
        db_records = phase2_results.get("database_completeness", {}).get("db_total_records", "N/A")

        key_findings = []

        # Source data findings
        if "phase1" in self.phase_results:
            phase1_summary = self.phase_results["phase1"]["summary"]
            if phase1_summary["pass_rate"] < 75:
                key_findings.append(f"Source data quality concerns identified ({phase1_summary['pass_rate']}% tests passed)")
            else:
                key_findings.append("Source data verification completed successfully")

        # Database migration findings
        if "phase2" in self.phase_results:
            phase2_summary = self.phase_results["phase2"]["summary"]
            db_completeness = self.phase_results["phase2"]["results"].get("database_completeness", {})

            csv_count = db_completeness.get("csv_total_records", 0)
            db_count = db_completeness.get("db_total_records", 0)

            if csv_count > 0 and db_count > 0:
                migration_rate = (db_count / csv_count) * 100
                if migration_rate < 95:
                    key_findings.append(f"Incomplete database migration: {migration_rate:.1f}% of records migrated")
                else:
                    key_findings.append("Database migration completed with high fidelity")

        # Business logic findings
        if "phase3" in self.phase_results:
            phase3_results = self.phase_results["phase3"]["results"]
            math_consistency = phase3_results.get("mathematical_consistency", {})

            math_accuracy = math_consistency.get("overall_accuracy_rate", 0)
            if math_accuracy < 80:
                key_findings.append(f"Mathematical consistency issues detected ({math_accuracy}% accuracy)")

            # NHS performance standards
            standards = phase3_results.get("nhs_performance_standards", {})
            if "compliance_summary" in standards:
                compliance = standards["compliance_summary"]
                rtt_compliance = compliance.get("rtt_compliance_rate", 0)
                ae_compliance = compliance.get("ae_compliance_rate", 0)

                if rtt_compliance < 20:
                    key_findings.append(f"RTT performance standards: {rtt_compliance}% compliance rate")
                if ae_compliance < 40:
                    key_findings.append(f"A&E performance standards: {ae_compliance}% compliance rate")

        self.comprehensive_report["executive_summary"] = {
            "assessment_date": self.report_timestamp.strftime("%Y-%m-%d"),
            "overall_system_status": overall_system_status,
            "data_confidence_level": confidence_level,
            "total_records_assessed": {
                "source_csv": csv_records,
                "database": db_records
            },
            "issue_summary": {
                "total_issues": total_issues,
                "critical_issues": total_critical_issues,
                "warning_issues": total_warning_issues
            },
            "phase_summary": phase_statuses,
            "key_findings": key_findings,
            "immediate_actions_required": total_critical_issues > 0,
            "recommended_go_live_status": "PROCEED_WITH_CAUTION" if total_critical_issues == 0 else "HOLD_FOR_FIXES"
        }

    def generate_detailed_findings(self) -> None:
        """Generate detailed findings from each test phase"""

        detailed_findings = {}

        for phase_name, results in self.phase_results.items():
            phase_findings = {
                "phase_name": results.get("test_phase", phase_name),
                "execution_timestamp": results.get("test_timestamp", "Unknown"),
                "overall_status": results.get("summary", {}).get("overall_status", "UNKNOWN"),
                "tests_performed": [],
                "issues_identified": results.get("issues_found", []),
                "test_results": results.get("results", {}),
                "recommendations": results.get("recommendations", [])
            }

            # Extract test details based on phase
            if phase_name == "phase1":
                phase_findings["tests_performed"] = [
                    "Raw data file completeness validation",
                    "Unified CSV structure verification",
                    "File integrity and readability checks",
                    "Database connectivity testing"
                ]

                # Add specific metrics
                unified_csv = results.get("results", {}).get("unified_csv", {})
                if unified_csv:
                    phase_findings["key_metrics"] = {
                        "records_validated": unified_csv.get("total_records", 0),
                        "columns_validated": unified_csv.get("total_columns", 0),
                        "trusts_identified": unified_csv.get("unique_trusts", 0),
                        "duplicate_records": unified_csv.get("duplicate_records", 0)
                    }

            elif phase_name == "phase2":
                phase_findings["tests_performed"] = [
                    "Database record completeness verification",
                    "JSONB structure integrity validation",
                    "Data transformation accuracy testing",
                    "Cross-validation with source data"
                ]

                # Add specific metrics
                db_completeness = results.get("results", {}).get("database_completeness", {})
                if db_completeness:
                    phase_findings["key_metrics"] = {
                        "migration_completeness": f"{db_completeness.get('db_total_records', 0)}/{db_completeness.get('csv_total_records', 0)} records",
                        "trust_migration": f"{db_completeness.get('db_unique_trusts', 0)}/{db_completeness.get('csv_unique_trusts', 0)} trusts",
                        "period_migration": f"{db_completeness.get('db_unique_periods', 0)}/{db_completeness.get('csv_unique_periods', 0)} periods"
                    }

            elif phase_name == "phase3":
                phase_findings["tests_performed"] = [
                    "NHS performance standards compliance testing",
                    "Mathematical consistency validation",
                    "Data range and outlier detection",
                    "Temporal consistency analysis",
                    "Business rule compliance verification"
                ]

                # Add specific metrics
                math_consistency = results.get("results", {}).get("mathematical_consistency", {})
                standards = results.get("results", {}).get("nhs_performance_standards", {})

                key_metrics = {}
                if math_consistency:
                    key_metrics["mathematical_accuracy"] = f"{math_consistency.get('overall_accuracy_rate', 0)}%"

                if "compliance_summary" in standards:
                    compliance = standards["compliance_summary"]
                    key_metrics["rtt_compliance"] = f"{compliance.get('rtt_compliance_rate', 0)}%"
                    key_metrics["ae_compliance"] = f"{compliance.get('ae_compliance_rate', 0)}%"

                phase_findings["key_metrics"] = key_metrics

            detailed_findings[phase_name] = phase_findings

        self.comprehensive_report["detailed_findings"] = detailed_findings

    def generate_data_quality_assessment(self) -> None:
        """Generate overall data quality assessment"""

        # Aggregate quality metrics from all phases
        quality_dimensions = {
            "completeness": {"score": 0, "findings": [], "weight": 0.3},
            "accuracy": {"score": 0, "findings": [], "weight": 0.3},
            "consistency": {"score": 0, "findings": [], "weight": 0.2},
            "validity": {"score": 0, "findings": [], "weight": 0.2}
        }

        # Phase 1 - Completeness assessment
        if "phase1" in self.phase_results:
            phase1_results = self.phase_results["phase1"]["results"]

            # Source file completeness
            raw_data = phase1_results.get("raw_data_completeness", {})
            ae_count = raw_data.get("ae_data", {}).get("found_count", 0)
            rtt_count = raw_data.get("rtt_data", {}).get("found_count", 0)
            discharge_count = raw_data.get("discharge_data", {}).get("found_count", 0)

            expected_files = 12  # 12 months expected
            file_completeness = ((ae_count + rtt_count + discharge_count) / (expected_files * 3)) * 100

            quality_dimensions["completeness"]["score"] = min(100, file_completeness)
            quality_dimensions["completeness"]["findings"].append(f"Source file completeness: {file_completeness:.1f}%")

        # Phase 2 - Accuracy and consistency assessment
        if "phase2" in self.phase_results:
            phase2_results = self.phase_results["phase2"]["results"]

            # Migration accuracy
            transformation_accuracy = phase2_results.get("transformation_accuracy", {})
            if "overall_accuracy" in transformation_accuracy:
                accuracy_score = transformation_accuracy["overall_accuracy"]
                quality_dimensions["accuracy"]["score"] = accuracy_score
                quality_dimensions["accuracy"]["findings"].append(f"Data transformation accuracy: {accuracy_score}%")

            # JSONB structure consistency
            jsonb_structure = phase2_results.get("jsonb_structure", {})
            if "average_populated_percentage" in jsonb_structure:
                consistency_score = jsonb_structure["average_populated_percentage"]
                quality_dimensions["consistency"]["score"] = consistency_score
                quality_dimensions["consistency"]["findings"].append(f"JSONB field population: {consistency_score}%")

        # Phase 3 - Validity assessment
        if "phase3" in self.phase_results:
            phase3_results = self.phase_results["phase3"]["results"]

            # Mathematical validity
            math_consistency = phase3_results.get("mathematical_consistency", {})
            if "overall_accuracy_rate" in math_consistency:
                math_score = math_consistency["overall_accuracy_rate"]
                quality_dimensions["validity"]["score"] = math_score
                quality_dimensions["validity"]["findings"].append(f"Mathematical consistency: {math_score}%")

            # Business rule compliance
            business_rules = phase3_results.get("business_rule_compliance", {})
            if "compliance_summary" in business_rules:
                rule_score = business_rules["compliance_summary"].get("overall_compliance_rate", 0)
                quality_dimensions["validity"]["findings"].append(f"Business rule compliance: {rule_score}%")

        # Calculate weighted overall quality score
        overall_score = sum(
            dim_data["score"] * dim_data["weight"]
            for dim_data in quality_dimensions.values()
        )

        # Determine quality grade
        if overall_score >= 90:
            quality_grade = "A (Excellent)"
        elif overall_score >= 80:
            quality_grade = "B (Good)"
        elif overall_score >= 70:
            quality_grade = "C (Acceptable)"
        elif overall_score >= 60:
            quality_grade = "D (Poor)"
        else:
            quality_grade = "F (Unacceptable)"

        self.comprehensive_report["data_quality_assessment"] = {
            "overall_quality_score": round(overall_score, 1),
            "overall_quality_grade": quality_grade,
            "quality_dimensions": {
                dim_name: {
                    "score": round(dim_data["score"], 1),
                    "weight": dim_data["weight"],
                    "findings": dim_data["findings"]
                }
                for dim_name, dim_data in quality_dimensions.items()
            },
            "quality_summary": self.generate_quality_summary(overall_score, quality_dimensions)
        }

    def generate_quality_summary(self, overall_score: float, dimensions: dict) -> List[str]:
        """Generate quality summary points"""
        summary = []

        if overall_score >= 80:
            summary.append("Data quality is suitable for production dashboard deployment")
        elif overall_score >= 60:
            summary.append("Data quality requires improvement before full deployment")
        else:
            summary.append("Data quality is below acceptable standards - immediate action required")

        # Dimension-specific summaries
        for dim_name, dim_data in dimensions.items():
            if dim_data["score"] < 70:
                summary.append(f"{dim_name.title()} dimension needs attention ({dim_data['score']:.1f}% score)")

        return summary

    def generate_risk_analysis(self) -> None:
        """Generate risk analysis and impact assessment"""

        risks = []

        # Analyze risks from each phase
        total_critical = sum(
            results.get("summary", {}).get("critical_issues", 0)
            for results in self.phase_results.values()
        )

        total_warnings = sum(
            results.get("summary", {}).get("warning_issues", 0)
            for results in self.phase_results.values()
        )

        # Data integrity risks
        if total_critical > 0:
            risks.append({
                "risk_category": "Data Integrity",
                "risk_level": "HIGH",
                "description": f"{total_critical} critical data integrity issues identified",
                "impact": "Inaccurate dashboard reporting, incorrect clinical decision support",
                "likelihood": "HIGH",
                "mitigation": "Address all critical issues before production deployment"
            })

        # Missing data risks
        if "phase2" in self.phase_results:
            db_completeness = self.phase_results["phase2"]["results"].get("database_completeness", {})
            missing_trusts = len(db_completeness.get("missing_trusts", []))

            if missing_trusts > 50:
                risks.append({
                    "risk_category": "Data Completeness",
                    "risk_level": "HIGH",
                    "description": f"{missing_trusts} NHS trusts missing from database",
                    "impact": "Incomplete national NHS performance picture",
                    "likelihood": "CERTAIN",
                    "mitigation": "Complete migration of all trust data"
                })

        # Mathematical consistency risks
        if "phase3" in self.phase_results:
            math_results = self.phase_results["phase3"]["results"].get("mathematical_consistency", {})
            math_accuracy = math_results.get("overall_accuracy_rate", 100)

            if math_accuracy < 80:
                risks.append({
                    "risk_category": "Data Accuracy",
                    "risk_level": "MEDIUM" if math_accuracy > 60 else "HIGH",
                    "description": f"Mathematical inconsistencies in {100-math_accuracy:.1f}% of calculations",
                    "impact": "Incorrect performance metrics and trend analysis",
                    "likelihood": "MEDIUM",
                    "mitigation": "Review and fix data transformation algorithms"
                })

        # Performance standards compliance risks
        if "phase3" in self.phase_results:
            standards = self.phase_results["phase3"]["results"].get("nhs_performance_standards", {})
            if "compliance_summary" in standards:
                compliance = standards["compliance_summary"]
                ae_compliance = compliance.get("ae_compliance_rate", 100)

                if ae_compliance < 30:
                    risks.append({
                        "risk_category": "Performance Standards",
                        "risk_level": "MEDIUM",
                        "description": f"Very low A&E 4-hour standard compliance ({ae_compliance}%)",
                        "impact": "May indicate data quality issues or system-wide performance problems",
                        "likelihood": "MEDIUM",
                        "mitigation": "Validate A&E data collection and processing procedures"
                    })

        # Overall risk assessment
        high_risks = len([r for r in risks if r["risk_level"] == "HIGH"])
        medium_risks = len([r for r in risks if r["risk_level"] == "MEDIUM"])

        if high_risks > 0:
            overall_risk_level = "HIGH"
            risk_recommendation = "High-risk issues must be resolved before production deployment"
        elif medium_risks > 2:
            overall_risk_level = "MEDIUM"
            risk_recommendation = "Medium-risk issues should be addressed to ensure data quality"
        else:
            overall_risk_level = "LOW"
            risk_recommendation = "Risk level acceptable for production deployment with monitoring"

        self.comprehensive_report["risk_analysis"] = {
            "overall_risk_level": overall_risk_level,
            "risk_recommendation": risk_recommendation,
            "risk_summary": {
                "high_risks": high_risks,
                "medium_risks": medium_risks,
                "low_risks": len(risks) - high_risks - medium_risks
            },
            "identified_risks": risks
        }

    def generate_recommendations(self) -> None:
        """Generate consolidated recommendations from all phases"""

        # Collect recommendations from all phases
        all_recommendations = []
        for phase_name, results in self.phase_results.items():
            phase_recs = results.get("recommendations", [])
            for rec in phase_recs:
                all_recommendations.append({
                    "source_phase": phase_name,
                    "recommendation": rec,
                    "priority": "HIGH" if "🔴" in rec else "MEDIUM" if "🟡" in rec else "LOW"
                })

        # Categorize recommendations
        categories = {
            "immediate_actions": [],
            "data_quality_improvements": [],
            "system_enhancements": [],
            "process_improvements": [],
            "monitoring_and_validation": []
        }

        for rec in all_recommendations:
            text = rec["recommendation"].lower()

            if any(word in text for word in ["critical", "immediate", "before proceeding", "fix"]):
                categories["immediate_actions"].append(rec)
            elif any(word in text for word in ["data quality", "accuracy", "transformation", "validation"]):
                categories["data_quality_improvements"].append(rec)
            elif any(word in text for word in ["system", "pipeline", "database", "infrastructure"]):
                categories["system_enhancements"].append(rec)
            elif any(word in text for word in ["process", "procedure", "workflow"]):
                categories["process_improvements"].append(rec)
            else:
                categories["monitoring_and_validation"].append(rec)

        # Add strategic recommendations based on overall findings
        strategic_recommendations = []

        # Data migration completion
        if "phase2" in self.phase_results:
            db_results = self.phase_results["phase2"]["results"].get("database_completeness", {})
            missing_trusts = len(db_results.get("missing_trusts", []))
            if missing_trusts > 0:
                strategic_recommendations.append({
                    "priority": "HIGH",
                    "category": "Data Migration",
                    "recommendation": f"Complete migration of {missing_trusts} missing NHS trusts to ensure comprehensive national coverage",
                    "timeline": "1-2 weeks"
                })

        # Mathematical consistency improvements
        if "phase3" in self.phase_results:
            math_results = self.phase_results["phase3"]["results"].get("mathematical_consistency", {})
            if math_results.get("overall_accuracy_rate", 100) < 80:
                strategic_recommendations.append({
                    "priority": "HIGH",
                    "category": "Data Quality",
                    "recommendation": "Implement comprehensive data validation rules in transformation pipeline to ensure mathematical consistency",
                    "timeline": "2-3 weeks"
                })

        self.comprehensive_report["recommendations"] = {
            "strategic_recommendations": strategic_recommendations,
            "categorized_recommendations": categories,
            "total_recommendations": len(all_recommendations),
            "high_priority_count": len([r for r in all_recommendations if r["priority"] == "HIGH"])
        }

    def generate_action_plan(self) -> None:
        """Generate prioritized action plan with timelines"""

        action_items = []

        # Critical issues requiring immediate attention
        total_critical = sum(
            results.get("summary", {}).get("critical_issues", 0)
            for results in self.phase_results.values()
        )

        if total_critical > 0:
            action_items.append({
                "priority": 1,
                "action": "Address Critical Data Integrity Issues",
                "description": f"Resolve {total_critical} critical issues identified across all test phases",
                "timeline": "1 week",
                "owner": "Data Engineering Team",
                "success_criteria": "Zero critical issues in re-testing"
            })

        # Database migration completion
        if "phase2" in self.phase_results:
            db_results = self.phase_results["phase2"]["results"].get("database_completeness", {})
            missing_trusts = len(db_results.get("missing_trusts", []))

            if missing_trusts > 10:
                action_items.append({
                    "priority": 2,
                    "action": "Complete Database Migration",
                    "description": f"Migrate remaining {missing_trusts} NHS trusts and missing time periods",
                    "timeline": "1-2 weeks",
                    "owner": "Data Migration Team",
                    "success_criteria": "100% trust and period coverage in database"
                })

        # Mathematical consistency improvements
        if "phase3" in self.phase_results:
            math_results = self.phase_results["phase3"]["results"].get("mathematical_consistency", {})
            if math_results.get("overall_accuracy_rate", 100) < 85:
                action_items.append({
                    "priority": 3,
                    "action": "Improve Mathematical Consistency",
                    "description": "Fix calculation errors and implement validation rules",
                    "timeline": "2 weeks",
                    "owner": "Data Quality Team",
                    "success_criteria": ">95% mathematical consistency rate"
                })

        # Data quality monitoring
        action_items.append({
            "priority": 4,
            "action": "Implement Data Quality Monitoring",
            "description": "Set up automated data quality checks and alerting",
            "timeline": "3 weeks",
            "owner": "Data Platform Team",
            "success_criteria": "Automated quality monitoring operational"
        })

        # Re-testing and validation
        action_items.append({
            "priority": 5,
            "action": "Comprehensive Re-testing",
            "description": "Re-run complete test suite after fixes are implemented",
            "timeline": "1 week",
            "owner": "QA Team",
            "success_criteria": "All test phases pass with <5% warning rate"
        })

        # Timeline summary
        immediate_actions = [item for item in action_items if item["priority"] <= 2]
        short_term_actions = [item for item in action_items if 3 <= item["priority"] <= 4]

        self.comprehensive_report["action_plan"] = {
            "action_items": action_items,
            "timeline_summary": {
                "immediate_actions_1_2_weeks": len(immediate_actions),
                "short_term_actions_2_4_weeks": len(short_term_actions),
                "estimated_total_timeline": "4-6 weeks for full resolution"
            },
            "go_live_recommendation": "HOLD" if total_critical > 0 else "PROCEED_WITH_MONITORING"
        }

    def generate_appendices(self) -> None:
        """Generate appendices with detailed test data and technical information"""

        appendices = {
            "test_methodology": {
                "phase1_methodology": "Source data verification using file system validation and CSV parsing",
                "phase2_methodology": "Database integrity testing using Supabase API and statistical sampling",
                "phase3_methodology": "Business logic validation using NHS performance standards and mathematical verification"
            },
            "technical_specifications": {
                "data_sources": [
                    "unified_monthly_data_enhanced.csv (1,816 records, 271 columns)",
                    "Supabase trust_metrics table",
                    "Raw NHS England data files (A&E, RTT, Diagnostics)"
                ],
                "test_sample_sizes": {
                    "transformation_accuracy": "25 randomly selected records",
                    "jsonb_structure": "50 database records",
                    "business_rules": "Full dataset validation"
                }
            },
            "data_dictionary": {
                "key_fields": {
                    "trust_code": "3-character NHS trust identifier",
                    "period": "YYYY-MM-DD format reporting period",
                    "rtt_data": "JSONB field containing RTT performance metrics",
                    "ae_data": "JSONB field containing A&E performance metrics"
                }
            }
        }

        # Add statistical summaries
        if "phase3" in self.phase_results:
            standards_results = self.phase_results["phase3"]["results"].get("nhs_performance_standards", {})
            if "compliance_summary" in standards_results:
                compliance = standards_results["compliance_summary"]
                appendices["performance_benchmarks"] = {
                    "rtt_18_week_target": "92% within 18 weeks",
                    "rtt_current_compliance": f"{compliance.get('rtt_compliance_rate', 0)}%",
                    "ae_4_hour_target": "95% within 4 hours",
                    "ae_current_compliance": f"{compliance.get('ae_compliance_rate', 0)}%"
                }

        self.comprehensive_report["appendices"] = appendices

    def save_report(self, output_file: Optional[str] = None) -> str:
        """Save the comprehensive report to file"""
        if not output_file:
            timestamp = self.report_timestamp.strftime("%Y%m%d_%H%M%S")
            output_file = f"comprehensive_data_integrity_report_{timestamp}.json"

        with open(output_file, 'w') as f:
            json.dump(self.comprehensive_report, f, indent=2, default=str)

        return output_file

    def generate_markdown_summary(self, output_file: Optional[str] = None) -> str:
        """Generate a markdown summary report for easy reading"""
        if not output_file:
            timestamp = self.report_timestamp.strftime("%Y%m%d_%H%M%S")
            output_file = f"NHS_Data_Integrity_Report_{timestamp}.md"

        exec_summary = self.comprehensive_report["executive_summary"]
        quality_assessment = self.comprehensive_report["data_quality_assessment"]
        risk_analysis = self.comprehensive_report["risk_analysis"]

        markdown_content = f"""# NHS Data Analytics - Data Integrity Assessment Report

**Report Generated:** {exec_summary['assessment_date']}
**Overall System Status:** {exec_summary['overall_system_status']}
**Data Confidence Level:** {exec_summary['data_confidence_level']}

## Executive Summary

### Overall Assessment
- **Data Quality Score:** {quality_assessment['overall_quality_score']}/100 ({quality_assessment['overall_quality_grade']})
- **Risk Level:** {risk_analysis['overall_risk_level']}
- **Go-Live Recommendation:** {exec_summary['recommended_go_live_status']}

### Records Assessed
- **Source CSV:** {exec_summary['total_records_assessed']['source_csv']:,} records
- **Database:** {exec_summary['total_records_assessed']['database']:,} records

### Issue Summary
- **Critical Issues:** {exec_summary['issue_summary']['critical_issues']}
- **Warning Issues:** {exec_summary['issue_summary']['warning_issues']}
- **Total Issues:** {exec_summary['issue_summary']['total_issues']}

## Key Findings

"""

        for finding in exec_summary.get("key_findings", []):
            markdown_content += f"- {finding}\n"

        markdown_content += f"""

## Data Quality Assessment by Dimension

"""

        for dim_name, dim_data in quality_assessment["quality_dimensions"].items():
            markdown_content += f"### {dim_name.title()}\n"
            markdown_content += f"**Score:** {dim_data['score']}/100\n\n"
            for finding in dim_data["findings"]:
                markdown_content += f"- {finding}\n"
            markdown_content += "\n"

        markdown_content += f"""## Risk Analysis

**Overall Risk Level:** {risk_analysis['overall_risk_level']}

### Risk Summary
- High Risks: {risk_analysis['risk_summary']['high_risks']}
- Medium Risks: {risk_analysis['risk_summary']['medium_risks']}
- Low Risks: {risk_analysis['risk_summary']['low_risks']}

### Identified Risks

"""

        for risk in risk_analysis.get("identified_risks", []):
            markdown_content += f"#### {risk['risk_category']} ({risk['risk_level']} Risk)\n"
            markdown_content += f"**Description:** {risk['description']}\n\n"
            markdown_content += f"**Impact:** {risk['impact']}\n\n"
            markdown_content += f"**Mitigation:** {risk['mitigation']}\n\n"

        # Add action plan
        action_plan = self.comprehensive_report["action_plan"]
        markdown_content += f"""## Recommended Action Plan

**Estimated Timeline:** {action_plan['timeline_summary']['estimated_total_timeline']}

### Priority Actions

"""

        for action in action_plan.get("action_items", []):
            markdown_content += f"{action['priority']}. **{action['action']}** ({action['timeline']})\n"
            markdown_content += f"   - {action['description']}\n"
            markdown_content += f"   - Owner: {action['owner']}\n"
            markdown_content += f"   - Success Criteria: {action['success_criteria']}\n\n"

        markdown_content += f"""## Conclusion

{risk_analysis['risk_recommendation']}

**Next Steps:**
1. Review this report with stakeholders
2. Prioritize and assign action items
3. Execute fixes according to recommended timeline
4. Re-run integrity tests after fixes
5. Proceed with deployment based on test results

---
*Report generated by NHS Data Integrity Testing Suite*
"""

        with open(output_file, 'w') as f:
            f.write(markdown_content)

        return output_file

def main():
    """Main execution function"""
    print("📊 NHS Data Analytics - Comprehensive Report Generator")
    print("="*60)

    # Generate comprehensive report
    generator = ComprehensiveReportGenerator()

    if not generator.phase_results:
        print("❌ Error: No test phase results found")
        print("Please run the individual phase tests first:")
        print("  - python3 phase1_source_data_verification.py")
        print("  - python3 phase2_database_migration_integrity.py")
        print("  - python3 phase3_business_logic_validation.py")
        sys.exit(1)

    # Generate the report
    comprehensive_report = generator.generate_comprehensive_report()

    # Save reports
    json_file = generator.save_report()
    markdown_file = generator.generate_markdown_summary()

    # Print summary
    print("\n" + "="*60)
    print("📋 COMPREHENSIVE REPORT SUMMARY")
    print("="*60)

    exec_summary = comprehensive_report["executive_summary"]
    quality_assessment = comprehensive_report["data_quality_assessment"]

    status_emoji = "✅" if exec_summary["overall_system_status"] == "GOOD" else ("⚠️" if exec_summary["overall_system_status"] == "NEEDS_ATTENTION" else "❌")

    print(f"{status_emoji} Overall System Status: {exec_summary['overall_system_status']}")
    print(f"📊 Data Quality Score: {quality_assessment['overall_quality_score']}/100 ({quality_assessment['overall_quality_grade']})")
    print(f"🎯 Data Confidence Level: {exec_summary['data_confidence_level']}")
    print(f"📋 Total Issues: {exec_summary['issue_summary']['total_issues']} (🔴 {exec_summary['issue_summary']['critical_issues']} Critical, 🟡 {exec_summary['issue_summary']['warning_issues']} Warnings)")
    print(f"🚀 Go-Live Recommendation: {exec_summary['recommended_go_live_status']}")

    print(f"\n📄 Reports Generated:")
    print(f"   • Detailed JSON Report: {json_file}")
    print(f"   • Executive Summary: {markdown_file}")

    print(f"\n💡 Next Steps:")
    if exec_summary["immediate_actions_required"]:
        print("   1. Address critical issues immediately")
        print("   2. Review detailed findings and action plan")
        print("   3. Re-run tests after fixes")
    else:
        print("   1. Review findings and recommendations")
        print("   2. Implement suggested improvements")
        print("   3. Proceed with deployment monitoring")

    return exec_summary["overall_system_status"]

if __name__ == "__main__":
    status = main()
    sys.exit(0 if status in ["GOOD", "NEEDS_ATTENTION"] else 1)
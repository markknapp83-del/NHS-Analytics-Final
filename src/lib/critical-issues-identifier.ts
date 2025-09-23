import { NHSTrustData } from '@/../types/nhs-data';
import { calculateCriticalDiagnosticServices } from './critical-diagnostics-calculator';
import { Clock, AlertTriangle, Activity, Building2 } from 'lucide-react';

export interface CriticalIssue {
  category: 'RTT' | 'Diagnostic' | 'A&E' | 'Capacity';
  severity: 'Critical' | 'High' | 'Moderate';
  title: string;
  description: string;
  metric: string;
  value: number;
  target?: number;
  icon: React.ComponentType<{ className?: string }>;
}

export function identifyAllCriticalIssues(trustData: NHSTrustData): CriticalIssue[] {
  const issues: CriticalIssue[] = [];

  // Specialty RTT Performance Rankings (Critical Issues)
  const specialties = [
    { key: 'general_surgery', name: 'General Surgery' },
    { key: 'urology', name: 'Urology' },
    { key: 'trauma_orthopaedics', name: 'Trauma & Orthopaedics' },
    { key: 'ent', name: 'ENT' },
    { key: 'ophthalmology', name: 'Ophthalmology' },
    { key: 'oral_surgery', name: 'Oral Surgery' },
    { key: 'restorative_dentistry', name: 'Restorative Dentistry' },
    { key: 'pediatric_surgery', name: 'Pediatric Surgery' },
    { key: 'cardiothoracic_surgery', name: 'Cardiothoracic Surgery' },
    { key: 'general_medicine', name: 'General Medicine' },
    { key: 'gastroenterology', name: 'Gastroenterology' },
    { key: 'cardiology', name: 'Cardiology' },
    { key: 'dermatology', name: 'Dermatology' },
    { key: 'respiratory_medicine', name: 'Respiratory Medicine' },
    { key: 'neurology', name: 'Neurology' },
    { key: 'rheumatology', name: 'Rheumatology' },
    { key: 'geriatric_medicine', name: 'Geriatric Medicine' },
    { key: 'gynecology', name: 'Gynecology' },
    { key: 'other_surgery', name: 'Other Surgery' },
    { key: 'medical_oncology', name: 'Medical Oncology' }
  ];

  specialties.forEach(specialty => {
    const complianceKey = `rtt_${specialty.key}_percent_within_18_weeks` as keyof NHSTrustData;
    const longWaitersKey = `rtt_${specialty.key}_total_52_plus_weeks` as keyof NHSTrustData;
    const totalPathwaysKey = `rtt_${specialty.key}_total_incomplete_pathways` as keyof NHSTrustData;

    const compliance = trustData[complianceKey] as number;
    const longWaiters = trustData[longWaitersKey] as number;
    const totalPathways = trustData[totalPathwaysKey] as number;

    // Convert decimal compliance to percentage (0.43 -> 43%)
    const compliancePercent = compliance !== undefined ? compliance * 100 : undefined;

    // Critical specialty performance issues
    if (compliancePercent !== undefined && compliancePercent < 40 && totalPathways > 50) {
      issues.push({
        category: 'RTT',
        severity: 'Critical',
        title: `${specialty.name} Critical Performance`,
        description: `Only ${compliancePercent.toFixed(1)}% of patients treated within 18 weeks`,
        metric: 'RTT Compliance',
        value: parseFloat(compliancePercent.toFixed(1)),
        target: 92,
        icon: AlertTriangle
      });
    } else if (compliancePercent !== undefined && compliancePercent < 60 && totalPathways > 100) {
      issues.push({
        category: 'RTT',
        severity: 'High',
        title: `${specialty.name} Poor Performance`,
        description: `${compliancePercent.toFixed(1)}% RTT compliance significantly below target`,
        metric: 'RTT Compliance',
        value: parseFloat(compliancePercent.toFixed(1)),
        target: 92,
        icon: Clock
      });
    }

    // Critical long waiters by specialty
    if (longWaiters !== undefined && longWaiters > 20 && totalPathways > 50) {
      issues.push({
        category: 'RTT',
        severity: longWaiters > 100 ? 'Critical' : 'High',
        title: `${specialty.name} Long Waiters`,
        description: `${longWaiters} patients waiting over 52 weeks`,
        metric: '52+ week waiters',
        value: longWaiters,
        target: 0,
        icon: AlertTriangle
      });
    }
  });

  // Trust-wide RTT Critical Issues (only if very severe)
  const rttCompliance = trustData.trust_total_percent_within_18_weeks;
  const rttCompliancePercent = rttCompliance !== undefined ? rttCompliance * 100 : undefined;

  if (rttCompliancePercent && rttCompliancePercent < 40) {
    issues.push({
      category: 'RTT',
      severity: 'Critical',
      title: 'Trust-wide RTT Failure',
      description: `Overall trust performance critically low at ${rttCompliancePercent.toFixed(1)}%`,
      metric: 'Overall Compliance',
      value: parseFloat(rttCompliancePercent.toFixed(1)),
      target: 92,
      icon: AlertTriangle
    });
  }

  // Trust-wide 52+ week waiters (only if very severe)
  const longWaiters = trustData.trust_total_total_52_plus_weeks;
  if (longWaiters && longWaiters > 500) {
    issues.push({
      category: 'RTT',
      severity: 'Critical',
      title: 'Excessive Trust-wide Long Waiters',
      description: `${longWaiters.toLocaleString()} patients waiting over 52 weeks across all specialties`,
      metric: '52+ week waiters',
      value: longWaiters,
      target: 0,
      icon: AlertTriangle
    });
  }

  // Diagnostic Critical Issues
  const criticalDiagnostics = calculateCriticalDiagnosticServices(trustData);
  criticalDiagnostics.services.forEach(service => {
    issues.push({
      category: 'Diagnostic',
      severity: service.breachRate > 25 ? 'Critical' : 'High',
      title: `${service.name} High Breach Rate`,
      description: `${service.breachRate.toFixed(1)}% of patients waiting over 6 weeks`,
      metric: 'Breach Rate',
      value: parseFloat(service.breachRate.toFixed(1)),
      target: 15,
      icon: Activity
    });
  });

  // A&E Critical Issues
  const aePerformance = trustData.ae_4hr_performance_pct;
  if (aePerformance && aePerformance < 70) {
    issues.push({
      category: 'A&E',
      severity: aePerformance < 50 ? 'Critical' : 'High',
      title: 'A&E 4-Hour Performance Critical',
      description: 'Emergency department performance significantly below target',
      metric: 'Performance',
      value: aePerformance,
      target: 95,
      icon: Activity
    });
  }

  // 12-hour wait issues
  const twelveHourWaits = trustData.ae_12hr_wait_admissions;
  if (twelveHourWaits && twelveHourWaits > 50) {
    issues.push({
      category: 'A&E',
      severity: twelveHourWaits > 100 ? 'Critical' : 'High',
      title: '12-Hour Emergency Waits',
      description: 'Excessive 12-hour waits indicate severe capacity issues',
      metric: '12-hour waits',
      value: twelveHourWaits,
      icon: Clock
    });
  }

  // Capacity Critical Issues
  const virtualWardOccupancy = trustData.virtual_ward_occupancy_rate;
  if (virtualWardOccupancy && virtualWardOccupancy > 95) {
    issues.push({
      category: 'Capacity',
      severity: 'High',
      title: 'Virtual Ward Over-Capacity',
      description: 'Virtual ward utilization exceeding safe operational limits',
      metric: 'Occupancy',
      value: virtualWardOccupancy,
      target: 85,
      icon: Building2
    });
  }

  // Sort by severity (Critical first, then High, then Moderate)
  return issues.sort((a, b) => {
    const severityOrder = { Critical: 0, High: 1, Moderate: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
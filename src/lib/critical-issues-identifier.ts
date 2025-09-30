import { TrustMetrics } from '@/types/database';
import { calculateCriticalDiagnosticServices } from './critical-diagnostics-calculator';
import { Clock, AlertTriangle, Activity, Building2, Users } from 'lucide-react';

export interface CriticalIssue {
  category: 'RTT' | 'Diagnostic' | 'A&E' | 'Capacity' | 'Community Health';
  severity: 'Critical' | 'High' | 'Moderate';
  title: string;
  description: string;
  metric: string;
  value: number;
  target?: number;
  icon: React.ComponentType<{ className?: string }>;
}

export function identifyAllCriticalIssues(trustData: TrustMetrics): CriticalIssue[] {
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
    const specialtyData = trustData.rtt_data?.specialties?.[specialty.key];

    if (!specialtyData) return;

    const compliance = specialtyData.percent_within_18_weeks;
    const longWaiters = specialtyData.total_52_plus_weeks;
    const totalPathways = specialtyData.total_incomplete_pathways;

    // Convert decimal compliance to percentage (0.43 -> 43%)
    const compliancePercent = compliance !== undefined ? compliance * 100 : undefined;

    // Critical specialty performance issues - aligned with specialty analysis thresholds
    if (compliancePercent !== undefined && compliancePercent < 50 && totalPathways > 50) {
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
    } else if (compliancePercent !== undefined && compliancePercent < 75 && totalPathways > 100) {
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
    if (longWaiters !== undefined && longWaiters > 10 && totalPathways > 50) {
      issues.push({
        category: 'RTT',
        severity: longWaiters > 50 ? 'Critical' : 'High',
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
  const trustTotalData = trustData.rtt_data?.trust_total;
  const rttCompliance = trustTotalData?.percent_within_18_weeks;
  const rttCompliancePercent = rttCompliance !== undefined ? rttCompliance * 100 : undefined;

  if (rttCompliancePercent && rttCompliancePercent < 50) {
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
  const longWaiters = trustTotalData?.total_52_plus_weeks;
  if (longWaiters && longWaiters > 200) {
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
  const aeData = trustData.ae_data;
  const aePerformance = aeData?.four_hour_performance_pct;
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
  const twelveHourWaits = aeData?.twelve_hour_wait_admissions;
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
  const capacityData = trustData.capacity_data;
  const virtualWardOccupancy = capacityData?.virtual_ward_occupancy_rate;
  if (virtualWardOccupancy && virtualWardOccupancy > 0.95) { // Convert to decimal comparison
    issues.push({
      category: 'Capacity',
      severity: 'High',
      title: 'Virtual Ward Over-Capacity',
      description: 'Virtual ward utilization exceeding safe operational limits',
      metric: 'Occupancy',
      value: virtualWardOccupancy * 100, // Convert to percentage for display
      target: 85,
      icon: Building2
    });
  }

  // Community Health Critical Issues
  const communityData = trustData.community_health_data;
  if (communityData && communityData.adult_services && communityData.cyp_services) {
    // Check for 52+ week breaches across all services
    const servicesWithBreaches: string[] = [];
    let totalBreaches = 0;

    // Check adult services
    Object.entries(communityData.adult_services).forEach(([serviceName, data]) => {
      if (data.wait_52_plus_weeks > 0) {
        servicesWithBreaches.push(serviceName);
        totalBreaches += data.wait_52_plus_weeks;
      }
    });

    // Check CYP services
    Object.entries(communityData.cyp_services).forEach(([serviceName, data]) => {
      if (data.wait_52_plus_weeks > 0) {
        servicesWithBreaches.push(`${serviceName} (CYP)`);
        totalBreaches += data.wait_52_plus_weeks;
      }
    });

    // Add critical issues for 52+ week breaches
    if (totalBreaches > 0) {
      issues.push({
        category: 'Community Health',
        severity: totalBreaches > 100 ? 'Critical' : 'High',
        title: '52+ Week Community Service Waiters',
        description: `${totalBreaches} patients waiting over 52 weeks across ${servicesWithBreaches.length} services`,
        metric: '52+ week waiters',
        value: totalBreaches,
        target: 0,
        icon: AlertTriangle
      });
    }

    // Check for high volume long waiters (>200 patients waiting 18+ weeks)
    Object.entries(communityData.adult_services).forEach(([serviceName, data]) => {
      const longWaiters = data.wait_18_52_weeks + data.wait_52_plus_weeks;
      if (longWaiters > 200 && data.total_waiting > 500) {
        issues.push({
          category: 'Community Health',
          severity: longWaiters > 500 ? 'Critical' : 'High',
          title: `${serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Long Waits`,
          description: `${longWaiters} patients waiting over 18 weeks`,
          metric: '18+ week waiters',
          value: longWaiters,
          icon: Clock
        });
      }
    });

    // Check CYP services for high long waiters (lower threshold due to smaller volumes)
    Object.entries(communityData.cyp_services).forEach(([serviceName, data]) => {
      const longWaiters = data.wait_18_52_weeks + data.wait_52_plus_weeks;
      if (longWaiters > 50 && data.total_waiting > 100) {
        issues.push({
          category: 'Community Health',
          severity: longWaiters > 100 ? 'Critical' : 'High',
          title: `${serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (CYP) Long Waits`,
          description: `${longWaiters} children waiting over 18 weeks`,
          metric: '18+ week waiters',
          value: longWaiters,
          icon: Users
        });
      }
    });
  }

  // Sort by severity (Critical first, then High, then Moderate)
  return issues.sort((a, b) => {
    const severityOrder = { Critical: 0, High: 1, Moderate: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
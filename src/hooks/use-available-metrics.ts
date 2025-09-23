import { useMemo } from 'react';

interface AvailableMetric {
  key: string;
  displayName: string;
  category: string;
  format: 'number' | 'percentage' | 'currency';
}

export function useAvailableMetrics(): AvailableMetric[] {
  const metrics = useMemo((): AvailableMetric[] => [
    // Trust-level RTT Metrics
    {
      key: 'trust_total_percent_within_18_weeks',
      displayName: 'RTT 18-week Compliance (%)',
      category: 'RTT Performance',
      format: 'percentage'
    },
    {
      key: 'trust_total_total_incomplete_pathways',
      displayName: 'Total Waiting List',
      category: 'RTT Performance',
      format: 'number'
    },
    {
      key: 'trust_total_total_52_plus_weeks',
      displayName: '52+ Week Waiters',
      category: 'RTT Performance',
      format: 'number'
    },
    {
      key: 'trust_total_total_65_plus_weeks',
      displayName: '65+ Week Waiters',
      category: 'RTT Performance',
      format: 'number'
    },
    {
      key: 'trust_total_total_78_plus_weeks',
      displayName: '78+ Week Waiters',
      category: 'RTT Performance',
      format: 'number'
    },
    {
      key: 'trust_total_median_wait_weeks',
      displayName: 'Median Wait Time (weeks)',
      category: 'RTT Performance',
      format: 'number'
    },

    // A&E Metrics
    {
      key: 'ae_4hr_performance_pct',
      displayName: 'A&E 4-hour Performance (%)',
      category: 'A&E Performance',
      format: 'percentage'
    },
    {
      key: 'ae_attendances_total',
      displayName: 'Total A&E Attendances',
      category: 'A&E Performance',
      format: 'number'
    },
    {
      key: 'ae_over_4hrs_total',
      displayName: 'A&E Over 4 Hours',
      category: 'A&E Performance',
      format: 'number'
    },
    {
      key: 'ae_emergency_admissions_total',
      displayName: 'Emergency Admissions',
      category: 'A&E Performance',
      format: 'number'
    },
    {
      key: 'ae_12hr_wait_admissions',
      displayName: '12+ Hour Wait Admissions',
      category: 'A&E Performance',
      format: 'number'
    },

    // Specialty RTT (top specialties)
    {
      key: 'rtt_general_surgery_percent_within_18_weeks',
      displayName: 'General Surgery RTT 18-week (%)',
      category: 'Specialty RTT',
      format: 'percentage'
    },
    {
      key: 'rtt_urology_percent_within_18_weeks',
      displayName: 'Urology RTT 18-week (%)',
      category: 'Specialty RTT',
      format: 'percentage'
    },
    {
      key: 'rtt_trauma_orthopaedics_percent_within_18_weeks',
      displayName: 'Trauma & Orthopaedics RTT 18-week (%)',
      category: 'Specialty RTT',
      format: 'percentage'
    },
    {
      key: 'rtt_ent_percent_within_18_weeks',
      displayName: 'ENT RTT 18-week (%)',
      category: 'Specialty RTT',
      format: 'percentage'
    },
    {
      key: 'rtt_ophthalmology_percent_within_18_weeks',
      displayName: 'Ophthalmology RTT 18-week (%)',
      category: 'Specialty RTT',
      format: 'percentage'
    },

    // Diagnostics (key types)
    {
      key: 'diag_mri_total_waiting',
      displayName: 'MRI Total Waiting',
      category: 'Diagnostics',
      format: 'number'
    },
    {
      key: 'diag_mri_6week_breaches',
      displayName: 'MRI 6+ Week Breaches',
      category: 'Diagnostics',
      format: 'number'
    },
    {
      key: 'diag_ct_total_waiting',
      displayName: 'CT Total Waiting',
      category: 'Diagnostics',
      format: 'number'
    },
    {
      key: 'diag_ct_6week_breaches',
      displayName: 'CT 6+ Week Breaches',
      category: 'Diagnostics',
      format: 'number'
    },
    {
      key: 'diag_ultrasound_total_waiting',
      displayName: 'Ultrasound Total Waiting',
      category: 'Diagnostics',
      format: 'number'
    },
    {
      key: 'diag_ultrasound_6week_breaches',
      displayName: 'Ultrasound 6+ Week Breaches',
      category: 'Diagnostics',
      format: 'number'
    },

    // Capacity
    {
      key: 'virtual_ward_capacity',
      displayName: 'Virtual Ward Capacity',
      category: 'Capacity',
      format: 'number'
    },
    {
      key: 'virtual_ward_occupancy_rate',
      displayName: 'Virtual Ward Occupancy Rate (%)',
      category: 'Capacity',
      format: 'percentage'
    },
    {
      key: 'avg_daily_discharges',
      displayName: 'Average Daily Discharges',
      category: 'Capacity',
      format: 'number'
    },

    // Time-based
    {
      key: 'period',
      displayName: 'Time Period',
      category: 'Time',
      format: 'number'
    }
  ], []);

  return metrics;
}
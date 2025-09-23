export interface NHSTrustData {
  // Basic Information
  trust_code: string;
  trust_name: string;
  period: string; // YYYY-MM-DD format
  icb_code: string;
  icb_name: string;

  // RTT Metrics (Trust Level)
  trust_total_percent_within_18_weeks: number;
  trust_total_total_incomplete_pathways: number;
  trust_total_total_within_18_weeks: number;
  trust_total_total_52_plus_weeks: number;
  trust_total_total_65_plus_weeks: number;
  trust_total_total_78_plus_weeks: number;
  trust_total_median_wait_weeks: number;

  // A&E Metrics
  ae_4hr_performance_pct: number;
  ae_attendances_total: number;
  ae_over_4hrs_total: number;
  ae_emergency_admissions_total: number;
  ae_12hr_wait_admissions: number;

  // Specialty RTT (examples - 20 specialties × 8 metrics = 160 columns)
  rtt_general_surgery_percent_within_18_weeks: number;
  rtt_general_surgery_total_incomplete_pathways: number;
  rtt_general_surgery_total_52_plus_weeks: number;
  rtt_general_surgery_median_wait_weeks: number;

  rtt_urology_percent_within_18_weeks: number;
  rtt_urology_total_incomplete_pathways: number;
  rtt_urology_total_52_plus_weeks: number;
  rtt_urology_median_wait_weeks: number;

  rtt_trauma_orthopaedics_percent_within_18_weeks: number;
  rtt_trauma_orthopaedics_total_incomplete_pathways: number;
  rtt_trauma_orthopaedics_total_52_plus_weeks: number;
  rtt_trauma_orthopaedics_median_wait_weeks: number;

  rtt_ent_percent_within_18_weeks: number;
  rtt_ent_total_incomplete_pathways: number;
  rtt_ent_total_52_plus_weeks: number;
  rtt_ent_median_wait_weeks: number;

  rtt_ophthalmology_percent_within_18_weeks: number;
  rtt_ophthalmology_total_incomplete_pathways: number;
  rtt_ophthalmology_total_52_plus_weeks: number;
  rtt_ophthalmology_median_wait_weeks: number;

  // Diagnostics (examples - 15 types × 6 metrics = 90 columns)
  diag_mri_total_waiting: number;
  diag_mri_6week_breaches: number;
  diag_mri_13week_breaches: number;

  diag_ct_total_waiting: number;
  diag_ct_6week_breaches: number;
  diag_ct_13week_breaches: number;

  diag_ultrasound_total_waiting: number;
  diag_ultrasound_6week_breaches: number;
  diag_ultrasound_13week_breaches: number;

  diag_gastroscopy_total_waiting: number;
  diag_gastroscopy_6week_breaches: number;
  diag_gastroscopy_13week_breaches: number;

  diag_echocardiography_total_waiting: number;
  diag_echocardiography_6week_breaches: number;
  diag_echocardiography_13week_breaches: number;

  // Capacity
  virtual_ward_capacity?: number;
  virtual_ward_occupancy_rate?: number;
  avg_daily_discharges?: number;
}

export interface TrustInfo {
  code: string;
  name: string;
  icb: string;
}

export interface PerformanceMetric {
  title: string;
  value: number;
  previousValue?: number;
  target?: number;
  format: 'percentage' | 'number';
  trend?: string;
  description: string;
}
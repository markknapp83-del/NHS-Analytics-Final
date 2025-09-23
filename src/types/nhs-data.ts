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
  trust_total_total_52_plus_weeks: number;
  trust_total_total_65_plus_weeks: number;
  trust_total_total_78_plus_weeks: number;
  trust_total_median_wait_weeks: number;
  trust_total_total_within_18_weeks: number;
  trust_total_total_active_pathways: number;

  // A&E Metrics
  ae_4hr_performance_pct: number;
  ae_attendances_total: number;
  ae_over_4hrs_total: number;
  ae_emergency_admissions_total: number;
  ae_12hr_wait_admissions: number;

  // RTT Specialty Metrics - General Surgery
  rtt_general_surgery_percent_within_18_weeks: number;
  rtt_general_surgery_total_within_18_weeks: number;
  rtt_general_surgery_total_incomplete_pathways: number;
  rtt_general_surgery_total_52_plus_weeks: number;
  rtt_general_surgery_total_65_plus_weeks: number;
  rtt_general_surgery_total_78_plus_weeks: number;
  rtt_general_surgery_median_wait_weeks: number;
  rtt_general_surgery_total_active_pathways: number;

  // RTT Specialty Metrics - Urology
  rtt_urology_percent_within_18_weeks: number;
  rtt_urology_total_within_18_weeks: number;
  rtt_urology_total_incomplete_pathways: number;
  rtt_urology_total_52_plus_weeks: number;
  rtt_urology_total_65_plus_weeks: number;
  rtt_urology_total_78_plus_weeks: number;
  rtt_urology_median_wait_weeks: number;
  rtt_urology_total_active_pathways: number;

  // RTT Specialty Metrics - Trauma & Orthopaedics
  rtt_trauma_orthopaedics_percent_within_18_weeks: number;
  rtt_trauma_orthopaedics_total_within_18_weeks: number;
  rtt_trauma_orthopaedics_total_incomplete_pathways: number;
  rtt_trauma_orthopaedics_total_52_plus_weeks: number;
  rtt_trauma_orthopaedics_total_65_plus_weeks: number;
  rtt_trauma_orthopaedics_total_78_plus_weeks: number;
  rtt_trauma_orthopaedics_median_wait_weeks: number;
  rtt_trauma_orthopaedics_total_active_pathways: number;

  // RTT Specialty Metrics - ENT
  rtt_ent_percent_within_18_weeks: number;
  rtt_ent_total_within_18_weeks: number;
  rtt_ent_total_incomplete_pathways: number;
  rtt_ent_total_52_plus_weeks: number;
  rtt_ent_total_65_plus_weeks: number;
  rtt_ent_total_78_plus_weeks: number;
  rtt_ent_median_wait_weeks: number;
  rtt_ent_total_active_pathways: number;

  // RTT Specialty Metrics - Ophthalmology
  rtt_ophthalmology_percent_within_18_weeks: number;
  rtt_ophthalmology_total_within_18_weeks: number;
  rtt_ophthalmology_total_incomplete_pathways: number;
  rtt_ophthalmology_total_52_plus_weeks: number;
  rtt_ophthalmology_total_65_plus_weeks: number;
  rtt_ophthalmology_total_78_plus_weeks: number;
  rtt_ophthalmology_median_wait_weeks: number;
  rtt_ophthalmology_total_active_pathways: number;

  // Diagnostics (15 types × 6 metrics = 90 columns)
  diag_mri_total_waiting: number;
  diag_mri_6week_breaches: number;
  diag_mri_13week_breaches: number;
  diag_mri_planned_procedures: number;
  diag_mri_procedures_performed: number;
  diag_mri_median_wait_weeks: number;

  diag_ct_total_waiting: number;
  diag_ct_6week_breaches: number;
  diag_ct_13week_breaches: number;
  diag_ct_planned_procedures: number;
  diag_ct_procedures_performed: number;
  diag_ct_median_wait_weeks: number;

  diag_ultrasound_total_waiting: number;
  diag_ultrasound_6week_breaches: number;
  diag_ultrasound_13week_breaches: number;
  diag_ultrasound_planned_procedures: number;
  diag_ultrasound_procedures_performed: number;
  diag_ultrasound_median_wait_weeks: number;

  // Capacity
  virtual_ward_capacity?: number;
  virtual_ward_occupancy_rate?: number;
  avg_daily_discharges?: number;
}

export interface TrustSummary {
  code: string;
  name: string;
  icb: string;
  latestPeriod: string;
  recordCount: number;
}

export interface SpecialtyData {
  key: string;
  name: string;
  code: string;
  percentWithin18Weeks: number;
  totalIncompletePathways: number;
  total52PlusWeeks: number;
  medianWaitWeeks: number;
}

export interface DiagnosticData {
  type: string;
  name: string;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
  breachRate: number;
  medianWaitWeeks: number;
}

export interface DiagnosticService {
  type: string;
  name: string;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
  breachRate: number;
  plannedTests: number;
  unscheduledTests: number;
}

export interface PerformanceMetric {
  value: number;
  target?: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  performance: 'excellent' | 'good' | 'concern' | 'critical';
}

export interface InteractiveSpecialtyData {
  key: string;
  name: string;
  code: string;
  percentage: number;
  within18weeks: number;
  total: number;
}

export interface BreachData {
  week52Plus: number;
  week65Plus: number;
  week78Plus: number;
}

export interface PerformanceLevel {
  label: 'Excellent' | 'Good' | 'Concern' | 'Critical';
  variant: 'default' | 'secondary' | 'destructive';
  color: string;
}

export interface BreachLevel {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  textColor: string;
}
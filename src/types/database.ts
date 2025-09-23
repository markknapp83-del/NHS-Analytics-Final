export interface RTTSpecialtyData {
  percent_within_18_weeks: number;
  total_incomplete_pathways: number;
  total_52_plus_weeks: number;
  total_65_plus_weeks: number;
  total_78_plus_weeks: number;
  median_wait_weeks: number;
  total_within_18_weeks: number;
  total_active_pathways: number;
}

export interface RTTData {
  trust_total: RTTSpecialtyData;
  specialties: {
    general_surgery: RTTSpecialtyData;
    urology: RTTSpecialtyData;
    trauma_orthopaedics: RTTSpecialtyData;
    ent: RTTSpecialtyData;
    ophthalmology: RTTSpecialtyData;
    [specialty: string]: RTTSpecialtyData;
  };
}

export interface AEData {
  four_hour_performance_pct: number;
  total_attendances: number;
  over_four_hours_total: number;
  emergency_admissions_total: number;
  twelve_hour_wait_admissions: number;
}

export interface DiagnosticTestData {
  total_waiting: number;
  six_week_breaches: number;
  thirteen_week_breaches: number;
  planned_procedures: number;
  procedures_performed: number;
  median_wait_weeks: number;
}

export interface DiagnosticsData {
  mri_scans: DiagnosticTestData;
  ct_scans: DiagnosticTestData;
  ultrasound: DiagnosticTestData;
  [testType: string]: DiagnosticTestData;
}

export interface CapacityData {
  virtual_ward_capacity: number;
  virtual_ward_occupancy_rate: number;
  avg_daily_discharges: number;
}

export interface TrustMetrics {
  id: string;
  trust_code: string;
  trust_name: string;
  period: string;
  icb_code: string | null;
  icb_name: string | null;
  data_type: string;
  rtt_data: RTTData;
  ae_data: AEData;
  diagnostics_data: DiagnosticsData;
  capacity_data: CapacityData;
  created_at: string;
  updated_at: string;
}

export interface Trust {
  code: string;
  name: string;
  icb_code: string | null;
  icb_name: string | null;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ComparisonData {
  trusts: Trust[];
  metrics: {
    [trustCode: string]: {
      [metric: string]: number | null;
    };
  };
  benchmarks: {
    [metric: string]: {
      average: number;
      median: number;
      best: number;
      worst: number;
    };
  };
}

export interface BenchmarkData {
  icb_code: string;
  icb_name: string;
  trust_count: number;
  metrics: {
    [metric: string]: {
      average: number;
      median: number;
      percentile_25: number;
      percentile_75: number;
      best_performing_trust: {
        code: string;
        name: string;
        value: number;
      };
    };
  };
}

export interface TrendData {
  trust_code: string;
  metric: string;
  data_points: Array<{
    period: string;
    value: number;
    target?: number;
  }>;
  trend_analysis: {
    direction: 'improving' | 'declining' | 'stable';
    rate_of_change: number;
    correlation_coefficient: number;
    seasonal_pattern: boolean;
  };
}

export interface Database {
  public: {
    Tables: {
      trust_metrics: {
        Row: TrustMetrics;
        Insert: Omit<TrustMetrics, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TrustMetrics, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
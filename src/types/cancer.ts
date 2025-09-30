export interface CancerPerformanceMetrics {
  total_treated: number;
  within_standard: number;
  breaches: number;
  performance_pct: number;
}

export interface CancerRouteData extends CancerPerformanceMetrics {
  by_treatment_modality?: Record<string, CancerPerformanceMetrics>;
}

export interface CancerTypeData extends CancerPerformanceMetrics {
  by_route: Record<string, CancerRouteData>;
}

export interface CancerStandardData {
  summary: CancerPerformanceMetrics;
  by_cancer_type: Record<string, CancerTypeData>;
}

export interface CancerDataMetadata {
  total_patients_treated_all_standards: number;
  total_breaches_all_standards: number;
  overall_performance_weighted: number;
  worst_performing_standard: {
    standard: string;
    performance_pct: number;
    breaches: number;
  };
  worst_performing_cancer_types: Array<{
    cancer_type: string;
    standard: string;
    performance_pct: number;
    breaches: number;
  }>;
  top_volume_cancer_types: Array<{
    cancer_type: string;
    total_treated: number;
  }>;
  data_quality: {
    missing_or_invalid_records: number;
    null_treatment_modalities: number;
    complete_data_pct: number;
  };
  last_updated: string;
  data_source: string;
  file_processed: string;
}

export interface CancerData {
  period: string;
  period_start: string;
  period_end: string;
  data_type: 'monthly' | 'quarterly';
  month?: string;
  months_covered?: string[];
  standards: {
    '28_day_fds': CancerStandardData;
    '31_day_combined': CancerStandardData;
    '62_day_combined': CancerStandardData;
  };
  metadata: CancerDataMetadata;
}

export interface CancerPerformanceRow {
  cancerType: string;
  displayName: string;
  category: 'treated' | 'suspected';
  fds_28_treated: number | null;
  fds_28_performance: number | null;
  fds_28_breaches: number | null;
  day_31_treated: number;
  day_31_performance: number;
  day_31_breaches: number;
  day_62_treated: number;
  day_62_performance: number;
  day_62_breaches: number;
  total_treated_all_standards: number;
  total_breaches_all_standards: number;
  worst_standard: string;
}

export const CANCER_TYPE_DISPLAY_NAMES: Record<string, string> = {
  'breast': 'Breast Cancer',
  'lung': 'Lung Cancer',
  'lower_gastrointestinal': 'Lower GI Cancer',
  'upper_gi_oesophagus_stomach': 'Upper GI (Oesophagus & Stomach)',
  'upper_gi_hepatobiliary': 'Upper GI (Hepatobiliary)',
  'gynaecological': 'Gynaecological Cancer',
  'head_neck': 'Head & Neck Cancer',
  'skin': 'Skin Cancer',
  'haematological_lymphoma': 'Haematological (Lymphoma)',
  'haematological_other': 'Haematological (Other)',
  'suspected_breast_cancer': 'Suspected Breast Cancer',
  'suspected_lung_cancer': 'Suspected Lung Cancer',
  'suspected_lower_gi_cancer': 'Suspected Lower GI Cancer',
  'suspected_upper_gi_cancer': 'Suspected Upper GI Cancer',
  'suspected_gynaecological_cancer': 'Suspected Gynaecological Cancer',
  'suspected_head_neck_cancer': 'Suspected Head & Neck Cancer',
  'suspected_urological': 'Suspected Urological',
  'suspected_testicular_cancer': 'Suspected Testicular Cancer',
  'suspected_skin_cancer': 'Suspected Skin Cancer',
  'suspected_haematological': 'Suspected Haematological',
  'suspected_acute_leukaemia': 'Suspected Acute Leukaemia',
  'suspected_brain_cns': 'Suspected Brain/CNS',
  'suspected_childrens_cancer': 'Suspected Children\'s Cancer',
  'suspected_sarcoma': 'Suspected Sarcoma',
  'suspected_other_cancer': 'Suspected Other Cancer',
  'suspected_non_specific': 'Suspected Cancer (Non-specific)',
  'breast_symptomatic_non_cancer': 'Breast Symptomatic (Non-cancer)',
  'other': 'Other Cancer',
  'all_cancers': 'All Cancers',
  'missing_invalid': 'Missing or Invalid'
};

export const CANCER_STANDARDS = {
  '28_day_fds': {
    name: '28-day FDS',
    target: 75,
    description: 'Faster Diagnosis Standard'
  },
  '31_day_combined': {
    name: '31-day Combined',
    target: 96,
    description: 'Decision to treat → First treatment'
  },
  '62_day_combined': {
    name: '62-day Combined',
    target: 85,
    description: 'Urgent referral → First treatment'
  }
} as const;

export type CancerStandardKey = keyof typeof CANCER_STANDARDS;
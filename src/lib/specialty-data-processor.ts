import { TrustMetrics } from '@/types/database';
import { InteractiveSpecialtyData, BreachData, PerformanceLevel } from '@/types/nhs-data';

export function getSpecialtiesData(trustData: TrustMetrics): InteractiveSpecialtyData[] {
  const specialties = [
    { key: 'general_surgery', name: 'General Surgery', code: '100' },
    { key: 'urology', name: 'Urology', code: '101' },
    { key: 'trauma_orthopaedics', name: 'Trauma & Orthopaedics', code: '110' },
    { key: 'ent', name: 'ENT', code: '120' },
    { key: 'ophthalmology', name: 'Ophthalmology', code: '130' },
    { key: 'oral_surgery', name: 'Oral Surgery', code: '140' },
    { key: 'restorative_dentistry', name: 'Restorative Dentistry', code: '141' },
    { key: 'pediatric_surgery', name: 'Paediatric Surgery', code: '170' },
    { key: 'cardiothoracic_surgery', name: 'Cardiothoracic Surgery', code: '180' },
    { key: 'general_medicine', name: 'General Internal Medicine', code: '300' },
    { key: 'gastroenterology', name: 'Gastroenterology', code: '301' },
    { key: 'cardiology', name: 'Cardiology', code: '320' },
    { key: 'dermatology', name: 'Dermatology', code: '330' },
    { key: 'respiratory_medicine', name: 'Respiratory Medicine', code: '340' },
    { key: 'neurology', name: 'Neurology', code: '400' },
    { key: 'rheumatology', name: 'Rheumatology', code: '410' },
    { key: 'geriatric_medicine', name: 'Geriatric Medicine', code: '430' },
    { key: 'gynecology', name: 'Gynaecology', code: '500' },
    { key: 'other_surgery', name: 'Other Surgery', code: '800' },
    { key: 'medical_oncology', name: 'Medical Oncology', code: '370' }
  ];

  if (!trustData?.rtt_data?.specialties) {
    return [];
  }

  return specialties.map(specialty => {
    const specialtyData = trustData.rtt_data.specialties[specialty.key];

    if (!specialtyData) {
      return {
        ...specialty,
        percentage: 0,
        within18weeks: 0,
        total: 0
      };
    }

    const percentage = specialtyData.percent_within_18_weeks || 0;
    const within18weeks = specialtyData.total_within_18_weeks || 0;
    const total = specialtyData.total_incomplete_pathways || 0;

    return {
      ...specialty,
      percentage: percentage * 100, // Convert decimal to percentage (0.5 -> 50%)
      within18weeks,
      total
    };
  }).filter(specialty => specialty.total > 0); // Only show specialties with data
}

export function getSpecialtyBreachData(trustData: TrustMetrics, specialtyKey: string): BreachData {
  if (!trustData?.rtt_data) {
    return {
      week52Plus: 0,
      week65Plus: 0,
      week78Plus: 0
    };
  }

  if (specialtyKey === 'trust_total') {
    return {
      week52Plus: trustData.rtt_data.trust_total?.total_52_plus_weeks || 0,
      week65Plus: trustData.rtt_data.trust_total?.total_65_plus_weeks || 0,
      week78Plus: trustData.rtt_data.trust_total?.total_78_plus_weeks || 0
    };
  }

  const specialtyData = trustData.rtt_data.specialties?.[specialtyKey];

  return {
    week52Plus: specialtyData?.total_52_plus_weeks || 0,
    week65Plus: specialtyData?.total_65_plus_weeks || 0,
    week78Plus: specialtyData?.total_78_plus_weeks || 0
  };
}

export function getSpecialtyDisplayName(specialtyKey: string): string {
  if (specialtyKey === 'trust_total') return 'All Specialties';

  const specialtyMap: Record<string, string> = {
    'general_surgery': 'General Surgery',
    'urology': 'Urology',
    'trauma_orthopaedics': 'Trauma & Orthopaedics',
    'ent': 'ENT',
    'ophthalmology': 'Ophthalmology',
    'oral_surgery': 'Oral Surgery',
    'restorative_dentistry': 'Restorative Dentistry',
    'pediatric_surgery': 'Paediatric Surgery',
    'cardiothoracic_surgery': 'Cardiothoracic Surgery',
    'general_medicine': 'General Internal Medicine',
    'gastroenterology': 'Gastroenterology',
    'cardiology': 'Cardiology',
    'dermatology': 'Dermatology',
    'respiratory_medicine': 'Respiratory Medicine',
    'neurology': 'Neurology',
    'rheumatology': 'Rheumatology',
    'geriatric_medicine': 'Geriatric Medicine',
    'gynecology': 'Gynaecology',
    'other_surgery': 'Other Surgery',
    'medical_oncology': 'Medical Oncology'
  };

  return specialtyMap[specialtyKey] || specialtyKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getPerformanceLevel(percentage: number): PerformanceLevel {
  if (percentage >= 92) return { label: 'Excellent', variant: 'default', color: 'bg-green-500' };
  if (percentage >= 75) return { label: 'Good', variant: 'secondary', color: 'bg-green-400' };
  if (percentage >= 50) return { label: 'Concern', variant: 'secondary', color: 'bg-yellow-400' };
  return { label: 'Critical', variant: 'destructive', color: 'bg-red-500' };
}
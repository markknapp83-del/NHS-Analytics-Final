import { NHSTrustData } from '@/../types/nhs-data';

export interface CriticalDiagnosticService {
  name: string;
  type: string;
  breachRate: number;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
}

export function calculateCriticalDiagnosticServices(trustData: NHSTrustData): {
  count: number;
  services: CriticalDiagnosticService[];
} {
  const diagnosticTypes = [
    { key: 'mri', name: 'MRI Scans' },
    { key: 'ct', name: 'CT Scans' },
    { key: 'ultrasound', name: 'Ultrasound' },
    { key: 'gastroscopy', name: 'Gastroscopy' },
    { key: 'echocardiography', name: 'Echocardiography' },
    { key: 'colonoscopy', name: 'Colonoscopy' },
    { key: 'sigmoidoscopy', name: 'Sigmoidoscopy' },
    { key: 'cystoscopy', name: 'Cystoscopy' },
    { key: 'nuclear_medicine', name: 'Nuclear Medicine' },
    { key: 'dexa', name: 'DEXA Scans' },
    { key: 'audiology', name: 'Audiology' },
    { key: 'electrophysiology', name: 'Electrophysiology' },
    { key: 'neurophysiology', name: 'Neurophysiology' },
    { key: 'sleep_studies', name: 'Sleep Studies' },
    { key: 'urodynamics', name: 'Urodynamics' }
  ];

  const criticalServices: CriticalDiagnosticService[] = [];

  diagnosticTypes.forEach(type => {
    const totalWaiting = trustData[`diag_${type.key}_total_waiting` as keyof NHSTrustData] as number;
    const sixWeekBreaches = trustData[`diag_${type.key}_6week_breaches` as keyof NHSTrustData] as number;
    const thirteenWeekBreaches = trustData[`diag_${type.key}_13week_breaches` as keyof NHSTrustData] as number;

    if (totalWaiting && totalWaiting > 0) {
      const breachRate = (sixWeekBreaches / totalWaiting) * 100;

      // Critical threshold: 15% breach rate
      if (breachRate >= 15) {
        criticalServices.push({
          name: type.name,
          type: type.key,
          breachRate,
          totalWaiting,
          sixWeekBreaches: sixWeekBreaches || 0,
          thirteenWeekBreaches: thirteenWeekBreaches || 0
        });
      }
    }
  });

  return {
    count: criticalServices.length,
    services: criticalServices.sort((a, b) => b.breachRate - a.breachRate) // Worst first
  };
}
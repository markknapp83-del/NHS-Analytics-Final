import { TrustMetrics } from '@/types/database';

export interface CriticalDiagnosticService {
  name: string;
  type: string;
  breachRate: number;
  totalWaiting: number;
  sixWeekBreaches: number;
  thirteenWeekBreaches: number;
}

export function calculateCriticalDiagnosticServices(trustData: TrustMetrics): {
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
    const diagnosticData = trustData.diagnostics_data?.[type.key];

    if (!diagnosticData) return;

    const totalWaiting = diagnosticData.total_waiting;
    const sixWeekBreaches = diagnosticData.six_week_breaches;
    const thirteenWeekBreaches = diagnosticData.thirteen_week_breaches;

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
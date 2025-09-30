import { TrustMetrics } from '../types/database';
import { DiagnosticService } from '../types/nhs-data';

export function extractDiagnosticData(trustData: TrustMetrics): DiagnosticService[] {
  const diagnosticTypes = [
    { key: 'mri', name: 'MRI Scans' },
    { key: 'ct', name: 'CT Scans' },
    { key: 'ultrasound', name: 'Ultrasound' },
    { key: 'nuclear_medicine', name: 'Nuclear Medicine' },
    { key: 'dexa', name: 'DEXA Scans' },
    { key: 'echocardiography', name: 'Echocardiography' },
    { key: 'electrophysiology', name: 'Electrophysiology' },
    { key: 'neurophysiology', name: 'Neurophysiology' },
    { key: 'audiology', name: 'Audiology' },
    { key: 'gastroscopy', name: 'Gastroscopy' },
    { key: 'colonoscopy', name: 'Colonoscopy' },
    { key: 'sigmoidoscopy', name: 'Sigmoidoscopy' },
    { key: 'cystoscopy', name: 'Cystoscopy' },
    { key: 'urodynamics', name: 'Urodynamics' },
    { key: 'sleep_studies', name: 'Sleep Studies' }
  ];

  if (!trustData.diagnostics_data) {
    return [];
  }

  return diagnosticTypes.map(type => {
    const diagnosticData = trustData.diagnostics_data[type.key];

    if (!diagnosticData) {
      return null;
    }

    const totalWaiting = diagnosticData.total_waiting || 0;
    const sixWeekBreaches = diagnosticData.six_week_breaches || 0;
    const thirteenWeekBreaches = diagnosticData.thirteen_week_breaches || 0;
    const plannedTests = diagnosticData.planned_procedures || 0;
    const unscheduledTests = diagnosticData.procedures_performed || 0;

    return {
      type: type.key,
      name: type.name,
      totalWaiting,
      sixWeekBreaches,
      thirteenWeekBreaches,
      breachRate: totalWaiting > 0 ? (sixWeekBreaches / totalWaiting) * 100 : 0,
      plannedTests,
      unscheduledTests
    };
  }).filter((service): service is DiagnosticService => service !== null && service.totalWaiting > 0);
}
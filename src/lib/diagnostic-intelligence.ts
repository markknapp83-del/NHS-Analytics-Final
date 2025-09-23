import { DiagnosticService, BreachLevel } from '../types/nhs-data';

export function calculateOpportunityScore(waitingList: number, breachRate: number): number {
  // Higher score = better opportunity for insourcing
  const volumeScore = Math.min(waitingList / 100, 50); // Cap at 50 points
  const urgencyScore = breachRate; // Percentage as direct score
  return volumeScore + urgencyScore;
}

export function rankDiagnosticsByOpportunity(diagnostics: DiagnosticService[]): DiagnosticService[] {
  return diagnostics.sort((a, b) => {
    const scoreA = calculateOpportunityScore(a.totalWaiting, a.breachRate);
    const scoreB = calculateOpportunityScore(b.totalWaiting, b.breachRate);
    return scoreB - scoreA; // Highest opportunity first
  });
}

export function getBreachLevel(breachRate: number): BreachLevel {
  if (breachRate >= 15) return {
    label: 'CRITICAL',
    variant: 'destructive',
    textColor: 'text-red-600'
  };
  if (breachRate >= 10) return {
    label: 'HIGH CONCERN',
    variant: 'destructive',
    textColor: 'text-red-500'
  };
  if (breachRate >= 5) return {
    label: 'MODERATE',
    variant: 'secondary',
    textColor: 'text-orange-600'
  };
  return {
    label: 'GOOD',
    variant: 'default',
    textColor: 'text-green-600'
  };
}
/**
 * CRM Stage Utilities
 * Provides consistent stage badge colors and labels across the CRM
 */

export type OpportunityStage =
  | 'identification'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface StageConfig {
  label: string;
  color: string;
  badgeClass: string;
}

const STAGE_CONFIGS: Record<OpportunityStage, StageConfig> = {
  identification: {
    label: 'Identification',
    color: '#64748b', // slate-500
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  discovery: {
    label: 'Discovery',
    color: '#3b82f6', // blue-500
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  proposal: {
    label: 'Proposal',
    color: '#8b5cf6', // violet-500
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  negotiation: {
    label: 'Negotiation',
    color: '#f97316', // orange-500
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  closed_won: {
    label: 'Closed Won',
    color: '#10b981', // emerald-500
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  closed_lost: {
    label: 'Closed Lost',
    color: '#ef4444', // red-500
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
  },
};

/**
 * Get stage configuration for a given stage
 */
export function getStageConfig(stage: string): StageConfig {
  const normalizedStage = stage.toLowerCase() as OpportunityStage;
  return STAGE_CONFIGS[normalizedStage] || STAGE_CONFIGS.identification;
}

/**
 * Get formatted stage label
 */
export function getStageLabel(stage: string): string {
  return getStageConfig(stage).label;
}

/**
 * Get badge CSS classes for a stage
 */
export function getStageBadgeClass(stage: string): string {
  return getStageConfig(stage).badgeClass;
}

/**
 * Get badge color for a stage
 */
export function getStageColor(stage: string): string {
  return getStageConfig(stage).color;
}

/**
 * Get all stage configurations
 */
export function getAllStages(): Array<{ value: OpportunityStage; config: StageConfig }> {
  return Object.entries(STAGE_CONFIGS).map(([value, config]) => ({
    value: value as OpportunityStage,
    config,
  }));
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number | null | undefined): string {
  if (!value) return '£0';

  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toLocaleString()}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  return `${Math.round(value)}%`;
}

/**
 * Get time-based greeting
 */
export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

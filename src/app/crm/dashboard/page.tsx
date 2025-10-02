'use client';

import { DashboardHeader } from '@/components/crm/dashboard-header';
import { DashboardKPICards } from '@/components/crm/dashboard-kpi-cards';
import { DashboardTasksDueToday } from '@/components/crm/dashboard-tasks-due-today';
import { DashboardTopOpportunities } from '@/components/crm/dashboard-top-opportunities';
import { ActiveAccountsSection } from '@/components/crm/dashboard-active-accounts';
import { ActivityStreamSection } from '@/components/crm/dashboard-activity-stream';

export default function CRMDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Greeting and Action Buttons */}
      <DashboardHeader />

      {/* Row 1: Four equal KPI cards - matching Analytics Overview */}
      <DashboardKPICards />

      {/* Row 2: Tasks Due Today & Top Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardTasksDueToday />
        <DashboardTopOpportunities />
      </div>

      {/* Row 3: Accounts I'm Working On & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveAccountsSection />
        <ActivityStreamSection />
      </div>
    </div>
  );
}

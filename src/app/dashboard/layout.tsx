'use client';

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { TrustSelectorHeader } from '@/components/dashboard/trust-selector';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TrustSelectorHeader />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
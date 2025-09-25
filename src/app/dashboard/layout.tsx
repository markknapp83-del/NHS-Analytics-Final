'use client';

import { usePathname } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { TrustSelectorHeader } from '@/components/dashboard/trust-selector';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isICBAnalysis = pathname === '/dashboard/icb-analysis';

  return (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {!isICBAnalysis && <TrustSelectorHeader />}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
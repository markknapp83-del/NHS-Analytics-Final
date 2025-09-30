'use client';

import { usePathname } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { TrustSelectorHeader } from '@/components/dashboard/trust-selector';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isICBAnalysis = pathname === '/dashboard/icb-analysis';

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {!isICBAnalysis && <TrustSelectorHeader />}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
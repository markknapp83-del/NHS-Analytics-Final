import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ReactNode } from 'react';

export default function CRMLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}

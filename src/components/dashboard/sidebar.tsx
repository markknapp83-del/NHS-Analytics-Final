'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Building2,
  MapPin,
  LineChart,
  Users,
  Settings
} from 'lucide-react';

export function DashboardSidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: BarChart3 },
    { name: 'RTT Deep Dive', href: '/dashboard/rtt-deep-dive', icon: TrendingUp },
    { name: 'Community Health', href: '/dashboard/community-health', icon: Users },
    { name: 'Diagnostics', href: '/dashboard/diagnostics', icon: Activity },
    { name: 'Capacity & Flow', href: '/dashboard/capacity', icon: Building2 },
    { name: 'ICB Analysis', href: '/dashboard/icb-analysis', icon: MapPin },
    { name: 'Custom Analytics', href: '/dashboard/custom-analytics', icon: LineChart }
  ];

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
      {/* NHS Analytics branding */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-[#005eb8]">NHS Analytics</h1>
        <p className="text-sm text-slate-600">Trust Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-[#005eb8] text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Settings className="h-5 w-5" />
          Settings
        </Button>
      </div>
    </div>
  );
}
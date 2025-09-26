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
    { name: 'Cancer Performance', href: '/dashboard/cancer-performance', icon: Activity },
    { name: 'Diagnostics', href: '/dashboard/diagnostics', icon: Activity },
    { name: 'Capacity & Flow', href: '/dashboard/capacity', icon: Building2 },
    { name: 'ICB Analysis', href: '/dashboard/icb-analysis', icon: MapPin },
    { name: 'Custom Analytics', href: '/dashboard/custom-analytics', icon: LineChart }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-[#005eb8] to-[#003d7a] border-r border-white/8 flex flex-col">
      {/* NHS Analytics branding */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">NHS Analytics</h1>
        <p className="text-sm text-white/80">Trust Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative group",
              pathname === item.href
                ? "bg-white/12 text-white border-l-3 border-l-[#00a650] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
                : "text-white/90 hover:bg-white/8 hover:text-white"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 transition-transform duration-200",
              pathname !== item.href && "group-hover:translate-x-1"
            )} />
            <span className="font-medium tracking-wide">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-4 border-t border-white/10">
        <Button variant="ghost" className="w-full justify-start gap-3 text-white/90 hover:bg-white/8 hover:text-white transition-all duration-200">
          <Settings className="h-5 w-5" />
          Settings
        </Button>
      </div>
    </div>
  );
}
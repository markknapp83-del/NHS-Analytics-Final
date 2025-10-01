'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Building2,
  MapPin,
  LineChart,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, isAdministrator } = useAuth();

  const handleLogout = async () => {
    console.log('[Sidebar] Logout button clicked');
    try {
      console.log('[Sidebar] Calling signOut()');
      await signOut();
      console.log('[Sidebar] SignOut successful, redirecting to login');
      router.push('/login');
    } catch (error) {
      console.error('[Sidebar] Logout failed:', error);
      alert(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: BarChart3 },
    { name: 'RTT Deep Dive', href: '/dashboard/rtt-deep-dive', icon: TrendingUp },
    { name: 'Community Health', href: '/dashboard/community-health', icon: Users },
    { name: 'Cancer Performance', href: '/dashboard/cancer-performance', icon: Activity },
    { name: 'Diagnostics', href: '/dashboard/diagnostics', icon: Stethoscope },
    { name: 'Capacity & Flow', href: '/dashboard/capacity', icon: Building2 },
    { name: 'ICB Analysis', href: '/dashboard/icb-analysis', icon: MapPin },
    { name: 'Custom Analytics', href: '/dashboard/custom-analytics', icon: LineChart }
  ];

  return (
    <div className={cn(
      "bg-gradient-to-b from-[#005eb8] to-[#003d7a] border-r border-white/8 flex flex-col transition-all duration-200",
      isCollapsed ? "w-16" : "w-60"
    )}>
      {/* Header Section */}
      <div className="h-18 border-b border-white/10 flex items-center justify-between px-4">
        {!isCollapsed ? (
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white">NHS Analytics</h1>
            <p className="text-xs text-white/80">Trust Dashboard</p>
          </div>
        ) : (
          <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center mx-auto backdrop-blur-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Tooltip key={item.name} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/12 text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
                      : "text-white/90 hover:bg-white/8 hover:text-white",
                    isCollapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* Settings Section */}
      <div className="p-2 border-t border-white/10 space-y-2">
        {isAdministrator && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/settings"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  pathname === '/dashboard/settings'
                    ? "bg-white/12 text-white"
                    : "text-white/90 hover:bg-white/8 hover:text-white",
                  isCollapsed && "justify-center"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Settings</span>}
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                Settings
              </TooltipContent>
            )}
          </Tooltip>
        )}

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full gap-3 text-white/90 hover:bg-white/8 hover:text-white transition-all duration-200",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Log Out</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              Log Out
            </TooltipContent>
          )}
        </Tooltip>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full mt-2 text-white/90 hover:bg-white/8 hover:text-white"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
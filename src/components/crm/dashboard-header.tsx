'use client';

import { Button } from '@/components/ui/button';
import { Plus, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getGreeting } from '@/lib/crm-stage-utils';

export function DashboardHeader() {
  const router = useRouter();
  const { user } = useAuth();

  // Get user's first name from email or use full email
  const userName = user?.email?.split('@')[0] || 'Sales Team';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{getGreeting()}, {displayName}</h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your NHS Trust accounts today
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => router.push('/crm/opportunities')}>
          <Plus className="h-4 w-4 mr-2" />
          New Opportunity
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Quick Actions
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/crm/contacts')}>
              Add Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/crm/tasks')}>
              Create Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/crm/trusts')}>
              View All Trusts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

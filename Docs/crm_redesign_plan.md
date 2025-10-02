# CRM Dashboard Redesign - Implementation Plan

## Project Overview
Redesign the CRM section to better reflect the sales team's actual workflow where multiple salespeople work on different specialties within the same NHS trust, rather than territorial account ownership.

## Core Principles
1. **Opportunities are the atomic unit** - Not accounts
2. **Shared trust workspaces** - No account ownership
3. **Opportunity ownership** - Each opportunity has one owner
4. **Visibility without access** - Reps can see colleagues' opportunities but can't access details
5. **Activity logging is required** - Not optional

## Phase 1: Database Schema Updates

### 1.1 Update Opportunities Table

```sql
-- Add specialty field as primary classification
ALTER TABLE opportunities 
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(100),
  ADD COLUMN IF NOT EXISTS specialty_other TEXT;

-- Update service_line to be optional/secondary
ALTER TABLE opportunities 
  ALTER COLUMN service_line DROP NOT NULL;

-- Add specialty constraint
ALTER TABLE opportunities
  ADD CONSTRAINT valid_specialty CHECK (
    specialty IN (
      'Maxillofacial Surgery',
      'Oncology', 
      'General Surgery',
      'Trauma & Orthopaedics',
      'Urology',
      'ENT',
      'Ophthalmology',
      'Radiology/Diagnostics',
      'Cardiology',
      'Neurology',
      'Gastroenterology',
      'Dermatology',
      'Respiratory Medicine',
      'Other'
    )
  );

-- Migrate existing data: service_line → specialty where appropriate
UPDATE opportunities 
SET specialty = CASE 
  WHEN service_line LIKE '%Surgery%' THEN 'General Surgery'
  WHEN service_line LIKE '%Ortho%' THEN 'Trauma & Orthopaedics'
  WHEN service_line LIKE '%Diagnostic%' THEN 'Radiology/Diagnostics'
  ELSE 'Other'
END
WHERE specialty IS NULL;
```

### 1.2 Ensure All Trusts Have Account Records

```sql
-- Create account records for all trusts if they don't exist
INSERT INTO accounts (trust_code, account_stage, created_at, updated_at)
SELECT 
  DISTINCT trust_code,
  'prospect' as account_stage,
  NOW() as created_at,
  NOW() as updated_at
FROM trust_metrics
WHERE trust_code NOT IN (SELECT trust_code FROM accounts)
ON CONFLICT (trust_code) DO NOTHING;
```

### 1.3 Update Database Views

```sql
-- Create view for "accounts I'm working on"
CREATE OR REPLACE VIEW vw_user_active_accounts AS
SELECT DISTINCT
  a.trust_code,
  tm.trust_name,
  tm.icb_name,
  a.account_stage,
  a.last_contact_date,
  CURRENT_DATE - a.last_contact_date AS days_since_contact,
  CASE 
    WHEN a.last_contact_date IS NULL THEN 'never_contacted'
    WHEN CURRENT_DATE - a.last_contact_date < 14 THEN 'active'
    WHEN CURRENT_DATE - a.last_contact_date < 30 THEN 'at_risk'
    WHEN CURRENT_DATE - a.last_contact_date < 60 THEN 'neglected'
    ELSE 'critical'
  END AS contact_status,
  
  -- My opportunities count and value
  (SELECT COUNT(*) 
   FROM opportunities o 
   WHERE o.trust_code = a.trust_code 
   AND o.opportunity_owner = auth.email()
   AND o.stage NOT IN ('closed_won', 'closed_lost')
  ) as my_opportunity_count,
  
  (SELECT COALESCE(SUM(estimated_value), 0)
   FROM opportunities o
   WHERE o.trust_code = a.trust_code
   AND o.opportunity_owner = auth.email()
   AND o.stage NOT IN ('closed_won', 'closed_lost')
  ) as my_pipeline_value,
  
  -- Other opportunities count
  (SELECT COUNT(*)
   FROM opportunities o
   WHERE o.trust_code = a.trust_code
   AND o.opportunity_owner != auth.email()
   AND o.stage NOT IN ('closed_won', 'closed_lost')
  ) as other_opportunity_count

FROM accounts a
JOIN trust_metrics tm ON a.trust_code = tm.trust_code
WHERE EXISTS (
  -- Include if I have opportunities here
  SELECT 1 FROM opportunities o 
  WHERE o.trust_code = a.trust_code 
  AND o.opportunity_owner = auth.email()
  AND o.stage NOT IN ('closed_won', 'closed_lost')
) OR EXISTS (
  -- Include if I've had recent activity here
  SELECT 1 FROM activities act
  WHERE act.trust_code = a.trust_code
  AND act.created_by = auth.email()
  AND act.activity_date >= CURRENT_DATE - INTERVAL '30 days'
);

-- View for opportunity visibility (includes owner info)
CREATE OR REPLACE VIEW vw_opportunities_with_owner AS
SELECT 
  o.*,
  p.full_name as owner_name,
  p.email as owner_email
FROM opportunities o
LEFT JOIN profiles p ON o.opportunity_owner = p.email;
```

## Phase 2: Navigation Updates

### 2.1 Update Sidebar Navigation

**File:** `/src/components/layout/crm-sidebar.tsx` or main sidebar component

**Changes:**
```typescript
// Update CRM navigation items
const crmNavigation = [
  { 
    name: 'My Dashboard', // RENAMED from "My Accounts"
    href: '/crm/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'My Opportunities', // RENAMED from "My Pipeline"
    href: '/crm/opportunities', 
    icon: Target 
  },
  { 
    name: 'Trusts', // RENAMED from "All Accounts"
    href: '/crm/trusts', 
    icon: Building2 
  },
  { 
    name: 'Contacts', 
    href: '/crm/contacts', 
    icon: Users 
  },
  { 
    name: 'My Tasks', 
    href: '/crm/tasks', 
    icon: CheckSquare 
  }
];

// Remove "Management" from sidebar (keep as separate protected route)
```

### 2.2 Update Routes

**Files to Create/Rename:**
- `/app/crm/dashboard/page.tsx` (NEW - main dashboard)
- `/app/crm/opportunities/page.tsx` (RENAME from pipeline)
- `/app/crm/trusts/page.tsx` (RENAME from accounts)
- `/app/crm/contacts/page.tsx` (KEEP)
- `/app/crm/tasks/page.tsx` (KEEP, enhance)
- `/app/crm/calendar/page.tsx` (NEW - calendar view)

## Phase 3: My Dashboard Page

### 3.1 Dashboard Page Structure

**File:** `/app/crm/dashboard/page.tsx`

```typescript
import { DashboardHeader } from '@/components/crm/dashboard-header';
import { TasksSection } from '@/components/crm/dashboard-tasks-section';
import { ActiveAccountsSection } from '@/components/crm/dashboard-active-accounts';
import { ActivityStreamSection } from '@/components/crm/dashboard-activity-stream';

export default function CRMDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <DashboardHeader />
      
      {/* Section 1: Tasks & Actions - Highest Priority */}
      <TasksSection />
      
      {/* Section 2: Accounts I'm Working On */}
      <ActiveAccountsSection />
      
      {/* Section 3: Recent Activity Stream */}
      <ActivityStreamSection />
    </div>
  );
}
```

### 3.2 Dashboard Header Component

**File:** `/src/components/crm/dashboard-header.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogActivityModal } from './log-activity-modal';
import { useState } from 'react';

export function DashboardHeader() {
  const [showLogActivity, setShowLogActivity] = useState(false);
  
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">
            Your tasks, opportunities, and recent activity
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowLogActivity(true)}>
            Log Activity
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/crm/opportunities/new')}>
                Create Opportunity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/crm/contacts/new')}>
                Add Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/crm/tasks/new')}>
                Create Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <LogActivityModal 
        open={showLogActivity} 
        onOpenChange={setShowLogActivity}
      />
    </>
  );
}
```

### 3.3 Tasks Section Component

**File:** `/src/components/crm/dashboard-tasks-section.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle, Calendar, Clock } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';

export function TasksSection() {
  const { tasks, completeTask, isLoading } = useTasks();
  
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date < new Date());
  const todayTasks = tasks.filter(t => !t.completed && isToday(t.due_date));
  const thisWeekTasks = tasks.filter(t => !t.completed && isThisWeek(t.due_date));
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Tasks & Actions</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm/tasks">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-8 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Overdue ({overdueTasks.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Today ({todayTasks.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">This Week ({thisWeekTasks.length})</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Overdue Tasks */}
          {overdueTasks.slice(0, 3).map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              variant="overdue"
              onComplete={completeTask}
            />
          ))}
          
          {/* Today's Tasks */}
          {todayTasks.slice(0, 3).map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              variant="today"
              onComplete={completeTask}
            />
          ))}
          
          {/* This Week's Tasks */}
          {thisWeekTasks.slice(0, 2).map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              variant="week"
              onComplete={completeTask}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskItem({ task, variant, onComplete }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Checkbox 
        checked={task.completed}
        onCheckedChange={() => onComplete(task.id)}
        className="mt-1"
      />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{task.task_title}</p>
          {variant === 'overdue' && (
            <Badge variant="destructive" className="text-xs">Overdue</Badge>
          )}
          {variant === 'today' && (
            <Badge className="text-xs bg-blue-600">Today</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{task.trust_name}</span>
          <span>•</span>
          <span>Due: {formatDate(task.due_date)}</span>
        </div>
        
        {task.opportunity_name && (
          <p className="text-sm text-muted-foreground">
            Related: {task.opportunity_name}
          </p>
        )}
      </div>
    </div>
  );
}
```

### 3.4 Active Accounts Section Component

**File:** `/src/components/crm/dashboard-active-accounts.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useActiveAccounts } from '@/hooks/use-active-accounts';
import { ContactStatusBadge } from './contact-status-badge';

export function ActiveAccountsSection() {
  const { accounts, isLoading } = useActiveAccounts();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Accounts I'm Working On</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm/trusts">
              View All Trusts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map(account => (
          <AccountCard key={account.trust_code} account={account} />
        ))}
        
        {accounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active accounts yet</p>
            <p className="text-sm">Create an opportunity to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountCard({ account }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">{account.trust_name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {account.trust_code} • {account.icb_name}
            </p>
          </div>
          
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/crm/trusts/${account.trust_code}`}>
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <Badge variant="outline">{account.account_stage}</Badge>
          <ContactStatusBadge 
            status={account.contact_status}
            lastContactDate={account.last_contact_date}
          />
        </div>
        
        {/* My Opportunities */}
        {account.my_opportunities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                My Opportunities ({account.my_opportunities.length})
              </span>
            </div>
            <div className="space-y-2 ml-6">
              {account.my_opportunities.map(opp => (
                <div key={opp.id} className="text-sm">
                  <Link 
                    href={`/crm/opportunities/${opp.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {opp.opportunity_name}
                  </Link>
                  <span className="text-muted-foreground ml-2">
                    ({opp.stage})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Other Opportunities */}
        {account.other_opportunities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Other Opportunities ({account.other_opportunities.length})
              </span>
            </div>
            <div className="space-y-2 ml-6">
              {account.other_opportunities.map(opp => (
                <div key={opp.id} className="text-sm text-muted-foreground">
                  {opp.opportunity_name}
                  <span className="ml-2">
                    ({opp.owner_name} - {opp.stage})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Pipeline Value */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm font-medium">My Pipeline Value</span>
          <span className="text-lg font-bold text-blue-600">
            £{formatCurrency(account.my_pipeline_value)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.5 Activity Stream Section Component

**File:** `/src/components/crm/dashboard-activity-stream.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Users2, FileText, Presentation, ArrowRight } from 'lucide-react';
import { useRecentActivities } from '@/hooks/use-activities';
import { formatDistanceToNow } from 'date-fns';

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Users2,
  proposal: FileText,
  demo: Presentation,
  other: FileText
};

export function ActivityStreamSection() {
  const { activities, isLoading } = useRecentActivities({ limit: 10 });
  
  // Group by date
  const groupedActivities = groupByDate(activities);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm/activities">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {Object.entries(groupedActivities).map(([date, items]) => (
          <div key={date} className="mb-6 last:mb-0">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              {date}
            </h4>
            
            <div className="space-y-4">
              {items.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities logged yet</p>
            <Button variant="outline" className="mt-4">
              Log Your First Activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }) {
  const Icon = activityIcons[activity.activity_type] || FileText;
  
  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{activity.activity_type}</span>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(activity.activity_date, { addSuffix: true })}
          </span>
        </div>
        
        <p className="font-medium">{activity.subject}</p>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {activity.contact_name && (
            <span>{activity.contact_name}</span>
          )}
          {activity.contact_name && <span>•</span>}
          <span>{activity.trust_name}</span>
          {activity.opportunity_name && (
            <>
              <span>•</span>
              <span>{activity.opportunity_name}</span>
            </>
          )}
        </div>
        
        {activity.outcome && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={
              activity.outcome === 'positive' ? 'default' :
              activity.outcome === 'negative' ? 'destructive' :
              'secondary'
            }>
              {activity.outcome}
            </Badge>
          </div>
        )}
        
        {activity.notes && (
          <details className="mt-2">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              View notes
            </summary>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {activity.notes}
            </p>
          </details>
        )}
        
        {activity.next_steps && (
          <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Next Steps:
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {activity.next_steps}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function groupByDate(activities) {
  const groups = {};
  const now = new Date();
  
  activities.forEach(activity => {
    const activityDate = new Date(activity.activity_date);
    let label;
    
    if (isToday(activityDate)) {
      label = 'Today';
    } else if (isYesterday(activityDate)) {
      label = 'Yesterday';
    } else if (isThisWeek(activityDate)) {
      label = 'This Week';
    } else {
      label = format(activityDate, 'MMMM d, yyyy');
    }
    
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
  });
  
  return groups;
}
```

## Phase 4: Trust Profile Page Updates

### 4.1 Update Opportunities Tab

**File:** `/src/components/crm/trust-profile-opportunities-tab.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, TrendingUp } from 'lucide-react';
import { useOpportunitiesByTrust } from '@/hooks/use-opportunities';
import { useAuth } from '@/hooks/use-auth';

export function TrustProfileOpportunitiesTab({ trustCode }) {
  const { user } = useAuth();
  const { opportunities, isLoading } = useOpportunitiesByTrust(trustCode);
  
  const myOpportunities = opportunities.filter(o => o.opportunity_owner === user.email);
  const otherOpportunities = opportunities.filter(o => o.opportunity_owner !== user.email);
  
  return (
    <div className="space-y-6">
      {/* My Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Opportunities ({myOpportunities.length})</CardTitle>
            <Button asChild>
              <Link href={`/crm/opportunities/new?trust=${trustCode}`}>
                Create Opportunity
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myOpportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No opportunities yet</p>
              <p className="text-sm">Create your first opportunity for this trust</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myOpportunities.map(opp => (
                <OpportunityCard 
                  key={opp.id} 
                  opportunity={opp} 
                  isOwner={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Other Active Opportunities */}
      {otherOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Active Opportunities ({otherOpportunities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {otherOpportunities.map(opp => (
                <OpportunityCard 
                  key={opp.id} 
                  opportunity={opp} 
                  isOwner={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OpportunityCard({ opportunity, isOwner }) {
  if (!isOwner) {
    // Limited view for others' opportunities
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-muted-foreground">
                {opportunity.opportunity_name}
              </h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>Owned by: {opportunity.owner_name}</span>
                <span>•</span>
                <Badge variant="outline">{opportunity.stage}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                (Limited access - contact {opportunity.owner_name} for details)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Full view for my opportunities
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-semibold text-lg mb-1">
              {opportunity.opportunity_name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {opportunity.specialty}
            </p>
          </div>
          <Badge>{opportunity.stage}</Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">Value</span>
            <p className="font-medium">
              £{formatCurrency(opportunity.estimated_value)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Probability</span>
            <p className="font-medium">{opportunity.probability}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Expected Close</span>
            <p className="font-medium">
              {formatDate(opportunity.expected_close_date)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/crm/opportunities/${opportunity.id}`}>
              View Details
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/crm/opportunities/${opportunity.id}/edit`}>
              Edit
            </Link>
          </Button>
          <Button size="sm" variant="outline">
            Log Activity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Phase 5: Opportunity Form Updates

### 5.1 Update Opportunity Form

**File:** `/src/components/crm/opportunity-form.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const opportunitySchema = z.object({
  opportunity_name: z.string().min(1, 'Opportunity name is required'),
  trust_code: z.string().min(1, 'Trust selection is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  specialty_other: z.string().optional(),
  service_line: z.string().optional(),
  stage: z.string().min(1, 'Stage is required'),
  probability: z.coerce.number().min(0).max(100),
  estimated_value: z.coerce.number().optional(),
  contract_length_months: z.coerce.number().optional(),
  expected_close_date: z.string().optional(),
  opportunity_source: z.string().optional(),
  performance_driver: z.string().optional(),
  competitive_intel: z.string().optional(),
});

const specialtyOptions = [
  'Maxillofacial Surgery',
  'Oncology',
  'General Surgery',
  'Trauma & Orthopaedics',
  'Urology',
  'ENT',
  'Ophthalmology',
  'Radiology/Diagnostics',
  'Cardiology',
  'Neurology',
  'Gastroenterology',
  'Dermatology',
  'Respiratory Medicine',
  'Other'
];

export function OpportunityForm({ defaultValues, onSubmit }) {
  const form = useForm({
    resolver: zodResolver(opportunitySchema),
    defaultValues: defaultValues || {
      stage: 'identification',
      probability: 30,
    }
  });
  
  const watchSpecialty = form.watch('specialty');
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="opportunity_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opportunity Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Maxillofacial Surgery Insourcing" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="trust_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trust *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trust" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {trusts.map(trust => (
                    <SelectItem key={trust.trust_code} value={trust.trust_code}>
                      {trust.trust_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialty *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {specialtyOptions.map(specialty => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchSpecialty === 'Other' && (
          <FormField
            control={form.control}
            name="specialty_other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Specialty (Please specify)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Specify specialty" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="service_line"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Line (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Staffing, Diagnostics, Surgical Services" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Additional fields: stage, probability, value, dates, etc. */}
        {/* ... (keep existing fields) */}
        
        <Button type="submit">
          {defaultValues ? 'Update Opportunity' : 'Create Opportunity'}
        </Button>
      </form>
    </Form>
  );
}
```

## Phase 6: Calendar View (New Feature)

### 6.1 Create Calendar Page

**File:** `/app/crm/calendar/page.tsx`

```typescript
import { CalendarView } from '@/components/crm/calendar-view';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            View and manage your tasks and follow-ups
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>
      
      <CalendarView />
    </div>
  );
}
```

### 6.2 Create Calendar Component

**File:** `/src/components/crm/calendar-view.tsx`

```typescript
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useTasks } from '@/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { tasks } = useTasks();
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const tasksForSelectedDate = tasks.filter(task => 
    isSameDay(new Date(task.due_date), selectedDate)
  );
  
  const getTasksForDate = (date) => {
    return tasks.filter(task => isSameDay(new Date(task.due_date), date));
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {daysInMonth.map(day => {
              const tasksForDay = getTasksForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    p-2 rounded-lg border text-center relative
                    ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
                    ${isToday && !isSelected ? 'border-primary' : ''}
                  `}
                >
                  <div className="text-sm font-medium">
                    {format(day, 'd')}
                  </div>
                  
                  {tasksForDay.length > 0 && (
                    <div className="flex gap-0.5 justify-center mt-1">
                      {tasksForDay.slice(0, 3).map((_, i) => (
                        <div key={i} className="h-1 w-1 rounded-full bg-primary" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Selected Date Tasks */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          
          {tasksForSelectedDate.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks for this date</p>
          ) : (
            <div className="space-y-3">
              {tasksForSelectedDate.map(task => (
                <div key={task.id} className="p-3 rounded-lg border">
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      checked={task.completed}
                      onCheckedChange={() => completeTask(task.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.task_title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.trust_name}
                      </p>
                      {task.opportunity_name && (
                        <Badge variant="outline" className="mt-2">
                          {task.opportunity_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.3 Add Calendar to Navigation

Update sidebar to include calendar link:

```typescript
const crmNavigation = [
  { name: 'My Dashboard', href: '/crm/dashboard', icon: LayoutDashboard },
  { name: 'My Opportunities', href: '/crm/opportunities', icon: Target },
  { name: 'Trusts', href: '/crm/trusts', icon: Building2 },
  { name: 'Contacts', href: '/crm/contacts', icon: Users },
  { name: 'My Tasks', href: '/crm/tasks', icon: CheckSquare },
  { name: 'Calendar', href: '/crm/calendar', icon: Calendar }, // NEW
];
```

## Phase 7: React Hooks for Data Fetching

### 7.1 Active Accounts Hook

**File:** `/src/hooks/use-active-accounts.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useActiveAccounts() {
  return useQuery({
    queryKey: ['active-accounts'],
    queryFn: async () => {
      const { data: accounts, error } = await supabase
        .from('vw_user_active_accounts')
        .select('*')
        .order('last_contact_date', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      
      // Fetch my opportunities for each account
      const accountsWithOpportunities = await Promise.all(
        accounts.map(async (account) => {
          // My opportunities
          const { data: myOpps } = await supabase
            .from('vw_opportunities_with_owner')
            .select('*')
            .eq('trust_code', account.trust_code)
            .eq('opportunity_owner', (await supabase.auth.getUser()).data.user?.email)
            .not('stage', 'in', '("closed_won","closed_lost")');
          
          // Other opportunities
          const { data: otherOpps } = await supabase
            .from('vw_opportunities_with_owner')
            .select('id, opportunity_name, stage, owner_name, owner_email')
            .eq('trust_code', account.trust_code)
            .neq('opportunity_owner', (await supabase.auth.getUser()).data.user?.email)
            .not('stage', 'in', '("closed_won","closed_lost")');
          
          return {
            ...account,
            my_opportunities: myOpps || [],
            other_opportunities: otherOpps || []
          };
        })
      );
      
      return accountsWithOpportunities;
    }
  });
}
```

### 7.2 Tasks Hook

**File:** `/src/hooks/use-tasks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useTasks() {
  const queryClient = useQueryClient();
  
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          trust:trust_metrics(trust_name),
          opportunity:opportunities(opportunity_name),
          contact:contacts(full_name)
        `)
        .eq('assigned_to', user.data.user?.email)
        .eq('completed', false)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      return data.map(task => ({
        ...task,
        trust_name: task.trust?.trust_name,
        opportunity_name: task.opportunity?.opportunity_name,
        contact_name: task.contact?.full_name
      }));
    }
  });
  
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true, 
          completed_date: new Date().toISOString() 
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
  
  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    completeTask: completeTaskMutation.mutate
  };
}
```

### 7.3 Recent Activities Hook

**File:** `/src/hooks/use-activities.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRecentActivities({ limit = 20 } = {}) {
  return useQuery({
    queryKey: ['recent-activities', limit],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          trust:trust_metrics(trust_name),
          opportunity:opportunities(opportunity_name),
          contact:contacts(full_name)
        `)
        .eq('created_by', user.data.user?.email)
        .order('activity_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data.map(activity => ({
        ...activity,
        trust_name: activity.trust?.trust_name,
        opportunity_name: activity.opportunity?.opportunity_name,
        contact_name: activity.contact?.full_name
      }));
    }
  });
}
```

## Phase 8: Testing & Refinement

### 8.1 Testing Checklist

**Database:**
- [ ] All trusts have account records
- [ ] Specialty field added to opportunities
- [ ] Views return correct data
- [ ] No SQL errors

**Dashboard:**
- [ ] Tasks section displays correctly with grouping
- [ ] Active accounts show my opportunities vs others
- [ ] Activity stream groups by date
- [ ] Quick actions work (log activity, create opportunity)

**Trust Profile:**
- [ ] My opportunities show full details
- [ ] Other opportunities show limited view (name, owner, stage only)
- [ ] Can't click into others' opportunities
- [ ] Create opportunity button works

**Opportunities:**
- [ ] Specialty field required on create/edit
- [ ] Form validation works
- [ ] Kanban view shows correct opportunities (mine only)
- [ ] Can update opportunity stage via drag-drop

**Calendar:**
- [ ] Shows tasks on correct dates
- [ ] Can select date and see tasks
- [ ] Task indicators visible on calendar grid
- [ ] Completing tasks updates calendar

**Navigation:**
- [ ] All renamed routes work
- [ ] Sidebar shows new navigation structure
- [ ] Quick action buttons work from all pages

### 8.2 Performance Checks

- [ ] Dashboard loads in < 2 seconds
- [ ] Active accounts query optimized (uses view)
- [ ] No N+1 queries
- [ ] Data caching working with React Query

## Success Criteria

✅ **Navigation:**
- "My Dashboard" replaces "My Accounts"
- "My Opportunities" replaces "My Pipeline"
- "Trusts" replaces "All Accounts"
- Calendar view accessible

✅ **Dashboard:**
- Tasks prominent at top
- Active accounts show my work + others' visibility
- Activity stream grouped by date
- Quick actions easily accessible

✅ **Trust Collaboration:**
- Multiple reps can have opportunities at same trust
- Reps see others' opportunity names but can't access details
- No confusion about who owns what

✅ **Opportunities:**
- Specialty is primary field
- Service line is secondary/optional
- Opportunity creation intuitive

✅ **Calendar:**
- Tasks visible on calendar
- Easy to see daily/weekly workload
- Foundation for future calendar sync

## Notes for Claude Code

1. **Database First:** Run all schema updates before building UI
2. **Test Views:** Verify views return expected data before using in hooks
3. **Component Reuse:** Use existing ShadCN components where possible
4. **Error Handling:** Add proper error boundaries and loading states
5. **Type Safety:** Update TypeScript types for all schema changes
6. **Mobile Responsive:** Ensure all new components work on mobile
7. **Accessibility:** Maintain ARIA labels and keyboard navigation

## Migration Plan for Existing Data

If there are existing opportunities without specialty:
1. Run migration to add specialty field
2. Default existing opportunities to 'Other'
3. Add admin UI to bulk update specialties if needed

## Future Enhancements (Post-Implementation)

- Google Calendar / Outlook sync (Option C)
- Automated task creation from activity follow-ups
- Email notifications for overdue tasks
- Team calendar view (management)
- Mobile app for activity logging
- Offline capability for field work
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Users2, FileText, Presentation, ArrowRight } from 'lucide-react';
import { useRecentActivities } from '@/hooks/use-activities';
import Link from 'next/link';

const activityIcons: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users2,
  proposal: FileText,
  demo: Presentation,
  other: FileText,
};

function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function isThisWeek(date: Date): boolean {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date > weekAgo && date < today;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function groupByDate(activities: any[]) {
  const groups: Record<string, any[]> = {};

  activities.forEach((activity) => {
    const activityDate = new Date(activity.activity_date);
    let label: string;

    if (isToday(activityDate)) {
      label = 'Today';
    } else if (isYesterday(activityDate)) {
      label = 'Yesterday';
    } else if (isThisWeek(activityDate)) {
      label = 'This Week';
    } else {
      label = formatDate(activityDate);
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(activity);
  });

  return groups;
}

interface ActivityItemProps {
  activity: any;
}

function ActivityItem({ activity }: ActivityItemProps) {
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
            {formatDistanceToNow(activity.activity_date)}
          </span>
        </div>

        <p className="font-medium">{activity.subject}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {activity.contact_name && <span>{activity.contact_name}</span>}
          {activity.contact_name && <span>•</span>}
          {activity.trust_name && <span>{activity.trust_name}</span>}
          {activity.opportunity_name && (
            <>
              <span>•</span>
              <span>{activity.opportunity_name}</span>
            </>
          )}
        </div>

        {activity.outcome && (
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={
                activity.outcome === 'positive'
                  ? 'default'
                  : activity.outcome === 'negative'
                  ? 'destructive'
                  : 'secondary'
              }
            >
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

export function ActivityStreamSection() {
  const { activities, isLoading } = useRecentActivities({ limit: 10 });

  const groupedActivities = groupByDate(activities);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">{date}</h4>

            <div className="space-y-4">
              {items.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities logged yet</p>
            <p className="text-sm">Log your first activity to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

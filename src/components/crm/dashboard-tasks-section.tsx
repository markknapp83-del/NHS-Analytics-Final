'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle, Calendar, Clock, CheckSquare } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import Link from 'next/link';

// Date utility functions
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isThisWeek(date: Date): boolean {
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  return date >= today && date <= weekFromNow;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface TaskItemProps {
  task: any;
  variant: 'overdue' | 'today' | 'week';
  onComplete: (taskId: string) => void;
}

function TaskItem({ task, variant, onComplete }: TaskItemProps) {
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
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
          {variant === 'today' && (
            <Badge className="text-xs bg-blue-600">Today</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {task.trust_name && <span>{task.trust_name}</span>}
          {task.trust_name && <span>•</span>}
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

export function TasksSection() {
  const { tasks, completeTask, isLoading } = useTasks();

  const now = new Date();
  const overdueTasks = tasks.filter((t) => !t.completed && new Date(t.due_date) < now);
  const todayTasks = tasks.filter((t) => !t.completed && isToday(new Date(t.due_date)));
  const thisWeekTasks = tasks.filter(
    (t) =>
      !t.completed &&
      !isToday(new Date(t.due_date)) &&
      isThisWeek(new Date(t.due_date))
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Tasks & Actions</CardTitle>
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
          {overdueTasks.slice(0, 3).map((task) => (
            <TaskItem key={task.id} task={task} variant="overdue" onComplete={completeTask} />
          ))}

          {/* Today's Tasks */}
          {todayTasks.slice(0, 3).map((task) => (
            <TaskItem key={task.id} task={task} variant="today" onComplete={completeTask} />
          ))}

          {/* This Week's Tasks */}
          {thisWeekTasks.slice(0, 2).map((task) => (
            <TaskItem key={task.id} task={task} variant="week" onComplete={completeTask} />
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks yet</p>
              <p className="text-sm">Create a task to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

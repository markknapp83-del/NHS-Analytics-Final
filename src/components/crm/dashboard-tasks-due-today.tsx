'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, CheckCircle2 } from 'lucide-react';
import { supabaseAuth } from '@/lib/supabase-auth';

interface Task {
  id: string;
  task_title: string;
  trust_name?: string;
  due_date: string;
  completed: boolean;
}

export function DashboardTasksDueToday() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodayTasks = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabaseAuth.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setTasks([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabaseAuth
        .from('tasks')
        .select('id, task_title, trust_code, due_date, completed')
        .eq('assigned_to', userEmail)
        .eq('due_date', today)
        .eq('completed', false)
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      // Fetch trust names
      // @ts-expect-error - Supabase type inference issue
      const trustCodes = [...new Set(data?.map((t) => t.trust_code).filter(Boolean))];
      const trustsMap = new Map();

      if (trustCodes.length > 0) {
        const { data: trusts } = await supabaseAuth
          .from('trust_metrics')
          .select('trust_code, trust_name')
          .in('trust_code', trustCodes);
        // @ts-expect-error - Supabase type inference issue
        trusts?.forEach((t) => trustsMap.set(t.trust_code, t.trust_name));
      }

      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        trust_name: trustsMap.get(task.trust_code) || null,
      }));

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching today tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      const { error } = await supabaseAuth
        .from('tasks')
        // @ts-expect-error - Supabase type inference issue
        .update({
          completed: true,
          completed_date: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      // Remove from list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tasks Due Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Tasks Due Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks due today</p>
            <p className="text-xs">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => handleToggleComplete(task.id)}
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight">{task.task_title}</p>
                  {task.trust_name && (
                    <p className="text-xs text-muted-foreground mt-1">{task.trust_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

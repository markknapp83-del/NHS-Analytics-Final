import { useState, useEffect } from 'react';
import { supabaseAuth } from '@/lib/supabase-auth';

interface Task {
  id: string;
  trust_code: string;
  task_title: string;
  task_description: string | null;
  due_date: string;
  assigned_to: string;
  completed: boolean;
  completed_date: string | null;
  trust_name?: string;
  opportunity_name?: string;
  contact_name?: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabaseAuth.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setTasks([]);
        return;
      }

      const { data, error: fetchError } = await supabaseAuth
        .from('tasks')
        .select('*')
        .eq('assigned_to', userEmail)
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (fetchError) throw fetchError;

      // Fetch related data separately
      // @ts-expect-error - Supabase type inference issue
      const trustCodes = [...new Set(data?.map(t => t.trust_code).filter(Boolean))];
      // @ts-expect-error - Supabase type inference issue
      const opportunityIds = [...new Set(data?.map(t => t.opportunity_id).filter(Boolean))];
      // @ts-expect-error - Supabase type inference issue
      const contactIds = [...new Set(data?.map(t => t.contact_id).filter(Boolean))];

      // Fetch trusts
      const trustsMap = new Map();
      if (trustCodes.length > 0) {
        const { data: trusts } = await supabaseAuth
          .from('trust_metrics')
          .select('trust_code, trust_name')
          .in('trust_code', trustCodes);
        // @ts-expect-error - Supabase type inference issue
        trusts?.forEach(t => trustsMap.set(t.trust_code, t.trust_name));
      }

      // Fetch opportunities
      const oppsMap = new Map();
      if (opportunityIds.length > 0) {
        const { data: opps } = await supabaseAuth
          .from('opportunities')
          .select('id, opportunity_name')
          .in('id', opportunityIds);
        // @ts-expect-error - Supabase type inference issue
        opps?.forEach(o => oppsMap.set(o.id, o.opportunity_name));
      }

      // Fetch contacts
      const contactsMap = new Map();
      if (contactIds.length > 0) {
        const { data: contacts } = await supabaseAuth
          .from('contacts')
          .select('id, full_name')
          .in('id', contactIds);
        // @ts-expect-error - Supabase type inference issue
        contacts?.forEach(c => contactsMap.set(c.id, c.full_name));
      }

      const mappedTasks = (data || []).map((task: any) => ({
        ...task,
        trust_name: trustsMap.get(task.trust_code) || null,
        opportunity_name: oppsMap.get(task.opportunity_id) || null,
        contact_name: contactsMap.get(task.contact_id) || null,
      }));

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
    } finally {
      setIsLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const { error: updateError } = await supabaseAuth
        .from('tasks')
        // @ts-expect-error - Supabase type inference issue
        .update({
          completed: true,
          completed_date: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Refresh tasks
      await fetchTasks();
    } catch (err) {
      console.error('Error completing task:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    isLoading,
    error,
    completeTask,
    refetch: fetchTasks,
  };
}

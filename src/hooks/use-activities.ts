import { useState, useEffect } from 'react';
import { supabaseAuth } from '@/lib/supabase-auth';

interface Activity {
  id: string;
  trust_code: string;
  contact_id: string | null;
  opportunity_id: string | null;
  activity_type: string;
  subject: string;
  notes: string | null;
  activity_date: string;
  duration_minutes: number | null;
  outcome: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  next_steps: string | null;
  created_by: string;
  created_at: string;
  trust_name?: string;
  opportunity_name?: string;
  contact_name?: string;
}

interface UseActivitiesOptions {
  limit?: number;
}

export function useRecentActivities(options: UseActivitiesOptions = {}) {
  const { limit = 20 } = options;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);

      const { data: userData } = await supabaseAuth.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        setActivities([]);
        return;
      }

      const { data, error: fetchError } = await supabaseAuth
        .from('activities')
        .select('*')
        .eq('created_by', userEmail)
        .order('activity_date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      // Fetch related data separately
      // @ts-expect-error - Supabase type inference issue
      const trustCodes = [...new Set(data?.map(a => a.trust_code).filter(Boolean))];
      // @ts-expect-error - Supabase type inference issue
      const opportunityIds = [...new Set(data?.map(a => a.opportunity_id).filter(Boolean))];
      // @ts-expect-error - Supabase type inference issue
      const contactIds = [...new Set(data?.map(a => a.contact_id).filter(Boolean))];

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

      const mappedActivities = (data || []).map((activity: any) => ({
        ...activity,
        trust_name: trustsMap.get(activity.trust_code) || null,
        opportunity_name: oppsMap.get(activity.opportunity_id) || null,
        contact_name: contactsMap.get(activity.contact_id) || null,
      }));

      setActivities(mappedActivities);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  return {
    activities,
    isLoading,
    error,
    refetch: fetchActivities,
  };
}

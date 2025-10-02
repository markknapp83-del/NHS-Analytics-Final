import { createSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(request.url);

    const trustCode = searchParams.get('trust_code');
    const activityType = searchParams.get('activity_type');
    const createdBy = searchParams.get('created_by');

    let query = supabase
      .from('activities')
      .select('*')
      .order('activity_date', { ascending: false });

    if (trustCode) {
      query = query.eq('trust_code', trustCode);
    }

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Map description to notes for database
    const activityData = {
      trust_code: body.trust_code,
      contact_id: body.contact_id || null,
      opportunity_id: body.opportunity_id || null,
      activity_type: body.activity_type,
      activity_date: body.activity_date,
      subject: body.subject,
      notes: body.description || body.notes,
      outcome: body.outcome,
      next_steps: body.next_steps,
      created_by: user.email,
    };

    // Insert the activity
    const { data: insertedActivity, error: activityError } = await supabase
      .from('activities')
      // @ts-expect-error - Supabase type inference issue
      .insert(activityData)
      .select()
      .single();

    if (activityError) throw activityError;

    // Update last_contact_date on the account
    // @ts-expect-error - Supabase type inference issue
    if (insertedActivity?.trust_code) {
      await supabase
        .from('accounts')
        // @ts-expect-error - Supabase type inference issue
        .update({ last_contact_date: new Date(insertedActivity.activity_date).toISOString().split('T')[0] })
        // @ts-expect-error - Supabase type inference issue
        .eq('trust_code', insertedActivity.trust_code);
    }

    // Create task if follow-up required
    if (body.follow_up_required && body.follow_up_date && body.follow_up_assigned_to) {
      // @ts-expect-error - Supabase type inference issue
      const trustCode = insertedActivity?.trust_code;
      // @ts-expect-error - Supabase type inference issue
      const contactId = insertedActivity?.contact_id;
      // @ts-expect-error - Supabase type inference issue
      const opportunityId = insertedActivity?.opportunity_id;
      // @ts-expect-error - Supabase type inference issue
      const subject = insertedActivity?.subject;
      // @ts-expect-error - Supabase type inference issue
      const nextSteps = insertedActivity?.next_steps;

      await supabase
        .from('tasks')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          trust_code: trustCode,
          contact_id: contactId,
          opportunity_id: opportunityId,
          task_title: `Follow-up: ${subject}`,
          task_description: nextSteps,
          due_date: body.follow_up_date,
          assigned_to: body.follow_up_assigned_to,
          created_by: user.email,
        });
    }

    return NextResponse.json({ data: insertedActivity, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

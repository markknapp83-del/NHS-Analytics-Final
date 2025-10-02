import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const trustCode = searchParams.get('trust_code');
    const activityType = searchParams.get('activity_type');
    const createdBy = searchParams.get('created_by');

    let query = supabaseAuth
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
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Insert the activity
    // @ts-expect-error - Supabase type inference issue
    const { data: insertedActivity, error: activityError } = await supabaseAuth.from('activities').insert({ trust_code: body.trust_code, contact_id: body.contact_id, opportunity_id: body.opportunity_id, activity_type: body.activity_type, activity_date: body.activity_date, subject: body.subject, notes: body.notes, outcome: body.outcome, next_steps: body.next_steps, created_by: user.email }).select().single();

    if (activityError) throw activityError;

    // Update last_contact_date on the account
    // @ts-expect-error - Supabase type inference issue
    if (insertedActivity?.trust_code) {
      // @ts-expect-error - Supabase type inference issue
      await supabaseAuth.from('accounts').update({ last_contact_date: new Date(insertedActivity.activity_date).toISOString().split('T')[0] }).eq('trust_code', insertedActivity.trust_code);
    }

    // Create task if follow-up required
    if (body.follow_up_required && body.follow_up_date && body.follow_up_assigned_to) {
      // @ts-expect-error - Supabase type inference issue
      await supabaseAuth.from('tasks').insert({ trust_code: insertedActivity?.trust_code, contact_id: insertedActivity?.contact_id, opportunity_id: insertedActivity?.opportunity_id, task_title: `Follow-up: ${insertedActivity?.subject}`, task_description: insertedActivity?.next_steps, due_date: body.follow_up_date, assigned_to: body.follow_up_assigned_to, created_by: user.email });
    }

    return NextResponse.json({ data: insertedActivity, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

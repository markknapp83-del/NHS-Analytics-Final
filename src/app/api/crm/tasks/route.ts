import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const assignedTo = searchParams.get('assigned_to');
    const completed = searchParams.get('completed');
    const dueDate = searchParams.get('due_date');

    let query = supabaseAuth
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (completed !== null && completed !== undefined) {
      query = query.eq('completed', completed === 'true');
    }

    if (dueDate) {
      query = query.eq('due_date', dueDate);
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

    const { data, error } = await supabaseAuth
      .from('tasks')
      .insert({
        ...body,
        created_by: user.email,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

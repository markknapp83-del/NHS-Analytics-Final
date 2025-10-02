import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const trustCode = searchParams.get('trust_code');
    const isDecisionMaker = searchParams.get('is_decision_maker');
    const contactStage = searchParams.get('contact_stage');

    let query = supabaseAuth
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (trustCode) {
      query = query.eq('trust_code', trustCode);
    }

    if (isDecisionMaker !== null && isDecisionMaker !== undefined) {
      query = query.eq('is_decision_maker', isDecisionMaker === 'true');
    }

    if (contactStage) {
      query = query.eq('contact_stage', contactStage);
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
      .from('contacts')
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

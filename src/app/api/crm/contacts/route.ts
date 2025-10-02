import { createSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(request.url);

    const trustCode = searchParams.get('trust_code');
    const isDecisionMaker = searchParams.get('is_decision_maker');
    const contactStage = searchParams.get('contact_stage');

    let query = supabase
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
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Map 'name' field to 'full_name' for database
    const contactData = {
      trust_code: body.trust_code,
      full_name: body.name || body.full_name,
      job_title: body.job_title,
      department: body.department,
      email: body.email,
      phone: body.phone,
      is_decision_maker: body.is_decision_maker,
      is_influencer: body.is_influencer,
      is_champion: body.is_champion,
      notes: body.notes,
      contact_stage: body.contact_stage || 'cold',
      created_by: user.email,
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

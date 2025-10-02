import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const accountOwner = searchParams.get('account_owner');
    const accountStage = searchParams.get('account_stage');
    const icbName = searchParams.get('icb_name');

    let query = supabaseAuth
      .from('vw_trust_coverage')
      .select('*')
      .order('trust_name');

    if (accountOwner) {
      query = query.eq('account_owner', accountOwner);
    }

    if (accountStage) {
      query = query.eq('account_stage', accountStage);
    }

    if (icbName) {
      query = query.eq('icb_name', icbName);
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
      .from('accounts')
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

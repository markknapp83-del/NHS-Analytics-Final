import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const trustCode = searchParams.get('trust_code');
    const stage = searchParams.get('stage');
    const opportunityOwner = searchParams.get('opportunity_owner');

    let query = supabaseAuth
      .from('opportunities')
      .select(`
        *,
        accounts!opportunities_trust_code_fkey (
          trust_name
        )
      `)
      .order('created_at', { ascending: false });

    if (trustCode) {
      query = query.eq('trust_code', trustCode);
    }

    if (stage) {
      query = query.eq('stage', stage);
    }

    if (opportunityOwner) {
      query = query.eq('opportunity_owner', opportunityOwner);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten the trust_name from the nested accounts object
    const enrichedData = data?.map((opp: any) => ({
      ...opp,
      trust_name: opp.accounts?.trust_name || null,
      accounts: undefined, // Remove the nested object
    }));

    return NextResponse.json({ data: enrichedData, error: null });
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
      .from('opportunities')
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

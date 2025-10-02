import { createSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(request.url);

    const trustCode = searchParams.get('trust_code');
    const stage = searchParams.get('stage');
    const opportunityOwner = searchParams.get('opportunity_owner');

    let query = supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false});

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

    // Get unique trust codes to fetch trust names
    const trustCodes = [...new Set(data?.map((opp: any) => opp.trust_code).filter(Boolean))];

    // Fetch trust names from trust_metrics
    const { data: trustData } = await supabase
      .from('trust_metrics')
      .select('trust_code, trust_name')
      .in('trust_code', trustCodes);

    // Create a map of trust_code to trust_name
    const trustNameMap = new Map(
      trustData?.map((t: any) => [t.trust_code, t.trust_name]) || []
    );

    // Enrich opportunities with trust names
    const enrichedData = data?.map((opp: any) => ({
      ...opp,
      trust_name: trustNameMap.get(opp.trust_code) || null,
    }));

    return NextResponse.json({ data: enrichedData, error: null });
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

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        ...body,
        created_by: user.email,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-create or assign account for this trust
    if (data && data.trust_code) {
      try {
        // Check if account exists
        const { data: existingAccount } = await supabase
          .from('accounts')
          .select('*')
          .eq('trust_code', data.trust_code)
          .single();

        if (!existingAccount) {
          // No account exists - create one
          await supabase
            .from('accounts')
            .insert({
              trust_code: data.trust_code,
              account_owner: user.email,
              account_stage: 'prospect',
              created_by: user.email,
            });
        } else if (!existingAccount.account_owner) {
          // Account exists but has no owner - assign to current user
          await supabase
            .from('accounts')
            .update({ account_owner: user.email })
            .eq('trust_code', data.trust_code);
        }
        // If account has an owner, leave it unchanged
      } catch (accountError) {
        // Log error but don't fail the opportunity creation
        console.error('Error managing account:', accountError);
      }
    }

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

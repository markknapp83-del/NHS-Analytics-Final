import { supabaseAuth } from '@/lib/supabase-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trustCode: string }> }
) {
  try {
    const { trustCode } = await params;
    const { data, error } = await supabaseAuth
      .from('accounts')
      .select('*')
      .eq('trust_code', trustCode)
      .single();

    // If no account exists (PGRST116 = row not found), fetch trust data from trust_metrics
    if (!data && error?.code === 'PGRST116') {
      const trustResult = await supabaseAuth
        .from('trust_metrics')
        .select('trust_code, trust_name, icb_code, icb_name')
        .eq('trust_code', trustCode)
        .limit(1)
        .single();

      if (trustResult.error && trustResult.error.code !== 'PGRST116') {
        throw trustResult.error;
      }

      if (trustResult.data) {
        // Return a placeholder account structure with trust data
        // @ts-expect-error - Supabase type inference issue
        const trust_code = trustResult.data.trust_code;
        // @ts-expect-error - Supabase type inference issue
        const trust_name = trustResult.data.trust_name;
        // @ts-expect-error - Supabase type inference issue
        const icb_code = trustResult.data.icb_code;
        // @ts-expect-error - Supabase type inference issue
        const icb_name = trustResult.data.icb_name;

        return NextResponse.json({
          data: {
            trust_code,
            trust_name,
            icb_code,
            icb_name,
            account_owner: null,
            account_stage: null,
            last_contact_date: null,
            next_follow_up_date: null,
            days_since_contact: null,
            created_at: null,
            updated_at: null,
          },
          error: null,
        });
      }
    }

    // Handle other database errors
    if (error) {
      throw error;
    }

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ trustCode: string }> }
) {
  try {
    const { trustCode } = await params;
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // @ts-expect-error - Supabase type inference issue
    const { data, error } = await supabaseAuth.from('accounts').update(body).eq('trust_code', trustCode).select().single();

    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ trustCode: string }> }
) {
  try {
    const { trustCode } = await params;
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAuth
      .from('accounts')
      .delete()
      .eq('trust_code', trustCode);

    if (error) throw error;

    return NextResponse.json({ success: true, error: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

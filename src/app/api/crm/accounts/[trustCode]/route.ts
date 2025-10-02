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

    if (error && error.code !== 'PGRST116') throw error;

    // If no account exists, fetch trust data from trust_metrics
    if (!data || error?.code === 'PGRST116') {
      const { data: trustData } = await supabaseAuth
        .from('trust_metrics')
        .select('trust_code, trust_name, icb_code, icb_name')
        .eq('trust_code', trustCode)
        .limit(1)
        .single();

      if (trustData) {
        // Return a placeholder account structure with trust data
        return NextResponse.json({
          data: {
            trust_code: trustData.trust_code,
            trust_name: trustData.trust_name,
            icb_code: trustData.icb_code,
            icb_name: trustData.icb_name,
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

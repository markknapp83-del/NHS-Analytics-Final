import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin endpoint to create users with confirmed emails
// Uses service role key to bypass email confirmation
export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role, emailConfirmed } = await request.json();

    console.log('[Admin API] Create user request:', { email, fullName, role, emailConfirmed });

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create user with admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: emailConfirmed, // Skip email confirmation if checked
      user_metadata: {
        full_name: fullName,
      },
    });

    if (error) {
      console.error('[Admin API] Error creating user:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      console.error('[Admin API] No user returned');
      return NextResponse.json(
        { error: 'User creation failed - no user returned' },
        { status: 500 }
      );
    }

    console.log('[Admin API] User created:', data.user.id);

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update user profile with specified role
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        role,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user.id);

    if (profileError) {
      console.error('[Admin API] Error updating profile:', profileError);
      return NextResponse.json(
        { error: `Failed to update user profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    console.log('[Admin API] User profile updated with role:', role);

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
    });
  } catch (error: any) {
    console.error('[Admin API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

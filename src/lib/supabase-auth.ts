import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase browser client for SSR compatibility
// This uses cookies instead of localStorage, which works with server-side middleware
export const supabaseAuth = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (...args) => {
      console.log('[Supabase Fetch]', args[0]);
      return fetch(...args);
    }
  }
});

// Auth utility functions

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(email: string, password: string, fullName?: string) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Create a new user (admin only)
 * This creates both the auth user and the user profile
 * Uses the admin API endpoint to bypass email confirmation
 */
export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: 'data_only' | 'sales' | 'management' | 'system_administrator',
  emailConfirmed: boolean = false
) {
  console.log('[createUser] Creating user via admin API:', { email, fullName, role, emailConfirmed });

  // Call the admin API endpoint which uses service role key
  const response = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      fullName,
      role,
      emailConfirmed,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('[createUser] API error:', result);
    throw new Error(result.error || 'Failed to create user');
  }

  console.log('[createUser] User created successfully:', result.user);

  return result;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  console.log('[supabaseAuth] signOut called');
  const { error } = await supabaseAuth.auth.signOut();
  if (error) {
    console.error('[supabaseAuth] signOut error:', error);
    throw error;
  }
  console.log('[supabaseAuth] signOut successful');
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data, error } = await supabaseAuth.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Get the current user
 */
export async function getUser() {
  const { data, error } = await supabaseAuth.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Enroll in MFA (Two-Factor Authentication)
 */
export async function enrollMFA() {
  const { data, error } = await supabaseAuth.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'NHS Analytics 2FA',
  });

  if (error) throw error;
  return data;
}

/**
 * Verify MFA enrollment with code
 */
export async function verifyMFAEnrollment(factorId: string, code: string) {
  const { data, error } = await supabaseAuth.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });

  if (error) throw error;
  return data;
}

/**
 * Create MFA challenge for existing enrollment
 */
export async function createMFAChallenge(factorId: string) {
  const { data, error } = await supabaseAuth.auth.mfa.challenge({
    factorId,
  });

  if (error) throw error;
  return data;
}

/**
 * Verify MFA challenge with code
 */
export async function verifyMFAChallenge(factorId: string, challengeId: string, code: string) {
  const { data, error } = await supabaseAuth.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (error) throw error;
  return data;
}

/**
 * Get user's MFA factors
 */
export async function getMFAFactors() {
  const { data, error } = await supabaseAuth.auth.mfa.listFactors();
  if (error) throw error;
  return data;
}

/**
 * Unenroll from MFA
 */
export async function unenrollMFA(factorId: string) {
  const { data, error } = await supabaseAuth.auth.mfa.unenroll({
    factorId,
  });

  if (error) throw error;
  return data;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getUserProfile error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    throw error;
  }
  return data;
}

/**
 * Update user profile
 * Note: Currently unused. Use updateUserRole RPC for role updates.
 */
// export async function updateUserProfile(
//   userId: string,
//   updates: { full_name?: string; role?: 'user' | 'administrator' }
// ) {
//   const { data, error } = await supabaseAuth
//     .from('user_profiles')
//     .update(updates)
//     .eq('id', userId)
//     .select()
//     .single();

//   if (error) throw error;
//   return data;
// }

/**
 * Check if user is administrator (DEPRECATED - use RBAC utilities instead)
 * @deprecated Use getRolePermissions from @/lib/rbac instead
 */
export async function isAdministrator(userId: string): Promise<boolean> {
  try {
    console.log('Checking admin status for user:', userId);
    const profile = await getUserProfile(userId);
    const isAdmin = profile?.role === 'system_administrator' || profile?.role === 'management';
    console.log('isAdministrator result:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('isAdministrator caught error:', error);
    return false;
  }
}

/**
 * Get all user profiles (admin only)
 */
export async function getAllUserProfiles() {
  const { data, error } = await supabaseAuth
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  role: 'data_only' | 'sales' | 'management' | 'system_administrator'
) {
  const { error } = await supabaseAuth
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabaseAuth.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}
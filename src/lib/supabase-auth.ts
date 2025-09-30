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
export const supabaseAuth = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

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
  const { error } = await supabaseAuth.auth.signOut();
  if (error) throw error;
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
 * Check if user is administrator
 */
export async function isAdministrator(userId: string): Promise<boolean> {
  try {
    console.log('Checking admin status for user:', userId);
    const { data, error } = await (supabaseAuth.rpc as any)('is_administrator', {
      user_id: userId,
    });

    console.log('is_administrator RPC response:', { data, error });

    if (error) {
      console.error('is_administrator error:', error);
      throw error;
    }
    return data || false;
  } catch (error) {
    console.error('is_administrator caught error:', error);
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
export async function updateUserRole(userId: string, role: 'user' | 'administrator') {
  const { error } = await (supabaseAuth.rpc as any)('update_user_role', {
    target_user_id: userId,
    new_role: role,
  });

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
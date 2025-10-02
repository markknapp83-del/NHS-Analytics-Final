'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthContextValue, AuthState, UserProfile } from '@/types/auth';
import {
  supabaseAuth,
  signInWithPassword,
  signOut as authSignOut,
  getUserProfile,
} from '@/lib/supabase-auth';
import { getRolePermissions } from '@/lib/rbac';
import type { Session, User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
    canAccessAnalytics: false,
    canAccessCRM: false,
    canAccessTenders: false,
    canManageTeam: false,
    isSystemAdmin: false,
  });

  // Fetch user profile and compute permissions
  const loadUserProfile = async (user: User) => {
    try {
      console.log('Loading profile for user:', user.id);
      const profile = await getUserProfile(user.id);
      console.log('Profile loaded:', profile);

      const permissions = getRolePermissions(profile?.role || null);
      console.log('Permissions computed:', permissions);

      return {
        profile,
        permissions,
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const emptyPermissions = getRolePermissions(null);
      return {
        profile: null,
        permissions: emptyPermissions,
      };
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // CRITICAL FIX: Set auth state IMMEDIATELY with session data
        // This allows data queries to start without waiting for profile loading
        const emptyPermissions = getRolePermissions(null);
        setAuthState({
          user: session.user,
          session,
          profile: null,  // Will be loaded in background
          isLoading: false,  // Allow app to render immediately
          isAuthenticated: true,
          role: null,  // Will be updated when profile loads
          ...emptyPermissions,  // Default to no permissions
        });

        // Load profile in background (non-blocking)
        loadUserProfile(session.user).then(({ profile, permissions }) => {
          setAuthState(prev => ({
            ...prev,
            profile,
            role: profile?.role || null,
            ...permissions,
          }));
        });
      } else {
        const emptyPermissions = getRolePermissions(null);
        setAuthState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          role: null,
          ...emptyPermissions,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          // Set auth immediately, load profile in background
          const emptyPermissions = getRolePermissions(null);
          setAuthState({
            user: session.user,
            session,
            profile: null,
            isLoading: false,
            isAuthenticated: true,
            role: null,
            ...emptyPermissions,
          });

          loadUserProfile(session.user).then(({ profile, permissions }) => {
            setAuthState(prev => ({
              ...prev,
              profile,
              role: profile?.role || null,
              ...permissions,
            }));
          });
        } else {
          const emptyPermissions = getRolePermissions(null);
          setAuthState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            role: null,
            ...emptyPermissions,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { session, user } = await signInWithPassword(email, password);

      if (user) {
        const { profile, permissions } = await loadUserProfile(user);

        setAuthState({
          user,
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
          role: profile?.role || null,
          ...permissions,
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await authSignOut();
      const emptyPermissions = getRolePermissions(null);
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        role: null,
        ...emptyPermissions,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (authState.user) {
      const { profile, permissions } = await loadUserProfile(authState.user);

      setAuthState(prev => ({
        ...prev,
        profile,
        role: profile?.role || null,
        ...permissions,
      }));
    }
  };

  const value: AuthContextValue = {
    ...authState,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
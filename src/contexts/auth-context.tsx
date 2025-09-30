'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthContextValue, AuthState, UserProfile } from '@/types/auth';
import {
  supabaseAuth,
  signInWithPassword,
  signOut as authSignOut,
  getUserProfile,
  isAdministrator,
} from '@/lib/supabase-auth';
import type { Session, User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isAdministrator: false,
  });

  // Fetch user profile and check admin status
  const loadUserProfile = async (user: User) => {
    try {
      console.log('Loading profile for user:', user.id);
      const profile = await getUserProfile(user.id);
      console.log('Profile loaded:', profile);
      const isAdmin = await isAdministrator(user.id);
      console.log('Admin check result:', isAdmin);

      return {
        profile,
        isAdmin,
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return {
        profile: null,
        isAdmin: false,
      };
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { profile, isAdmin } = await loadUserProfile(session.user);

        setAuthState({
          user: session.user,
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
          isAdministrator: isAdmin,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isAdministrator: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          const { profile, isAdmin } = await loadUserProfile(session.user);

          setAuthState({
            user: session.user,
            session,
            profile,
            isLoading: false,
            isAuthenticated: true,
            isAdministrator: isAdmin,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            isAdministrator: false,
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
        const { profile, isAdmin } = await loadUserProfile(user);

        setAuthState({
          user,
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
          isAdministrator: isAdmin,
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
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        isAdministrator: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (authState.user) {
      const { profile, isAdmin } = await loadUserProfile(authState.user);

      setAuthState(prev => ({
        ...prev,
        profile,
        isAdministrator: isAdmin,
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
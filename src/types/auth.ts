import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'data_only' | 'sales' | 'management' | 'system_administrator';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  profile?: UserProfile;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  // Role-based permission flags
  canAccessAnalytics: boolean;
  canAccessCRM: boolean;
  canAccessTenders: boolean;
  canManageTeam: boolean;
  isSystemAdmin: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface MFAEnrollment {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export interface MFAChallenge {
  id: string;
  type: 'totp';
  expires_at: number;
}
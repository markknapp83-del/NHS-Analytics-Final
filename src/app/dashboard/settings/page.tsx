'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAllUserProfiles,
  updateUserRole,
  sendPasswordResetEmail,
  getMFAFactors,
} from '@/lib/supabase-auth';
import { MFASetup } from '@/components/auth/mfa-setup';
import type { UserProfile } from '@/types/auth';
import {
  Users,
  Shield,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { isAdministrator, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [hasMFA, setHasMFA] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAdministrator) {
        router.push('/dashboard');
      } else {
        loadUsers();
        checkMFAStatus();
      }
    }
  }, [isAdministrator, authLoading, router]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const profiles = await getAllUserProfiles();
      setUsers(profiles);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const checkMFAStatus = async () => {
    try {
      const factors = await getMFAFactors();
      setHasMFA(factors.totp.some(f => f.status === 'verified'));
    } catch (err) {
      console.error('Failed to check MFA status:', err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'administrator') => {
    setError(null);
    setSuccess(null);

    try {
      await updateUserRole(userId, newRole);
      setSuccess('User role updated successfully');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handlePasswordReset = async (email: string) => {
    setError(null);
    setSuccess(null);

    try {
      await sendPasswordResetEmail(email);
      setSuccess(`Password reset email sent to ${email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    }
  };

  const handleMFASetupComplete = () => {
    setShowMFASetup(false);
    setHasMFA(true);
    setSuccess('Two-factor authentication has been enabled successfully');
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[#005eb8]" />
      </div>
    );
  }

  if (!isAdministrator) {
    return null;
  }

  if (showMFASetup) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <MFASetup
          onSuccess={handleMFASetupComplete}
          onCancel={() => setShowMFASetup(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage users and security settings</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Security Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[#005eb8]" />
          <h2 className="text-xl font-semibold">Security</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
          <div className="flex items-center gap-3">
            {hasMFA ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldOff className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">
                {hasMFA
                  ? 'Your account is protected with 2FA'
                  : 'Add an extra layer of security to your account'}
              </p>
            </div>
          </div>
          {!hasMFA && (
            <Button
              onClick={() => setShowMFASetup(true)}
              className="bg-[#005eb8] hover:bg-[#003d7a]"
            >
              Enable 2FA
            </Button>
          )}
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-[#005eb8]" />
          <h2 className="text-xl font-semibold">User Management</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{profile.full_name}</p>
                      <p className="text-sm text-gray-600">{profile.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Select
                      value={profile.role}
                      onValueChange={(value: 'user' | 'administrator') =>
                        handleRoleChange(profile.id, value)
                      }
                      disabled={profile.id === user?.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // In a real app, you'd need to get the email from auth.users
                        // For now, we'll show an alert
                        const email = prompt('Enter user email for password reset:');
                        if (email) {
                          handlePasswordReset(email);
                        }
                      }}
                      className="text-[#005eb8] hover:text-[#003d7a]"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}
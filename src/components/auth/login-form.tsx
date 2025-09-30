'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { getMFAFactors, createMFAChallenge } from '@/lib/supabase-auth';
import { MFAVerify } from './mfa-verify';
import { AlertCircle, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      console.log('Step 1: Calling signIn...');
      await signIn(email, password);
      console.log('Step 2: signIn completed successfully');

      // Check if MFA is enabled
      console.log('Step 3: Checking MFA factors...');
      try {
        const factors = await getMFAFactors();
        console.log('Step 4: MFA factors retrieved:', factors);
        const totpFactor = factors?.totp?.find(f => f.status === 'verified');

        if (totpFactor) {
          console.log('Step 5: MFA required, creating challenge');
          // Create MFA challenge
          const challenge = await createMFAChallenge(totpFactor.id);
          setMfaChallengeId(challenge.id);
          setMfaRequired(true);
          setIsLoading(false);
          return;
        }
        console.log('Step 5: No MFA required');
      } catch (mfaError) {
        console.error('Error checking MFA factors:', mfaError);
        // Continue to redirect even if MFA check fails
      }

      // No MFA required, redirect to dashboard
      console.log('Step 6: Waiting for cookies to persist...');
      // Wait a moment for session cookies to be written
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Step 7: Redirecting to dashboard...');
      // Use window.location to force a full page reload and ensure cookies are synced
      window.location.href = '/dashboard';
      console.log('Step 8: Redirect called');
    } catch (err: any) {
      console.error('Login error caught:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleMFASuccess = () => {
    window.location.href = '/dashboard';
  };

  if (mfaRequired && mfaChallengeId) {
    return (
      <MFAVerify
        challengeId={mfaChallengeId}
        onSuccess={handleMFASuccess}
        onCancel={() => {
          setMfaRequired(false);
          setMfaChallengeId(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-[#005eb8]">NHS Analytics</h1>
        <p className="text-gray-600">Sign in to access the dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#005eb8] hover:bg-[#003d7a]"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-[#005eb8] hover:underline font-medium"
            disabled={isLoading}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
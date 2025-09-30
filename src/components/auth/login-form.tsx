'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/auth-context';
import { getMFAFactors, createMFAChallenge } from '@/lib/supabase-auth';
import { MFAVerify } from './mfa-verify';
import { AlertCircle, Loader2, Mail, Lock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  onSwitchToSignUp: () => void;
}

export function LoginForm({ onSwitchToSignUp }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

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
          setMfaFactorId(totpFactor.id);
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

  if (mfaRequired && mfaChallengeId && mfaFactorId) {
    return (
      <MFAVerify
        factorId={mfaFactorId}
        challengeId={mfaChallengeId}
        onSuccess={handleMFASuccess}
        onCancel={() => {
          setMfaRequired(false);
          setMfaChallengeId(null);
          setMfaFactorId(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* NHS Logo Icon */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-nhs-blue rounded-full flex items-center justify-center shadow-lg">
          <Building2 className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-text-primary">NHS Analytics</h1>
        <p className="text-text-secondary text-sm">Sign in to access the dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className={cn(
                "pl-10 h-12 border transition-all",
                error && "border-red-500 focus:ring-red-500/20"
              )}
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <button
              type="button"
              className="text-xs text-nhs-blue hover:underline"
              onClick={() => {/* TODO: Implement forgot password */}}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className={cn(
                "pl-10 h-12 border transition-all",
                error && "border-red-500 focus:ring-red-500/20"
              )}
            />
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          />
          <Label
            htmlFor="remember"
            className="text-sm text-text-secondary cursor-pointer"
          >
            Remember me for 30 days
          </Label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Sign In Button */}
        <Button
          type="submit"
          className="w-full h-12 bg-nhs-blue hover:bg-nhs-dark-blue transition-colors shadow-md hover:shadow-lg"
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

      {/* Footer */}
      <div className="text-center">
        <p className="text-sm text-text-secondary">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-nhs-blue font-medium hover:underline"
            disabled={isLoading}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
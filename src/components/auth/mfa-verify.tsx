'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyMFAChallenge } from '@/lib/supabase-auth';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface MFAVerifyProps {
  challengeId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerify({ challengeId, onSuccess, onCancel }: MFAVerifyProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await verifyMFAChallenge(challengeId, code);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setCode('');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="p-3 bg-[#005eb8]/10 rounded-full">
            <ShieldCheck className="h-8 w-8 text-[#005eb8]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[#005eb8]">Two-Factor Authentication</h2>
        <p className="text-gray-600">Enter the 6-digit code from your authenticator app</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            required
            disabled={isLoading}
            className="text-center text-2xl tracking-widest"
            autoComplete="off"
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#005eb8] hover:bg-[#003d7a]"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
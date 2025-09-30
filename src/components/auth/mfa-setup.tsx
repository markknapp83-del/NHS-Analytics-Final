'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enrollMFA, verifyMFAEnrollment } from '@/lib/supabase-auth';
import { AlertCircle, CheckCircle, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import type { MFAEnrollment } from '@/types/auth';

interface MFASetupProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function MFASetup({ onSuccess, onCancel }: MFASetupProps) {
  const [enrollment, setEnrollment] = useState<MFAEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(true);

  useEffect(() => {
    initializeEnrollment();
  }, []);

  const initializeEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const data = await enrollMFA();
      setEnrollment(data as MFAEnrollment);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize MFA enrollment');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!enrollment) {
      setError('Enrollment not initialized');
      setIsLoading(false);
      return;
    }

    try {
      await verifyMFAEnrollment(enrollment.id, code);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setCode('');
      setIsLoading(false);
    }
  };

  if (isEnrolling) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#005eb8]" />
        <p className="text-gray-600">Setting up two-factor authentication...</p>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-red-600">{error || 'Failed to initialize MFA enrollment'}</p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="p-3 bg-[#005eb8]/10 rounded-full">
            <ShieldCheck className="h-8 w-8 text-[#005eb8]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[#005eb8]">Set Up Two-Factor Authentication</h2>
        <p className="text-gray-600">Scan the QR code with your authenticator app</p>
      </div>

      <div className="space-y-6">
        {/* QR Code */}
        <div className="flex justify-center p-6 bg-white border-2 border-gray-200 rounded-lg">
          {enrollment.totp.qr_code ? (
            <img
              src={enrollment.totp.qr_code}
              alt="QR Code for MFA setup"
              className="w-48 h-48"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-48 h-48 bg-gray-100 rounded">
              <QrCode className="h-16 w-16 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">QR Code not available</p>
            </div>
          )}
        </div>

        {/* Secret Key */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Or enter this key manually:</Label>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <code className="text-sm font-mono break-all">{enrollment.totp.secret}</code>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
            <li>Scan the QR code or enter the key manually</li>
            <li>Enter the 6-digit code from your app below</li>
          </ol>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
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
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
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
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
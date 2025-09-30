'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { SignUpForm } from '@/components/auth/signup-form';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-nhs-gradient flex items-center justify-center p-4 relative">
      {/* Optional: Subtle geometric pattern overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <Card className="w-full max-w-md shadow-2xl relative z-10">
        <CardContent className="pt-8 pb-6 px-8">
          {isSignUp ? (
            <SignUpForm onSwitchToSignIn={() => setIsSignUp(false)} />
          ) : (
            <LoginForm onSwitchToSignUp={() => setIsSignUp(true)} />
          )}
        </CardContent>
      </Card>

      {/* Version Number */}
      <div className="absolute bottom-4 right-4 text-xs text-white/60">
        v1.7.0
      </div>
    </div>
  );
}
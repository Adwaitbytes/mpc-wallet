'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Shield, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggle } = useTheme();
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/onboarding';

  // If already signed in, redirect based on user state
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetch('/api/user/state')
        .then((r) => r.json())
        .then((data) => {
          switch (data.state) {
            case 'active_child':
              router.replace('/child');
              break;
            case 'active_parent':
              router.replace('/parent');
              break;
            case 'pending_parents':
              router.replace('/status');
              break;
            case 'invited_parent':
              router.replace('/status');
              break;
            default:
              router.replace('/onboarding');
          }
        })
        .catch(() => router.replace('/onboarding'));
    }
  }, [status, session, router, callbackUrl]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } catch {
      setLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60%] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[30%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="fixed top-5 right-5 z-50 p-2 rounded-lg transition-all duration-200 hover:scale-110"
        style={{ color: 'var(--text-s)' }}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Auth card */}
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="card p-8 glow-indigo">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">StellaRay Guardian</h1>
            <p className="text-sm mt-2 text-center" style={{ color: 'var(--text-s)' }}>
              Your family&apos;s self-custodial wallet on Stellar
            </p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-50"
            style={{
              background: 'var(--inner-bg)',
              border: '1px solid var(--inner-border)',
              color: 'var(--text)',
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--card-border)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-t)' }}>HOW IT WORKS</span>
            <div className="flex-1 h-px" style={{ background: 'var(--card-border)' }} />
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { step: '1', text: 'Sign in with your Google account' },
              { step: '2', text: 'Add your parents as guardians' },
              { step: '3', text: 'Parents accept — wallet created' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 inner-panel px-4 py-2.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-indigo-400">{item.step}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-s)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] mt-6" style={{ color: 'var(--text-t)' }}>
            By signing in, you agree to use the Stellar testnet.
            <br />No real funds are involved.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/')}
            className="text-xs flex items-center gap-1 mx-auto transition-colors"
            style={{ color: 'var(--text-t)' }}
          >
            <ArrowRight className="w-3 h-3 rotate-180" />
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

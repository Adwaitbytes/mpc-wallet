'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Shield, Loader2, CheckCircle2, AlertCircle,
  UserCheck, Sun, Moon, Wallet,
} from 'lucide-react';
import { useTheme } from '../../components/ThemeProvider';

type InviteData = {
  childName: string;
  childEmail: string;
  role: string;
  allowanceXlm: number;
};

export default function InvitePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { theme, toggle } = useTheme();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          if (data.alreadyAccepted) {
            setAccepted(true);
          }
          setError(data.error);
        } else {
          setInvite(data);
        }
        setLoadingInvite(false);
      })
      .catch(() => {
        setError('Failed to load invitation');
        setLoadingInvite(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (sessionStatus !== 'authenticated') {
      // Need to sign in first, then come back
      await signIn('google', { callbackUrl: `/invite/${token}` });
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept');
        setAccepting(false);
        return;
      }

      setAccepted(true);
      setWalletCreated(data.walletCreated);

      // Redirect after a moment
      setTimeout(() => {
        router.push(data.walletCreated ? '/parent' : '/status');
      }, 3000);
    } catch {
      setError('Network error');
      setAccepting(false);
    }
  };

  if (loadingInvite) {
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

      <button onClick={toggle} className="fixed top-5 right-5 z-50 p-2 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="card p-8 glow-indigo">
          {/* Success state */}
          {accepted && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                {walletCreated ? <Wallet className="w-8 h-8 text-white" /> : <CheckCircle2 className="w-8 h-8 text-white" />}
              </div>
              <h1 className="text-2xl font-bold mb-2">
                {walletCreated ? 'Wallet Created!' : 'Invitation Accepted!'}
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-s)' }}>
                {walletCreated
                  ? 'Both parents are in — the family wallet is live on Stellar! Redirecting to your dashboard...'
                  : 'Waiting for the other parent to accept. Redirecting...'}
              </p>
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* Error state */}
          {error && !accepted && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold mb-2">Invitation Error</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-s)' }}>{error}</p>
              <button onClick={() => router.push('/auth')} className="btn-primary px-6 py-2.5 text-sm">
                Go to sign in
              </button>
            </div>
          )}

          {/* Invitation details */}
          {invite && !accepted && !error && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-xl font-bold mb-1">You&apos;re invited!</h1>
                <p className="text-sm" style={{ color: 'var(--text-s)' }}>
                  <strong style={{ color: 'var(--text)' }}>{invite.childName}</strong> wants to add you as a guardian
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>YOUR ROLE</div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    Guardian Parent
                  </div>
                </div>
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>WHAT THIS MEANS</div>
                  <div className="text-xs" style={{ color: 'var(--text-s)' }}>
                    You&apos;ll hold one key share of the family vault and approve {invite.childName}&apos;s spending requests using 2-of-3 MPC signing.
                  </div>
                </div>
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>WEEKLY ALLOWANCE</div>
                  <div className="text-sm font-semibold number-display text-emerald-400">{invite.allowanceXlm} XLM</div>
                </div>
              </div>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="btn-primary w-full px-6 py-3 text-sm disabled:opacity-60"
              >
                {accepting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Accepting...</>
                ) : sessionStatus === 'authenticated' ? (
                  <><CheckCircle2 className="w-4 h-4" /> Accept Invitation</>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google to accept
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

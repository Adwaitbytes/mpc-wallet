'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Shield, CheckCircle2, Clock, Loader2,
  Users, Wallet, Sun, Moon, ArrowRight,
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

type Member = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  shareIndex: number;
  acceptedAt: string | null;
};

type FamilyStatus = {
  familyId: string;
  status: string;
  walletPublicKey: string | null;
  walletFunded: boolean;
  allowanceXlm: number;
  members: Member[];
};

export default function StatusPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [family, setFamily] = useState<FamilyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(() => {
    fetch('/api/family/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setLoading(false);
          return;
        }
        setFamily(data);
        setLoading(false);

        // If wallet is active, redirect to the appropriate dashboard
        if (data.status === 'active') {
          const me = data.members.find((m: Member) => m.role === 'child');
          if (me) {
            setTimeout(() => router.replace('/child'), 2000);
          } else {
            setTimeout(() => router.replace('/parent'), 2000);
          }
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/auth');
      return;
    }
    if (sessionStatus === 'authenticated') {
      fetchStatus();
      // Poll every 5 seconds
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionStatus, router, fetchStatus]);

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const parents = family?.members.filter((m) => m.role === 'parent') || [];
  const acceptedCount = parents.filter((p) => p.status === 'accepted').length;
  const isActive = family?.status === 'active';

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
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
              isActive
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20'
                : 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/20'
            }`}>
              {isActive ? <Wallet className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
            </div>
            <h1 className="text-2xl font-bold mb-1">
              {isActive ? 'Wallet is Live!' : 'Waiting for Parents'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-s)' }}>
              {isActive
                ? 'Your family vault is active on Stellar. Redirecting...'
                : `${acceptedCount}/2 parents have accepted`}
            </p>
          </div>

          {/* Members list */}
          <div className="space-y-3 mb-6">
            {parents.map((parent) => (
              <div key={parent.id} className="inner-panel px-4 py-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  parent.status === 'accepted'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-zinc-600 to-zinc-700'
                }`}>
                  {parent.name ? parent.name[0].toUpperCase() : parent.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{parent.name || parent.email}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-t)' }}>
                    {parent.name ? parent.email : 'Invitation sent'}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {parent.status === 'accepted' ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Joined
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-t)' }}>
                      <Clock className="w-4 h-4" />
                      Pending
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress indicator */}
          {!isActive && (
            <div className="inner-panel p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-xs font-medium text-indigo-400">Polling for updates...</span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-t)' }}>
                Once both parents accept, your Stellar wallet will be created automatically
              </p>
            </div>
          )}

          {/* Active state: show wallet info */}
          {isActive && family?.walletPublicKey && (
            <div className="space-y-3">
              <div className="inner-panel px-4 py-3">
                <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>WALLET ADDRESS</div>
                <div className="text-xs font-mono break-all" style={{ color: 'var(--text-s)' }}>{family.walletPublicKey}</div>
              </div>
              <div className="inner-panel px-4 py-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${family.walletFunded ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-xs">{family.walletFunded ? 'Funded via Friendbot (testnet)' : 'Awaiting funding'}</span>
              </div>

              <button onClick={() => router.push('/child')} className="btn-primary w-full px-6 py-3 text-sm mt-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* No family state */}
          {!family && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-600/20 to-zinc-700/20 border border-zinc-500/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" style={{ color: 'var(--text-t)' }} />
              </div>
              <h1 className="text-xl font-bold mb-2">No family yet</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--text-s)' }}>
                Set up your family vault to get started
              </p>
              <button onClick={() => router.push('/onboarding')} className="btn-primary px-6 py-2.5 text-sm">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

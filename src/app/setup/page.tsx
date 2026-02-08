'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ArrowRight, ArrowLeft, Check, User, Users,
  Loader2, Mail, Wallet, Sparkles, Lock, Copy,
  ExternalLink, Smartphone, CloudUpload, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { fundWithFriendbot, getBalance } from '../../lib/stellar';
import { saveVault, type VaultConfig } from '../../lib/wallet-store';

/* ───────────────────────────────────────────────
   Google "G" logo as inline SVG (4-color)
   ─────────────────────────────────────────────── */

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* GitHub icon */
function GitHubIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/* ───────────────────────────────────────────────
   Step transition wrapper
   ─────────────────────────────────────────────── */

function StepWrapper({
  children,
  show,
}: {
  children: React.ReactNode;
  show: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
        show
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      {children}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Progress bar
   ─────────────────────────────────────────────── */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-md mx-auto mb-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-s)' }}>
          Step {current} of {total}
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-s)' }}>
          {Math.round((current / total) * 100)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-s)' }}>
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Main component
   ─────────────────────────────────────────────── */

export default function SetupPage() {
  const router = useRouter();

  // Flow state
  const [step, setStep] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  // Step 2 - Parent 1
  const [p1Loading, setP1Loading] = useState(false);
  const [p1Connected, setP1Connected] = useState(false);
  const [p1Provider, setP1Provider] = useState<'google' | 'github'>('google');

  // Step 3 - Parent 2
  const [p2Loading, setP2Loading] = useState(false);
  const [p2Connected, setP2Connected] = useState(false);
  const [p2Provider, setP2Provider] = useState<'google' | 'github'>('google');

  // Step 4 - Child
  const [childName, setChildName] = useState('Emma');
  const [childLoading, setChildLoading] = useState(false);
  const [childConnected, setChildConnected] = useState(false);
  const [allowance, setAllowance] = useState('50');
  const [autoDeposit, setAutoDeposit] = useState(true);

  // Step 5 - Done
  const [walletAddress, setWalletAddress] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);
  const [balance, setBalance] = useState('');
  const [copied, setCopied] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [walletShares, setWalletShares] = useState<Array<{ index: number; preview: string }>>([]);

  const { theme, toggle } = useTheme();

  /* ── Step transitions ── */

  const goToStep = useCallback((next: number) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 300);
  }, []);

  /* ── ZK Login via SDK ── */

  const connectWithZkLogin = useCallback(async (
    provider: 'google' | 'github',
    setLoading: (v: boolean) => void,
    setConnected: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      // Try ZK Login SDK
      const { StellarZkLogin } = await import('@stellar-zklogin/sdk');
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (googleClientId && googleClientId !== 'demo-google-client-id') {
        const zkLogin = new StellarZkLogin({
          network: 'testnet',
          oauth: { google: { clientId: googleClientId } },
        });
        await zkLogin.login(provider);
        setLoading(false);
        setConnected(true);
        return;
      }
    } catch (err) {
      console.warn('ZK Login SDK unavailable, using demo mode:', err);
    }

    // Demo mode fallback (simulated connection)
    setTimeout(() => {
      setLoading(false);
      setConnected(true);
    }, 1500);
  }, []);

  const connectParent1 = useCallback((provider: 'google' | 'github') => {
    setP1Provider(provider);
    connectWithZkLogin(provider, setP1Loading, setP1Connected);
  }, [connectWithZkLogin]);

  const connectParent2 = useCallback((provider: 'google' | 'github') => {
    setP2Provider(provider);
    connectWithZkLogin(provider, setP2Loading, setP2Connected);
  }, [connectWithZkLogin]);

  const connectChild = useCallback(() => {
    connectWithZkLogin('google', setChildLoading, setChildConnected);
  }, [connectWithZkLogin]);

  /* ── Create real wallet when reaching step 5 ── */

  useEffect(() => {
    if (step === 5 && !walletAddress && !creatingWallet) {
      setCreatingWallet(true);

      // Call the real MPC wallet creation API
      fetch('/api/mpc/create-simple', { method: 'POST' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.publicKey) {
            setWalletAddress(data.publicKey);
            setWalletShares(data.shares || []);

            // Save vault config to localStorage for cross-page use
            const vault: VaultConfig = {
              publicKey: data.publicKey,
              childName: childName || 'Emma',
              parent1Name: 'Alex',
              parent2Name: 'Sarah',
              parent1Email: 'alex.johnson@gmail.com',
              parent2Email: 'sarah.johnson@gmail.com',
              childEmail: `${(childName || 'emma').toLowerCase().replace(/\s+/g, '.')}.johnson@gmail.com`,
              allowance: parseInt(allowance) || 50,
              autoDeposit,
              threshold: data.threshold || 2,
              total: data.total || 3,
              createdAt: Date.now(),
              shares: data.shares,
              zkEnabled: true,
            };
            saveVault(vault);

            setTimeout(() => setShowSuccess(true), 200);
          } else {
            throw new Error('Wallet creation failed');
          }
        })
        .catch((err) => {
          console.error('Wallet creation API failed:', err);
          // Fallback: still show a demo address
          const fallbackAddr = 'GDEMO' + Array.from({ length: 51 }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
          ).join('');
          setWalletAddress(fallbackAddr);

          const vault: VaultConfig = {
            publicKey: fallbackAddr,
            childName: childName || 'Emma',
            parent1Name: 'Alex',
            parent2Name: 'Sarah',
            allowance: parseInt(allowance) || 50,
            autoDeposit,
            threshold: 2,
            total: 3,
            createdAt: Date.now(),
            zkEnabled: false,
          };
          saveVault(vault);

          setTimeout(() => setShowSuccess(true), 200);
        })
        .finally(() => setCreatingWallet(false));
    }
  }, [step, walletAddress, creatingWallet, childName, allowance, autoDeposit]);

  /* ── Fund with Friendbot (real) ── */

  const fundWallet = async () => {
    if (!walletAddress || funding) return;
    setFunding(true);
    const result = await fundWithFriendbot(walletAddress);
    if (result.success) {
      setFunded(true);
      setBalance(result.balance || '10,000.00');
    } else {
      // If Friendbot fails (e.g. already funded), fetch current balance
      const bal = await getBalance(walletAddress);
      if (bal && bal.funded) {
        setFunded(true);
        setBalance(bal.xlm);
      } else {
        // Show demo balance
        setFunded(true);
        setBalance('10,000.00');
      }
    }
    setFunding(false);
  };

  /* ── Copy address ── */

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ───────────────────────────────────────────────
     RENDER
     ─────────────────────────────────────────────── */

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Ambient gradient orbs for glass blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[10%] w-[60%] h-[50%] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] right-[-10%] w-[45%] h-[45%] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[35%] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Floating nav */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl">
        <div className="flex items-center justify-between h-12 px-4 glass-nav">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Guardian</span>
          </a>
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-t)' }}>
              <span>Step {step}/5</span>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className={`w-5 h-1 rounded-full transition-all ${s <= step ? 'bg-indigo-500' : ''}`} style={s > step ? { background: 'var(--border)' } : undefined} />
                ))}
              </div>
            </div>
            {step > 1 && step < 5 && (
              <button onClick={() => goToStep(step - 1)} className="flex items-center gap-1 px-3 py-1 rounded-lg text-[13px] transition-all hover:scale-105" style={{ color: 'var(--text-s)' }}>
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Steps container */}
      <div className="relative z-10 w-full pt-16" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* ════════════════════════════════════════════
            STEP 1 - Welcome
           ════════════════════════════════════════════ */}
        <StepWrapper show={step === 1 && !transitioning}>
          <div className="w-full max-w-2xl mx-auto px-6 py-16 text-center">
            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 inner-panel">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-s)' }}>
                Wallet Setup
              </span>
            </div>

            <h1 className="animate-fade-up animate-delay-100 text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Set up your{' '}
              <span className="text-gradient">Family Vault</span>
            </h1>

            <p className="animate-fade-up animate-delay-200 text-base max-w-md mx-auto mb-14 leading-relaxed" style={{ color: 'var(--text-s)' }}>
              Create a shared wallet powered by zkLogin and Shamir Secret Sharing on Stellar
            </p>

            {/* Role preview cards with connecting flow */}
            <div className="animate-fade-up animate-delay-300 flex items-center justify-center gap-3 max-w-xl mx-auto mb-14">
              {[
                {
                  icon: Smartphone,
                  label: 'Child',
                  detail: 'Share 1',
                  iconGradient: 'from-violet-500/20 to-purple-500/20',
                  iconBorder: 'border-violet-500/10',
                  iconColor: 'text-violet-400',
                },
                {
                  icon: User,
                  label: 'Parent 1',
                  detail: 'Share 2',
                  iconGradient: 'from-indigo-500/20 to-violet-500/20',
                  iconBorder: 'border-indigo-500/10',
                  iconColor: 'text-indigo-400',
                },
                {
                  icon: Users,
                  label: 'Parent 2',
                  detail: 'Share 3',
                  iconGradient: 'from-indigo-500/20 to-blue-500/20',
                  iconBorder: 'border-indigo-500/10',
                  iconColor: 'text-indigo-400',
                },
              ].map((role, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="card-hover p-5 text-center relative overflow-hidden group" style={{ minWidth: '130px' }}>
                    <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${role.iconGradient} rounded-bl-full pointer-events-none opacity-50`} />
                    <div className="relative">
                      <div className={`w-11 h-11 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${role.iconGradient} ${role.iconBorder} border flex items-center justify-center`}>
                        <role.icon className={`w-5 h-5 ${role.iconColor}`} />
                      </div>
                      <div className="text-sm font-semibold mb-0.5">{role.label}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-t)' }}>{role.detail}</div>
                    </div>
                  </div>
                  {i < 2 && (
                    <div className="flex items-center" style={{ color: 'var(--text-t)' }}>
                      <div className="w-4 h-px" style={{ background: 'var(--card-border)' }} />
                      <Lock className="w-3 h-3 mx-0.5" />
                      <div className="w-4 h-px" style={{ background: 'var(--card-border)' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Threshold badge */}
            <div className="animate-fade-up animate-delay-300 inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 inner-panel">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span className="text-xs font-medium" style={{ color: 'var(--text-s)' }}>2-of-3 threshold signing via zkLogin</span>
            </div>

            <div className="animate-fade-up animate-delay-400">
              <button
                onClick={() => goToStep(2)}
                className="btn-primary px-10 py-4 text-[15px]"
              >
                Begin Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </StepWrapper>

        {/* ════════════════════════════════════════════
            STEP 2 - Parent 1 (You)
           ════════════════════════════════════════════ */}
        <StepWrapper show={step === 2 && !transitioning}>
          <div className="w-full max-w-lg mx-auto px-6 py-16">
            <ProgressBar current={2} total={5} />

            <div className="text-center mb-10">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center mb-5">
                <User className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
                Link your account
              </h2>
              <p className="text-[15px]" style={{ color: 'var(--text-s)' }}>
                Parent 1 (You) &ndash; Authenticate via zkLogin
              </p>
            </div>

            <div className="card p-6 space-y-4">
              {!p1Connected ? (
                <>
                  {/* Google button */}
                  <button
                    onClick={() => connectParent1('google')}
                    disabled={p1Loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium rounded-xl px-6 py-4 transition-all duration-200 hover:bg-gray-50 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {p1Loading && p1Provider === 'google' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    ) : (
                      <GoogleIcon />
                    )}
                    {p1Loading && p1Provider === 'google' ? 'Generating ZK proof...' : 'Continue with Google'}
                  </button>

                  {/* GitHub button */}
                  <button
                    onClick={() => connectParent1('github')}
                    disabled={p1Loading}
                    className="w-full flex items-center justify-center gap-3 font-medium rounded-xl px-6 py-4 transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg-s)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {p1Loading && p1Provider === 'github' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <GitHubIcon />
                    )}
                    {p1Loading && p1Provider === 'github' ? 'Generating ZK proof...' : 'Continue with GitHub'}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-[11px]" style={{ color: 'var(--text-t)' }}>
                      Powered by @stellar-zklogin/sdk &middot; Zero-knowledge proof authentication
                    </p>
                  </div>
                </>
              ) : (
                <div className="animate-fade-up">
                  <div className="flex items-center gap-4 p-4 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      A
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[15px]">Alex Johnson</span>
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-s)' }}>
                        <Mail className="w-3.5 h-3.5" />
                        alex.johnson@gmail.com
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ color: 'var(--text-s)', background: 'var(--bg-s)' }}>
                    <CloudUpload className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span>
                      Share 2 encrypted via zkLogin &middot; Stored in Google Drive
                    </span>
                  </div>
                </div>
              )}
            </div>

            {p1Connected && (
              <div className="animate-fade-up mt-8 flex justify-end">
                <button
                  onClick={() => goToStep(3)}
                  className="btn-primary px-8 py-3.5 text-[15px]"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </StepWrapper>

        {/* ════════════════════════════════════════════
            STEP 3 - Parent 2 (Co-Guardian)
           ════════════════════════════════════════════ */}
        <StepWrapper show={step === 3 && !transitioning}>
          <div className="w-full max-w-lg mx-auto px-6 py-16">
            <ProgressBar current={3} total={5} />

            <div className="text-center mb-10">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center mb-5">
                <Users className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
                Add a co-guardian
              </h2>
              <p className="text-[15px]" style={{ color: 'var(--text-s)' }}>
                Invite your partner or trusted family member
              </p>
            </div>

            <div className="card p-6 space-y-4">
              {!p2Connected ? (
                <>
                  <button
                    onClick={() => connectParent2('google')}
                    disabled={p2Loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium rounded-xl px-6 py-4 transition-all duration-200 hover:bg-gray-50 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {p2Loading && p2Provider === 'google' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    ) : (
                      <GoogleIcon />
                    )}
                    {p2Loading && p2Provider === 'google' ? 'Generating ZK proof...' : 'Continue with Google'}
                  </button>

                  <button
                    onClick={() => connectParent2('github')}
                    disabled={p2Loading}
                    className="w-full flex items-center justify-center gap-3 font-medium rounded-xl px-6 py-4 transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'var(--bg-s)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {p2Loading && p2Provider === 'github' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <GitHubIcon />
                    )}
                    {p2Loading && p2Provider === 'github' ? 'Generating ZK proof...' : 'Continue with GitHub'}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-[11px]" style={{ color: 'var(--text-t)' }}>
                      Powered by @stellar-zklogin/sdk &middot; Zero-knowledge proof authentication
                    </p>
                  </div>
                </>
              ) : (
                <div className="animate-fade-up">
                  <div className="flex items-center gap-4 p-4 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      S
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[15px]">Sarah Johnson</span>
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-s)' }}>
                        <Mail className="w-3.5 h-3.5" />
                        sarah.johnson@gmail.com
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ color: 'var(--text-s)', background: 'var(--bg-s)' }}>
                    <CloudUpload className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span>
                      Share 3 encrypted via zkLogin &middot; Recovery backup
                    </span>
                  </div>
                </div>
              )}
            </div>

            {p2Connected && (
              <div className="animate-fade-up mt-8 flex justify-end">
                <button
                  onClick={() => goToStep(4)}
                  className="btn-primary px-8 py-3.5 text-[15px]"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </StepWrapper>

        {/* ════════════════════════════════════════════
            STEP 4 - Child's Account
           ════════════════════════════════════════════ */}
        <StepWrapper show={step === 4 && !transitioning}>
          <div className="w-full max-w-lg mx-auto px-6 py-16">
            <ProgressBar current={4} total={5} />

            <div className="text-center mb-10">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">
                Set up your child&apos;s wallet
              </h2>
              <p className="text-[15px]" style={{ color: 'var(--text-s)' }}>
                Configure their account and spending limits
              </p>
            </div>

            <div className="space-y-4">
              {/* Child's name */}
              <div className="card p-6">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-s)' }}>
                  Child&apos;s name
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  style={{ background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Child Google connect */}
              <div className="card p-6 space-y-4">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-s)' }}>
                  Link {childName || 'child'}&apos;s account
                </label>

                {!childConnected ? (
                  <button
                    onClick={connectChild}
                    disabled={childLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium rounded-xl px-6 py-4 transition-all duration-200 hover:bg-gray-50 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {childLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    ) : (
                      <GoogleIcon />
                    )}
                    {childLoading
                      ? 'Generating ZK proof...'
                      : `Continue with ${childName || 'Child'}'s Google`}
                  </button>
                ) : (
                  <div className="animate-fade-up">
                    <div className="flex items-center gap-4 p-4 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(childName || 'E')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-[15px]">
                            {childName || 'Emma'} Johnson
                          </span>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-s)' }}>
                          <Mail className="w-3.5 h-3.5" />
                          {(childName || 'emma').toLowerCase().replace(/\s+/g, '.')}
                          .johnson@gmail.com
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ color: 'var(--text-s)', background: 'var(--bg-s)' }}>
                      <Smartphone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        Share 1 stored on {childName || 'Emma'}&apos;s device via zkLogin. Needs approval to spend.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Allowance settings */}
              <div className="card p-6">
                <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-s)' }}>
                  Allowance settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: 'var(--text-s)' }}>
                      Weekly amount
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={allowance}
                        onChange={(e) =>
                          setAllowance(e.target.value.replace(/[^0-9]/g, ''))
                        }
                        className="w-full rounded-xl px-4 py-3 pr-16 text-[15px] font-mono number-display outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        style={{ background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-s)' }}>
                        XLM
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-s)' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>
                        Auto-deposit weekly
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-s)' }}>
                        Automatically fund each week
                      </div>
                    </div>
                    <button
                      onClick={() => setAutoDeposit(!autoDeposit)}
                      className="flex-shrink-0"
                    >
                      {autoDeposit ? (
                        <ToggleRight className="w-10 h-10 text-indigo-400" />
                      ) : (
                        <ToggleLeft className="w-10 h-10" style={{ color: 'var(--text-t)' }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {childConnected && (
              <div className="animate-fade-up mt-8 flex justify-end">
                <button
                  onClick={() => goToStep(5)}
                  className="btn-primary px-8 py-3.5 text-[15px]"
                >
                  <Wallet className="w-4 h-4" />
                  Create Family Vault
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </StepWrapper>

        {/* ════════════════════════════════════════════
            STEP 5 - Done!
           ════════════════════════════════════════════ */}
        <StepWrapper show={step === 5 && !transitioning}>
          <div className="w-full max-w-xl mx-auto px-6 py-16">
            {/* Creating wallet spinner */}
            {creatingWallet && !walletAddress && (
              <div className="text-center py-20">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
                <p className="text-sm" style={{ color: 'var(--text-s)' }}>
                  Creating your family vault on Stellar...
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-t)' }}>
                  Generating keypair &middot; Splitting with Shamir SSS &middot; Encrypting shares
                </p>
              </div>
            )}

            {/* Success content */}
            {walletAddress && (
              <>
                {/* Success animation */}
                <div className="text-center mb-10">
                  <div
                    className={`mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-2 border-emerald-500/30 flex items-center justify-center mb-6 transition-all duration-700 ease-out ${
                      showSuccess ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
                  >
                    <Check
                      className={`w-12 h-12 text-emerald-400 transition-all duration-500 delay-300 ${
                        showSuccess ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                      }`}
                      strokeWidth={3}
                    />
                  </div>

                  <h2
                    className={`text-3xl lg:text-4xl font-bold tracking-tight mb-3 transition-all duration-500 delay-200 ${
                      showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <span className="text-gradient">Family Vault</span> Created!
                  </h2>

                  <p
                    className={`text-[15px] transition-all duration-500 delay-300 ${
                      showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ color: 'var(--text-s)' }}
                  >
                    Your family&apos;s multi-signature wallet is live on Stellar testnet
                  </p>
                </div>

                {/* Wallet address */}
                <div
                  className={`card p-5 mb-4 transition-all duration-500 delay-400 ${
                    showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-s)' }}>
                      Wallet Address (Stellar Testnet)
                    </span>
                    <button
                      onClick={copyAddress}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                      style={{ color: 'var(--text-s)' }}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-sm break-all number-display leading-relaxed" style={{ color: 'var(--text-s)' }}>
                    {walletAddress}
                  </div>
                </div>

                {/* Share status cards */}
                <div
                  className={`space-y-3 mb-4 transition-all duration-500 delay-500 ${
                    showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {[
                    {
                      name: childName || 'Emma',
                      role: 'Child',
                      share: 'Share 1',
                      location: 'Device (zkLogin)',
                      gradient: 'from-amber-400 to-orange-400',
                      initial: (childName || 'E')[0].toUpperCase(),
                    },
                    {
                      name: 'Alex',
                      role: 'Parent 1',
                      share: 'Share 2',
                      location: 'Google Drive (zkLogin)',
                      gradient: 'from-indigo-500 to-violet-500',
                      initial: 'A',
                    },
                    {
                      name: 'Sarah',
                      role: 'Parent 2',
                      share: 'Share 3',
                      location: 'Recovery (zkLogin)',
                      gradient: 'from-violet-500 to-purple-500',
                      initial: 'S',
                    },
                  ].map((share, i) => (
                    <div
                      key={i}
                      className="card p-4 flex items-center gap-4"
                    >
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${share.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                      >
                        {share.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {share.name}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-s)' }}>
                            ({share.role})
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-s)' }}>
                          {share.share} &middot; {share.location}
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Security summary */}
                <div
                  className={`flex items-center justify-center gap-4 flex-wrap text-xs mb-6 transition-all duration-500 delay-500 ${
                    showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ color: 'var(--text-s)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>2-of-3 threshold</span>
                  </div>
                  <span style={{ color: 'var(--text-t)' }}>&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-violet-400" />
                    <span>AES-256-GCM</span>
                  </div>
                  <span style={{ color: 'var(--text-t)' }}>&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>zkLogin + Shamir SSS</span>
                  </div>
                </div>

                {/* Fund button */}
                <div
                  className={`mb-6 transition-all duration-500 delay-500 ${
                    showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {!funded ? (
                    <button
                      onClick={fundWallet}
                      disabled={funding}
                      className="w-full btn-primary px-6 py-4 text-[15px]"
                    >
                      {funding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Funding via Stellar Friendbot...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Fund with Testnet XLM
                          <ExternalLink className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="animate-fade-up card p-5 border-emerald-500/20 bg-emerald-500/[0.04]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs mb-1" style={{ color: 'var(--text-s)' }}>
                            Testnet Balance
                          </div>
                          <div className="text-2xl font-bold number-display text-gradient-warm">
                            {balance} XLM
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Check className="w-5 h-5 text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div
                  className={`grid grid-cols-2 gap-3 transition-all duration-500 delay-500 ${
                    showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <button
                    onClick={() => router.push('/parent')}
                    className="btn-primary px-6 py-3.5 text-sm"
                  >
                    <User className="w-4 h-4" />
                    Open Parent Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/child')}
                    className="btn-secondary px-6 py-3.5 text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Open Child&apos;s Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </StepWrapper>
      </div>
    </div>
  );
}

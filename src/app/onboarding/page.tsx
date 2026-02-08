'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Shield, ArrowRight, ArrowLeft, Mail, Users,
  Wallet, CheckCircle2, Loader2, Sun, Moon, AlertCircle,
  Copy, ExternalLink,
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

type Step = 'welcome' | 'parents' | 'allowance' | 'confirm' | 'done';
type InviteResult = { email: string; inviteUrl: string; success: boolean; fallback?: boolean };

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [step, setStep] = useState<Step>('welcome');
  const [parent1Email, setParent1Email] = useState('');
  const [parent2Email, setParent2Email] = useState('');
  const [allowance, setAllowance] = useState('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteResults, setInviteResults] = useState<InviteResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [status, router]);

  // Check if user already has a family
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/state')
        .then((r) => r.json())
        .then((data) => {
          if (data.state === 'active_child') router.replace('/child');
          else if (data.state === 'active_parent') router.replace('/parent');
          else if (data.state === 'pending_parents') router.replace('/status');
        })
        .catch(() => {});
    }
  }, [status, router]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent1Email: parent1Email.trim().toLowerCase(),
          parent2Email: parent2Email.trim().toLowerCase(),
          allowanceXlm: parseFloat(allowance) || 50,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      // Show invite links so user can share manually if email failed
      setInviteResults(data.invitations || []);
      setStep('done');
      setLoading(false);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const childName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60%] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[30%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Theme toggle */}
      <button onClick={toggle} className="fixed top-5 right-5 z-50 p-2 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="relative w-full max-w-lg animate-fade-up">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {(['welcome', 'parents', 'allowance', 'confirm', 'done'] as Step[]).map((s, i) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: i <= ['welcome', 'parents', 'allowance', 'confirm', 'done'].indexOf(step)
                  ? 'linear-gradient(to right, #6366f1, #8b5cf6)'
                  : 'var(--inner-border)',
              }}
            />
          ))}
        </div>

        <div className="card p-8 glow-indigo">
          {/* Step: Welcome */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Hey {childName}!</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--text-s)' }}>
                Let&apos;s set up your family vault. You&apos;ll need to invite your parents —
                once they both accept, your real Stellar wallet will be created with 2-of-3 MPC security.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { icon: Users, text: 'Invite 2 parents as guardians' },
                  { icon: Mail, text: 'They get email invitations' },
                  { icon: Wallet, text: 'Both accept → wallet is live' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 inner-panel px-4 py-3 text-left">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-s)' }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setStep('parents')} className="btn-primary w-full px-6 py-3 text-sm">
                Let&apos;s go <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step: Parent Emails */}
          {step === 'parents' && (
            <div>
              <button onClick={() => setStep('welcome')} className="flex items-center gap-1 text-xs mb-6 transition-colors" style={{ color: 'var(--text-t)' }}>
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Add your parents</h2>
                  <p className="text-xs" style={{ color: 'var(--text-t)' }}>They&apos;ll each hold a key share of your wallet</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-s)' }}>Parent 1 email</label>
                  <input
                    type="email"
                    value={parent1Email}
                    onChange={(e) => setParent1Email(e.target.value)}
                    placeholder="mom@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'var(--inner-bg)',
                      border: '1px solid var(--inner-border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-s)' }}>Parent 2 email</label>
                  <input
                    type="email"
                    value={parent2Email}
                    onChange={(e) => setParent2Email(e.target.value)}
                    placeholder="dad@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'var(--inner-bg)',
                      border: '1px solid var(--inner-border)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>

              {parent1Email && parent2Email && parent1Email.toLowerCase() === parent2Email.toLowerCase() && (
                <div className="flex items-center gap-2 mt-3 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Parent emails must be different
                </div>
              )}

              <button
                onClick={() => setStep('allowance')}
                disabled={!isValidEmail(parent1Email) || !isValidEmail(parent2Email) || parent1Email.toLowerCase() === parent2Email.toLowerCase()}
                className="btn-primary w-full px-6 py-3 text-sm mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step: Allowance */}
          {step === 'allowance' && (
            <div>
              <button onClick={() => setStep('parents')} className="flex items-center gap-1 text-xs mb-6 transition-colors" style={{ color: 'var(--text-t)' }}>
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Set allowance</h2>
                  <p className="text-xs" style={{ color: 'var(--text-t)' }}>How much XLM per week?</p>
                </div>
              </div>

              <div className="inner-panel p-6 text-center mb-6">
                <input
                  type="number"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  min="1"
                  max="10000"
                  className="text-4xl font-bold text-center bg-transparent outline-none w-32 number-display"
                  style={{ color: 'var(--text)' }}
                />
                <div className="text-sm mt-1" style={{ color: 'var(--text-t)' }}>XLM per week</div>
              </div>

              <div className="flex gap-2 mb-6">
                {['25', '50', '100', '200'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAllowance(amt)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: allowance === amt ? 'linear-gradient(to right, #6366f1, #8b5cf6)' : 'var(--inner-bg)',
                      color: allowance === amt ? 'white' : 'var(--text-s)',
                      border: `1px solid ${allowance === amt ? 'transparent' : 'var(--inner-border)'}`,
                    }}
                  >
                    {amt} XLM
                  </button>
                ))}
              </div>

              <button onClick={() => setStep('confirm')} className="btn-primary w-full px-6 py-3 text-sm">
                Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div>
              <button onClick={() => setStep('allowance')} className="flex items-center gap-1 text-xs mb-6 transition-colors" style={{ color: 'var(--text-t)' }}>
                <ArrowLeft className="w-3 h-3" /> Back
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Confirm & send</h2>
                  <p className="text-xs" style={{ color: 'var(--text-t)' }}>Review your family vault setup</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>YOUR ACCOUNT</div>
                  <div className="text-sm font-medium">{session?.user?.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-s)' }}>{session?.user?.email}</div>
                </div>
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>PARENT 1</div>
                  <div className="text-sm flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    {parent1Email}
                  </div>
                </div>
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>PARENT 2</div>
                  <div className="text-sm flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    {parent2Email}
                  </div>
                </div>
                <div className="inner-panel px-4 py-3">
                  <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-t)' }}>WEEKLY ALLOWANCE</div>
                  <div className="text-sm font-semibold number-display text-emerald-400">{allowance} XLM</div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full px-6 py-3 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending invitations...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send invitations
                  </>
                )}
              </button>

              <p className="text-center text-[10px] mt-4" style={{ color: 'var(--text-t)' }}>
                Both parents will receive an email with a link to accept.
                <br />Invitations expire in 7 days.
              </p>
            </div>
          )}

          {/* Step: Done — show invite links */}
          {step === 'done' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-1">Invitations sent!</h2>
                <p className="text-sm" style={{ color: 'var(--text-s)' }}>
                  Share these links with your parents so they can accept.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {inviteResults.map((inv, i) => (
                  <div key={i} className="inner-panel px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-medium" style={{ color: 'var(--text-t)' }}>PARENT {i + 1}</div>
                      {inv.success && !inv.fallback ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Email sent
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Share link manually
                        </span>
                      )}
                    </div>
                    <div className="text-sm mb-2" style={{ color: 'var(--text-s)' }}>{inv.email}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inv.inviteUrl);
                          setCopied(inv.email);
                          setTimeout(() => setCopied(null), 2000);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: copied === inv.email ? 'rgba(16,185,129,0.15)' : 'var(--inner-bg)',
                          border: `1px solid ${copied === inv.email ? 'rgba(16,185,129,0.3)' : 'var(--inner-border)'}`,
                          color: copied === inv.email ? '#10b981' : 'var(--text-s)',
                        }}
                      >
                        {copied === inv.email ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy link</>}
                      </button>
                      <a
                        href={inv.inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{ background: 'var(--inner-bg)', border: '1px solid var(--inner-border)', color: 'var(--text-s)' }}
                      >
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/status')}
                className="btn-primary w-full px-6 py-3 text-sm"
              >
                Go to waiting room <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-[10px] mt-4" style={{ color: 'var(--text-t)' }}>
                Send these links to your parents via WhatsApp, SMS, or any messenger.
                <br />Once both accept, your wallet will be created automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

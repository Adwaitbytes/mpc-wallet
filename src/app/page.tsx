'use client';

import { useRouter } from 'next/navigation';
import {
  Shield, ArrowRight, Lock, RefreshCw,
  ChevronRight, Clock, Wallet, UserCheck,
  Sparkles, KeyRound, TrendingUp, Users,
  CheckCircle2, XCircle, Globe, Send,
  ShieldCheck, Zap, User, Sun, Moon,
} from 'lucide-react';
import { useTheme } from './components/ThemeProvider';

export default function Home() {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen relative">
      {/* Page-wide ambient gradient orbs for glass blur effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60%] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[30%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[60%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[40%] rounded-full opacity-35" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* NAV */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
        <div className="flex items-center justify-between h-12 px-5 glass-nav">
          <button onClick={() => router.push('/')} className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Guardian</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {['Features', 'How it works', 'Security'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s/g, '-')}`}
                className="px-3 py-1 text-[13px] rounded-lg transition-all duration-150"
                style={{ color: 'var(--text-s)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-s)'}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
              style={{ color: 'var(--text-s)' }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => router.push('/parent')}
              className="hidden sm:block text-[13px] px-3 py-1 rounded-lg transition-all"
              style={{ color: 'var(--text-s)' }}
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/auth')}
              className="text-[13px] font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 rounded-xl transition-all duration-150 hover:shadow-lg hover:shadow-indigo-500/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-6 text-center pt-20">
          <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 inner-panel">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-s)' }}>
              Self-custodial family wallet on Stellar
            </span>
          </div>

          <h1 className="animate-fade-up animate-delay-100 text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.92] tracking-tight mb-6">
            Your child&apos;s first
            <br />
            <span className="text-gradient">real wallet</span>
          </h1>

          <p className="animate-fade-up animate-delay-200 text-base lg:text-lg max-w-lg mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-s)' }}>
            Kids spend, parents approve. No seed phrases, just Google Sign-In powered by MPC on Stellar
          </p>

          <div className="animate-fade-up animate-delay-300 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push('/auth')}
              className="btn-primary px-7 py-3 text-sm w-full sm:w-auto"
            >
              Set Up Family Wallet
              <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#how-it-works" className="btn-secondary px-7 py-3 text-sm w-full sm:w-auto">
              How it works
            </a>
          </div>

          <div className="animate-fade-up animate-delay-400 mt-14 flex items-center justify-center gap-6 text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-t)' }}>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> 2-of-3 MPC</span>
            <span className="w-px h-3" style={{ background: 'var(--card-border)' }} />
            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> AES-256-GCM</span>
            <span className="w-px h-3" style={{ background: 'var(--card-border)' }} />
            <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Stellar</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-indigo-400 mb-3 tracking-widest uppercase">Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Everything a family needs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Parental Approval - spans 2 cols */}
            <div className="lg:col-span-2 card-hover p-7 lg:p-8 relative overflow-hidden group">
              {/* Accent glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/[0.07] to-transparent rounded-bl-full pointer-events-none transition-opacity duration-500 group-hover:opacity-150" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Parental Approval Flow</h3>
                </div>
                <p className="text-sm leading-relaxed mb-6 max-w-md" style={{ color: 'var(--text-s)' }}>
                  Children hold 1 key share but need a parent&apos;s co-signature to spend. Any 1 parent can approve, no bottlenecks
                </p>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  {[
                    { Icon: User, label: 'Child', sub: 'Share 1', gradient: 'from-amber-500/15 to-orange-500/15', borderColor: 'border-amber-500/10', iconColor: 'text-amber-400' },
                    null,
                    { Icon: Send, label: 'Send 25 XLM', sub: 'Request', gradient: 'from-indigo-500/15 to-violet-500/15', borderColor: 'border-indigo-500/10', iconColor: 'text-indigo-400', dashed: true },
                    null,
                    { Icon: UserCheck, label: 'Parent 1', sub: 'Share 2', gradient: 'from-emerald-500/15 to-emerald-600/15', borderColor: 'border-emerald-500/10', iconColor: 'text-emerald-400' },
                    null,
                    { Icon: Zap, label: 'Signed', sub: '2-of-3', gradient: 'from-indigo-500/15 to-violet-500/15', borderColor: 'border-indigo-500/10', iconColor: 'text-indigo-400', highlight: true },
                  ].map((item, i) => {
                    if (!item) return <div key={i} className="flex items-center justify-center"><ChevronRight className="w-3 h-3 rotate-90 sm:rotate-0" style={{ color: 'var(--text-t)' }} /></div>;
                    return (
                      <div key={i} className={`flex-1 inner-panel px-3 py-3.5 text-center flex flex-col items-center bg-gradient-to-br ${item.gradient} ${item.borderColor} ${item.dashed ? 'border-dashed' : ''} ${item.highlight ? 'ring-1 ring-indigo-500/20' : ''}`}>
                        <item.Icon className={`w-4 h-4 mb-1.5 ${item.iconColor}`} />
                        <div className="text-[10px] font-medium" style={{ color: 'var(--text-t)' }}>{item.sub}</div>
                        <div className="text-xs font-medium" style={{ color: 'var(--text-s)' }}>{item.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Smart Allowance */}
            <div className="card-hover p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Smart Allowance</h3>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-s)' }}>
                  Auto-deposit XLM weekly with per-category limits
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Weekly deposit', value: '50 XLM', color: 'text-emerald-400' },
                    { label: 'Gaming limit', value: '15 XLM', color: 'text-amber-400' },
                    { label: 'Savings lock', value: '20%', color: 'text-indigo-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between inner-panel px-3.5 py-2">
                      <span className="text-[11px]" style={{ color: 'var(--text-t)' }}>{item.label}</span>
                      <span className={`text-[11px] font-semibold number-display ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Zero Seed Phrases */}
            <div className="card-hover p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/10 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Zero Seed Phrases</h3>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-s)' }}>
                  No 24 words, just Google Sign-In with ZK authentication
                </p>
                <div className="inner-panel p-3.5">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--inner-bg)', border: '1px solid var(--inner-border)' }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-medium">Sign in with Google</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-t)' }}>That&apos;s it</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>ZK-authenticated identity</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Graduating Autonomy */}
            <div className="card-hover p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Graduating Autonomy</h3>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-s)' }}>
                  Raise limits as kids grow, hand over full custody when ready
                </p>
                <div className="space-y-2">
                  {[
                    { age: 'Age 8', limit: '10 XLM/day', level: '20%' },
                    { age: 'Age 13', limit: '50 XLM/day', level: '55%' },
                    { age: 'Age 18', limit: 'Full access', level: '100%' },
                  ].map((item, i) => (
                    <div key={i} className="relative inner-panel px-3.5 py-2 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/10 to-transparent" style={{ width: item.level }} />
                      <div className="relative flex items-center justify-between">
                        <span className="text-[11px] font-medium" style={{ color: 'var(--text-s)' }}>{item.age}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-t)' }}>{item.limit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Social Recovery */}
            <div className="card-hover p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-cyan-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Social Recovery</h3>
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-s)' }}>
                  Lost a device? Any 2 of 3 family members recover the wallet
                </p>
                <div className="inner-panel p-3.5">
                  <div className="flex gap-2 mb-2.5">
                    {['Child', 'Mom', 'Dad'].map((m, i) => (
                      <div key={i} className={`flex-1 text-center text-[11px] py-2 rounded-lg font-medium ${
                        i < 2 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : ''
                      }`} style={i >= 2 ? { background: 'var(--inner-bg)', color: 'var(--text-t)', border: '1px solid var(--inner-border)' } : undefined}>{m}</div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>2-of-3 recovers full wallet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-medium text-violet-400 mb-3 tracking-widest uppercase">How it works</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Three steps to your family vault
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: '01', icon: Users, title: 'Create a family vault',
                desc: 'Sign in with Google. A Stellar keypair is generated client-side and split into 3 Shamir shares',
                gradient: 'from-indigo-500/[0.07] to-transparent', iconGradient: 'from-indigo-500/20 to-violet-500/20', iconBorder: 'border-indigo-500/10', iconColor: 'text-indigo-400', badgeColor: 'text-indigo-400',
              },
              {
                step: '02', icon: Wallet, title: 'Fund the allowance',
                desc: 'Send XLM to the vault. Set auto-deposits, spending limits and category controls',
                gradient: 'from-amber-500/[0.07] to-transparent', iconGradient: 'from-amber-500/20 to-orange-500/20', iconBorder: 'border-amber-500/10', iconColor: 'text-amber-400', badgeColor: 'text-amber-400',
              },
              {
                step: '03', icon: UserCheck, title: 'Spend and approve',
                desc: 'Child creates a request, parent co-signs. Once the 2-of-3 threshold is met the transaction broadcasts',
                gradient: 'from-emerald-500/[0.07] to-transparent', iconGradient: 'from-emerald-500/20 to-emerald-600/20', iconBorder: 'border-emerald-500/10', iconColor: 'text-emerald-400', badgeColor: 'text-emerald-400',
              },
            ].map((item, i) => (
              <div key={i} className="relative card-hover p-7 lg:p-8 overflow-hidden group">
                <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${item.gradient} rounded-bl-full pointer-events-none`} />
                <div className="absolute top-5 right-6 text-5xl font-black" style={{ color: 'var(--card-border)' }}>{item.step}</div>
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.iconGradient} ${item.iconBorder} border flex items-center justify-center mb-5`}>
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div className={`text-[10px] font-semibold ${item.badgeColor} mb-2 tracking-widest uppercase`}>Step {item.step}</div>
                  <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-s)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE PREVIEW */}
      <section className="relative py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-medium text-amber-400 mb-3 tracking-widest uppercase">Live preview</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">What parents see</h2>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="card p-0 overflow-hidden glow-indigo">
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[11px] font-medium text-indigo-400">Guardian</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-t)' }}>
                    <Clock className="w-2.5 h-2.5" />
                    <span>Just now</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white">E</div>
                  <div>
                    <div className="text-sm font-semibold">Emma wants to send</div>
                    <div className="text-xs" style={{ color: 'var(--text-t)' }}>To: GameStore</div>
                  </div>
                </div>

                <div className="inner-panel p-4 mb-5 text-center">
                  <div className="text-2xl font-bold number-display text-gradient-warm mb-0.5">25 XLM</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-t)' }}>~$3.75 USD</div>
                </div>

                <div className="space-y-2 mb-5 text-sm">
                  {[
                    { l: 'Category', r: <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-400" />Gaming</span> },
                    { l: 'Daily limit left', r: '75 / 100 XLM' },
                    { l: 'Network fee', r: '0.00001 XLM' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-t)' }}>{row.l}</span>
                      <span className="number-display" style={{ color: 'var(--text-s)' }}>{row.r}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-deny px-4 py-2.5 text-xs"><XCircle className="w-3.5 h-3.5" />Deny</button>
                  <button className="btn-approve px-4 py-2.5 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>
                </div>
              </div>

              <div className="px-5 py-2.5" style={{ borderTop: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-t)' }}>
                  <Lock className="w-2.5 h-2.5" />
                  <span>Co-signature completes 2-of-3 threshold</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" className="relative py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="card p-8 lg:p-12 glow-indigo relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row gap-10">
              <div className="flex-1">
                <p className="text-xs font-medium text-indigo-400 mb-3 tracking-widest uppercase">Security model</p>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-5">
                  Built for families, <span className="text-gradient">secured like a vault</span>
                </h2>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-s)' }}>
                  The server never sees your private key. Generation, splitting and signing all happen in-browser
                </p>
                <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-s)' }}>
                  Two shares reconstruct the key, wiped from memory immediately after
                </p>
                <button onClick={() => router.push('/auth')} className="btn-primary px-6 py-2.5 text-sm">
                  Set up your vault <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Encryption', value: 'AES-256-GCM' },
                  { label: 'Key Derivation', value: 'PBKDF2 (100K iter)' },
                  { label: 'Secret Sharing', value: 'Shamir over GF(256)' },
                  { label: 'Threshold', value: '2 of 3 family shares' },
                  { label: 'Key Lifetime', value: 'Wiped after every use' },
                  { label: 'Server Access', value: 'Zero-knowledge' },
                  { label: 'Auth', value: 'Google OAuth + ZK' },
                  { label: 'Network', value: 'Stellar Consensus' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between inner-panel px-4 py-2.5">
                    <span className="text-xs" style={{ color: 'var(--text-t)' }}>{item.label}</span>
                    <span className="text-xs font-medium text-emerald-400">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-5">
            Ready to set up your <span className="text-gradient-warm">family vault?</span>
          </h2>
          <p className="text-sm mb-10 max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-s)' }}>
            No seed phrases, no hardware wallets. Just Google Sign-In and MPC on Stellar
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => router.push('/auth')} className="btn-primary px-8 py-3 text-sm w-full sm:w-auto">
              <Shield className="w-4 h-4" />
              Set Up Family Wallet
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => router.push('/parent')} className="btn-secondary px-6 py-3 text-sm w-full sm:w-auto">
              Parent Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--card-border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Shield className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-t)' }}>StellaRay Guardian</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-t)' }}>
            <a href="/auth" className="hover:opacity-70 transition-opacity">Get Started</a>
            <a href="/parent" className="hover:opacity-70 transition-opacity">Parent</a>
            <a href="/child" className="hover:opacity-70 transition-opacity">Child</a>
            <span className="w-px h-3" style={{ background: 'var(--card-border)' }} />
            <span>Built on Stellar</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Send, ArrowDownLeft, RefreshCw, Clock, CheckCircle2,
  Clipboard, Gamepad2, UtensilsCrossed, ShoppingBag, Sparkles,
  Star, ChevronRight, Wallet, TrendingUp, CalendarDays, Target,
  ArrowUpRight, X, Loader2, Check, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

// ─── TYPES ───
type SendFlowState = 'idle' | 'form' | 'submitting' | 'pending' | 'approved';

interface PendingRequest {
  id: number;
  amount: string;
  amountUsd: string;
  destination: string;
  purpose: string;
  time: string;
}

interface Transaction {
  id: number;
  icon: typeof Gamepad2;
  description: string;
  amount: string;
  amountUsd: string;
  time: string;
  status: 'approved' | 'pending';
  category: string;
}

// ─── MOCK DATA ───
const MOCK_PENDING: PendingRequest[] = [
  {
    id: 1,
    amount: '25.00',
    amountUsd: '$3.00',
    destination: 'GBKX...4R2P',
    purpose: 'New game on Steam',
    time: '10 min ago',
  },
  {
    id: 2,
    amount: '15.00',
    amountUsd: '$1.80',
    destination: 'GCRT...8WN1',
    purpose: 'Lunch with friends',
    time: '2 hours ago',
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 1, icon: Gamepad2, description: 'Sent to GameStore', amount: '-30.00', amountUsd: '-$3.60', time: 'Yesterday', status: 'approved', category: 'Games' },
  { id: 2, icon: ArrowDownLeft, description: 'Weekly allowance', amount: '+50.00', amountUsd: '+$6.00', time: 'Monday', status: 'approved', category: 'Allowance' },
  { id: 3, icon: UtensilsCrossed, description: 'Sent to FoodCourt', amount: '-12.50', amountUsd: '-$1.50', time: 'Last week', status: 'approved', category: 'Food' },
  { id: 4, icon: ShoppingBag, description: 'Sent to MerchShop', amount: '-8.00', amountUsd: '-$0.96', time: 'Last week', status: 'approved', category: 'Shopping' },
  { id: 5, icon: ArrowDownLeft, description: 'Weekly allowance', amount: '+50.00', amountUsd: '+$6.00', time: '2 weeks ago', status: 'approved', category: 'Allowance' },
];

const SPENDING_CATEGORIES = [
  { name: 'Games', amount: 22.50, color: 'bg-violet-500' },
  { name: 'Food', amount: 12.50, color: 'bg-amber-500' },
  { name: 'Shopping', amount: 10.20, color: 'bg-indigo-500' },
];

// ─── PULSING DOTS COMPONENT ───
function PulsingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '200ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '400ms' }} />
    </span>
  );
}

// ─── MAIN PAGE COMPONENT ───
export default function ChildDashboard() {
  // ─── STATE ───
  const [sendFlow, setSendFlow] = useState<SendFlowState>('idle');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(MOCK_PENDING);
  const [refreshing, setRefreshing] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const { theme, toggle } = useTheme();

  // The child's mock wallet address
  const childAddress = 'GDXE7H2BQLG5NFMQVPR3QTK4P2EAXRO6SXIRZLHK5DQPN7FMERIEMMA';

  // ─── SEND FLOW SIMULATION ───
  const handleSendRequest = useCallback(() => {
    if (!recipient || !amount || !purpose) return;
    setSendFlow('submitting');

    // Simulate submission delay
    setTimeout(() => {
      setSendFlow('pending');
      // Add to pending requests
      const newRequest: PendingRequest = {
        id: Date.now(),
        amount: parseFloat(amount).toFixed(2),
        amountUsd: `$${(parseFloat(amount) * 0.12).toFixed(2)}`,
        destination: recipient.length > 10 ? `${recipient.slice(0, 4)}...${recipient.slice(-4)}` : recipient,
        purpose,
        time: 'Just now',
      };
      setPendingRequests(prev => [newRequest, ...prev]);
    }, 1500);
  }, [recipient, amount, purpose]);

  // Simulate parent approval after entering pending state
  useEffect(() => {
    if (sendFlow === 'pending') {
      const timer = setTimeout(() => {
        setSendFlow('approved');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sendFlow]);

  // Auto-close success state
  useEffect(() => {
    if (sendFlow === 'approved') {
      const timer = setTimeout(() => {
        setSendFlow('idle');
        setRecipient('');
        setAmount('');
        setPurpose('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sendFlow]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipient(text);
    } catch {
      // Clipboard not available
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(childAddress).catch(() => {});
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const closeModal = () => {
    if (sendFlow === 'submitting' || sendFlow === 'pending') return; // Don't close during processing
    setSendFlow('idle');
    setRecipient('');
    setAmount('');
    setPurpose('');
  };

  const usdConversion = amount ? `~$${(parseFloat(amount || '0') * 0.12).toFixed(2)} USD` : '';
  const spentTotal = 45.20;
  const monthlyLimit = 100;
  const spentPercent = (spentTotal / monthlyLimit) * 100;

  // ─── RENDER ───
  return (
    <div className="min-h-screen relative">
      {/* Ambient gradient orbs for glass blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[5%] w-[55%] h-[50%] rounded-full opacity-45" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] left-[-10%] w-[45%] h-[45%] rounded-full opacity-35" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[35%] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* ─── FLOATING NAV ─── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
        <div className="flex items-center justify-between h-12 px-4 glass-nav">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Guardian</span>
          </a>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px', borderStyle: 'solid' }}>
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-s)' }}>Emma&apos;s Wallet</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--surface)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px]" style={{ color: 'var(--text-t)' }}>Connected</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center ring-1 ring-violet-500/20">
              <span className="text-xs font-bold text-white">E</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <div className="pt-20 pb-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          {/* Greeting */}
          <div className="mb-6 animate-fade-up">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight mb-0.5">
              Hey, Emma
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-t)' }}>Here&apos;s your wallet overview</p>
          </div>

          {/* ─── BENTO GRID ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* ─── BALANCE CARD (large) ─── */}
            <div className="lg:col-span-7 card p-8 relative overflow-hidden animate-fade-up animate-delay-100">
              {/* Gradient accent in corner */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-violet-500/[0.07] via-indigo-500/[0.04] to-transparent rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-indigo-500/[0.03] to-transparent rounded-tr-full pointer-events-none" />

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" style={{ color: 'var(--text-s)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>My Balance</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    aria-label="Refresh balance"
                  >
                    <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : ''}`} style={{ color: 'var(--text-s)' }} />
                  </button>
                </div>

                <div className="mb-1">
                  <span className="text-5xl lg:text-6xl font-bold tracking-tight number-display">2,450.00</span>
                  <span className="text-2xl font-medium ml-3" style={{ color: 'var(--text-s)' }}>XLM</span>
                </div>
                <p className="text-lg mb-8 number-display" style={{ color: 'var(--text-s)' }}>$294.00 USD</p>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSendFlow('form')}
                    className="btn-primary px-6 py-3 text-sm flex-1 sm:flex-none"
                  >
                    <Send className="w-4 h-4" />
                    Request to Send
                  </button>
                  <button
                    onClick={() => setShowReceive(!showReceive)}
                    className="btn-secondary px-6 py-3 text-sm flex-1 sm:flex-none"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Receive
                  </button>
                </div>

                {/* Receive address reveal */}
                {showReceive && (
                  <div className="mt-4 rounded-xl p-4 animate-slide-up" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-s)' }}>Your address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono break-all flex-1" style={{ color: 'var(--text)' }}>{childAddress}</p>
                      <button
                        onClick={handleCopyAddress}
                        className="p-2 rounded-lg transition-colors shrink-0"
                      >
                        {copiedAddress
                          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                          : <Clipboard className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} />
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── SPENDING THIS MONTH ─── */}
            <div className="lg:col-span-5 card p-8 animate-fade-up animate-delay-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-s)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Spending This Month</p>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-s)' }}>Feb 2026</span>
              </div>

              {/* Amount and limit */}
              <div className="mb-4">
                <span className="text-3xl font-bold number-display">${spentTotal.toFixed(2)}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--text-s)' }}>of ${monthlyLimit} limit</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                  style={{ width: `${spentPercent}%` }}
                />
              </div>

              {/* Category breakdown */}
              <div className="space-y-3">
                {SPENDING_CATEGORIES.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{cat.name}</span>
                    </div>
                    <span className="text-sm number-display" style={{ color: 'var(--text-s)' }}>${cat.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Remaining budget */}
              <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-s)' }}>Remaining</span>
                <span className="text-sm font-semibold text-emerald-400 number-display">
                  ${(monthlyLimit - spentTotal).toFixed(2)}
                </span>
              </div>
            </div>

            {/* ─── PENDING REQUESTS ─── */}
            <div className="lg:col-span-6 card p-6 animate-fade-up animate-delay-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Pending Requests</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs text-amber-400 font-medium">{pendingRequests.length} waiting</span>
                </div>
              </div>

              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-s)', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{req.purpose}</p>
                          <p className="text-xs" style={{ color: 'var(--text-s)' }}>To {req.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold number-display">{req.amount} XLM</p>
                        <p className="text-xs" style={{ color: 'var(--text-s)' }}>{req.amountUsd}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <span className="text-xs font-medium">Waiting for parent approval</span>
                        <PulsingDots />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-t)' }}>{req.time}</span>
                    </div>
                  </div>
                ))}

                {pendingRequests.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
                    <p className="text-sm" style={{ color: 'var(--text-s)' }}>No pending requests</p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── ALLOWANCE INFO ─── */}
            <div className="lg:col-span-6 card p-6 animate-fade-up animate-delay-400">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Allowance</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-s)' }}>Weekly Amount</p>
                  <p className="text-xl font-bold number-display">50 <span className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>XLM</span></p>
                  <p className="text-xs number-display" style={{ color: 'var(--text-s)' }}>~$6.00 USD</p>
                </div>
                <div className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-s)' }}>Next Deposit</p>
                  <p className="text-xl font-bold">Monday</p>
                  <p className="text-xs" style={{ color: 'var(--text-s)' }}>In 3 days</p>
                </div>
              </div>

              {/* Savings Goal */}
              <div className="bg-gradient-to-r from-violet-500/[0.06] to-indigo-500/[0.06] border border-violet-500/10 rounded-xl px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Savings Goal</p>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: 'var(--text-s)' }}>New headphones</span>
                  <span className="text-xs number-display" style={{ color: 'var(--text-s)' }}>750 / 1,000 XLM</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 w-[75%]" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-violet-400 font-medium">75% there!</span>
                  <span className="text-xs" style={{ color: 'var(--text-s)' }}>~5 weeks left</span>
                </div>
              </div>
            </div>

            {/* ─── RECENT TRANSACTIONS (full width) ─── */}
            <div className="lg:col-span-12 card animate-fade-up animate-delay-500">
              <div className="flex items-center justify-between p-6 pb-0">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: 'var(--text-s)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Recent Transactions</p>
                </div>
                <button className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--text-s)' }}>
                  View all
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-6 pt-4">
                <div className="space-y-1">
                  {MOCK_TRANSACTIONS.map((tx) => {
                    const isIncome = tx.amount.startsWith('+');
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between py-3.5 px-4 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isIncome ? 'bg-emerald-500/10' : 'bg-indigo-500/10'
                          }`}>
                            {isIncome
                              ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                              : <tx.icon className="w-4 h-4 text-indigo-400" />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tx.description}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs" style={{ color: 'var(--text-s)' }}>{tx.time}</p>
                              <span className="text-xs" style={{ color: 'var(--text-t)' }}>&middot;</span>
                              <span className="text-xs" style={{ color: 'var(--text-s)' }}>{tx.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-sm font-semibold number-display ${
                              isIncome ? 'text-emerald-400' : ''
                            }`} style={isIncome ? {} : { color: 'var(--text)' }}>
                              {tx.amount} XLM
                            </p>
                            <p className="text-xs number-display" style={{ color: 'var(--text-s)' }}>{tx.amountUsd}</p>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-400 font-medium">Approved</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── SECURITY INDICATOR ─── */}
            <div className="lg:col-span-12 card p-5 animate-fade-up animate-delay-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Wallet protected by family vault</p>
                    <p className="text-xs" style={{ color: 'var(--text-s)' }}>All transactions require parent approval via MPC threshold signing</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                    <Shield className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-s)' }}>2-of-3 MPC threshold</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Secured</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── REQUEST TO SEND MODAL ─── */}
      {sendFlow !== 'idle' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-md mx-4 card p-0 overflow-hidden animate-scale-in">
            {/* Gradient header accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />

            {/* ─── FORM STATE ─── */}
            {sendFlow === 'form' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">Request to Send</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-s)' }}>Your parent will approve this transaction</p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--text-s)' }} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Recipient */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-s)' }}>Recipient Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="G..."
                        className="w-full rounded-xl px-4 py-3 text-sm font-mono placeholder-muted focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-colors pr-16"
                        style={{ background: 'var(--bg-s)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      />
                      <button
                        onClick={handlePaste}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                        style={{ background: 'var(--surface)', color: 'var(--text-s)' }}
                      >
                        <Clipboard className="w-3 h-3" />
                        Paste
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-s)' }}>Amount (XLM)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full rounded-xl px-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-colors number-display"
                        style={{ background: 'var(--bg-s)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      />
                      {usdConversion && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-s)' }}>
                          {usdConversion}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-s)' }}>What&apos;s this for?</label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g., New game, lunch money, gift for a friend..."
                      rows={2}
                      className="w-full rounded-xl px-4 py-3 text-sm placeholder-muted focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-colors resize-none"
                      style={{ background: 'var(--bg-s)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-t)' }}>This note will appear on your parent&apos;s approval screen</p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSendRequest}
                  disabled={!recipient || !amount || !purpose}
                  className="btn-primary w-full py-3.5 text-sm mt-6 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
                >
                  <Send className="w-4 h-4" />
                  Send Request to Parent
                </button>
              </div>
            )}

            {/* ─── SUBMITTING STATE ─── */}
            {sendFlow === 'submitting' && (
              <div className="p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                  <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sending request...</h3>
                <p className="text-sm" style={{ color: 'var(--text-s)' }}>Preparing your transaction request</p>
              </div>
            )}

            {/* ─── PENDING / WAITING FOR PARENT STATE ─── */}
            {sendFlow === 'pending' && (
              <div className="p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 relative">
                  <Clock className="w-7 h-7 text-amber-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 animate-ping opacity-30" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Waiting for parent approval
                  <PulsingDots />
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-s)' }}>
                  Your parent has been notified. They&apos;ll review and approve this transaction.
                </p>
                <div className="rounded-xl px-5 py-3 inline-flex items-center gap-3" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-s)' }}>Amount:</span>
                  <span className="text-sm font-semibold number-display">{parseFloat(amount || '0').toFixed(2)} XLM</span>
                </div>
              </div>
            )}

            {/* ─── APPROVED / SUCCESS STATE ─── */}
            {sendFlow === 'approved' && (
              <div className="p-10 flex flex-col items-center text-center relative overflow-hidden">
                {/* Success particles */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full"
                      style={{
                        left: `${15 + Math.random() * 70}%`,
                        top: `${10 + Math.random() * 30}%`,
                        backgroundColor: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'][i % 5],
                        animation: `fadeUp 1.5s ease-out ${i * 0.1}s forwards`,
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </div>

                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-scale-in">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-emerald-400">Approved!</h3>
                <p className="text-sm mb-1" style={{ color: 'var(--text-s)' }}>Your parent approved the transaction.</p>
                <p className="text-sm" style={{ color: 'var(--text-s)' }}>The funds have been sent successfully.</p>

                <div className="mt-5 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl px-5 py-3 inline-flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400 number-display">{parseFloat(amount || '0').toFixed(2)} XLM sent</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

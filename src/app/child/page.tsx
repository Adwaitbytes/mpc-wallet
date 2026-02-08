'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Shield, Send, ArrowDownLeft, RefreshCw, Clock, CheckCircle2,
  Clipboard, Sparkles,
  Star, Wallet, TrendingUp, CalendarDays, Target,
  ArrowUpRight, X, Loader2, Check, Sun, Moon, XCircle
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

type SendFlowState = 'idle' | 'form' | 'submitting' | 'pending' | 'approved' | 'denied';

interface SpendRequest {
  id: string;
  amountXlm: string;
  destination: string;
  destinationLabel: string;
  purpose: string;
  category: string;
  status: string;
  txHash: string | null;
  createdAt: string;
}

interface TxRecord {
  id: string;
  amount: string;
  from: string;
  to: string;
  createdAt: string;
  isIncoming: boolean;
}

function formatAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function PulsingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '200ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '400ms' }} />
    </span>
  );
}

export default function ChildDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [sendFlow, setSendFlow] = useState<SendFlowState>('idle');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  const [balance, setBalance] = useState<{ xlm: string; usd: string; funded: boolean; publicKey: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [requests, setRequests] = useState<SpendRequest[]>([]);
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [allowanceXlm, setAllowanceXlm] = useState(50);

  const childName = session?.user?.name?.split(' ')[0] || 'Child';
  const childInitial = childName[0] || 'C';
  const childAddress = balance?.publicKey || '';

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.replace('/auth');
  }, [sessionStatus, router]);

  const fetchBalance = useCallback(() => {
    fetch('/api/family/balance').then(r => r.json()).then(data => {
      if (!data.error) setBalance(data);
      setBalanceLoading(false);
    }).catch(() => setBalanceLoading(false));
  }, []);

  const fetchRequests = useCallback(() => {
    fetch('/api/spend/requests').then(r => r.json()).then(data => {
      if (data.requests) setRequests(data.requests);
    }).catch(() => {});
  }, []);

  const fetchTransactions = useCallback(() => {
    fetch('/api/family/transactions').then(r => r.json()).then(data => {
      if (data.transactions) setTransactions(data.transactions);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetchBalance();
    fetchRequests();
    fetchTransactions();
    fetch('/api/family/status').then(r => r.json()).then(data => {
      if (data.allowanceXlm) setAllowanceXlm(parseFloat(data.allowanceXlm));
    }).catch(() => {});
  }, [sessionStatus, fetchBalance, fetchRequests, fetchTransactions]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    const poll = setInterval(fetchRequests, 4000);
    return () => clearInterval(poll);
  }, [sessionStatus, fetchRequests]);

  useEffect(() => {
    if (!lastSubmittedId) return;
    const req = requests.find(r => r.id === lastSubmittedId);
    if (req?.status === 'approved') {
      setSendFlow('approved');
      setLastSubmittedId(null);
      fetchBalance();
    } else if (req?.status === 'denied') {
      setSendFlow('denied');
      setLastSubmittedId(null);
    }
  }, [requests, lastSubmittedId, fetchBalance]);

  useEffect(() => {
    if (sendFlow === 'approved' || sendFlow === 'denied') {
      const timer = setTimeout(() => {
        setSendFlow('idle');
        setRecipient(''); setAmount(''); setPurpose('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sendFlow]);

  const handleSendRequest = useCallback(() => {
    if (!recipient || !amount || !purpose) return;
    setSendFlow('submitting');
    fetch('/api/spend/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountXlm: parseFloat(amount),
        destination: recipient,
        destinationLabel: recipient.length > 12 ? formatAddress(recipient) : recipient,
        purpose,
        category: 'General',
      }),
    }).then(r => r.json()).then(data => {
      if (data.success) {
        setLastSubmittedId(data.requestId);
        setSendFlow('pending');
        fetchRequests();
      } else { setSendFlow('form'); }
    }).catch(() => setSendFlow('form'));
  }, [recipient, amount, purpose, fetchRequests]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBalance();
    fetchTransactions();
    setTimeout(() => setRefreshing(false), 1000);
  }, [fetchBalance, fetchTransactions]);

  const handlePaste = async () => {
    try { const text = await navigator.clipboard.readText(); setRecipient(text); } catch {}
  };

  const handleCopyAddress = () => {
    if (!childAddress) return;
    navigator.clipboard.writeText(childAddress).catch(() => {});
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const closeModal = () => {
    if (sendFlow === 'submitting' || sendFlow === 'pending') return;
    setSendFlow('idle'); setRecipient(''); setAmount(''); setPurpose('');
  };

  const usdConversion = amount ? `~$${(parseFloat(amount || '0') * 0.12).toFixed(2)} USD` : '';
  const monthlyLimit = allowanceXlm * 4;
  const spentTotal = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + parseFloat(r.amountXlm), 0);
  const spentPercent = monthlyLimit > 0 ? (spentTotal / monthlyLimit) * 100 : 0;
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (sessionStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[5%] w-[55%] h-[50%] rounded-full opacity-45" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] left-[-10%] w-[45%] h-[45%] rounded-full opacity-35" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[35%] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
        <div className="flex items-center justify-between h-12 px-4 glass-nav">
          <a href="/" className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div><span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Guardian</span></a>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}><Sparkles className="w-3 h-3 text-violet-400" /><span className="text-[11px] font-medium" style={{ color: 'var(--text-s)' }}>{childName}&apos;s Wallet</span></div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>{theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}</button>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'var(--surface)' }}><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[11px]" style={{ color: 'var(--text-t)' }}>{balance?.funded ? 'Connected' : 'Unfunded'}</span></div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center ring-1 ring-violet-500/20"><span className="text-xs font-bold text-white">{childInitial}</span></div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 animate-fade-up">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight mb-0.5">Hey, {childName}</h1>
            <p className="text-sm" style={{ color: 'var(--text-t)' }}>Here&apos;s your wallet overview</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* BALANCE CARD */}
            <div className="lg:col-span-7 card p-8 relative overflow-hidden animate-fade-up animate-delay-100">
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-violet-500/[0.07] via-indigo-500/[0.04] to-transparent rounded-bl-full pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2"><Wallet className="w-4 h-4" style={{ color: 'var(--text-s)' }} /><p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>My Balance</p></div>
                  <button onClick={handleRefresh} className="p-2 rounded-lg" aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} style={{ color: 'var(--text-s)' }} /></button>
                </div>
                <div className="mb-1">
                  {balanceLoading
                    ? <span className="text-5xl lg:text-6xl font-bold number-display animate-pulse">...</span>
                    : <span className="text-5xl lg:text-6xl font-bold number-display">{balance ? parseFloat(balance.xlm).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>}
                  <span className="text-2xl font-medium ml-3" style={{ color: 'var(--text-s)' }}>XLM</span>
                </div>
                <p className="text-lg mb-8 number-display" style={{ color: 'var(--text-s)' }}>{balance ? balance.usd : '$0.00'} USD</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSendFlow('form')} className="btn-primary px-6 py-3 text-sm flex-1 sm:flex-none"><Send className="w-4 h-4" />Request to Send</button>
                  <button onClick={() => setShowReceive(!showReceive)} className="btn-secondary px-6 py-3 text-sm flex-1 sm:flex-none"><ArrowDownLeft className="w-4 h-4" />Receive</button>
                </div>
                {showReceive && (
                  <div className="mt-4 rounded-xl p-4 animate-slide-up" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-s)' }}>Your address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono break-all flex-1" style={{ color: 'var(--text)' }}>{childAddress || 'Wallet not created yet'}</p>
                      {childAddress && <button onClick={handleCopyAddress} className="p-2 rounded-lg shrink-0">{copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} />}</button>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SPENDING THIS MONTH */}
            <div className="lg:col-span-5 card p-8 animate-fade-up animate-delay-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: 'var(--text-s)' }} /><p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Spending This Month</p></div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold number-display">{spentTotal.toFixed(2)}</span>
                <span className="text-sm ml-2" style={{ color: 'var(--text-s)' }}>of {monthlyLimit} XLM limit</span>
              </div>
              <div className="w-full h-3 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--surface)' }}>
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000" style={{ width: `${Math.min(spentPercent, 100)}%` }} />
              </div>
              <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-s)' }}>Remaining</span>
                <span className="text-sm font-semibold text-emerald-400 number-display">{(monthlyLimit - spentTotal).toFixed(2)} XLM</span>
              </div>
            </div>

            {/* PENDING REQUESTS */}
            <div className="lg:col-span-6 card p-6 animate-fade-up animate-delay-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /><p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>My Requests</p></div>
                {pendingCount > 0 && <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"><span className="text-xs text-amber-400 font-medium">{pendingCount} waiting</span></div>}
              </div>
              <div className="space-y-3">
                {requests.slice(0, 10).map(req => (
                  <div key={req.id} className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-s)', border: req.status === 'approved' ? '1px solid rgba(16,185,129,0.2)' : req.status === 'denied' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.1)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${req.status === 'approved' ? 'bg-emerald-500/10' : req.status === 'denied' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                          {req.status === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : req.status === 'denied' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-amber-400 animate-pulse" />}
                        </div>
                        <div><p className="text-sm font-medium">{req.purpose}</p><p className="text-xs" style={{ color: 'var(--text-s)' }}>To {req.destinationLabel || formatAddress(req.destination)}</p></div>
                      </div>
                      <div className="text-right"><p className="text-sm font-semibold number-display">{parseFloat(req.amountXlm).toFixed(2)} XLM</p><p className="text-xs" style={{ color: 'var(--text-s)' }}>${(parseFloat(req.amountXlm) * 0.12).toFixed(2)}</p></div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      {req.status === 'pending' ? <div className="flex items-center gap-1.5 text-amber-400"><span className="text-xs font-medium">Waiting for parent approval</span><PulsingDots /></div>
                        : req.status === 'approved' ? <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-3 h-3" /><span className="text-xs font-medium">Approved &amp; sent on Stellar</span></div>
                        : <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3 h-3" /><span className="text-xs font-medium">Denied by parent</span></div>}
                      <span className="text-xs" style={{ color: 'var(--text-t)' }}>{new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
                {requests.length === 0 && <div className="text-center py-8"><CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" /><p className="text-sm" style={{ color: 'var(--text-s)' }}>No requests yet</p><p className="text-xs mt-1" style={{ color: 'var(--text-t)' }}>Use &quot;Request to Send&quot; to create one</p></div>}
              </div>
            </div>

            {/* ALLOWANCE INFO */}
            <div className="lg:col-span-6 card p-6 animate-fade-up animate-delay-400">
              <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-violet-400" /><p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Allowance</p></div></div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}><p className="text-xs mb-1" style={{ color: 'var(--text-s)' }}>Weekly Amount</p><p className="text-xl font-bold number-display">{allowanceXlm} <span className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>XLM</span></p><p className="text-xs number-display" style={{ color: 'var(--text-s)' }}>~${(allowanceXlm * 0.12).toFixed(2)} USD</p></div>
                <div className="rounded-xl px-4 py-4" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}><p className="text-xs mb-1" style={{ color: 'var(--text-s)' }}>Next Deposit</p><p className="text-xl font-bold">Monday</p><p className="text-xs" style={{ color: 'var(--text-s)' }}>In 3 days</p></div>
              </div>
              <div className="bg-gradient-to-r from-violet-500/[0.06] to-indigo-500/[0.06] border border-violet-500/10 rounded-xl px-4 py-4">
                <div className="flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-violet-400" /><p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Savings Goal</p></div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs" style={{ color: 'var(--text-s)' }}>New headphones</span><span className="text-xs number-display" style={{ color: 'var(--text-s)' }}>750 / 1,000 XLM</span></div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 w-[75%]" /></div>
                <div className="flex items-center justify-between mt-2"><span className="text-xs text-violet-400 font-medium">75% there!</span><span className="text-xs" style={{ color: 'var(--text-s)' }}>~5 weeks left</span></div>
              </div>
            </div>

            {/* RECENT TRANSACTIONS */}
            <div className="lg:col-span-12 card animate-fade-up animate-delay-500">
              <div className="flex items-center justify-between p-6 pb-0"><div className="flex items-center gap-2"><Star className="w-4 h-4" style={{ color: 'var(--text-s)' }} /><p className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>Recent Transactions</p></div><span className="text-xs" style={{ color: 'var(--text-t)' }}>{transactions.length > 0 ? `${transactions.length} on-chain` : 'From Stellar Horizon'}</span></div>
              <div className="p-6 pt-4">
                <div className="space-y-1">
                  {transactions.length === 0 && <div className="text-center py-8"><Star className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-t)' }} /><p className="text-sm" style={{ color: 'var(--text-s)' }}>No transactions yet</p><p className="text-xs mt-1" style={{ color: 'var(--text-t)' }}>Transactions will appear here after your first send</p></div>}
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-3.5 px-4 rounded-xl group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.isIncoming ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`}>{tx.isIncoming ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-indigo-400" />}</div>
                        <div><p className="text-sm font-medium">{tx.isIncoming ? `Received from ${formatAddress(tx.from)}` : `Sent to ${formatAddress(tx.to)}`}</p><p className="text-xs" style={{ color: 'var(--text-s)' }}>{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right"><p className={`text-sm font-semibold number-display ${tx.isIncoming ? 'text-emerald-400' : ''}`} style={tx.isIncoming ? {} : { color: 'var(--text)' }}>{tx.isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} XLM</p><p className="text-xs number-display" style={{ color: 'var(--text-s)' }}>{tx.isIncoming ? '+' : '-'}${(parseFloat(tx.amount) * 0.12).toFixed(2)}</p></div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10"><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-[10px] text-emerald-400 font-medium">On-chain</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECURITY */}
            <div className="lg:col-span-12 card p-5 animate-fade-up animate-delay-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div><div><p className="text-sm font-medium">Wallet protected by family vault</p><p className="text-xs" style={{ color: 'var(--text-s)' }}>All transactions require parent approval via 2-of-3 MPC threshold signing</p></div></div>
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}><Shield className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} /><span className="text-xs" style={{ color: 'var(--text-s)' }}>2-of-3 MPC</span></div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-emerald-400 font-medium">Secured</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEND MODAL */}
      {sendFlow !== 'idle' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md mx-4 card p-0 overflow-hidden animate-scale-in">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            {sendFlow === 'form' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6"><div><h2 className="text-lg font-semibold">Request to Send</h2><p className="text-xs mt-0.5" style={{ color: 'var(--text-s)' }}>Your parent will approve this transaction</p></div><button onClick={closeModal} className="p-2 rounded-lg"><X className="w-4 h-4" style={{ color: 'var(--text-s)' }} /></button></div>
                <div className="space-y-4">
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-s)' }}>Recipient Address</label><div className="relative"><input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="G..." className="w-full rounded-xl px-4 py-3 text-sm font-mono pr-16 focus:outline-none focus:ring-1 focus:ring-indigo-500/20" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)', color: 'var(--text)' }} /><button onClick={handlePaste} className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'var(--surface)', color: 'var(--text-s)' }}><Clipboard className="w-3 h-3" />Paste</button></div></div>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-s)' }}>Amount (XLM)</label><div className="relative"><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" className="w-full rounded-xl px-4 py-3 text-sm number-display focus:outline-none focus:ring-1 focus:ring-indigo-500/20" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)', color: 'var(--text)' }} />{usdConversion && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-s)' }}>{usdConversion}</span>}</div></div>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-s)' }}>What&apos;s this for?</label><textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g., New game, lunch money, gift..." rows={2} className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)', color: 'var(--text)' }} /></div>
                </div>
                <button onClick={handleSendRequest} disabled={!recipient || !amount || !purpose} className="btn-primary w-full py-3.5 text-sm mt-6 disabled:opacity-40 disabled:cursor-not-allowed"><Send className="w-4 h-4" />Send Request to Parent</button>
              </div>
            )}
            {sendFlow === 'submitting' && <div className="p-10 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6"><Loader2 className="w-7 h-7 text-indigo-400 animate-spin" /></div><h3 className="text-lg font-semibold mb-2">Creating request...</h3><p className="text-sm" style={{ color: 'var(--text-s)' }}>Saving to database</p></div>}
            {sendFlow === 'pending' && <div className="p-10 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 relative"><Clock className="w-7 h-7 text-amber-400" /><div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 animate-ping opacity-30" /><div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500" /></div><h3 className="text-lg font-semibold mb-2">Waiting for parent approval<PulsingDots /></h3><p className="text-sm mb-4" style={{ color: 'var(--text-s)' }}>Your parent will see this request on their dashboard.</p><div className="rounded-xl px-5 py-3 inline-flex items-center gap-3" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}><span className="text-sm" style={{ color: 'var(--text-s)' }}>Amount:</span><span className="text-sm font-semibold number-display">{parseFloat(amount || '0').toFixed(2)} XLM</span></div></div>}
            {sendFlow === 'approved' && <div className="p-10 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-scale-in"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div><h3 className="text-lg font-semibold mb-2 text-emerald-400">Approved!</h3><p className="text-sm" style={{ color: 'var(--text-s)' }}>Real Stellar transaction submitted to the network.</p></div>}
            {sendFlow === 'denied' && <div className="p-10 flex flex-col items-center text-center"><div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 animate-scale-in"><XCircle className="w-8 h-8 text-red-400" /></div><h3 className="text-lg font-semibold mb-2 text-red-400">Request Denied</h3><p className="text-sm" style={{ color: 'var(--text-s)' }}>Your parent denied this transaction request.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}

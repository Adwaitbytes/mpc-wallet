'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Shield, Check, X, Clock, Send,
  Wallet, Lock, Key, Settings, Bell, ArrowUpRight, ArrowDownLeft,
  TrendingUp, CalendarDays, RefreshCw,
  CheckCircle2, XCircle, AlertCircle,
  Sparkles, CreditCard, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

type ApprovalStatus = 'pending' | 'approved' | 'denied';
type ActivityFilter = 'all' | 'approved' | 'pending' | 'denied';

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
  requesterName: string;
  approvedByName: string | null;
}

interface FamilyMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  shareIndex: number;
}

function formatAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

function Toast({ message, type, visible }: { message: string; type: 'approve' | 'deny'; visible: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'} ${type === 'approve' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10' : 'bg-red-500/10 border-red-500/20 shadow-red-500/10'}`}>
      {type === 'approve' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function CircularProgress({ percentage, size = 120, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#progressGradient)" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
        <defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold number-display">{percentage}%</span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-s)' }}>of limit</span>
      </div>
    </div>
  );
}

function AnimatedCheckmark() {
  return <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 animate-scale-in"><Check className="w-6 h-6 text-emerald-400" strokeWidth={3} /></div>;
}

function AnimatedXMark() {
  return <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-400 animate-scale-in"><X className="w-6 h-6 text-red-400" strokeWidth={3} /></div>;
}

export default function ParentDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [requests, setRequests] = useState<SpendRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const [balance, setBalance] = useState<{ xlm: string; usd: string; funded: boolean; publicKey: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allowanceXlm, setAllowanceXlm] = useState(50);
  const [childName, setChildName] = useState('Child');

  const [toast, setToast] = useState<{ message: string; type: 'approve' | 'deny'; visible: boolean }>({ message: '', type: 'approve', visible: false });

  const parentName = session?.user?.name?.split(' ')[0] || 'Parent';

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

  const fetchFamilyStatus = useCallback(() => {
    fetch('/api/family/status').then(r => r.json()).then(data => {
      if (data.members) setMembers(data.members);
      if (data.allowanceXlm) setAllowanceXlm(parseFloat(data.allowanceXlm));
      const child = data.members?.find((m: FamilyMember) => m.role === 'child');
      if (child?.name) setChildName(child.name.split(' ')[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetchBalance();
    fetchRequests();
    fetchFamilyStatus();
  }, [sessionStatus, fetchBalance, fetchRequests, fetchFamilyStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    const poll = setInterval(fetchRequests, 4000);
    return () => clearInterval(poll);
  }, [sessionStatus, fetchRequests]);

  const showToast = useCallback((message: string, type: 'approve' | 'deny') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  }, []);

  const handleApprove = useCallback((id: string) => {
    setProcessingId(id);
    fetch('/api/spend/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    }).then(r => r.json()).then(data => {
      setProcessingId(null);
      if (data.success) {
        setActionedIds(prev => new Set(prev).add(id));
        const req = requests.find(r => r.id === id);
        showToast(`Approved ${req ? parseFloat(req.amountXlm).toFixed(2) : ''} XLM — tx: ${data.txHash?.slice(0, 8)}...`, 'approve');
        fetchRequests();
        fetchBalance();
        setTimeout(() => {
          setRemovingIds(prev => new Set(prev).add(id));
          setTimeout(() => {
            setActionedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
          }, 500);
        }, 2000);
      } else {
        showToast(data.error || 'Approval failed', 'deny');
      }
    }).catch(() => {
      setProcessingId(null);
      showToast('Network error', 'deny');
    });
  }, [requests, showToast, fetchRequests, fetchBalance]);

  const handleDeny = useCallback((id: string) => {
    fetch('/api/spend/deny', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: id }),
    }).then(r => r.json()).then(data => {
      if (data.success) {
        setActionedIds(prev => new Set(prev).add(id));
        const req = requests.find(r => r.id === id);
        showToast(`Denied ${req ? parseFloat(req.amountXlm).toFixed(2) : ''} XLM request`, 'deny');
        fetchRequests();
        setTimeout(() => {
          setRemovingIds(prev => new Set(prev).add(id));
          setTimeout(() => {
            setActionedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
          }, 500);
        }, 2000);
      }
    }).catch(() => showToast('Network error', 'deny'));
  }, [requests, showToast, fetchRequests]);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pendingCount = pendingRequests.length;
  const allActivity = requests.filter(r => r.status !== 'pending');
  const filteredActivity = activityFilter === 'all' ? allActivity : allActivity.filter(a => a.status === activityFilter);

  const spentTotal = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + parseFloat(r.amountXlm), 0);
  const spendingLimit = allowanceXlm * 4;
  const spendingPercentage = spendingLimit > 0 ? Math.round((spentTotal / spendingLimit) * 100) : 0;

  if (sessionStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[50%] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[35%] right-[-10%] w-[45%] h-[45%] rounded-full opacity-35" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] left-[15%] w-[40%] h-[35%] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
        <div className="flex items-center justify-between h-12 px-4 glass-nav">
          <a href="/" className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div><span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Guardian</span></a>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>{theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}</button>
            <button className="relative p-1.5 rounded-lg"><Bell className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} />{pendingCount > 0 && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}</button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><span className="text-[9px] font-bold text-white">{parentName[0]}</span></div>
              <span className="hidden sm:block text-[11px] font-medium" style={{ color: 'var(--text-s)' }}>{parentName}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 animate-fade-up">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight mb-1">Good evening, <span className="text-gradient">{parentName}</span></h1>
            <p className="text-sm" style={{ color: 'var(--text-s)' }}>{pendingCount > 0 ? `You have ${pendingCount} pending approval${pendingCount > 1 ? 's' : ''} from ${childName}.` : 'All caught up. No pending approvals.'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* PENDING APPROVALS */}
            <div className="lg:col-span-8 space-y-4 animate-fade-up animate-delay-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-semibold">Pending Approvals</h2>{pendingCount > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-400">{pendingCount}</span>}</div>
                <span className="text-xs" style={{ color: 'var(--text-t)' }}>MPC threshold: 2-of-3</span>
              </div>

              {pendingRequests.length === 0 && (
                <div className="card p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4"><CheckCircle2 className="w-7 h-7 text-emerald-400" /></div>
                  <h3 className="text-lg font-semibold mb-2">All clear</h3>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--text-s)' }}>No pending approval requests from {childName}.</p>
                </div>
              )}

              {pendingRequests.map(req => {
                const isActioned = actionedIds.has(req.id);
                const isRemoving = removingIds.has(req.id);
                return (
                  <div key={req.id} className={`card p-6 relative overflow-hidden transition-all duration-500 ${isRemoving ? 'opacity-0 translate-x-8 scale-95 max-h-0' : ''}`} style={{ maxHeight: isRemoving ? '0px' : '400px' }}>
                    {!isActioned && <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-600 rounded-l-2xl" />}
                    {isActioned && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-sm rounded-2xl animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <div className="flex flex-col items-center gap-3">
                          {req.status === 'approved' ? <AnimatedCheckmark /> : <AnimatedXMark />}
                          <p className={`text-sm font-semibold ${req.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>{req.status === 'approved' ? 'Transaction Approved' : 'Transaction Denied'}</p>
                          {req.status === 'approved' && <p className="text-xs" style={{ color: 'var(--text-s)' }}>MPC signature broadcast to Stellar network</p>}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0"><span className="text-sm font-bold text-white">{childName[0]}</span></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div><p className="text-[15px]"><span className="font-semibold">{childName}</span> <span style={{ color: 'var(--text-s)' }}>wants to send</span></p><p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-s)' }}><Clock className="w-3 h-3" />{new Date(req.createdAt).toLocaleTimeString()}<span className="mx-1" style={{ color: 'var(--text-t)' }}>&middot;</span>{req.category}</p></div>
                          <div className="text-right shrink-0"><p className="text-2xl font-bold number-display">{parseFloat(req.amountXlm).toFixed(2)}<span className="text-sm font-medium ml-1" style={{ color: 'var(--text-s)' }}>XLM</span></p><p className="text-xs number-display" style={{ color: 'var(--text-s)' }}>${(parseFloat(req.amountXlm) * 0.12).toFixed(2)} USD</p></div>
                        </div>
                        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-2 mb-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /><span className="text-sm">&ldquo;{req.purpose}&rdquo;</span></div>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-s)' }}><Send className="w-3 h-3" /><span>To: {req.destinationLabel || formatAddress(req.destination)}</span></div>
                        </div>
                        <div className="flex items-center gap-2 mb-4 px-1"><Lock className="w-3 h-3 text-indigo-400" /><span className="text-[11px]" style={{ color: 'var(--text-s)' }}>Your approval (Share 2) + {childName}&apos;s share = <span className="text-indigo-400 font-medium">2-of-3 threshold met</span></span></div>
                        {!isActioned && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleApprove(req.id)} disabled={processingId !== null} className={`btn-approve px-6 py-2.5 text-sm flex-1 sm:flex-none ${processingId === req.id ? 'opacity-70 cursor-wait' : ''}`}>
                              {processingId === req.id ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-t)', borderTopColor: 'var(--text)' }} />Signing...</> : <><Check className="w-4 h-4" />Approve</>}
                            </button>
                            <button onClick={() => handleDeny(req.id)} disabled={processingId !== null} className="btn-deny px-6 py-2.5 text-sm flex-1 sm:flex-none"><X className="w-4 h-4" />Deny</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-4 space-y-4">
              {/* CHILD BALANCE */}
              <div className="card p-6 relative overflow-hidden animate-fade-up animate-delay-200">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center"><span className="text-xs font-bold text-white">{childName[0]}</span></div><div><p className="text-sm font-medium">{childName}&apos;s Wallet</p><p className="text-[11px]" style={{ color: 'var(--text-t)' }}>Child Account</p></div></div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-emerald-400 font-medium">Active</span></div>
                  </div>
                  <div className="mb-1">
                    {balanceLoading ? <span className="text-4xl font-bold number-display animate-pulse">...</span> : <span className="text-4xl font-bold number-display">{balance ? parseFloat(balance.xlm).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>}
                    <span className="text-lg font-medium ml-2" style={{ color: 'var(--text-s)' }}>XLM</span>
                  </div>
                  <p className="text-sm number-display mb-4" style={{ color: 'var(--text-s)' }}>{balance ? balance.usd : '$0.00'} USD</p>
                  <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                    <Wallet className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} />
                    <span className="text-xs font-mono truncate" style={{ color: 'var(--text-s)' }}>{balance?.publicKey ? formatAddress(balance.publicKey) : 'No wallet'}</span>
                  </div>
                </div>
              </div>

              {/* SPENDING THIS MONTH */}
              <div className="card p-6 animate-fade-up animate-delay-300">
                <div className="flex items-center justify-between mb-5"><p className="text-sm font-semibold">Spending This Month</p><TrendingUp className="w-4 h-4" style={{ color: 'var(--text-t)' }} /></div>
                <div className="flex items-center gap-6 mb-5">
                  <CircularProgress percentage={spendingPercentage} />
                  <div><p className="text-lg font-bold number-display mb-0.5">{spentTotal.toFixed(2)} XLM</p><p className="text-xs" style={{ color: 'var(--text-s)' }}>of {spendingLimit.toFixed(2)} XLM limit</p><p className="text-[11px] text-emerald-400 mt-1.5 font-medium">{(spendingLimit - spentTotal).toFixed(2)} remaining</p></div>
                </div>
              </div>

              {/* ALLOWANCE SETTINGS */}
              <div className="card p-6 animate-fade-up animate-delay-400">
                <div className="flex items-center justify-between mb-5"><p className="text-sm font-semibold">Allowance</p><Settings className="w-4 h-4" style={{ color: 'var(--text-t)' }} /></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm" style={{ color: 'var(--text-s)' }}>Weekly Amount</span><span className="text-lg font-bold number-display">{allowanceXlm} <span className="text-sm font-medium" style={{ color: 'var(--text-s)' }}>XLM</span></span></div>
                  <div className="w-full h-px" style={{ background: 'var(--border)' }} />
                  <div className="flex items-center justify-between"><span className="text-sm" style={{ color: 'var(--text-s)' }}>Next Deposit</span><div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" style={{ color: 'var(--text-s)' }} /><span className="text-sm font-medium">Monday</span></div></div>
                  <div className="w-full h-px" style={{ background: 'var(--border)' }} />
                  <div className="flex items-center justify-between"><span className="text-sm" style={{ color: 'var(--text-s)' }}>Monthly Limit</span><span className="text-sm font-medium number-display">{spendingLimit.toFixed(2)} XLM</span></div>
                </div>
              </div>

              {/* SECURITY STATUS */}
              <div className="card p-6 animate-fade-up animate-delay-500">
                <div className="flex items-center justify-between mb-5"><p className="text-sm font-semibold">Security Status</p><div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-emerald-400 font-medium">Secure</span></div></div>
                <div className="space-y-2 mb-4">
                  {members.map((m, i) => (
                    <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.role === 'child' ? 'bg-pink-500/10' : 'bg-indigo-500/10'}`}><Key className={`w-3 h-3 ${m.role === 'child' ? 'text-pink-400' : 'text-indigo-400'}`} /></div>
                        <div><p className="text-xs font-medium">{m.name || m.email}</p><p className="text-[10px]" style={{ color: 'var(--text-t)' }}>Share {m.shareIndex}</p></div>
                      </div>
                      <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${m.status === 'accepted' ? 'bg-emerald-400' : 'bg-amber-400'}`} /><span className={`text-[11px] font-medium ${m.status === 'accepted' ? 'text-emerald-400' : 'text-amber-400'}`}>{m.status === 'accepted' ? 'Active' : 'Pending'}</span></div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}><span className="text-xs" style={{ color: 'var(--text-s)' }}>Threshold</span><span className="text-xs font-semibold text-indigo-400">2 of 3 shares</span></div>
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-s)', border: '1px solid var(--border)' }}><span className="text-xs" style={{ color: 'var(--text-s)' }}>Encryption</span><span className="text-xs font-semibold flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-400" />AES-256-GCM</span></div>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY TABLE */}
            <div className="lg:col-span-12 card animate-fade-up animate-delay-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 pb-0 gap-4">
                <div><h2 className="text-sm font-semibold">Recent Activity</h2><p className="text-xs mt-0.5" style={{ color: 'var(--text-t)' }}>{filteredActivity.length} transactions</p></div>
                <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--bg-s)' }}>
                  {(['all', 'approved', 'denied'] as const).map(filter => (
                    <button key={filter} onClick={() => setActivityFilter(filter)} className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 capitalize ${activityFilter === filter ? 'font-medium' : ''}`} style={{ background: activityFilter === filter ? 'var(--bg-s)' : 'transparent', color: activityFilter === filter ? 'var(--text)' : 'var(--text-s)' }}>{filter}</button>
                  ))}
                </div>
              </div>
              <div className="p-6 pt-4">
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-t)' }}><div className="col-span-1">Type</div><div className="col-span-5">Description</div><div className="col-span-2 text-right">Amount</div><div className="col-span-2 text-center">Status</div><div className="col-span-2 text-right">Time</div></div>
                <div className="h-px mb-1" style={{ background: 'var(--border)' }} />
                <div className="space-y-0.5">
                  {filteredActivity.length === 0 && <div className="py-12 text-center"><p className="text-sm" style={{ color: 'var(--text-t)' }}>No transactions match this filter.</p></div>}
                  {filteredActivity.map(item => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center py-3.5 px-4 rounded-xl inner-panel-hover">
                      <div className="hidden sm:flex col-span-1"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.status === 'approved' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>{item.status === 'approved' ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</div></div>
                      <div className="sm:col-span-5"><p className="text-sm font-medium">{item.purpose}</p><p className="text-xs" style={{ color: 'var(--text-t)' }}>{item.destinationLabel || formatAddress(item.destination)}</p></div>
                      <div className="sm:col-span-2 text-right"><p className="text-sm font-semibold number-display">{parseFloat(item.amountXlm).toFixed(2)} XLM</p></div>
                      <div className="sm:col-span-2 flex sm:justify-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${item.status === 'approved' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                          {item.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}<span className="capitalize">{item.status}</span>
                        </div>
                      </div>
                      <div className="sm:col-span-2 text-right"><p className="text-xs" style={{ color: 'var(--text-s)' }}>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}

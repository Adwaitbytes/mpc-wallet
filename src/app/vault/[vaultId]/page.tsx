'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/app/components/ThemeProvider';
import { useVault } from '@/hooks/useVault';
import { BalanceDisplay } from '@/app/components/vault/BalanceDisplay';
import { MemberList } from '@/app/components/vault/MemberList';
import { ActionList } from '@/app/components/vault/ActionList';
import { VaultTypeIcon } from '@/app/components/vault/VaultTypeIcon';
import {
  ArrowLeft, Settings, Send, FileText, Clock,
  Heart, Loader2, AlertTriangle, Sun, Moon,
} from 'lucide-react';

// Payment modal
function PaymentModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: { destination: string; amount: string; purpose: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!destination || !amount || !purpose) { setError('All fields required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ destination, amount, purpose });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>New Payment Request</h3>
        <div className="space-y-3">
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="Destination address (G...)"
            className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none placeholder-muted"
            style={{ color: 'var(--text)' }}
          />
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount (XLM)"
            type="number"
            step="0.01"
            className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none placeholder-muted number-display"
            style={{ color: 'var(--text)' }}
          />
          <input
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="Purpose / Memo"
            className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none placeholder-muted"
            style={{ color: 'var(--text)' }}
          />
        </div>
        {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1 px-3 py-2.5 text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex-1 px-3 py-2.5 text-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VaultDetailPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const { vault, balance, actions, userRole, loading, error, refetch, createAction, castVote, sendHeartbeat } = useVault(vaultId);
  const [showPayment, setShowPayment] = useState(false);
  const [tab, setTab] = useState<'actions' | 'members' | 'info'>('actions');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={32} className="text-rose-400" />
        <p style={{ color: 'var(--text-s)' }}>{error || 'Vault not found'}</p>
        <button onClick={() => router.push('/dashboard')} className="text-indigo-400 text-sm">Back to dashboard</button>
      </div>
    );
  }

  const canSign = ['owner', 'signer', 'council', 'arbiter', 'executor'].includes(userRole || '');
  const canCreate = ['owner', 'signer', 'requester', 'council'].includes(userRole || '');
  const isInheritance = vault.vault_type === 'inheritance';
  const vaultConfig = vault.config || {};

  const handlePayment = async (data: { destination: string; amount: string; purpose: string }) => {
    await createAction('payment', {
      destination: data.destination,
      amount: data.amount,
      purpose: data.purpose,
      asset: 'XLM',
    });
  };

  const pendingActions = actions.filter(a => ['pending', 'time_locked'].includes(a.status));
  const completedActions = actions.filter(a => ['executed', 'denied', 'failed', 'expired'].includes(a.status));

  return (
    <div className="min-h-screen relative">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-indigo-500/[0.03] blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="max-w-4xl mx-auto glass-nav px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="transition-colors" style={{ color: 'var(--text-s)' }}>
              <ArrowLeft size={20} />
            </button>
            <VaultTypeIcon type={vault.vault_type} size={18} />
            <div>
              <h1 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{vault.name}</h1>
              <p className="text-xs capitalize" style={{ color: 'var(--text-t)' }}>{vault.vault_type} &middot; {vault.chain}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inner-panel ${
              vault.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {vault.status}
            </span>
            <button
              onClick={() => router.push(`/vault/${vaultId}/settings`)}
              className="transition-colors"
              style={{ color: 'var(--text-t)' }}
            >
              <Settings size={16} />
            </button>
            <button onClick={toggle} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--text-t)' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Balance + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <BalanceDisplay balance={balance} onRefresh={refetch} />
          </div>
          <div className="space-y-2">
            {canCreate && vault.status === 'active' && (
              <button
                onClick={() => setShowPayment(true)}
                className="btn-primary w-full px-4 py-3 text-sm"
              >
                <Send size={16} /> New Payment
              </button>
            )}

            {isInheritance && userRole === 'owner' && (
              <button
                onClick={sendHeartbeat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium rounded-xl hover:bg-rose-500/20 transition-colors"
              >
                <Heart size={16} /> Send Heartbeat
              </button>
            )}

            {vault.wallet_public_key && (
              <div className="inner-panel px-3 py-2">
                <p className="text-xs mb-1" style={{ color: 'var(--text-t)' }}>Wallet</p>
                <p className="text-xs font-mono truncate" style={{ color: 'var(--text-s)' }}>{vault.wallet_public_key}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inheritance heartbeat status */}
        {isInheritance && Boolean(vaultConfig.heartbeat_interval_days) && (
          <div className="mb-6 card px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} style={{ color: 'var(--text-s)' }} />
              <div>
                <p className="text-sm" style={{ color: 'var(--text-s)' }}>Dead Man&apos;s Switch</p>
                <p className="text-xs" style={{ color: 'var(--text-t)' }}>
                  {typeof vaultConfig.last_heartbeat === 'string'
                    ? `Last heartbeat: ${new Date(vaultConfig.last_heartbeat).toLocaleString()}`
                    : 'No heartbeat recorded yet'}
                </p>
              </div>
            </div>
            {Boolean(vaultConfig.executor_activated) && (
              <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-400 rounded-full">Executor Activated</span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--inner-border)' }}>
          {(['actions', 'members', 'info'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-indigo-500' : 'border-transparent'
              }`}
              style={{ color: tab === t ? 'var(--text)' : 'var(--text-t)' }}
            >
              {t}
              {t === 'actions' && pendingActions.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs">
                  {pendingActions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'actions' && (
          <div className="space-y-6">
            {pendingActions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-s)' }}>Pending Actions</h3>
                <ActionList
                  actions={pendingActions}
                  canVote={canSign}
                  onApprove={async (id) => { await castVote(id, 'approve'); }}
                  onDeny={async (id) => { await castVote(id, 'deny'); }}
                />
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-s)' }}>History</h3>
              <ActionList
                actions={completedActions}
                canVote={false}
                emptyMessage="No action history"
              />
            </div>
          </div>
        )}

        {tab === 'members' && (
          <MemberList members={vault.members || []} />
        )}

        {tab === 'info' && (
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-s)' }}>Vault Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span style={{ color: 'var(--text-t)' }}>Type</span><span className="capitalize" style={{ color: 'var(--text)' }}>{vault.vault_type}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-t)' }}>Chain</span><span className="capitalize" style={{ color: 'var(--text)' }}>{vault.chain}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-t)' }}>Network</span><span className="capitalize" style={{ color: 'var(--text)' }}>{vault.network}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-t)' }}>Threshold</span><span className="number-display" style={{ color: 'var(--text)' }}>{vault.threshold}-of-{vault.total_shares}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-t)' }}>Your Role</span><span className="capitalize" style={{ color: 'var(--text)' }}>{userRole}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-t)' }}>Created</span><span style={{ color: 'var(--text)' }}>{new Date(vault.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>

            {Object.keys(vaultConfig).length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-s)' }}>Settings</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(vaultConfig).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize" style={{ color: 'var(--text-t)' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--text)' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push(`/vault/${vaultId}/audit`)}
              className="btn-secondary w-full px-4 py-2.5 text-sm"
            >
              <FileText size={16} /> View Audit Log
            </button>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          onSubmit={handlePayment}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

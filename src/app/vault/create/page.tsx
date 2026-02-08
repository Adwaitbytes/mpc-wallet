'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/components/ThemeProvider';
import { VaultTypeIcon } from '@/app/components/vault/VaultTypeIcon';
import { VAULT_TYPE_INFO } from '@/lib/vault/presets';
import {
  ArrowLeft, ArrowRight, Loader2, Check, Plus, Trash2, Sun, Moon,
} from 'lucide-react';
import type { VaultType } from '@/lib/vault/types';

type Step = 'type' | 'config' | 'review';

export default function CreateVaultPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<VaultType | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [members, setMembers] = useState<string[]>(['']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const typeInfo = selectedType ? VAULT_TYPE_INFO[selectedType] : null;

  const handleCreate = async () => {
    if (!selectedType) return;
    setCreating(true);
    setError('');

    try {
      const preset: Record<string, unknown> = { ...config };
      const validMembers = members.filter(e => e.trim() && e.includes('@'));

      // Map member emails to preset fields based on vault type
      switch (selectedType) {
        case 'family':
          preset.parent1Email = validMembers[0] || '';
          preset.parent2Email = validMembers[1] || '';
          break;
        case 'company':
          preset.companyName = config.name || 'Company';
          preset.signerEmails = validMembers;
          break;
        case 'escrow':
          preset.freelancerEmail = validMembers[0] || '';
          preset.arbiterEmail = validMembers[1] || '';
          break;
        case 'inheritance':
          preset.executorEmail = validMembers[0] || '';
          preset.beneficiaryEmail = validMembers[1] || '';
          break;
        case 'dao':
          preset.daoName = config.name || 'DAO';
          preset.councilEmails = validMembers;
          break;
        case 'trade':
          preset.tradeName = config.name || 'Trade';
          preset.exporterEmail = validMembers[0] || '';
          preset.bankEmail = validMembers[1] || '';
          break;
      }

      const res = await fetch('/api/v2/vault/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultType: selectedType, preset }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/vault/${data.vault.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-indigo-500/[0.03] blur-[100px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="max-w-2xl mx-auto glass-nav px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step === 'type' ? router.push('/dashboard') : setStep(step === 'review' ? 'config' : 'type')}
              className="transition-colors"
              style={{ color: 'var(--text-s)' }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Create Vault</h1>
          </div>
          <button onClick={toggle} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-t)' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['type', 'config', 'review'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                s === step ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white' :
                ['type', 'config', 'review'].indexOf(step) > i ? 'bg-emerald-500/20 text-emerald-400' :
                'text-zinc-500'
              }`} style={s !== step && ['type', 'config', 'review'].indexOf(step) <= i ? { background: 'var(--inner-bg)', border: '1px solid var(--inner-border)' } : undefined}>
                {['type', 'config', 'review'].indexOf(step) > i ? <Check size={14} /> : i + 1}
              </div>
              {i < 2 && <div className="w-12 h-px" style={{ background: 'var(--inner-border)' }} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Select Type */}
        {step === 'type' && (
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Choose Vault Type</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-t)' }}>Select the type that matches your use case</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries(VAULT_TYPE_INFO) as [VaultType, typeof VAULT_TYPE_INFO[VaultType]][]).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => { setSelectedType(type); setStep('config'); }}
                  className={`text-left p-4 rounded-xl transition-all ${
                    selectedType === type
                      ? 'border-indigo-500 bg-indigo-500/10 border'
                      : 'card-hover'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <VaultTypeIcon type={type} size={20} withBg />
                    <div>
                      <h3 className="font-medium text-sm" style={{ color: 'var(--text)' }}>{info.name}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-t)' }}>{info.description}</p>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-t)', opacity: 0.6 }}>{info.defaultThreshold}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Configure */}
        {step === 'config' && selectedType && typeInfo && (
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Configure {typeInfo.name}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-t)' }}>{typeInfo.defaultThreshold} threshold signing</p>

            {/* Vault Name */}
            {['company', 'dao', 'trade', 'escrow'].includes(selectedType) && (
              <div className="mb-4">
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Name</label>
                <input
                  type="text"
                  value={(config.name as string) || ''}
                  onChange={e => setConfig({ ...config, name: e.target.value })}
                  placeholder={`${typeInfo.name} name`}
                  className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none placeholder-muted"
                  style={{ color: 'var(--text)', borderColor: 'var(--inner-border)' }}
                />
              </div>
            )}

            {/* Type-specific fields */}
            {selectedType === 'family' && (
              <div className="mb-4">
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Monthly Allowance (XLM)</label>
                <input
                  type="number"
                  value={(config.allowanceXlm as number) || 50}
                  onChange={e => setConfig({ ...config, allowanceXlm: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            )}

            {selectedType === 'company' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Auto-approve below (XLM)</label>
                  <input
                    type="number"
                    value={(config.autoApproveBelow as number) || 100}
                    onChange={e => setConfig({ ...config, autoApproveBelow: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Time-lock above (XLM)</label>
                  <input
                    type="number"
                    value={(config.timeLockAbove as number) || 1000}
                    onChange={e => setConfig({ ...config, timeLockAbove: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              </>
            )}

            {selectedType === 'escrow' && (
              <div className="mb-4">
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Total Amount (XLM)</label>
                <input
                  type="text"
                  value={(config.totalAmount as string) || ''}
                  onChange={e => setConfig({ ...config, totalAmount: e.target.value })}
                  placeholder="1000"
                  className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none placeholder-muted number-display"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            )}

            {selectedType === 'inheritance' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Heartbeat Interval (days)</label>
                  <input
                    type="number"
                    value={(config.heartbeatIntervalDays as number) || 30}
                    onChange={e => setConfig({ ...config, heartbeatIntervalDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Executor Delay (days)</label>
                  <input
                    type="number"
                    value={(config.executorDelayDays as number) || 7}
                    onChange={e => setConfig({ ...config, executorDelayDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              </>
            )}

            {selectedType === 'dao' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Voting Period (hours)</label>
                  <input
                    type="number"
                    value={(config.votingPeriodHours as number) || 72}
                    onChange={e => setConfig({ ...config, votingPeriodHours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>Quorum (%)</label>
                  <input
                    type="number"
                    value={(config.quorumPercent as number) || 50}
                    onChange={e => setConfig({ ...config, quorumPercent: parseInt(e.target.value) })}
                    className="w-full px-3 py-2.5 inner-panel text-sm focus:outline-none number-display"
                    style={{ color: 'var(--text)' }}
                  />
                </div>
              </>
            )}

            {/* Member emails */}
            <div className="mt-6">
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-s)' }}>
                Invite Members ({selectedType === 'family' ? '2 parents' : 'enter emails'})
              </label>
              {members.map((email, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      const updated = [...members];
                      updated[idx] = e.target.value;
                      setMembers(updated);
                    }}
                    placeholder={`member${idx + 1}@example.com`}
                    className="flex-1 px-3 py-2.5 inner-panel text-sm focus:outline-none placeholder-muted"
                    style={{ color: 'var(--text)' }}
                  />
                  {members.length > 1 && (
                    <button
                      onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                      className="px-2 hover:text-rose-400 transition-colors"
                      style={{ color: 'var(--text-t)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {members.length < (typeInfo.maxMembers - 1) && (
                <button
                  onClick={() => setMembers([...members, ''])}
                  className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                >
                  <Plus size={14} /> Add member
                </button>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep('type')}
                className="btn-secondary px-4 py-2.5 text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep('review')}
                className="btn-primary flex-1 px-4 py-2.5 text-sm"
              >
                Review <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Create */}
        {step === 'review' && selectedType && typeInfo && (
          <div>
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>Review & Create</h2>

            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <VaultTypeIcon type={selectedType} size={24} withBg />
                <div>
                  <h3 className="font-medium" style={{ color: 'var(--text)' }}>{typeInfo.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-t)' }}>Stellar Testnet &middot; {typeInfo.defaultThreshold}</p>
                </div>
              </div>

              {Object.entries(config).filter(([, v]) => v !== undefined && v !== '').map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm pt-3" style={{ borderTop: '1px solid var(--inner-border)' }}>
                  <span className="capitalize" style={{ color: 'var(--text-t)' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span style={{ color: 'var(--text)' }}>{String(value)}</span>
                </div>
              ))}

              <div className="pt-3" style={{ borderTop: '1px solid var(--inner-border)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--text-t)' }}>Members to invite</p>
                {members.filter(e => e.trim()).map((email, idx) => (
                  <p key={idx} className="text-sm" style={{ color: 'var(--text-s)' }}>{email}</p>
                ))}
                <p className="text-sm mt-1" style={{ color: 'var(--text-s)' }}>+ {session?.user?.email} (you)</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('config')}
                className="btn-secondary px-4 py-2.5 text-sm"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {creating ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating...</>
                ) : (
                  <><Check size={16} /> Create Vault</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

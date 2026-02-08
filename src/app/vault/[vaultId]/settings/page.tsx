'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/components/ThemeProvider';
import { ArrowLeft, Loader2, Trash2, Sun, Moon } from 'lucide-react';

interface Rule {
  id: string;
  rule_type: string;
  config: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}

export default function VaultSettingsPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v2/vault/${vaultId}/rules`)
      .then(r => r.json())
      .then(data => { setRules(data.rules || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [vaultId]);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await fetch(`/api/v2/vault/${vaultId}/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled } : r));
  };

  const deleteRule = async (ruleId: string) => {
    await fetch(`/api/v2/vault/${vaultId}/rules/${ruleId}`, { method: 'DELETE' });
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const ruleTypeLabels: Record<string, string> = {
    auto_approve: 'Auto-Approve',
    time_lock: 'Time Lock',
    whitelist: 'Address Whitelist',
    rate_limit: 'Rate Limit',
    category_budget: 'Category Budget',
    heartbeat: 'Heartbeat (Dead Man\'s Switch)',
    voting_period: 'Voting Period',
    quorum: 'Quorum',
    expiration: 'Action Expiration',
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
            <button onClick={() => router.push(`/vault/${vaultId}`)} className="transition-colors" style={{ color: 'var(--text-s)' }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Vault Settings</h1>
          </div>
          <button onClick={toggle} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-t)' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Policy Rules</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-t)' }}>Manage automation and security rules for this vault</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text-t)' }}>No rules configured</p>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>{ruleTypeLabels[rule.rule_type] || rule.rule_type}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-t)' }}>Priority: {rule.priority}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        rule.enabled
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'inner-panel'
                      }`}
                      style={!rule.enabled ? { color: 'var(--text-t)' } : undefined}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="hover:text-rose-400 transition-colors"
                      style={{ color: 'var(--text-t)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Config display */}
                <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--inner-border)' }}>
                  {Object.entries(rule.config).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="capitalize" style={{ color: 'var(--text-t)' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--text-s)' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

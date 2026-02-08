'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/components/ThemeProvider';
import { ArrowLeft, Loader2, FileText, Sun, Moon } from 'lucide-react';

interface AuditEntry {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  actor_name?: string;
  actor_email?: string;
  created_at: string;
}

export default function VaultAuditPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v2/vault/${vaultId}/audit?limit=100`)
      .then(r => r.json())
      .then(data => { setEntries(data.entries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [vaultId]);

  const eventColors: Record<string, string> = {
    vault_created: 'text-indigo-400',
    vault_activated: 'text-emerald-400',
    invite_accepted: 'text-blue-400',
    action_created: 'text-amber-400',
    vote_cast: 'text-purple-400',
    action_executed: 'text-emerald-400',
    action_denied: 'text-rose-400',
    action_expired: '',
    action_failed: 'text-rose-400',
    heartbeat_received: 'text-rose-400',
    executor_activated: 'text-rose-400',
    config_changed: 'text-cyan-400',
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
            <h1 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Audit Log</h1>
          </div>
          <button onClick={toggle} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-t)' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 relative z-10">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-t)' }}>
            <FileText size={32} className="mb-2" />
            <p className="text-sm">No audit entries yet</p>
          </div>
        ) : (
          <div className="card p-4">
            <div className="space-y-0">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-3"
                  style={idx < entries.length - 1 ? { borderBottom: '1px solid var(--inner-border)' } : undefined}
                >
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--text-t)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${eventColors[entry.event_type] || ''}`} style={!eventColors[entry.event_type] ? { color: 'var(--text-s)' } : undefined}>
                        {entry.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-t)' }}>
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    {entry.actor_name && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-t)' }}>by {entry.actor_name}</p>
                    )}
                    {Object.keys(entry.details).length > 0 && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-t)', opacity: 0.6 }}>
                        {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

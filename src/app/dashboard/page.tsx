'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUserVaults } from '@/hooks/useVault';
import { VaultCard } from '@/app/components/vault/VaultCard';
import { Plus, Loader2, LogOut, Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { vaults, loading, error, refetch } = useUserVaults();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60%] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[30%] right-[-15%] w-[50%] h-[50%] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Theme toggle */}
      <button onClick={toggle} className="fixed top-5 right-5 z-50 p-2 rounded-lg transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-s)' }}>
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Header */}
      <header className="glass-nav mx-4 mt-4 px-5 py-3 flex items-center justify-between sticky top-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>StellaRay Vault</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-xs hidden sm:block" style={{ color: 'var(--text-s)' }}>{session?.user?.email}</span>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="transition-colors hover:opacity-70" style={{ color: 'var(--text-t)' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Title + Create button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Your Vaults</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-s)' }}>
              {vaults.length === 0
                ? 'Create your first vault to get started'
                : `${vaults.length} vault${vaults.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/vault/create')}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            <Plus size={16} />
            New Vault
          </button>
        </div>

        {error && (
          <div className="mb-6 inner-panel px-4 py-3 text-sm" style={{ borderColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
            {error}
          </div>
        )}

        {/* Vault grid */}
        {vaults.length > 0 ? (
          <div className="grid gap-3">
            {vaults.map((vault: Record<string, unknown>) => (
              <VaultCard key={vault.id as string} vault={vault as Parameters<typeof VaultCard>[0]['vault']} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-fade-up">
            <div className="card inline-flex items-center justify-center w-16 h-16 mb-4 glow-indigo">
              <Shield size={28} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>No vaults yet</h2>
            <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-s)' }}>
              Create a vault to manage shared funds with MPC threshold signing.
              Choose from Family, Company, Escrow, Inheritance, DAO, or Trade.
            </p>
            <button
              onClick={() => router.push('/vault/create')}
              className="btn-primary px-6 py-3 text-sm"
            >
              Create Your First Vault
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { VaultTypeIcon } from './VaultTypeIcon';
import { ChevronRight, Wallet, Clock, Users } from 'lucide-react';

interface VaultCardProps {
  vault: {
    id: string;
    name: string;
    vault_type: string;
    chain: string;
    status: string;
    wallet_public_key?: string;
    memberCount?: number;
    config?: Record<string, unknown>;
    created_at?: string;
  };
}

const statusColors: Record<string, string> = {
  active: 'text-emerald-400',
  pending: 'text-amber-400',
  frozen: 'text-blue-400',
  closed: 'text-zinc-400',
};

const chainLabels: Record<string, string> = {
  stellar: 'Stellar',
  ethereum: 'Ethereum',
  solana: 'Solana',
};

export function VaultCard({ vault }: VaultCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/vault/${vault.id}`)}
      className="w-full text-left card-hover p-4 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <VaultTypeIcon type={vault.vault_type} size={22} withBg />
          <div>
            <h3 className="font-medium text-sm" style={{ color: 'var(--text)' }}>{vault.name}</h3>
            <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-t)' }}>{vault.vault_type} &middot; {chainLabels[vault.chain] || vault.chain}</p>
          </div>
        </div>
        <ChevronRight size={16} className="mt-1 transition-colors" style={{ color: 'var(--text-t)' }} />
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--inner-border)' }}>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inner-panel ${statusColors[vault.status] || ''}`}>
          {vault.status}
        </span>

        {vault.wallet_public_key && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-t)' }}>
            <Wallet size={12} />
            {vault.wallet_public_key.slice(0, 4)}...{vault.wallet_public_key.slice(-4)}
          </span>
        )}

        {vault.memberCount && (
          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-t)' }}>
            <Users size={12} />
            {vault.memberCount}
          </span>
        )}

        {vault.created_at && (
          <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: 'var(--text-t)' }}>
            <Clock size={12} />
            {new Date(vault.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </button>
  );
}

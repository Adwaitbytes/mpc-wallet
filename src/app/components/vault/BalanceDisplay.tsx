'use client';

import { Wallet, RefreshCw } from 'lucide-react';

interface BalanceDisplayProps {
  balance: {
    native: string;
    nativeFormatted: string;
    symbol: string;
    usdEstimate: string;
    funded: boolean;
    assets?: Array<{ code: string; issuer: string; balance: string }>;
  } | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function BalanceDisplay({ balance, loading, onRefresh }: BalanceDisplayProps) {
  if (!balance) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2" style={{ color: 'var(--text-t)' }}>
          <Wallet size={18} />
          <span className="text-sm">No wallet yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 glow-indigo">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2" style={{ color: 'var(--text-s)' }}>
          <Wallet size={18} />
          <span className="text-sm font-medium">Balance</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="transition-colors hover:opacity-70" style={{ color: 'var(--text-t)' }} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-bold number-display" style={{ color: 'var(--text)' }}>
          {parseFloat(balance.native).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-lg ml-2" style={{ color: 'var(--text-s)' }}>{balance.symbol}</span>
        </p>
        <p className="text-sm" style={{ color: 'var(--text-t)' }}>{balance.usdEstimate} USD</p>
      </div>

      {!balance.funded && (
        <div className="mt-3 inner-panel px-3 py-2" style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
          <p className="text-xs text-amber-400">Account not funded on-chain</p>
        </div>
      )}

      {balance.assets && balance.assets.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--inner-border)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--text-t)' }}>Other Assets</p>
          {balance.assets.map((asset, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span style={{ color: 'var(--text-s)' }}>{asset.code}</span>
              <span className="number-display" style={{ color: 'var(--text)' }}>{parseFloat(asset.balance).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

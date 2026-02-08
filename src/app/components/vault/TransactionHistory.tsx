'use client';

import { ArrowDownLeft, ArrowUpRight, ExternalLink, Inbox } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: string;
  asset: string;
  from: string;
  to: string;
  createdAt: string;
  successful: boolean;
  hash?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  walletAddress: string;
  chain?: string;
}

export function TransactionHistory({ transactions, walletAddress, chain = 'stellar' }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-t)' }}>
        <Inbox size={32} className="mb-2" />
        <p className="text-sm">No transactions yet</p>
      </div>
    );
  }

  const explorerBase = chain === 'stellar'
    ? 'https://stellar.expert/explorer/testnet/tx/'
    : '';

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isIncoming = tx.to === walletAddress;
        return (
          <div
            key={tx.id}
            className="inner-panel flex items-center justify-between py-3 px-3"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${isIncoming ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {isIncoming ? (
                  <ArrowDownLeft size={16} className="text-emerald-400" />
                ) : (
                  <ArrowUpRight size={16} className="text-rose-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium number-display" style={{ color: 'var(--text)' }}>
                  {isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} {tx.asset}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-t)' }}>
                  {isIncoming ? 'From' : 'To'}: {(isIncoming ? tx.from : tx.to).slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-t)' }}>
                  {new Date(tx.createdAt).toLocaleDateString()}
                </p>
                <p className={`text-xs ${tx.successful ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.successful ? 'Success' : 'Failed'}
                </p>
              </div>
              {tx.hash && explorerBase && (
                <a
                  href={`${explorerBase}${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-t)' }}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

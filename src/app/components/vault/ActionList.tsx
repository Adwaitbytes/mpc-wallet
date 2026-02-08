'use client';

import { ActionCard } from './ActionCard';
import { Inbox } from 'lucide-react';

interface Action {
  id: string;
  action_type: string;
  creator_id: string;
  payload: Record<string, unknown>;
  status: string;
  approvals_required: number;
  approvals_received: number;
  denials_received: number;
  time_lock_until: string | null;
  expires_at: string | null;
  tx_hash: string | null;
  created_at: string;
}

interface ActionListProps {
  actions: Action[];
  canVote: boolean;
  onApprove?: (actionId: string) => Promise<void>;
  onDeny?: (actionId: string) => Promise<void>;
  filter?: string;
  emptyMessage?: string;
}

export function ActionList({
  actions,
  canVote,
  onApprove,
  onDeny,
  filter,
  emptyMessage = 'No actions yet',
}: ActionListProps) {
  const filtered = filter
    ? actions.filter(a => a.status === filter)
    : actions;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-t)' }}>
        <Inbox size={32} className="mb-2" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map(action => (
        <ActionCard
          key={action.id}
          action={action}
          canVote={canVote}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      ))}
    </div>
  );
}

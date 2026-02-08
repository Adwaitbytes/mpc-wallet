'use client';

import { useState } from 'react';
import {
  CheckCircle, XCircle, Clock, ArrowUpRight, AlertTriangle,
  Loader2, ThumbsUp, ThumbsDown, ExternalLink,
} from 'lucide-react';

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

interface ActionCardProps {
  action: Action;
  canVote: boolean;
  onApprove?: (actionId: string) => Promise<void>;
  onDeny?: (actionId: string) => Promise<void>;
}

const statusIcons: Record<string, typeof CheckCircle> = {
  pending: Clock,
  approved: CheckCircle,
  time_locked: Clock,
  executing: Loader2,
  executed: CheckCircle,
  denied: XCircle,
  expired: AlertTriangle,
  failed: XCircle,
};

const statusColors: Record<string, string> = {
  pending: 'text-amber-400',
  approved: 'text-blue-400',
  time_locked: 'text-purple-400',
  executing: 'text-blue-400',
  executed: 'text-emerald-400',
  denied: 'text-rose-400',
  expired: '',
  failed: 'text-rose-400',
};

const actionLabels: Record<string, string> = {
  payment: 'Payment',
  batch_payment: 'Batch Payment',
  path_payment: 'Path Payment',
  proposal: 'Proposal',
  milestone_release: 'Milestone Release',
  dispute: 'Dispute',
  heartbeat: 'Heartbeat',
  executor_activation: 'Executor Activation',
  config_change: 'Config Change',
  member_add: 'Add Member',
  member_remove: 'Remove Member',
  share_rotation: 'Share Rotation',
};

export function ActionCard({ action, canVote, onApprove, onDeny }: ActionCardProps) {
  const [voting, setVoting] = useState(false);

  const StatusIcon = statusIcons[action.status] || Clock;
  const statusColor = statusColors[action.status] || '';
  const payload = action.payload;

  const handleVote = async (type: 'approve' | 'deny') => {
    setVoting(true);
    try {
      if (type === 'approve') await onApprove?.(action.id);
      else await onDeny?.(action.id);
    } catch {
      // error handled upstream
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon size={16} className={`${statusColor} ${action.status === 'executing' ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {actionLabels[action.action_type] || action.action_type}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-t)' }}>
          {new Date(action.created_at).toLocaleString()}
        </span>
      </div>

      {/* Payload details */}
      <div className="mt-3 space-y-1">
        {typeof payload.amount === 'string' && (
          <div className="flex items-center gap-1.5">
            <ArrowUpRight size={14} style={{ color: 'var(--text-t)' }} />
            <span className="text-sm font-medium number-display" style={{ color: 'var(--text)' }}>{String(payload.amount)} XLM</span>
          </div>
        )}
        {typeof payload.destination === 'string' && (
          <p className="text-xs truncate" style={{ color: 'var(--text-t)' }}>
            To: {String(payload.destination).slice(0, 8)}...{String(payload.destination).slice(-8)}
          </p>
        )}
        {typeof payload.purpose === 'string' && (
          <p className="text-xs" style={{ color: 'var(--text-s)' }}>{String(payload.purpose)}</p>
        )}
        {typeof payload.title === 'string' && (
          <p className="text-sm" style={{ color: 'var(--text-s)' }}>{String(payload.title)}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span style={{ color: 'var(--text-t)' }}>
            {action.approvals_received}/{action.approvals_required} approvals
          </span>
          {action.denials_received > 0 && (
            <span className="text-rose-400">{action.denials_received} denied</span>
          )}
        </div>
        <div className="w-full rounded-full h-1.5" style={{ background: 'var(--inner-bg)' }}>
          <div
            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(100, (action.approvals_received / action.approvals_required) * 100)}%` }}
          />
        </div>
      </div>

      {/* Time lock / expiration */}
      {action.time_lock_until && action.status === 'time_locked' && (
        <div className="mt-2 inner-panel px-2 py-1 text-xs text-purple-400">
          Time-locked until {new Date(action.time_lock_until).toLocaleString()}
        </div>
      )}
      {action.expires_at && ['pending'].includes(action.status) && (
        <div className="mt-2 inner-panel px-2 py-1 text-xs text-amber-400">
          Expires {new Date(action.expires_at).toLocaleString()}
        </div>
      )}

      {/* TX hash */}
      {action.tx_hash && (
        <div className="mt-2 flex items-center gap-1">
          <ExternalLink size={12} style={{ color: 'var(--text-t)' }} />
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${action.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 truncate"
          >
            {action.tx_hash.slice(0, 12)}...
          </a>
        </div>
      )}

      {/* Vote buttons */}
      {canVote && ['pending', 'time_locked'].includes(action.status) && (
        <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: '1px solid var(--inner-border)' }}>
          <button
            onClick={() => handleVote('approve')}
            disabled={voting}
            className="btn-approve flex-1 px-3 py-2 text-sm disabled:opacity-50"
          >
            {voting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
            Approve
          </button>
          <button
            onClick={() => handleVote('deny')}
            disabled={voting}
            className="btn-deny flex-1 px-3 py-2 text-sm disabled:opacity-50"
          >
            {voting ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
            Deny
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Escrow Vault Preset
 * 2-of-3: client + freelancer + arbiter
 * Milestone-based releases, dispute resolution, timeout
 */

import type { CreateVaultInput } from '../types';

export interface EscrowPresetInput {
  title: string;
  clientEmail: string;
  freelancerEmail: string;
  arbiterEmail: string;
  totalAmount: string;
  milestones: Array<{
    name: string;
    amount: string;
  }>;
  timeoutDays?: number;
}

export function escrowPreset(input: EscrowPresetInput): CreateVaultInput {
  const milestones = input.milestones.map(m => ({
    ...m,
    status: 'pending' as const,
  }));

  return {
    name: `Escrow: ${input.title}`,
    vaultType: 'escrow',
    chain: 'stellar',
    network: 'testnet',
    threshold: 2,
    totalShares: 3,
    config: {
      milestones,
      timeout_days: input.timeoutDays || 30,
      total_amount: input.totalAmount,
    },
    members: [
      {
        email: input.clientEmail,
        role: 'signer',
        label: 'Client',
        permissions: {
          can_approve: true,
          can_deny: true,
          can_create_actions: true,
          can_dispute: true,
          can_view_all: true,
        },
      },
      {
        email: input.freelancerEmail,
        role: 'signer',
        label: 'Freelancer',
        permissions: {
          can_approve: true,
          can_create_actions: true,
          can_request_milestone: true,
          can_view_all: true,
        },
      },
      {
        email: input.arbiterEmail,
        role: 'arbiter',
        label: 'Arbiter',
        permissions: {
          can_approve: true,
          can_deny: true,
          can_resolve_dispute: true,
          can_view_all: true,
        },
      },
    ],
    rules: [
      {
        ruleType: 'expiration',
        config: { expires_after_hours: (input.timeoutDays || 30) * 24 },
        priority: 100,
      },
    ],
  };
}

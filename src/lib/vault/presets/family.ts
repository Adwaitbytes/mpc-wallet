/**
 * Family Vault Preset
 * 2-of-3 threshold: child (requester) + parent1 (signer) + parent2 (signer)
 * Child can request spending, parents approve
 */

import type { CreateVaultInput } from '../types';

export interface FamilyPresetInput {
  childEmail: string;
  childName?: string;
  parent1Email: string;
  parent2Email: string;
  allowanceXlm?: number;
  autoDeposit?: boolean;
}

export function familyPreset(input: FamilyPresetInput): CreateVaultInput {
  return {
    name: `${input.childName || 'Family'} Wallet`,
    vaultType: 'family',
    chain: 'stellar',
    network: 'testnet',
    threshold: 2,
    totalShares: 3,
    config: {
      allowance_xlm: input.allowanceXlm || 50,
      auto_deposit: input.autoDeposit !== false,
    },
    members: [
      {
        email: input.childEmail,
        role: 'requester',
        label: 'Child',
        permissions: { can_request: true, can_view_balance: true, can_view_transactions: true },
      },
      {
        email: input.parent1Email,
        role: 'signer',
        label: 'Parent 1',
        permissions: { can_approve: true, can_deny: true, can_view_all: true },
      },
      {
        email: input.parent2Email,
        role: 'signer',
        label: 'Parent 2',
        permissions: { can_approve: true, can_deny: true, can_view_all: true },
      },
    ],
    rules: [
      {
        ruleType: 'expiration',
        config: { expires_after_hours: 168 }, // 7 days
        priority: 100,
      },
    ],
  };
}

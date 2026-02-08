/**
 * Company Vault Preset
 * N-of-M threshold with tiered approvals
 * Owner (admin) + signers, auto-approve small amounts, time-lock large amounts
 */

import type { CreateVaultInput } from '../types';

export interface CompanyPresetInput {
  companyName: string;
  ownerEmail: string;
  signerEmails: string[];
  threshold?: number;
  autoApproveBelow?: number;    // XLM - auto-approve payments below this
  timeLockAbove?: number;       // XLM - time-lock payments above this
  timeLockHours?: number;       // hours to delay large payments
  departments?: string[];
}

export function companyPreset(input: CompanyPresetInput): CreateVaultInput {
  const totalMembers = 1 + input.signerEmails.length; // owner + signers
  const threshold = input.threshold || Math.ceil(totalMembers / 2); // majority

  const members: CreateVaultInput['members'] = [
    {
      email: input.ownerEmail,
      role: 'owner',
      label: 'Owner',
      permissions: {
        can_approve: true,
        can_deny: true,
        can_create_actions: true,
        can_manage_rules: true,
        can_add_members: true,
        can_view_all: true,
      },
    },
    ...input.signerEmails.map((email, idx) => ({
      email,
      role: 'signer' as const,
      label: `Signer ${idx + 1}`,
      permissions: {
        can_approve: true,
        can_deny: true,
        can_create_actions: true,
        can_view_all: true,
      },
    })),
  ];

  const rules: CreateVaultInput['rules'] = [];

  if (input.autoApproveBelow) {
    rules.push({
      ruleType: 'auto_approve',
      config: { auto_approve_below: input.autoApproveBelow },
      priority: 10,
    });
  }

  if (input.timeLockAbove) {
    rules.push({
      ruleType: 'time_lock',
      config: {
        time_lock_above: input.timeLockAbove,
        time_lock_hours: input.timeLockHours || 24,
      },
      priority: 20,
    });
  }

  rules.push({
    ruleType: 'rate_limit',
    config: {
      max_amount_per_day: 10000,
      max_transactions_per_day: 50,
    },
    priority: 30,
  });

  return {
    name: `${input.companyName} Treasury`,
    vaultType: 'company',
    chain: 'stellar',
    network: 'testnet',
    threshold,
    totalShares: totalMembers,
    config: {
      auto_approve_below: input.autoApproveBelow || 0,
      time_lock_above: input.timeLockAbove || 0,
      time_lock_hours: input.timeLockHours || 24,
      departments: input.departments || [],
    },
    members,
    rules,
  };
}

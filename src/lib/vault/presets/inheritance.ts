/**
 * Inheritance Vault Preset
 * 2-of-3: owner + executor + beneficiary
 * Dead man's switch via heartbeat, executor activation after missed heartbeat
 */

import type { CreateVaultInput } from '../types';

export interface InheritancePresetInput {
  ownerEmail: string;
  executorEmail: string;
  beneficiaryEmail: string;
  heartbeatIntervalDays?: number;   // How often owner must check in (default 30)
  executorDelayDays?: number;        // Delay after missed heartbeat before executor activates (default 7)
  vaultName?: string;
}

export function inheritancePreset(input: InheritancePresetInput): CreateVaultInput {
  const heartbeatInterval = input.heartbeatIntervalDays || 30;
  const executorDelay = input.executorDelayDays || 7;

  return {
    name: input.vaultName || 'Inheritance Vault',
    vaultType: 'inheritance',
    chain: 'stellar',
    network: 'testnet',
    threshold: 2,
    totalShares: 3,
    config: {
      heartbeat_interval_days: heartbeatInterval,
      executor_delay_days: executorDelay,
      last_heartbeat: null,
      executor_activated: false,
    },
    members: [
      {
        email: input.ownerEmail,
        role: 'owner',
        label: 'Owner',
        permissions: {
          can_approve: true,
          can_create_actions: true,
          can_heartbeat: true,
          can_manage_rules: true,
          can_view_all: true,
        },
      },
      {
        email: input.executorEmail,
        role: 'executor',
        label: 'Executor',
        permissions: {
          can_approve: true,
          can_create_actions: true,
          can_activate: true,
          can_view_all: true,
        },
      },
      {
        email: input.beneficiaryEmail,
        role: 'beneficiary',
        label: 'Beneficiary',
        permissions: {
          can_view_balance: true,
          can_view_transactions: true,
        },
      },
    ],
    rules: [
      {
        ruleType: 'heartbeat',
        config: {
          heartbeat_interval_days: heartbeatInterval,
          executor_delay_days: executorDelay,
        },
        priority: 10,
      },
    ],
  };
}

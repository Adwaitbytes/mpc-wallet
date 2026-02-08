/**
 * DAO Governance Treasury Preset
 * N-of-M council members with voting periods and quorum
 */

import type { CreateVaultInput } from '../types';

export interface DaoPresetInput {
  daoName: string;
  councilEmails: string[];
  threshold?: number;               // Shamir threshold for key reconstruction
  votingPeriodHours?: number;       // How long proposals stay open (default 72)
  quorumPercent?: number;           // Minimum % of council that must vote (default 50)
  proposalThreshold?: number;       // Min balance to create proposal (default 0)
}

export function daoPreset(input: DaoPresetInput): CreateVaultInput {
  const totalMembers = input.councilEmails.length;
  const threshold = input.threshold || Math.ceil(totalMembers * 0.6); // 60% default Shamir threshold
  const approvalsNeeded = Math.ceil(totalMembers * ((input.quorumPercent || 50) / 100));

  return {
    name: `${input.daoName} Treasury`,
    vaultType: 'dao',
    chain: 'stellar',
    network: 'testnet',
    threshold: Math.min(threshold, totalMembers),
    totalShares: totalMembers,
    config: {
      voting_period_hours: input.votingPeriodHours || 72,
      quorum_percent: input.quorumPercent || 50,
      proposal_threshold: input.proposalThreshold || 0,
      approvals_needed: approvalsNeeded,
    },
    members: input.councilEmails.map((email, idx) => ({
      email,
      role: 'council' as const,
      label: `Council Member ${idx + 1}`,
      permissions: {
        can_approve: true,
        can_deny: true,
        can_create_actions: true,
        can_propose: true,
        can_view_all: true,
      },
    })),
    rules: [
      {
        ruleType: 'voting_period',
        config: { voting_period_hours: input.votingPeriodHours || 72 },
        priority: 10,
      },
      {
        ruleType: 'quorum',
        config: { quorum_percent: input.quorumPercent || 50 },
        priority: 20,
      },
    ],
  };
}

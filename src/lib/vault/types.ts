/**
 * Vault Platform Type Definitions
 * Core types for the universal MPC vault system
 */

import type { ChainId, NetworkType } from '../chains/types';

// ============================================
// VAULT TYPES
// ============================================

export type VaultType = 'family' | 'company' | 'escrow' | 'inheritance' | 'dao' | 'trade';

export type VaultStatus = 'pending' | 'active' | 'frozen' | 'closed';

export type MemberRole =
  | 'owner'       // Full admin (company, dao)
  | 'signer'      // Can approve actions (parent in family, council in dao)
  | 'requester'   // Can create actions but not approve (child in family)
  | 'viewer'      // Read-only access
  | 'executor'    // Inheritance executor
  | 'beneficiary' // Inheritance beneficiary
  | 'arbiter'     // Escrow dispute resolver
  | 'council';    // DAO council member (can vote + sign)

export type MemberStatus = 'pending' | 'accepted' | 'removed';

export type ActionType =
  | 'payment'              // Single payment
  | 'batch_payment'        // Multiple payments (payroll)
  | 'path_payment'         // Cross-asset swap
  | 'proposal'             // DAO proposal
  | 'milestone_release'    // Escrow milestone
  | 'dispute'              // Escrow dispute
  | 'heartbeat'            // Inheritance heartbeat
  | 'executor_activation'  // Inheritance executor takes over
  | 'config_change'        // Change vault settings
  | 'member_add'           // Add member
  | 'member_remove'        // Remove member
  | 'share_rotation';      // Rotate Shamir shares

export type ActionStatus =
  | 'pending'        // Waiting for votes
  | 'approved'       // Enough approvals, waiting for time-lock or execution
  | 'time_locked'    // Approved but time-locked
  | 'executing'      // Being executed on-chain
  | 'executed'       // Successfully executed
  | 'denied'         // Denied by voters
  | 'expired'        // Expired before enough votes
  | 'failed';        // Execution failed

export type VoteDecision = 'approve' | 'deny';

// ============================================
// RULE TYPES
// ============================================

export type RuleType =
  | 'auto_approve'      // Auto-approve below threshold
  | 'time_lock'         // Require delay above threshold
  | 'whitelist'         // Only allow certain destinations
  | 'rate_limit'        // Max per period
  | 'category_budget'   // Budget per category
  | 'heartbeat'         // Dead man's switch
  | 'voting_period'     // DAO voting window
  | 'quorum'            // Minimum voters required
  | 'expiration';       // Auto-expire actions

export interface RuleConfig {
  // auto_approve
  auto_approve_below?: number;

  // time_lock
  time_lock_above?: number;
  time_lock_hours?: number;

  // whitelist
  allowed_addresses?: string[];

  // rate_limit
  max_amount_per_day?: number;
  max_amount_per_week?: number;
  max_transactions_per_day?: number;

  // category_budget
  category?: string;
  budget_amount?: number;
  budget_period?: 'daily' | 'weekly' | 'monthly';

  // heartbeat (inheritance)
  heartbeat_interval_days?: number;
  executor_delay_days?: number;

  // voting_period (dao)
  voting_period_hours?: number;

  // quorum (dao)
  quorum_percent?: number;

  // expiration
  expires_after_hours?: number;
}

export interface RuleEvalResult {
  autoApprove: boolean;
  timeLockUntil: Date | null;
  blocked: boolean;
  blockReason: string | null;
  approvalsRequired: number | null; // null = use vault default
}

// ============================================
// INPUT / OUTPUT TYPES
// ============================================

export interface CreateVaultInput {
  name: string;
  vaultType: VaultType;
  chain?: ChainId;
  network?: NetworkType;
  threshold: number;
  totalShares: number;
  config: Record<string, unknown>;
  members: Array<{
    email: string;
    role: MemberRole;
    label?: string;
    permissions?: Record<string, unknown>;
  }>;
  rules?: Array<{
    ruleType: RuleType;
    config: RuleConfig;
    priority?: number;
  }>;
}

export interface VaultWithMembers {
  id: string;
  name: string;
  vault_type: VaultType;
  chain: ChainId;
  network: NetworkType;
  wallet_public_key: string | null;
  wallet_funded: boolean;
  threshold: number;
  total_shares: number;
  status: VaultStatus;
  config: Record<string, unknown>;
  creator_id: string;
  created_at: string;
  updated_at: string;
  members: VaultMember[];
}

export interface VaultMember {
  id: string;
  vault_id: string;
  user_id: string | null;
  email: string;
  role: MemberRole;
  label: string | null;
  permissions: Record<string, unknown>;
  invite_token: string | null;
  status: MemberStatus;
  share_index: number | null;
  invited_at: string;
  accepted_at: string | null;
}

export interface VaultAction {
  id: string;
  vault_id: string;
  action_type: ActionType;
  creator_id: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
  approvals_required: number;
  approvals_received: number;
  denials_received: number;
  time_lock_until: string | null;
  expires_at: string | null;
  executed_at: string | null;
  tx_hash: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VaultVote {
  id: string;
  action_id: string;
  voter_id: string;
  member_id: string;
  decision: VoteDecision;
  reason: string | null;
  created_at: string;
}

export interface VaultRule {
  id: string;
  vault_id: string;
  rule_type: RuleType;
  config: RuleConfig;
  priority: number;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  vault_id: string;
  actor_id: string | null;
  event_type: string;
  details: Record<string, unknown>;
  ip_address?: string;
}

// ============================================
// VAULT TYPE-SPECIFIC CONFIG INTERFACES
// ============================================

export interface FamilyConfig {
  allowance_xlm: number;
  auto_deposit: boolean;
}

export interface CompanyConfig {
  auto_approve_below: number;
  time_lock_above: number;
  time_lock_hours: number;
  departments?: string[];
}

export interface EscrowConfig {
  milestones: Array<{
    name: string;
    amount: string;
    status: 'pending' | 'released' | 'disputed';
  }>;
  timeout_days: number;
  total_amount: string;
}

export interface InheritanceConfig {
  heartbeat_interval_days: number;
  executor_delay_days: number;
  last_heartbeat: string | null;
  executor_activated: boolean;
}

export interface DaoConfig {
  voting_period_hours: number;
  quorum_percent: number;
  proposal_threshold: number; // min tokens/balance to create proposal
}

export interface TradeConfig {
  accepted_assets: string[];
  document_required: boolean;
  trade_terms?: string;
}

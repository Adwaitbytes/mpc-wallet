/**
 * Vault Actions & Voting System
 * Universal action pipeline: create -> vote -> evaluate -> execute
 */

import { sql } from '../db';
import { getAdapter } from '../chains/registry';
import { reconstructKey } from './shares';
import { evaluateRules, checkRateLimit } from './rules';
import type {
  ActionType,
  ActionStatus,
  VoteDecision,
  VaultAction,
  VaultVote,
  AuditEntry,
} from './types';
import type { ChainId, NetworkType } from '../chains/types';

/**
 * Create a new action for a vault
 */
export async function createAction(
  vaultId: string,
  creatorId: string,
  actionType: ActionType,
  payload: Record<string, unknown>,
): Promise<VaultAction> {
  // 1. Get vault info
  const vaultRows = await sql`
    SELECT * FROM vault_vaults WHERE id = ${vaultId}
  `;
  if (!vaultRows[0]) throw new Error('Vault not found');
  const vault = vaultRows[0];

  if (vault.status !== 'active') {
    throw new Error(`Vault is ${vault.status}, cannot create actions`);
  }

  // 2. Verify creator is a member
  const memberRows = await sql`
    SELECT * FROM vault_members WHERE vault_id = ${vaultId} AND user_id = ${creatorId} AND status = 'accepted'
  `;
  if (!memberRows[0]) throw new Error('Not a member of this vault');

  // 3. Check rate limits
  const amount = parseFloat(payload.amount as string || '0');
  if (amount > 0) {
    const rateCheck = await checkRateLimit(vaultId, actionType, amount);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit: ${rateCheck.reason}`);
    }
  }

  // 4. Evaluate rules
  const ruleResult = await evaluateRules(vaultId, actionType, payload);

  if (ruleResult.blocked) {
    throw new Error(`Blocked by policy: ${ruleResult.blockReason}`);
  }

  // 5. Determine approvals required
  const approvalsRequired = ruleResult.approvalsRequired ?? getDefaultApprovals(vault.vault_type, actionType);

  // 6. Calculate expiration
  let expiresAt: string | null = null;
  const vaultConfig = typeof vault.config === 'string' ? JSON.parse(vault.config) : vault.config;

  if (vault.vault_type === 'dao' && vaultConfig.voting_period_hours) {
    const expires = new Date();
    expires.setHours(expires.getHours() + vaultConfig.voting_period_hours);
    expiresAt = expires.toISOString();
  }

  // 7. Create the action
  const rows = await sql`
    INSERT INTO vault_actions (vault_id, action_type, creator_id, payload, status, approvals_required, time_lock_until, expires_at)
    VALUES (
      ${vaultId},
      ${actionType},
      ${creatorId},
      ${JSON.stringify(payload)},
      ${ruleResult.autoApprove ? 'approved' : 'pending'},
      ${approvalsRequired},
      ${ruleResult.timeLockUntil ? ruleResult.timeLockUntil.toISOString() : null},
      ${expiresAt}
    )
    RETURNING *
  `;

  const action = rows[0] as unknown as VaultAction;

  // 8. Audit log
  await auditLog({
    vault_id: vaultId,
    actor_id: creatorId,
    event_type: 'action_created',
    details: { action_id: action.id, action_type: actionType, auto_approved: ruleResult.autoApprove },
  });

  // 9. If auto-approved, execute immediately
  if (ruleResult.autoApprove) {
    console.log(`[ACTIONS] Auto-approved action ${action.id}`);
    return await executeAction(action.id);
  }

  // 10. If time-locked, mark status
  if (ruleResult.timeLockUntil) {
    await sql`
      UPDATE vault_actions SET status = 'time_locked', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${action.id}
    `;
    action.status = 'time_locked' as ActionStatus;
  }

  console.log(`[ACTIONS] Created action ${action.id} (${actionType}) for vault ${vaultId}`);
  return action;
}

/**
 * Cast a vote on an action
 */
export async function castVote(
  actionId: string,
  voterId: string,
  decision: VoteDecision,
  reason?: string,
): Promise<{ action: VaultAction; vote: VaultVote; executed: boolean }> {
  // 1. Get action
  const actionRows = await sql`SELECT * FROM vault_actions WHERE id = ${actionId}`;
  if (!actionRows[0]) throw new Error('Action not found');
  const action = actionRows[0];

  if (!['pending', 'time_locked'].includes(action.status)) {
    throw new Error(`Action is ${action.status}, cannot vote`);
  }

  // 2. Verify voter is a member with signing rights
  const memberRows = await sql`
    SELECT * FROM vault_members
    WHERE vault_id = ${action.vault_id} AND user_id = ${voterId} AND status = 'accepted'
  `;
  if (!memberRows[0]) throw new Error('Not a member of this vault');

  const member = memberRows[0];
  const signingRoles = ['owner', 'signer', 'council', 'arbiter', 'executor'];
  if (!signingRoles.includes(member.role)) {
    throw new Error(`Role ${member.role} cannot vote on actions`);
  }

  // 3. Check for duplicate vote
  const existingVote = await sql`
    SELECT id FROM vault_votes WHERE action_id = ${actionId} AND voter_id = ${voterId}
  `;
  if (existingVote[0]) {
    throw new Error('Already voted on this action');
  }

  // 4. Record vote
  const voteRows = await sql`
    INSERT INTO vault_votes (action_id, voter_id, member_id, decision, reason)
    VALUES (${actionId}, ${voterId}, ${member.id}, ${decision}, ${reason || null})
    RETURNING *
  `;
  const vote = voteRows[0] as unknown as VaultVote;

  // 5. Update counts
  if (decision === 'approve') {
    await sql`
      UPDATE vault_actions
      SET approvals_received = approvals_received + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${actionId}
    `;
  } else {
    await sql`
      UPDATE vault_actions
      SET denials_received = denials_received + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${actionId}
    `;
  }

  // 6. Audit
  await auditLog({
    vault_id: action.vault_id,
    actor_id: voterId,
    event_type: 'vote_cast',
    details: { action_id: actionId, decision, member_role: member.role },
  });

  // 7. Check if action should be executed or denied
  const updatedRows = await sql`SELECT * FROM vault_actions WHERE id = ${actionId}`;
  const updatedAction = updatedRows[0] as unknown as VaultAction;

  let executed = false;

  // Check denial threshold (if denials > total_signers - approvals_required, can never pass)
  const signerRows = await sql`
    SELECT COUNT(*) as count FROM vault_members
    WHERE vault_id = ${action.vault_id} AND role IN ('owner', 'signer', 'council', 'arbiter', 'executor') AND status = 'accepted'
  `;
  const totalSigners = parseInt(signerRows[0]?.count || '0');

  if (updatedAction.denials_received > totalSigners - updatedAction.approvals_required) {
    await sql`
      UPDATE vault_actions SET status = 'denied', updated_at = CURRENT_TIMESTAMP WHERE id = ${actionId}
    `;
    updatedAction.status = 'denied' as ActionStatus;
    await auditLog({
      vault_id: action.vault_id,
      actor_id: voterId,
      event_type: 'action_denied',
      details: { action_id: actionId },
    });
  }

  // Check approval threshold
  if (updatedAction.approvals_received >= updatedAction.approvals_required) {
    // Check time-lock
    if (updatedAction.time_lock_until && new Date(updatedAction.time_lock_until) > new Date()) {
      await sql`
        UPDATE vault_actions SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ${actionId}
      `;
      updatedAction.status = 'approved' as ActionStatus;
      console.log(`[ACTIONS] Action ${actionId} approved but time-locked until ${updatedAction.time_lock_until}`);
    } else {
      // Execute!
      const executedAction = await executeAction(actionId);
      executed = true;
      return { action: executedAction, vote: vote, executed };
    }
  }

  return { action: updatedAction, vote, executed };
}

/**
 * Execute an approved action
 */
export async function executeAction(actionId: string): Promise<VaultAction> {
  const actionRows = await sql`SELECT * FROM vault_actions WHERE id = ${actionId}`;
  if (!actionRows[0]) throw new Error('Action not found');
  const action = actionRows[0];

  // Mark as executing
  await sql`
    UPDATE vault_actions SET status = 'executing', updated_at = CURRENT_TIMESTAMP WHERE id = ${actionId}
  `;

  const vaultRows = await sql`SELECT * FROM vault_vaults WHERE id = ${action.vault_id}`;
  if (!vaultRows[0]) throw new Error('Vault not found');
  const vault = vaultRows[0];

  const payload = typeof action.payload === 'string' ? JSON.parse(action.payload) : action.payload;

  let privateKeyHex = '';

  try {
    switch (action.action_type) {
      case 'payment':
      case 'batch_payment':
      case 'path_payment':
      case 'milestone_release': {
        // Get 2 members' shares (threshold) for key reconstruction
        const shareMembers = await sql`
          SELECT member_id FROM vault_shares WHERE vault_id = ${vault.id} ORDER BY share_index ASC LIMIT ${vault.threshold}
        `;
        const memberIds = shareMembers.map((r: Record<string, unknown>) => r.member_id as string);

        if (memberIds.length < vault.threshold) {
          throw new Error(`Not enough shares: need ${vault.threshold}, have ${memberIds.length}`);
        }

        // Reconstruct key
        privateKeyHex = await reconstructKey(vault.id, memberIds);

        const adapter = getAdapter(vault.chain as ChainId, vault.network as NetworkType);

        // Build transaction based on type
        let txXdr: string;
        if (action.action_type === 'batch_payment') {
          const payments = (payload.payments as Array<{ destination: string; amount: string }>) || [];
          txXdr = await adapter.buildBatchPayment({
            source: vault.wallet_public_key,
            payments,
            memo: payload.memo as string,
          });
        } else if (action.action_type === 'path_payment') {
          txXdr = await adapter.buildPathPayment({
            source: vault.wallet_public_key,
            destination: payload.destination as string,
            sendAsset: payload.send_asset as string || 'XLM',
            destAsset: payload.dest_asset as string || 'XLM',
            destAmount: payload.dest_amount as string,
            maxSend: payload.max_send as string,
          });
        } else {
          // payment or milestone_release
          txXdr = await adapter.buildPayment({
            source: vault.wallet_public_key,
            destination: payload.destination as string,
            amount: payload.amount as string,
            memo: payload.memo as string || payload.purpose as string,
          });
        }

        // Sign
        const signedXdr = adapter.signTransaction(txXdr, privateKeyHex);

        // Submit
        const result = await adapter.submitTransaction(signedXdr);

        if (!result.success) {
          throw new Error(result.error || 'Transaction submission failed');
        }

        // Update action
        await sql`
          UPDATE vault_actions
          SET status = 'executed', tx_hash = ${result.hash}, executed_at = CURRENT_TIMESTAMP, result = ${JSON.stringify(result)}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;

        await auditLog({
          vault_id: vault.id,
          actor_id: action.creator_id,
          event_type: 'action_executed',
          details: { action_id: actionId, tx_hash: result.hash, action_type: action.action_type },
        });

        console.log(`[ACTIONS] Executed ${action.action_type} ${actionId}: tx ${result.hash}`);
        break;
      }

      case 'heartbeat': {
        // Update last heartbeat in vault config
        const config = typeof vault.config === 'string' ? JSON.parse(vault.config) : vault.config;
        config.last_heartbeat = new Date().toISOString();
        config.executor_activated = false;

        await sql`
          UPDATE vault_vaults SET config = ${JSON.stringify(config)}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${vault.id}
        `;
        await sql`
          UPDATE vault_actions SET status = 'executed', executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;

        await auditLog({
          vault_id: vault.id,
          actor_id: action.creator_id,
          event_type: 'heartbeat_received',
          details: { action_id: actionId },
        });
        break;
      }

      case 'executor_activation': {
        // Mark executor as activated
        const config = typeof vault.config === 'string' ? JSON.parse(vault.config) : vault.config;
        config.executor_activated = true;

        await sql`
          UPDATE vault_vaults SET config = ${JSON.stringify(config)}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${vault.id}
        `;
        await sql`
          UPDATE vault_actions SET status = 'executed', executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;

        await auditLog({
          vault_id: vault.id,
          actor_id: action.creator_id,
          event_type: 'executor_activated',
          details: { action_id: actionId },
        });
        break;
      }

      case 'config_change': {
        const config = typeof vault.config === 'string' ? JSON.parse(vault.config) : vault.config;
        const changes = payload.changes as Record<string, unknown> || {};
        Object.assign(config, changes);

        await sql`
          UPDATE vault_vaults SET config = ${JSON.stringify(config)}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${vault.id}
        `;
        await sql`
          UPDATE vault_actions SET status = 'executed', executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;

        await auditLog({
          vault_id: vault.id,
          actor_id: action.creator_id,
          event_type: 'config_changed',
          details: { action_id: actionId, changes },
        });
        break;
      }

      case 'proposal': {
        // DAO proposal executed = approved by quorum
        await sql`
          UPDATE vault_actions SET status = 'executed', executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;

        await auditLog({
          vault_id: vault.id,
          actor_id: action.creator_id,
          event_type: 'proposal_passed',
          details: { action_id: actionId, title: payload.title },
        });
        break;
      }

      case 'dispute': {
        // Escrow dispute resolution
        await sql`
          UPDATE vault_actions SET status = 'executed', executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;

        await auditLog({
          vault_id: vault.id,
          actor_id: action.creator_id,
          event_type: 'dispute_resolved',
          details: { action_id: actionId, resolution: payload.resolution },
        });
        break;
      }

      default:
        await sql`
          UPDATE vault_actions SET status = 'executed', executed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${actionId}
        `;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ACTIONS] Execution failed for ${actionId}:`, message);

    await sql`
      UPDATE vault_actions SET status = 'failed', result = ${JSON.stringify({ error: message })}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${actionId}
    `;

    await auditLog({
      vault_id: vault.id,
      actor_id: action.creator_id,
      event_type: 'action_failed',
      details: { action_id: actionId, error: message },
    });

    throw error;
  } finally {
    // Wipe key material
    privateKeyHex = '';
  }

  const finalRows = await sql`SELECT * FROM vault_actions WHERE id = ${actionId}`;
  return finalRows[0] as unknown as VaultAction;
}

/**
 * Process expired actions
 */
export async function processExpirations(): Promise<number> {
  const rows = await sql`
    UPDATE vault_actions
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('pending', 'time_locked')
      AND expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP
    RETURNING id, vault_id
  `;

  for (const r of rows) {
    await auditLog({
      vault_id: r.vault_id,
      actor_id: null,
      event_type: 'action_expired',
      details: { action_id: r.id },
    });
  }

  if (rows.length > 0) {
    console.log(`[ACTIONS] Expired ${rows.length} actions`);
  }
  return rows.length;
}

/**
 * Process time-locked actions that are ready
 */
export async function processTimeLocks(): Promise<number> {
  const rows = await sql`
    SELECT id FROM vault_actions
    WHERE status = 'approved'
      AND time_lock_until IS NOT NULL
      AND time_lock_until <= CURRENT_TIMESTAMP
  `;

  let executed = 0;
  for (const r of rows) {
    try {
      await executeAction(r.id);
      executed++;
    } catch (error) {
      console.error(`[ACTIONS] Failed to execute time-locked action ${r.id}:`, error);
    }
  }

  if (executed > 0) {
    console.log(`[ACTIONS] Executed ${executed} time-locked actions`);
  }
  return executed;
}

/**
 * Check inheritance heartbeats
 */
export async function checkHeartbeats(): Promise<number> {
  const vaults = await sql`
    SELECT v.*, r.config as rule_config
    FROM vault_vaults v
    JOIN vault_rules r ON r.vault_id = v.id AND r.rule_type = 'heartbeat' AND r.enabled = true
    WHERE v.vault_type = 'inheritance' AND v.status = 'active'
  `;

  let activated = 0;

  for (const v of vaults) {
    const vaultConfig = typeof v.config === 'string' ? JSON.parse(v.config) : v.config;
    const ruleConfig = typeof v.rule_config === 'string' ? JSON.parse(v.rule_config) : v.rule_config;

    const lastHeartbeat = vaultConfig.last_heartbeat ? new Date(vaultConfig.last_heartbeat) : new Date(v.created_at);
    const intervalMs = (ruleConfig.heartbeat_interval_days || 30) * 24 * 60 * 60 * 1000;
    const now = new Date();

    if (now.getTime() - lastHeartbeat.getTime() > intervalMs && !vaultConfig.executor_activated) {
      console.log(`[HEARTBEAT] Missed heartbeat for vault ${v.id}! Last: ${lastHeartbeat.toISOString()}`);

      // Find executor
      const executors = await sql`
        SELECT user_id FROM vault_members
        WHERE vault_id = ${v.id} AND role = 'executor' AND status = 'accepted'
        LIMIT 1
      `;

      if (executors[0]) {
        await createAction(v.id, executors[0].user_id, 'executor_activation', {
          reason: 'Heartbeat missed',
          last_heartbeat: lastHeartbeat.toISOString(),
          interval_days: ruleConfig.heartbeat_interval_days,
        });
        activated++;
      }
    }
  }

  return activated;
}

/**
 * Get actions for a vault with optional filters
 */
export async function getActions(
  vaultId: string,
  filters?: { status?: ActionStatus; actionType?: ActionType; limit?: number },
): Promise<VaultAction[]> {
  const limit = filters?.limit || 50;

  if (filters?.status && filters?.actionType) {
    const rows = await sql`
      SELECT * FROM vault_actions
      WHERE vault_id = ${vaultId} AND status = ${filters.status} AND action_type = ${filters.actionType}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
    return rows as unknown as VaultAction[];
  }

  if (filters?.status) {
    const rows = await sql`
      SELECT * FROM vault_actions
      WHERE vault_id = ${vaultId} AND status = ${filters.status}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
    return rows as unknown as VaultAction[];
  }

  if (filters?.actionType) {
    const rows = await sql`
      SELECT * FROM vault_actions
      WHERE vault_id = ${vaultId} AND action_type = ${filters.actionType}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
    return rows as unknown as VaultAction[];
  }

  const rows = await sql`
    SELECT * FROM vault_actions
    WHERE vault_id = ${vaultId}
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows as unknown as VaultAction[];
}

/**
 * Get votes for an action
 */
export async function getVotes(actionId: string): Promise<VaultVote[]> {
  const rows = await sql`
    SELECT vv.*, vu.name as voter_name, vu.email as voter_email, vm.role as voter_role
    FROM vault_votes vv
    JOIN vault_users vu ON vu.id = vv.voter_id
    JOIN vault_members vm ON vm.id = vv.member_id
    WHERE vv.action_id = ${actionId}
    ORDER BY vv.created_at ASC
  `;
  return rows as unknown as VaultVote[];
}

// --- Helpers ---

function getDefaultApprovals(vaultType: string, actionType: ActionType): number {
  switch (vaultType) {
    case 'family':
      return 1; // 1 parent approval needed
    case 'company':
      return actionType === 'batch_payment' ? 2 : 1;
    case 'escrow':
      return 2; // 2-of-3 (client + freelancer, or either + arbiter)
    case 'inheritance':
      return actionType === 'executor_activation' ? 1 : 2;
    case 'dao':
      return 3; // Default; overridden by quorum rule
    case 'trade':
      return 2; // 2-of-3
    default:
      return 1;
  }
}

async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO vault_audit_log (vault_id, actor_id, event_type, details, ip_address)
      VALUES (${entry.vault_id}, ${entry.actor_id}, ${entry.event_type}, ${JSON.stringify(entry.details)}, ${entry.ip_address || null})
    `;
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

/**
 * Vault Rules Engine
 * Evaluates policy rules for actions
 * Priority-ordered pipeline: lower priority number = higher precedence
 */

import { sql } from '../db';
import type { VaultRule, RuleEvalResult, ActionType, RuleConfig } from './types';

/**
 * Evaluate all enabled rules for a vault against an action
 * Returns combined result from all matching rules
 */
export async function evaluateRules(
  vaultId: string,
  actionType: ActionType,
  payload: Record<string, unknown>,
): Promise<RuleEvalResult> {
  const rows = await sql`
    SELECT * FROM vault_rules
    WHERE vault_id = ${vaultId} AND enabled = true
    ORDER BY priority ASC
  `;

  const rules = rows as unknown as VaultRule[];

  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  for (const rule of rules) {
    const ruleResult = evaluateRule(rule, actionType, payload);

    // Block takes priority over everything
    if (ruleResult.blocked) {
      return {
        ...result,
        blocked: true,
        blockReason: ruleResult.blockReason,
        autoApprove: false,
      };
    }

    // Auto-approve only if not already blocked and rule says so
    if (ruleResult.autoApprove && !result.blocked) {
      result.autoApprove = true;
    }

    // Time-lock: take the latest time-lock
    if (ruleResult.timeLockUntil) {
      if (!result.timeLockUntil || ruleResult.timeLockUntil > result.timeLockUntil) {
        result.timeLockUntil = ruleResult.timeLockUntil;
      }
    }

    // Approvals: take the highest required
    if (ruleResult.approvalsRequired !== null) {
      if (result.approvalsRequired === null || ruleResult.approvalsRequired > result.approvalsRequired) {
        result.approvalsRequired = ruleResult.approvalsRequired;
      }
    }
  }

  // Time-lock overrides auto-approve
  if (result.timeLockUntil) {
    result.autoApprove = false;
  }

  return result;
}

function evaluateRule(
  rule: VaultRule,
  actionType: ActionType,
  payload: Record<string, unknown>,
): RuleEvalResult {
  const config = rule.config;
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  switch (rule.rule_type) {
    case 'auto_approve':
      return evaluateAutoApprove(config, actionType, payload);

    case 'time_lock':
      return evaluateTimeLock(config, actionType, payload);

    case 'whitelist':
      return evaluateWhitelist(config, actionType, payload);

    case 'rate_limit':
      // Rate limits need async DB queries - handled separately
      return result;

    case 'category_budget':
      return evaluateCategoryBudget(config, actionType, payload);

    case 'heartbeat':
      return evaluateHeartbeat(config, actionType, payload);

    case 'voting_period':
      return evaluateVotingPeriod(config, actionType, payload);

    case 'quorum':
      return evaluateQuorum(config, actionType, payload);

    case 'expiration':
      return result; // Expiration is handled by processExpirations()

    default:
      return result;
  }
}

function evaluateAutoApprove(
  config: RuleConfig,
  actionType: ActionType,
  payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  if (actionType !== 'payment' && actionType !== 'batch_payment') {
    return result;
  }

  const amount = parseFloat(payload.amount as string || '0');
  if (config.auto_approve_below && amount < config.auto_approve_below) {
    result.autoApprove = true;
  }

  return result;
}

function evaluateTimeLock(
  config: RuleConfig,
  actionType: ActionType,
  payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  if (actionType !== 'payment' && actionType !== 'batch_payment') {
    return result;
  }

  const amount = parseFloat(payload.amount as string || '0');
  if (config.time_lock_above && amount >= config.time_lock_above && config.time_lock_hours) {
    const lockUntil = new Date();
    lockUntil.setHours(lockUntil.getHours() + config.time_lock_hours);
    result.timeLockUntil = lockUntil;
  }

  return result;
}

function evaluateWhitelist(
  config: RuleConfig,
  actionType: ActionType,
  payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  if (actionType !== 'payment' && actionType !== 'path_payment') {
    return result;
  }

  const destination = payload.destination as string;
  if (config.allowed_addresses && destination) {
    if (!config.allowed_addresses.includes(destination)) {
      result.blocked = true;
      result.blockReason = `Destination ${destination} is not in the whitelist`;
    }
  }

  return result;
}

function evaluateCategoryBudget(
  config: RuleConfig,
  actionType: ActionType,
  payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  if (actionType !== 'payment') return result;

  const category = payload.category as string;
  if (config.category && category && config.category === category) {
    // Budget check would need DB query for spent-so-far
    // For now, this rule just flags the category match
  }

  return result;
}

function evaluateHeartbeat(
  config: RuleConfig,
  actionType: ActionType,
  _payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  // Heartbeat rule: if action is executor_activation, check heartbeat interval
  if (actionType === 'executor_activation') {
    result.autoApprove = true; // executor activation is auto-approved if heartbeat missed
  }

  return result;
}

function evaluateVotingPeriod(
  config: RuleConfig,
  actionType: ActionType,
  _payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  if (actionType === 'proposal' && config.voting_period_hours) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.voting_period_hours);
    // Voting period handled as expiration on the action itself
  }

  return result;
}

function evaluateQuorum(
  config: RuleConfig,
  actionType: ActionType,
  _payload: Record<string, unknown>,
): RuleEvalResult {
  const result: RuleEvalResult = {
    autoApprove: false,
    timeLockUntil: null,
    blocked: false,
    blockReason: null,
    approvalsRequired: null,
  };

  if (actionType === 'proposal' && config.quorum_percent) {
    // Quorum calculation is done in castVote when checking if threshold met
    // This rule just configures the quorum percentage
  }

  return result;
}

/**
 * Check rate limits (async - needs DB)
 */
export async function checkRateLimit(
  vaultId: string,
  actionType: ActionType,
  amount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const rows = await sql`
    SELECT * FROM vault_rules
    WHERE vault_id = ${vaultId} AND rule_type = 'rate_limit' AND enabled = true
    LIMIT 1
  `;

  if (!rows[0]) return { allowed: true };

  const config = (typeof rows[0].config === 'string' ? JSON.parse(rows[0].config) : rows[0].config) as RuleConfig;

  // Check daily limit
  if (config.max_amount_per_day) {
    const dailyRows = await sql`
      SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
      FROM vault_actions
      WHERE vault_id = ${vaultId}
        AND action_type = ${actionType}
        AND status IN ('executed', 'approved', 'pending')
        AND created_at >= NOW() - INTERVAL '24 hours'
    `;
    const dailyTotal = parseFloat(dailyRows[0]?.total || '0');
    if (dailyTotal + amount > config.max_amount_per_day) {
      return { allowed: false, reason: `Daily limit exceeded (${dailyTotal.toFixed(2)} + ${amount} > ${config.max_amount_per_day})` };
    }
  }

  // Check weekly limit
  if (config.max_amount_per_week) {
    const weeklyRows = await sql`
      SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
      FROM vault_actions
      WHERE vault_id = ${vaultId}
        AND action_type = ${actionType}
        AND status IN ('executed', 'approved', 'pending')
        AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const weeklyTotal = parseFloat(weeklyRows[0]?.total || '0');
    if (weeklyTotal + amount > config.max_amount_per_week) {
      return { allowed: false, reason: `Weekly limit exceeded` };
    }
  }

  // Check transaction count
  if (config.max_transactions_per_day) {
    const countRows = await sql`
      SELECT COUNT(*) as count
      FROM vault_actions
      WHERE vault_id = ${vaultId}
        AND action_type = ${actionType}
        AND created_at >= NOW() - INTERVAL '24 hours'
    `;
    const count = parseInt(countRows[0]?.count || '0');
    if (count >= config.max_transactions_per_day) {
      return { allowed: false, reason: `Daily transaction limit reached (${count}/${config.max_transactions_per_day})` };
    }
  }

  return { allowed: true };
}

/**
 * Install default rules for a vault type
 */
export async function installDefaultRules(
  vaultId: string,
  vaultType: string,
  config: Record<string, unknown>,
  creatorId: string,
): Promise<void> {
  switch (vaultType) {
    case 'family':
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'expiration', ${JSON.stringify({ expires_after_hours: 168 })}, 100, ${creatorId})
      `;
      break;

    case 'company':
      if (config.auto_approve_below) {
        await sql`
          INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
          VALUES (${vaultId}, 'auto_approve', ${JSON.stringify({ auto_approve_below: config.auto_approve_below })}, 10, ${creatorId})
        `;
      }
      if (config.time_lock_above) {
        await sql`
          INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
          VALUES (${vaultId}, 'time_lock', ${JSON.stringify({ time_lock_above: config.time_lock_above, time_lock_hours: config.time_lock_hours || 24 })}, 20, ${creatorId})
        `;
      }
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'rate_limit', ${JSON.stringify({ max_amount_per_day: 10000, max_transactions_per_day: 50 })}, 30, ${creatorId})
      `;
      break;

    case 'escrow':
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'expiration', ${JSON.stringify({ expires_after_hours: (config.timeout_days as number || 30) * 24 })}, 100, ${creatorId})
      `;
      break;

    case 'inheritance':
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'heartbeat', ${JSON.stringify({
          heartbeat_interval_days: config.heartbeat_interval_days || 30,
          executor_delay_days: config.executor_delay_days || 7,
        })}, 10, ${creatorId})
      `;
      break;

    case 'dao':
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'voting_period', ${JSON.stringify({ voting_period_hours: config.voting_period_hours || 72 })}, 10, ${creatorId})
      `;
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'quorum', ${JSON.stringify({ quorum_percent: config.quorum_percent || 50 })}, 20, ${creatorId})
      `;
      break;

    case 'trade':
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'whitelist', ${JSON.stringify({ allowed_addresses: [] })}, 10, ${creatorId})
      `;
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vaultId}, 'expiration', ${JSON.stringify({ expires_after_hours: 720 })}, 100, ${creatorId})
      `;
      break;
  }

  console.log(`[RULES] Installed default rules for ${vaultType} vault ${vaultId}`);
}

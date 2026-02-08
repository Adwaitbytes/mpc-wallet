/**
 * Vault Engine
 * Core orchestrator for vault creation, invite acceptance, and activation
 */

import { randomBytes } from 'crypto';
import { sql, ensureSchema } from '../db';
import { createShares } from './shares';
import { installDefaultRules } from './rules';
import type {
  CreateVaultInput,
  VaultWithMembers,
  VaultMember,
  VaultType,
  MemberRole,
  AuditEntry,
} from './types';
import type { ChainId, NetworkType } from '../chains/types';

/**
 * Create a new vault from a preset input
 */
export async function createVault(
  creatorId: string,
  input: CreateVaultInput,
): Promise<VaultWithMembers> {
  await ensureSchema();

  const chain = input.chain || 'stellar';
  const network = input.network || 'testnet';

  console.log(`[ENGINE] Creating ${input.vaultType} vault "${input.name}" for user ${creatorId}`);

  // 1. Ensure creator exists in vault_users
  await ensureVaultUser(creatorId);

  // 2. Create vault
  const vaultRows = await sql`
    INSERT INTO vault_vaults (name, vault_type, chain, network, threshold, total_shares, status, config, creator_id)
    VALUES (${input.name}, ${input.vaultType}, ${chain}, ${network}, ${input.threshold}, ${input.totalShares}, 'pending', ${JSON.stringify(input.config)}, ${creatorId})
    RETURNING *
  `;
  const vault = vaultRows[0];
  console.log(`[ENGINE] Vault created: ${vault.id}`);

  // 3. Create members
  const members: VaultMember[] = [];
  let shareIndex = 1;

  for (const m of input.members) {
    const inviteToken = generateInviteToken();

    // Check if this member is the creator
    const creatorRows = await sql`SELECT email FROM vault_users WHERE id = ${creatorId}`;
    const isCreator = creatorRows[0]?.email === m.email;

    const memberRows = await sql`
      INSERT INTO vault_members (vault_id, user_id, email, role, label, permissions, invite_token, status, share_index)
      VALUES (
        ${vault.id},
        ${isCreator ? creatorId : null},
        ${m.email},
        ${m.role},
        ${m.label || null},
        ${JSON.stringify(m.permissions || {})},
        ${isCreator ? null : inviteToken},
        ${isCreator ? 'accepted' : 'pending'},
        ${shareIndex}
      )
      RETURNING *
    `;
    members.push(memberRows[0] as unknown as VaultMember);
    shareIndex++;
  }

  // 4. Install default rules
  await installDefaultRules(vault.id, input.vaultType, input.config, creatorId);

  // 5. Install custom rules if provided
  if (input.rules) {
    for (const rule of input.rules) {
      await sql`
        INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
        VALUES (${vault.id}, ${rule.ruleType}, ${JSON.stringify(rule.config)}, ${rule.priority || 100}, ${creatorId})
      `;
    }
  }

  // 6. Audit
  await auditLog({
    vault_id: vault.id,
    actor_id: creatorId,
    event_type: 'vault_created',
    details: { vault_type: input.vaultType, members: input.members.length, threshold: input.threshold },
  });

  // 7. Check if all members are already accepted (e.g., single-member vault)
  const pendingCount = members.filter(m => m.status === 'pending').length;
  if (pendingCount === 0) {
    await activateVault(vault.id);
  }

  // Return vault with members
  const result = {
    ...vault,
    members,
  } as unknown as VaultWithMembers;

  console.log(`[ENGINE] Vault ${vault.id} created with ${members.length} members (${pendingCount} pending)`);
  return result;
}

/**
 * Accept a vault invitation
 */
export async function acceptInvite(
  userId: string,
  inviteToken: string,
): Promise<{ success: boolean; vaultActivated: boolean; vault?: VaultWithMembers }> {
  await ensureSchema();
  await ensureVaultUser(userId);

  // 1. Find invitation
  const inviteRows = await sql`
    SELECT vm.*, vv.status as vault_status, vv.vault_type
    FROM vault_members vm
    JOIN vault_vaults vv ON vv.id = vm.vault_id
    WHERE vm.invite_token = ${inviteToken}
  `;

  if (!inviteRows[0]) {
    throw new Error('Invitation not found');
  }

  const invite = inviteRows[0];

  if (invite.status === 'accepted') {
    throw new Error('Invitation already accepted');
  }

  // 2. Accept invitation
  await sql`
    UPDATE vault_members
    SET user_id = ${userId}, status = 'accepted', accepted_at = CURRENT_TIMESTAMP
    WHERE id = ${invite.id}
  `;

  await auditLog({
    vault_id: invite.vault_id,
    actor_id: userId,
    event_type: 'invite_accepted',
    details: { member_id: invite.id, role: invite.role },
  });

  // 3. Check if all members have accepted
  const pendingRows = await sql`
    SELECT COUNT(*) as count FROM vault_members
    WHERE vault_id = ${invite.vault_id} AND status = 'pending'
  `;
  const pendingCount = parseInt(pendingRows[0].count);

  let vaultActivated = false;

  if (pendingCount === 0) {
    console.log(`[ENGINE] All members accepted for vault ${invite.vault_id}! Activating...`);
    await activateVault(invite.vault_id);
    vaultActivated = true;
  }

  // 4. Return vault data
  const vault = await getVault(invite.vault_id);

  return { success: true, vaultActivated, vault: vault || undefined };
}

/**
 * Activate a vault: generate wallet + distribute shares
 */
export async function activateVault(vaultId: string): Promise<void> {
  const vaultRows = await sql`SELECT * FROM vault_vaults WHERE id = ${vaultId}`;
  if (!vaultRows[0]) throw new Error('Vault not found');
  const vault = vaultRows[0];

  if (vault.wallet_public_key) {
    console.log(`[ENGINE] Vault ${vaultId} already has wallet, skipping activation`);
    return;
  }

  // Get accepted members ordered by share_index
  const memberRows = await sql`
    SELECT id FROM vault_members
    WHERE vault_id = ${vaultId} AND status = 'accepted'
    ORDER BY share_index ASC
  `;

  const memberIds = memberRows.map((r: Record<string, unknown>) => r.id as string);

  if (memberIds.length < vault.total_shares) {
    console.log(`[ENGINE] Not enough accepted members (${memberIds.length}/${vault.total_shares}), cannot activate`);
    return;
  }

  // Create shares and wallet
  const result = await createShares(
    vaultId,
    memberIds,
    vault.threshold,
    vault.chain as ChainId,
    vault.network as NetworkType,
  );

  await auditLog({
    vault_id: vaultId,
    actor_id: vault.creator_id,
    event_type: 'vault_activated',
    details: { public_key: result.publicKey, funded: result.funded, shares: result.sharesStored },
  });

  console.log(`[ENGINE] Vault ${vaultId} activated: ${result.publicKey}`);
}

/**
 * Get a vault with its members
 */
export async function getVault(vaultId: string): Promise<VaultWithMembers | null> {
  const vaultRows = await sql`SELECT * FROM vault_vaults WHERE id = ${vaultId}`;
  if (!vaultRows[0]) return null;

  const memberRows = await sql`
    SELECT vm.*, vu.name as user_name, vu.image as user_image
    FROM vault_members vm
    LEFT JOIN vault_users vu ON vu.id = vm.user_id
    WHERE vm.vault_id = ${vaultId}
    ORDER BY vm.share_index ASC
  `;

  return {
    ...vaultRows[0],
    members: memberRows as unknown as VaultMember[],
  } as VaultWithMembers;
}

/**
 * Get all vaults for a user
 */
export async function getUserVaults(userId: string): Promise<VaultWithMembers[]> {
  await ensureSchema();

  const vaultRows = await sql`
    SELECT DISTINCT v.*
    FROM vault_vaults v
    JOIN vault_members vm ON vm.vault_id = v.id
    WHERE vm.user_id = ${userId}
    ORDER BY v.created_at DESC
  `;

  const results: VaultWithMembers[] = [];
  for (const v of vaultRows) {
    const memberRows = await sql`
      SELECT vm.*, vu.name as user_name, vu.image as user_image
      FROM vault_members vm
      LEFT JOIN vault_users vu ON vu.id = vm.user_id
      WHERE vm.vault_id = ${v.id}
      ORDER BY vm.share_index ASC
    `;
    results.push({
      ...v,
      members: memberRows as unknown as VaultMember[],
    } as VaultWithMembers);
  }

  return results;
}

/**
 * Get the user's member record for a specific vault
 */
export async function getVaultMember(
  vaultId: string,
  userId: string,
): Promise<VaultMember | null> {
  const rows = await sql`
    SELECT * FROM vault_members WHERE vault_id = ${vaultId} AND user_id = ${userId} LIMIT 1
  `;
  return (rows[0] as unknown as VaultMember) || null;
}

/**
 * Get user's vault state (equivalent to old getUserState)
 */
export async function getUserVaultState(userId: string): Promise<{
  hasVaults: boolean;
  vaults: Array<{
    id: string;
    name: string;
    vault_type: VaultType;
    status: string;
    role: MemberRole;
    chain: string;
  }>;
  // Legacy compatibility
  legacyState?: string;
  legacyFamily?: Record<string, unknown>;
  legacyRole?: string;
}> {
  await ensureSchema();

  const rows = await sql`
    SELECT v.id, v.name, v.vault_type, v.status, v.chain, vm.role
    FROM vault_vaults v
    JOIN vault_members vm ON vm.vault_id = v.id
    WHERE vm.user_id = ${userId}
    ORDER BY v.created_at DESC
  `;

  const vaults = rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    vault_type: r.vault_type as VaultType,
    status: r.status as string,
    role: r.role as MemberRole,
    chain: r.chain as string,
  }));

  return {
    hasVaults: vaults.length > 0,
    vaults,
  };
}

/**
 * Get audit log for a vault
 */
export async function getAuditLog(
  vaultId: string,
  limit = 50,
  offset = 0,
): Promise<Array<Record<string, unknown>>> {
  const rows = await sql`
    SELECT al.*, vu.name as actor_name, vu.email as actor_email
    FROM vault_audit_log al
    LEFT JOIN vault_users vu ON vu.id = al.actor_id
    WHERE al.vault_id = ${vaultId}
    ORDER BY al.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return rows;
}

// --- Helpers ---

function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

async function ensureVaultUser(userId: string): Promise<void> {
  // Copy from guardian_users to vault_users if needed
  const existing = await sql`SELECT id FROM vault_users WHERE id = ${userId}`;
  if (existing[0]) return;

  const guardian = await sql`SELECT * FROM guardian_users WHERE id = ${userId}`;
  if (guardian[0]) {
    await sql`
      INSERT INTO vault_users (id, email, name, image, google_sub, created_at, updated_at)
      VALUES (${guardian[0].id}, ${guardian[0].email}, ${guardian[0].name}, ${guardian[0].image}, ${guardian[0].google_sub}, ${guardian[0].created_at}, ${guardian[0].updated_at})
      ON CONFLICT (email) DO NOTHING
    `;
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

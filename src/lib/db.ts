import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_NEON_URL_HERE')) {
      throw new Error('DATABASE_URL is not configured. Please set it in .env.local');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// Lazy proxy: neon() is only called on first actual query, not at import time
// This prevents build failures when DATABASE_URL isn't set yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const noop = (() => {}) as any;
export const sql: NeonQueryFunction<false, false> = new Proxy(noop, {
  apply(_target, _thisArg, args: [TemplateStringsArray, ...unknown[]]) {
    return getSql()(args[0], ...args.slice(1));
  },
});

let _schemaReady = false;
let _schemaPromise: Promise<void> | null = null;

export async function ensureSchema() {
  if (_schemaReady) return;
  if (_schemaPromise) return _schemaPromise;
  _schemaPromise = initializeSchema().then(() => { _schemaReady = true; }).catch((err) => {
    _schemaPromise = null;
    throw err;
  });
  return _schemaPromise;
}

export async function initializeSchema() {
  // Users
  await sql`
    CREATE TABLE IF NOT EXISTS guardian_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      image TEXT,
      google_sub VARCHAR(255) UNIQUE,
      role VARCHAR(20) DEFAULT 'child',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_gu_email ON guardian_users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gu_sub ON guardian_users(google_sub)`;

  // Families
  await sql`
    CREATE TABLE IF NOT EXISTS guardian_families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES guardian_users(id),
      allowance_xlm DECIMAL(20,7) DEFAULT 50,
      auto_deposit BOOLEAN DEFAULT TRUE,
      wallet_public_key VARCHAR(56),
      wallet_funded BOOLEAN DEFAULT FALSE,
      status VARCHAR(30) DEFAULT 'pending_parents',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_gf_child ON guardian_families(child_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gf_status ON guardian_families(status)`;

  // Members (child + invited parents)
  await sql`
    CREATE TABLE IF NOT EXISTS guardian_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES guardian_families(id),
      user_id UUID REFERENCES guardian_users(id),
      email VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      invite_token VARCHAR(64) UNIQUE,
      status VARCHAR(20) DEFAULT 'pending',
      share_index INTEGER,
      invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP WITH TIME ZONE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_gm_family ON guardian_members(family_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gm_user ON guardian_members(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gm_token ON guardian_members(invite_token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gm_email ON guardian_members(email)`;

  // Encrypted wallet shares
  await sql`
    CREATE TABLE IF NOT EXISTS guardian_wallet_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES guardian_families(id),
      member_id UUID NOT NULL REFERENCES guardian_members(id),
      share_index INTEGER NOT NULL,
      encrypted_share TEXT NOT NULL,
      iv VARCHAR(64) NOT NULL,
      salt VARCHAR(64) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_gws_unique ON guardian_wallet_shares(family_id, share_index)`;

  // Spend requests
  await sql`
    CREATE TABLE IF NOT EXISTS guardian_spend_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES guardian_families(id),
      requester_id UUID NOT NULL REFERENCES guardian_users(id),
      amount_xlm DECIMAL(20,7) NOT NULL,
      destination VARCHAR(56) NOT NULL,
      destination_label VARCHAR(255),
      purpose TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'General',
      status VARCHAR(20) DEFAULT 'pending',
      approved_by UUID REFERENCES guardian_users(id),
      approved_at TIMESTAMP WITH TIME ZONE,
      denied_by UUID REFERENCES guardian_users(id),
      denied_at TIMESTAMP WITH TIME ZONE,
      tx_hash VARCHAR(64),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_gsr_family ON guardian_spend_requests(family_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_gsr_status ON guardian_spend_requests(status)`;

  console.log('[DB] Guardian schema initialized');

  // ========================================
  // VAULT PLATFORM TABLES (Universal)
  // ========================================

  // Users (mirrors guardian_users, no role column - roles are per-vault)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      image TEXT,
      google_sub VARCHAR(255) UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_vu_email ON vault_users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vu_sub ON vault_users(google_sub)`;

  // Vaults (generic: family, company, escrow, inheritance, dao, trade)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_vaults (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      vault_type VARCHAR(30) NOT NULL,
      chain VARCHAR(20) NOT NULL DEFAULT 'stellar',
      network VARCHAR(20) NOT NULL DEFAULT 'testnet',
      wallet_public_key VARCHAR(128),
      wallet_funded BOOLEAN DEFAULT FALSE,
      threshold INTEGER NOT NULL DEFAULT 2,
      total_shares INTEGER NOT NULL DEFAULT 3,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      config JSONB NOT NULL DEFAULT '{}',
      creator_id UUID NOT NULL REFERENCES vault_users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_vv_type ON vault_vaults(vault_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vv_status ON vault_vaults(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vv_creator ON vault_vaults(creator_id)`;

  // Members (role is per-vault: owner, signer, requester, viewer, executor, beneficiary, arbiter, council)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id UUID NOT NULL REFERENCES vault_vaults(id) ON DELETE CASCADE,
      user_id UUID REFERENCES vault_users(id),
      email VARCHAR(255) NOT NULL,
      role VARCHAR(30) NOT NULL,
      label VARCHAR(255),
      permissions JSONB NOT NULL DEFAULT '{}',
      invite_token VARCHAR(64) UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      share_index INTEGER,
      invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP WITH TIME ZONE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_vm_vault ON vault_members(vault_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vm_user ON vault_members(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vm_token ON vault_members(invite_token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vm_email ON vault_members(email)`;

  // Encrypted wallet shares (same encryption as guardian_wallet_shares)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id UUID NOT NULL REFERENCES vault_vaults(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES vault_members(id) ON DELETE CASCADE,
      share_index INTEGER NOT NULL,
      encrypted_share TEXT NOT NULL,
      iv VARCHAR(64) NOT NULL,
      salt VARCHAR(64) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vs_unique ON vault_shares(vault_id, share_index)`;

  // Actions (universal work unit: payment, proposal, heartbeat, milestone_release, dispute, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id UUID NOT NULL REFERENCES vault_vaults(id) ON DELETE CASCADE,
      action_type VARCHAR(50) NOT NULL,
      creator_id UUID NOT NULL REFERENCES vault_users(id),
      payload JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      approvals_required INTEGER NOT NULL DEFAULT 1,
      approvals_received INTEGER NOT NULL DEFAULT 0,
      denials_received INTEGER NOT NULL DEFAULT 0,
      time_lock_until TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE,
      executed_at TIMESTAMP WITH TIME ZONE,
      tx_hash VARCHAR(128),
      result JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_va_vault ON vault_actions(vault_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_va_status ON vault_actions(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_va_type ON vault_actions(action_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_va_timelock ON vault_actions(time_lock_until) WHERE time_lock_until IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_va_expires ON vault_actions(expires_at) WHERE expires_at IS NOT NULL`;

  // Votes (per-action approval/denial by members)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action_id UUID NOT NULL REFERENCES vault_actions(id) ON DELETE CASCADE,
      voter_id UUID NOT NULL REFERENCES vault_users(id),
      member_id UUID NOT NULL REFERENCES vault_members(id),
      decision VARCHAR(10) NOT NULL CHECK (decision IN ('approve', 'deny')),
      reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vvt_unique ON vault_votes(action_id, voter_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vvt_action ON vault_votes(action_id)`;

  // Rules (policy engine: auto-approve, time-lock, whitelist, rate-limit, category-budget, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id UUID NOT NULL REFERENCES vault_vaults(id) ON DELETE CASCADE,
      rule_type VARCHAR(50) NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      priority INTEGER NOT NULL DEFAULT 100,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_by UUID REFERENCES vault_users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_vr_vault ON vault_rules(vault_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vr_type ON vault_rules(rule_type)`;

  // Audit log (immutable event log)
  await sql`
    CREATE TABLE IF NOT EXISTS vault_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vault_id UUID NOT NULL REFERENCES vault_vaults(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES vault_users(id),
      event_type VARCHAR(50) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      ip_address VARCHAR(45),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_val_vault ON vault_audit_log(vault_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_val_event ON vault_audit_log(event_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_val_actor ON vault_audit_log(actor_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_val_created ON vault_audit_log(created_at)`;

  console.log('[DB] Vault platform schema initialized');
}

/**
 * Migrate existing guardian_* data to vault_* tables
 * Safe to run multiple times (idempotent)
 */
export async function migrateGuardianToVault(): Promise<{ migrated: boolean; stats: Record<string, number> }> {
  const stats: Record<string, number> = { users: 0, vaults: 0, members: 0, shares: 0, actions: 0 };

  // 1. Migrate users
  const users = await sql`
    INSERT INTO vault_users (id, email, name, image, google_sub, created_at, updated_at)
    SELECT id, email, name, image, google_sub, created_at, updated_at
    FROM guardian_users
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;
  stats.users = users.length;

  // 2. Migrate families -> vaults
  const families = await sql`SELECT * FROM guardian_families`;
  for (const f of families) {
    const existing = await sql`SELECT id FROM vault_vaults WHERE id = ${f.id}`;
    if (existing.length > 0) continue;

    await sql`
      INSERT INTO vault_vaults (id, name, vault_type, chain, network, wallet_public_key, wallet_funded, threshold, total_shares, status, config, creator_id, created_at, updated_at)
      VALUES (
        ${f.id},
        'Family Wallet',
        'family',
        'stellar',
        'testnet',
        ${f.wallet_public_key},
        ${f.wallet_funded},
        2,
        3,
        ${f.status === 'active' ? 'active' : 'pending'},
        ${JSON.stringify({ allowance_xlm: parseFloat(f.allowance_xlm || '50'), auto_deposit: f.auto_deposit })},
        ${f.child_id},
        ${f.created_at},
        ${f.updated_at}
      )
    `;
    stats.vaults++;
  }

  // 3. Migrate members
  const members = await sql`SELECT * FROM guardian_members`;
  for (const m of members) {
    const existing = await sql`SELECT id FROM vault_members WHERE id = ${m.id}`;
    if (existing.length > 0) continue;

    const role = m.role === 'child' ? 'requester' : 'signer';
    await sql`
      INSERT INTO vault_members (id, vault_id, user_id, email, role, label, invite_token, status, share_index, invited_at, accepted_at)
      VALUES (
        ${m.id},
        ${m.family_id},
        ${m.user_id},
        ${m.email},
        ${role},
        ${m.role === 'child' ? 'Child' : 'Parent'},
        ${m.invite_token},
        ${m.status},
        ${m.share_index},
        ${m.invited_at},
        ${m.accepted_at}
      )
    `;
    stats.members++;
  }

  // 4. Migrate wallet shares
  const shares = await sql`SELECT * FROM guardian_wallet_shares`;
  for (const s of shares) {
    const existing = await sql`SELECT id FROM vault_shares WHERE vault_id = ${s.family_id} AND share_index = ${s.share_index}`;
    if (existing.length > 0) continue;

    await sql`
      INSERT INTO vault_shares (id, vault_id, member_id, share_index, encrypted_share, iv, salt, created_at)
      VALUES (${s.id}, ${s.family_id}, ${s.member_id}, ${s.share_index}, ${s.encrypted_share}, ${s.iv}, ${s.salt}, ${s.created_at})
    `;
    stats.shares++;
  }

  // 5. Migrate spend requests -> actions + votes
  const requests = await sql`SELECT * FROM guardian_spend_requests`;
  for (const r of requests) {
    const existing = await sql`SELECT id FROM vault_actions WHERE id = ${r.id}`;
    if (existing.length > 0) continue;

    const status = r.status === 'approved' ? 'executed' : r.status === 'denied' ? 'denied' : 'pending';
    await sql`
      INSERT INTO vault_actions (id, vault_id, action_type, creator_id, payload, status, approvals_required, approvals_received, tx_hash, created_at, updated_at)
      VALUES (
        ${r.id},
        ${r.family_id},
        'payment',
        ${r.requester_id},
        ${JSON.stringify({
          amount: r.amount_xlm,
          destination: r.destination,
          destination_label: r.destination_label,
          purpose: r.purpose,
          category: r.category,
          asset: 'XLM',
        })},
        ${status},
        1,
        ${r.status === 'approved' ? 1 : 0},
        ${r.tx_hash},
        ${r.created_at},
        ${r.updated_at}
      )
    `;
    stats.actions++;

    // Create vote record if approved/denied
    if (r.approved_by) {
      const approverMember = await sql`
        SELECT vm.id FROM vault_members vm WHERE vm.vault_id = ${r.family_id} AND vm.user_id = ${r.approved_by} LIMIT 1
      `;
      if (approverMember[0]) {
        await sql`
          INSERT INTO vault_votes (action_id, voter_id, member_id, decision, created_at)
          VALUES (${r.id}, ${r.approved_by}, ${approverMember[0].id}, 'approve', ${r.approved_at || r.updated_at})
          ON CONFLICT (action_id, voter_id) DO NOTHING
        `;
      }
    }
    if (r.denied_by) {
      const denierMember = await sql`
        SELECT vm.id FROM vault_members vm WHERE vm.vault_id = ${r.family_id} AND vm.user_id = ${r.denied_by} LIMIT 1
      `;
      if (denierMember[0]) {
        await sql`
          INSERT INTO vault_votes (action_id, voter_id, member_id, decision, created_at)
          VALUES (${r.id}, ${r.denied_by}, ${denierMember[0].id}, 'deny', ${r.denied_at || r.updated_at})
          ON CONFLICT (action_id, voter_id) DO NOTHING
        `;
      }
    }
  }

  console.log('[DB] Migration complete:', stats);
  return { migrated: true, stats };
}

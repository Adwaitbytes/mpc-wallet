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
}

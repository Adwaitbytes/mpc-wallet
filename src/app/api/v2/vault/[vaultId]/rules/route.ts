/**
 * GET /api/v2/vault/[vaultId]/rules - list rules
 * POST /api/v2/vault/[vaultId]/rules - add rule
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import type { RuleType, RuleConfig } from '@/lib/vault/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const rules = await sql`
      SELECT * FROM vault_rules WHERE vault_id = ${vaultId} ORDER BY priority ASC
    `;

    return NextResponse.json({ rules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    // Only owner/admin can manage rules
    if (!['owner', 'council'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners can manage rules' }, { status: 403 });
    }

    const body = await request.json();
    const { ruleType, config, priority } = body as {
      ruleType: RuleType;
      config: RuleConfig;
      priority?: number;
    };

    if (!ruleType) {
      return NextResponse.json({ error: 'ruleType is required' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO vault_rules (vault_id, rule_type, config, priority, created_by)
      VALUES (${vaultId}, ${ruleType}, ${JSON.stringify(config || {})}, ${priority || 100}, ${user.id})
      RETURNING *
    `;

    return NextResponse.json({ rule: rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

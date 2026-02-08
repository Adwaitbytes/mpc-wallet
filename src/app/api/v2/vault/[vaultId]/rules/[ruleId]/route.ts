/**
 * PATCH /api/v2/vault/[vaultId]/rules/[ruleId] - update rule
 * DELETE /api/v2/vault/[vaultId]/rules/[ruleId] - delete rule
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ vaultId: string; ruleId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId, ruleId } = await params;

    const member = await getVaultMember(vaultId, user.id);
    if (!member || !['owner', 'council'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners can manage rules' }, { status: 403 });
    }

    const body = await request.json();
    const { config, priority, enabled } = body;

    const updates: string[] = [];
    if (config !== undefined) updates.push('config');
    if (priority !== undefined) updates.push('priority');
    if (enabled !== undefined) updates.push('enabled');

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const rows = await sql`
      UPDATE vault_rules
      SET
        config = COALESCE(${config ? JSON.stringify(config) : null}::jsonb, config),
        priority = COALESCE(${priority ?? null}::integer, priority),
        enabled = COALESCE(${enabled ?? null}::boolean, enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${ruleId} AND vault_id = ${vaultId}
      RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule: rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ vaultId: string; ruleId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId, ruleId } = await params;

    const member = await getVaultMember(vaultId, user.id);
    if (!member || !['owner', 'council'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners can manage rules' }, { status: 403 });
    }

    const rows = await sql`
      DELETE FROM vault_rules WHERE id = ${ruleId} AND vault_id = ${vaultId} RETURNING id
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

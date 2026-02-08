/**
 * GET /api/v2/vault/[vaultId]/actions/[actionId]
 * Get action details with votes
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { getVotes } from '@/lib/vault/actions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vaultId: string; actionId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId, actionId } = await params;

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const actionRows = await sql`
      SELECT va.*, vu.name as creator_name, vu.email as creator_email
      FROM vault_actions va
      JOIN vault_users vu ON vu.id = va.creator_id
      WHERE va.id = ${actionId} AND va.vault_id = ${vaultId}
    `;

    if (!actionRows[0]) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const votes = await getVotes(actionId);

    return NextResponse.json({ action: actionRows[0], votes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

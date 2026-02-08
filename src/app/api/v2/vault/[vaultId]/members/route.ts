/**
 * GET /api/v2/vault/[vaultId]/members
 * Get vault members
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';

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

    const rows = await sql`
      SELECT vm.id, vm.email, vm.role, vm.label, vm.status, vm.share_index, vm.accepted_at,
             vu.name, vu.image
      FROM vault_members vm
      LEFT JOIN vault_users vu ON vu.id = vm.user_id
      WHERE vm.vault_id = ${vaultId}
      ORDER BY vm.share_index ASC
    `;

    return NextResponse.json({ members: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

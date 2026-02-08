/**
 * GET /api/v2/invite/[token]
 * Get invite details (public - no auth required)
 */

import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    await ensureSchema();

    const { token } = await params;

    const rows = await sql`
      SELECT vm.email, vm.role, vm.label, vm.status,
             vv.name as vault_name, vv.vault_type, vv.chain,
             vu.name as inviter_name
      FROM vault_members vm
      JOIN vault_vaults vv ON vv.id = vm.vault_id
      JOIN vault_users vu ON vu.id = vv.creator_id
      WHERE vm.invite_token = ${token}
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invite = rows[0];

    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted', accepted: true }, { status: 400 });
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      label: invite.label,
      vaultName: invite.vault_name,
      vaultType: invite.vault_type,
      chain: invite.chain,
      inviterName: invite.inviter_name,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

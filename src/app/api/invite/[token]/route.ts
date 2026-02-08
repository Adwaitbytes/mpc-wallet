import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await ensureSchema();

    const rows = await sql`
      SELECT
        gm.id as member_id, gm.email, gm.role, gm.status, gm.invited_at,
        gf.id as family_id, gf.status as family_status, gf.allowance_xlm,
        gu.name as child_name, gu.email as child_email
      FROM guardian_members gm
      JOIN guardian_families gf ON gf.id = gm.family_id
      JOIN guardian_users gu ON gu.id = gf.child_id
      WHERE gm.invite_token = ${token}
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Invitation not found or expired' }, { status: 404 });
    }

    const invite = rows[0];

    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted', alreadyAccepted: true }, { status: 400 });
    }

    return NextResponse.json({
      childName: invite.child_name,
      childEmail: invite.child_email,
      role: invite.role,
      allowanceXlm: invite.allowance_xlm,
      invitedAt: invite.invited_at,
    });
  } catch (error) {
    console.error('[API] /invite/[token] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

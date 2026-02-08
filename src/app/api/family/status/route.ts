import { NextResponse } from 'next/server';
import { requireAuth, getUserFamily } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    // Get all members with their statuses
    const members = await sql`
      SELECT gm.id, gm.email, gm.role, gm.status, gm.share_index, gm.accepted_at,
             gu.name as user_name, gu.image as user_image
      FROM guardian_members gm
      LEFT JOIN guardian_users gu ON gu.id = gm.user_id
      WHERE gm.family_id = ${family.id}
      ORDER BY gm.share_index ASC
    `;

    return NextResponse.json({
      familyId: family.id,
      status: family.status,
      walletPublicKey: family.wallet_public_key,
      walletFunded: family.wallet_funded,
      allowanceXlm: family.allowance_xlm,
      members: members.map((m: Record<string, unknown>) => ({
        id: m.id,
        email: m.email,
        name: m.user_name,
        image: m.user_image,
        role: m.role,
        status: m.status,
        shareIndex: m.share_index,
        acceptedAt: m.accepted_at,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

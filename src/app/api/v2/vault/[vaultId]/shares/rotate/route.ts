/**
 * POST /api/v2/vault/[vaultId]/shares/rotate
 * Rotate Shamir shares (re-split key with new polynomials)
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { rotateShares } from '@/lib/vault/shares';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;

    // Only owner can rotate shares
    const member = await getVaultMember(vaultId, user.id);
    if (!member || !['owner', 'council'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners can rotate shares' }, { status: 403 });
    }

    const body = await request.json();
    const { newThreshold } = body as { newThreshold?: number };

    // Get current members with shares
    const currentMembers = await sql`
      SELECT vs.member_id FROM vault_shares vs
      WHERE vs.vault_id = ${vaultId}
      ORDER BY vs.share_index ASC
    `;
    const currentMemberIds = currentMembers.map((r: Record<string, unknown>) => r.member_id as string);

    // Get all accepted members (for new share distribution)
    const allMembers = await sql`
      SELECT id FROM vault_members
      WHERE vault_id = ${vaultId} AND status = 'accepted'
      ORDER BY share_index ASC
    `;
    const newMemberIds = allMembers.map((r: Record<string, unknown>) => r.id as string);

    // Get vault threshold
    const vaultRows = await sql`SELECT threshold FROM vault_vaults WHERE id = ${vaultId}`;
    const threshold = newThreshold || vaultRows[0]?.threshold || 2;

    const result = await rotateShares(vaultId, currentMemberIds, newMemberIds, threshold);

    return NextResponse.json({ success: result.success, sharesRotated: result.sharesRotated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

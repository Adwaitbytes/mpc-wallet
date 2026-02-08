/**
 * GET /api/v2/vault/[vaultId]
 * Get vault details with members
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getVault, getVaultMember } from '@/lib/vault/engine';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;

    // Verify user is a member
    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const vault = await getVault(vaultId);
    if (!vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    return NextResponse.json({ vault, userRole: member.role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/v2/vault/[vaultId]/audit
 * Get vault audit log
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getVaultMember, getAuditLog } from '@/lib/vault/engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const entries = await getAuditLog(vaultId, limit, offset);

    return NextResponse.json({ entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

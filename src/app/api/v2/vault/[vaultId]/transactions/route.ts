/**
 * GET /api/v2/vault/[vaultId]/transactions
 * Get on-chain transaction history
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { getAdapter } from '@/lib/chains/registry';
import type { ChainId, NetworkType } from '@/lib/chains/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const rows = await sql`SELECT chain, network, wallet_public_key FROM vault_vaults WHERE id = ${vaultId}`;
    if (!rows[0] || !rows[0].wallet_public_key) {
      return NextResponse.json({ transactions: [] });
    }

    const vault = rows[0];
    const adapter = getAdapter(vault.chain as ChainId, vault.network as NetworkType);
    const transactions = await adapter.getTransactions(vault.wallet_public_key, limit);

    return NextResponse.json({ transactions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

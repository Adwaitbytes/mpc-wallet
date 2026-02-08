/**
 * GET /api/v2/vault/[vaultId]/balance
 * Get vault balance via chain adapter
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { getAdapter } from '@/lib/chains/registry';
import type { ChainId, NetworkType } from '@/lib/chains/types';

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

    const rows = await sql`SELECT chain, network, wallet_public_key, wallet_funded FROM vault_vaults WHERE id = ${vaultId}`;
    if (!rows[0] || !rows[0].wallet_public_key) {
      return NextResponse.json({ error: 'Vault has no wallet yet' }, { status: 400 });
    }

    const vault = rows[0];
    const adapter = getAdapter(vault.chain as ChainId, vault.network as NetworkType);
    const balance = await adapter.getBalance(vault.wallet_public_key);

    return NextResponse.json({ balance, funded: vault.wallet_funded });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

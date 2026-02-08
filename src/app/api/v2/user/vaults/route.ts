/**
 * GET /api/v2/user/vaults
 * Get all vaults for the authenticated user
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getUserVaults } from '@/lib/vault/engine';

export async function GET() {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const vaults = await getUserVaults(user.id);

    return NextResponse.json({
      vaults: vaults.map(v => ({
        id: v.id,
        name: v.name,
        vault_type: v.vault_type,
        chain: v.chain,
        network: v.network,
        status: v.status,
        wallet_public_key: v.wallet_public_key,
        wallet_funded: v.wallet_funded,
        threshold: v.threshold,
        total_shares: v.total_shares,
        memberCount: v.members.length,
        pendingActions: 0, // TODO: count pending actions
        config: v.config,
        created_at: v.created_at,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

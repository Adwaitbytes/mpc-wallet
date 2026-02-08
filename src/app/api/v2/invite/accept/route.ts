/**
 * POST /api/v2/invite/accept
 * Accept a vault invitation
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { acceptInvite } from '@/lib/vault/engine';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Invite token required' }, { status: 400 });
    }

    const result = await acceptInvite(user.id, token);

    return NextResponse.json({
      success: true,
      vaultActivated: result.vaultActivated,
      vault: result.vault ? {
        id: result.vault.id,
        name: result.vault.name,
        vault_type: result.vault.vault_type,
        status: result.vault.status,
        wallet_public_key: result.vault.wallet_public_key,
      } : null,
      message: result.vaultActivated
        ? 'Welcome! The vault wallet has been created.'
        : 'Invitation accepted. Waiting for other members.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
    if (message === 'Invitation already accepted') return NextResponse.json({ error: message }, { status: 400 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

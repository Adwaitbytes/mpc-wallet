/**
 * GET /api/v2/user/state
 * Get user state with all their vaults
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getUserVaultState } from '@/lib/vault/engine';

export async function GET() {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const state = await getUserVaultState(user.id);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, image: user.image },
      ...state,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

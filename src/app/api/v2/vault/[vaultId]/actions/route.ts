/**
 * GET /api/v2/vault/[vaultId]/actions - list actions
 * POST /api/v2/vault/[vaultId]/actions - create action
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { createAction, getActions } from '@/lib/vault/actions';
import type { ActionType, ActionStatus } from '@/lib/vault/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as ActionStatus | null;
    const actionType = url.searchParams.get('type') as ActionType | null;
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const actions = await getActions(vaultId, {
      status: status || undefined,
      actionType: actionType || undefined,
      limit,
    });

    return NextResponse.json({ actions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;
    const body = await request.json();
    const { actionType, payload } = body as {
      actionType: ActionType;
      payload: Record<string, unknown>;
    };

    if (!actionType) {
      return NextResponse.json({ error: 'actionType is required' }, { status: 400 });
    }

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const action = await createAction(vaultId, user.id, actionType, payload || {});

    return NextResponse.json({ action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message.startsWith('Rate limit') || message.startsWith('Blocked')) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

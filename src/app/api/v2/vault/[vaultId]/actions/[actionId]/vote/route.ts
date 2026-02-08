/**
 * POST /api/v2/vault/[vaultId]/actions/[actionId]/vote
 * Cast a vote (approve/deny) on an action
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { castVote } from '@/lib/vault/actions';
import type { VoteDecision } from '@/lib/vault/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ vaultId: string; actionId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId, actionId } = await params;
    const body = await request.json();
    const { decision, reason } = body as { decision: VoteDecision; reason?: string };

    if (!decision || !['approve', 'deny'].includes(decision)) {
      return NextResponse.json({ error: 'decision must be "approve" or "deny"' }, { status: 400 });
    }

    const member = await getVaultMember(vaultId, user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not a member of this vault' }, { status: 403 });
    }

    const result = await castVote(actionId, user.id, decision, reason);

    return NextResponse.json({
      success: true,
      vote: result.vote,
      action: result.action,
      executed: result.executed,
      message: result.executed
        ? 'Action approved and executed'
        : `Vote recorded: ${decision}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (message === 'Already voted on this action') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/v2/vault/[vaultId]/heartbeat
 * Record a heartbeat for inheritance vaults (dead man's switch)
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';
import { getVaultMember } from '@/lib/vault/engine';
import { createAction } from '@/lib/vault/actions';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ vaultId: string }> },
) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const { vaultId } = await params;

    // Verify vault is inheritance type
    const vaultRows = await sql`SELECT vault_type, config FROM vault_vaults WHERE id = ${vaultId}`;
    if (!vaultRows[0]) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }
    if (vaultRows[0].vault_type !== 'inheritance') {
      return NextResponse.json({ error: 'Heartbeat is only for inheritance vaults' }, { status: 400 });
    }

    // Verify user is the owner
    const member = await getVaultMember(vaultId, user.id);
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Only the vault owner can send heartbeats' }, { status: 403 });
    }

    // Create heartbeat action (auto-executed)
    const config = typeof vaultRows[0].config === 'string'
      ? JSON.parse(vaultRows[0].config)
      : vaultRows[0].config;

    // Update vault config directly
    config.last_heartbeat = new Date().toISOString();
    config.executor_activated = false;

    await sql`
      UPDATE vault_vaults SET config = ${JSON.stringify(config)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${vaultId}
    `;

    // Audit log via action
    await createAction(vaultId, user.id, 'heartbeat', {
      timestamp: config.last_heartbeat,
    });

    return NextResponse.json({
      success: true,
      lastHeartbeat: config.last_heartbeat,
      nextDeadline: new Date(
        new Date(config.last_heartbeat).getTime() +
        (config.heartbeat_interval_days || 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, getUserFamily } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family || family.member_role === 'child') {
      return NextResponse.json({ error: 'Only parents can deny requests' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    // Verify the request belongs to this family and is pending
    const rows = await sql`
      SELECT id, status FROM guardian_spend_requests
      WHERE id = ${requestId} AND family_id = ${family.id}
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (rows[0].status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
    }

    await sql`
      UPDATE guardian_spend_requests
      SET status = 'denied', denied_by = ${user.id}, denied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[API] /spend/deny error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

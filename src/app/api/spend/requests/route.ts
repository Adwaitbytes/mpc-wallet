import { NextResponse } from 'next/server';
import { requireAuth, getUserFamily } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const rows = await sql`
      SELECT
        sr.id, sr.amount_xlm, sr.destination, sr.destination_label, sr.purpose,
        sr.category, sr.status, sr.tx_hash, sr.created_at, sr.approved_at, sr.denied_at,
        gu.name as requester_name,
        ap.name as approved_by_name
      FROM guardian_spend_requests sr
      JOIN guardian_users gu ON gu.id = sr.requester_id
      LEFT JOIN guardian_users ap ON ap.id = sr.approved_by
      WHERE sr.family_id = ${family.id}
      ORDER BY sr.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      requests: rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        amountXlm: r.amount_xlm,
        destination: r.destination,
        destinationLabel: r.destination_label,
        purpose: r.purpose,
        category: r.category,
        status: r.status,
        txHash: r.tx_hash,
        createdAt: r.created_at,
        approvedAt: r.approved_at,
        deniedAt: r.denied_at,
        requesterName: r.requester_name,
        approvedByName: r.approved_by_name,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[API] /spend/requests error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

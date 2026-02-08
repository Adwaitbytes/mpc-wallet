import { NextResponse } from 'next/server';
import { requireAuth, getUserFamily } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family || family.member_role !== 'child') {
      return NextResponse.json({ error: 'Only the child can create spend requests' }, { status: 403 });
    }

    if (family.status !== 'active') {
      return NextResponse.json({ error: 'Family wallet is not active yet' }, { status: 400 });
    }

    const body = await request.json();
    const { amountXlm, destination, destinationLabel, purpose, category } = body;

    if (!amountXlm || !destination || !purpose) {
      return NextResponse.json({ error: 'Amount, destination, and purpose are required' }, { status: 400 });
    }

    if (parseFloat(amountXlm) <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO guardian_spend_requests (family_id, requester_id, amount_xlm, destination, destination_label, purpose, category, status)
      VALUES (${family.id}, ${user.id}, ${amountXlm}, ${destination}, ${destinationLabel || destination}, ${purpose}, ${category || 'General'}, 'pending')
      RETURNING id, created_at
    `;

    return NextResponse.json({
      success: true,
      requestId: rows[0].id,
      createdAt: rows[0].created_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[API] /spend/request error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

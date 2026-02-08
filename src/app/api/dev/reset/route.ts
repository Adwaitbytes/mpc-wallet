import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    await sql`DROP TABLE IF EXISTS guardian_spend_requests CASCADE`;
    await sql`DROP TABLE IF EXISTS guardian_wallet_shares CASCADE`;
    await sql`DROP TABLE IF EXISTS guardian_members CASCADE`;
    await sql`DROP TABLE IF EXISTS guardian_families CASCADE`;
    await sql`DROP TABLE IF EXISTS guardian_users CASCADE`;

    console.log('[DEV] All guardian tables dropped');

    return NextResponse.json({ success: true, message: 'All tables dropped. They will auto-recreate on next request.' });
  } catch (error) {
    console.error('[DEV] Reset error:', error);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}

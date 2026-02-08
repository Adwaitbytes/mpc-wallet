import { NextResponse } from 'next/server';
import { requireAuth, getUserFamily } from '@/lib/auth';

const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

export async function GET() {
  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family || !family.wallet_public_key) {
      return NextResponse.json({ transactions: [] });
    }

    const res = await fetch(
      `${HORIZON_URL}/accounts/${family.wallet_public_key}/payments?order=desc&limit=20`
    );

    if (!res.ok) {
      return NextResponse.json({ transactions: [] });
    }

    const data = await res.json();
    const records = data._embedded?.records || [];

    const transactions = records
      .filter((r: { type: string }) => ['payment', 'create_account'].includes(r.type))
      .map((r: {
        id: string;
        type: string;
        amount?: string;
        starting_balance?: string;
        from: string;
        to: string;
        created_at: string;
        transaction_successful: boolean;
      }) => ({
        id: r.id,
        type: r.type,
        amount: r.amount || r.starting_balance || '0',
        from: r.from,
        to: r.to,
        createdAt: r.created_at,
        successful: r.transaction_successful,
        isIncoming: r.to === family.wallet_public_key,
      }));

    return NextResponse.json({ transactions, publicKey: family.wallet_public_key });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[API] /family/transactions error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

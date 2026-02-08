import { NextResponse } from 'next/server';
import { requireAuth, getUserFamily } from '@/lib/auth';

const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

export async function GET() {
  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family || !family.wallet_public_key) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
    }

    const res = await fetch(`${HORIZON_URL}/accounts/${family.wallet_public_key}`);

    if (res.status === 404) {
      return NextResponse.json({ xlm: '0.00', usd: '$0.00', funded: false, publicKey: family.wallet_public_key });
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 502 });
    }

    const data = await res.json();
    const native = data.balances?.find((b: { asset_type: string }) => b.asset_type === 'native');
    const xlm = native ? parseFloat(native.balance).toFixed(2) : '0.00';
    const usd = (parseFloat(xlm) * 0.12).toFixed(2);

    return NextResponse.json({
      xlm,
      usd: `$${usd}`,
      funded: true,
      publicKey: family.wallet_public_key,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[API] /family/balance error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Client-side Stellar helpers
 * Uses Horizon REST API directly (no Node.js SDK needed)
 */

const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
  'https://horizon-testnet.stellar.org';

const FRIENDBOT_URL =
  process.env.NEXT_PUBLIC_FRIENDBOT_URL ||
  'https://friendbot.stellar.org';

export interface BalanceInfo {
  xlm: string;
  usd: string;
  funded: boolean;
}

export async function getBalance(address: string): Promise<BalanceInfo | null> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (res.status === 404) {
      return { xlm: '0.00', usd: '$0.00', funded: false };
    }
    if (!res.ok) return null;
    const data = await res.json();
    const native = data.balances?.find(
      (b: { asset_type: string }) => b.asset_type === 'native',
    );
    const xlm = native ? parseFloat(native.balance).toFixed(2) : '0.00';
    const usd = (parseFloat(xlm) * 0.12).toFixed(2);
    return { xlm, usd: `$${usd}`, funded: true };
  } catch {
    return null;
  }
}

export async function fundWithFriendbot(
  address: string,
): Promise<{ success: boolean; balance?: string }> {
  try {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${address}`);
    if (!res.ok) {
      return { success: false };
    }
    // After funding, fetch new balance
    const bal = await getBalance(address);
    return { success: true, balance: bal?.xlm || '10,000.00' };
  } catch {
    return { success: false };
  }
}

export async function getRecentTransactions(
  address: string,
  limit = 10,
): Promise<
  Array<{
    id: string;
    type: string;
    amount: string;
    from: string;
    to: string;
    createdAt: string;
    successful: boolean;
  }>
> {
  try {
    const res = await fetch(
      `${HORIZON_URL}/accounts/${address}/payments?order=desc&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data._embedded?.records || [])
      .filter((r: { type: string }) =>
        ['payment', 'create_account'].includes(r.type),
      )
      .map(
        (r: {
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
        }),
      );
  } catch {
    return [];
  }
}

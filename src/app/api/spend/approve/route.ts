import { NextResponse } from 'next/server';
import {
  Keypair, Networks, TransactionBuilder, Operation, Asset,
} from '@stellar/stellar-sdk';
import { requireAuth, getUserFamily } from '@/lib/auth';
import { sql } from '@/lib/db';
import { decryptShare } from '@/lib/crypto';
import { shamirCombine } from '@/lib/mpc/shamir-simple';

const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

export async function POST(request: Request) {
  let privateKeyHex = '';
  let keypair: Keypair | null = null;

  try {
    const user = await requireAuth();
    const family = await getUserFamily(user.id);

    if (!family || family.member_role === 'child') {
      return NextResponse.json({ error: 'Only parents can approve requests' }, { status: 403 });
    }

    if (!family.wallet_public_key) {
      return NextResponse.json({ error: 'No wallet found for this family' }, { status: 400 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
    }

    // 1. Verify the request
    const reqRows = await sql`
      SELECT id, amount_xlm, destination, status FROM guardian_spend_requests
      WHERE id = ${requestId} AND family_id = ${family.id}
    `;

    if (!reqRows[0]) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (reqRows[0].status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
    }

    const spendReq = reqRows[0];

    // 2. Get 2 wallet shares (child's share + this parent's share)
    const shareRows = await sql`
      SELECT ws.encrypted_share, ws.iv, ws.salt, ws.share_index, ws.member_id
      FROM guardian_wallet_shares ws
      JOIN guardian_members gm ON gm.id = ws.member_id
      WHERE ws.family_id = ${family.id}
      ORDER BY ws.share_index ASC
    `;

    if (shareRows.length < 2) {
      return NextResponse.json({ error: 'Not enough wallet shares found' }, { status: 500 });
    }

    // Pick child's share (index 1) and this parent's share
    const childShare = shareRows.find((s: Record<string, unknown>) => s.share_index === 1);
    const parentShare = shareRows.find((s: Record<string, unknown>) => s.member_id === family.member_id);

    if (!childShare || !parentShare) {
      return NextResponse.json({ error: 'Required shares not found' }, { status: 500 });
    }

    // 3. Decrypt both shares
    const decryptedChild = decryptShare(
      { ciphertext: childShare.encrypted_share, iv: childShare.iv, salt: childShare.salt },
      childShare.member_id
    );
    const decryptedParent = decryptShare(
      { ciphertext: parentShare.encrypted_share, iv: parentShare.iv, salt: parentShare.salt },
      parentShare.member_id
    );

    // 4. Reconstruct private key via Shamir combine
    privateKeyHex = shamirCombine([decryptedChild, decryptedParent]);
    const privateKey = Buffer.from(privateKeyHex, 'hex').toString();

    // 5. Build Stellar transaction
    keypair = Keypair.fromSecret(privateKey);

    // Load account for sequence number
    const accountRes = await fetch(`${HORIZON_URL}/accounts/${family.wallet_public_key}`);
    if (!accountRes.ok) {
      return NextResponse.json({ error: 'Failed to load account from Horizon' }, { status: 502 });
    }
    const accountData = await accountRes.json();

    const transaction = new TransactionBuilder(
      {
        accountId: () => family.wallet_public_key,
        sequenceNumber: () => accountData.sequence,
        incrementSequenceNumber: () => {},
      } as unknown as import('@stellar/stellar-sdk').Account,
      {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      }
    )
      .addOperation(
        Operation.payment({
          destination: spendReq.destination,
          asset: Asset.native(),
          amount: parseFloat(spendReq.amount_xlm).toFixed(7),
        })
      )
      .setTimeout(60)
      .build();

    // 6. Sign
    transaction.sign(keypair);

    // 7. Submit to Horizon
    const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `tx=${encodeURIComponent(transaction.toXDR())}`,
    });

    const submitData = await submitRes.json();

    if (!submitRes.ok) {
      console.error('[APPROVE] Horizon submission failed:', submitData);
      return NextResponse.json({ error: 'Transaction submission failed', details: submitData }, { status: 502 });
    }

    const txHash = submitData.hash;

    // 8. Update spend request
    await sql`
      UPDATE guardian_spend_requests
      SET status = 'approved', approved_by = ${user.id}, approved_at = CURRENT_TIMESTAMP, tx_hash = ${txHash}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
    `;

    console.log('[APPROVE] Transaction approved and submitted:', txHash);

    return NextResponse.json({
      success: true,
      txHash,
      message: 'Transaction approved and submitted to Stellar network',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    if (message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('[API] /spend/approve error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // WIPE sensitive key material
    if (keypair) {
      try { keypair.rawSecretKey().fill(0); } catch {}
    }
    if (privateKeyHex) {
      privateKeyHex = '';
    }
  }
}

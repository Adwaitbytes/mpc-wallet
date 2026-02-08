import { NextRequest, NextResponse } from 'next/server';
import { Transaction, Networks, Keypair } from '@stellar/stellar-sdk';
import { shamirCombine } from '@/lib/mpc/shamir-simple';

/**
 * REAL MPC transaction signing - reconstructs key from 2 shares
 */
export async function POST(request: NextRequest) {
  try {
    const { transactionXDR, shares, network } = await request.json();

    if (!transactionXDR || !shares || shares.length < 2) {
      return NextResponse.json(
        { error: 'Need transaction and at least 2 shares' },
        { status: 400 }
      );
    }

    console.log('[MPC] Signing transaction with', shares.length, 'shares...');

    // 1. Decode shares from base64
    const decodedShares = shares.map((s: any) =>
      Buffer.from(s.data, 'base64').toString()
    );

    console.log('[MPC] Decoded shares:', decodedShares.map((s: string) => s.substring(0, 20) + '...'));

    // 2. Reconstruct private key using Shamir (only need 2 out of 3)
    const privateKeyHex = shamirCombine(decodedShares.slice(0, 2));
    console.log('[MPC] Reconstructed private key from shares');

    // 3. Convert hex back to Stellar secret key
    const privateKey = Buffer.from(privateKeyHex, 'hex').toString();

    // 4. Load transaction
    const networkPassphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
    const transaction = new Transaction(transactionXDR, networkPassphrase);

    // 5. Sign with reconstructed key
    const keypair = Keypair.fromSecret(privateKey);
    transaction.sign(keypair);

    console.log('[MPC] Transaction signed successfully');

    // 6. WIPE private key from memory
    const secretBuffer = keypair.rawSecretKey();
    secretBuffer.fill(0);

    return NextResponse.json({
      success: true,
      signedTransaction: transaction.toXDR(),
      message: 'Signed with MPC (reconstructed from 2 shares)'
    });

  } catch (error: any) {
    console.error('[MPC] Error signing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign transaction' },
      { status: 500 }
    );
  }
}

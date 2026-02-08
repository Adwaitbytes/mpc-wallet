import { NextRequest, NextResponse } from 'next/server';
import { MPCWallet } from '@/lib/mpc/wallet';
import { Transaction, Networks } from '@stellar/stellar-sdk';

/**
 * API Route: Sign Transaction with MPC
 * POST /api/mpc/sign
 *
 * Body: {
 *   transaction: '...', // XDR string
 *   providers: [
 *     { type: 'google', userSub: '...', token: '...' },
 *     { type: 'github', userSub: '...', token: '...' }
 *   ],
 *   walletAddress: 'GXXX...',
 *   network: 'testnet' | 'mainnet'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction: transactionXDR, providers, walletAddress, network } = body;

    // Validate input
    if (!transactionXDR || !providers || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(providers) || providers.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 providers to sign' },
        { status: 400 }
      );
    }

    console.log('[API] Signing transaction with MPC...');
    console.log('[API] Wallet:', walletAddress);
    console.log('[API] Providers:', providers.map(p => p.type).join(', '));

    // Parse transaction
    const networkPassphrase = network === 'mainnet'
      ? Networks.PUBLIC
      : Networks.TESTNET;

    const transaction = new Transaction(transactionXDR, networkPassphrase);

    // Sign with MPC
    const signedTransaction = await MPCWallet.sign(
      transaction,
      providers,
      walletAddress
    );

    console.log('[API] Transaction signed successfully');

    return NextResponse.json({
      success: true,
      signedTransaction: signedTransaction.toXDR(),
      signatures: signedTransaction.signatures.length
    });

  } catch (error: any) {
    console.error('[API] Error signing transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign transaction' },
      { status: 500 }
    );
  }
}

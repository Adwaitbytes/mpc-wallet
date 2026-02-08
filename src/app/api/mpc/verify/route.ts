import { NextRequest, NextResponse } from 'next/server';
import { MPCWallet } from '@/lib/mpc/wallet';

/**
 * API Route: Verify MPC Wallet Recovery
 * POST /api/mpc/verify
 *
 * Body: {
 *   providers: [
 *     { type: 'google', userSub: '...', token: '...' },
 *     { type: 'github', userSub: '...', token: '...' }
 *   ],
 *   walletAddress: 'GXXX...'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providers, walletAddress } = body;

    // Validate input
    if (!providers || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[API] Verifying MPC wallet recovery...');
    console.log('[API] Wallet:', walletAddress);

    // Verify recovery
    const result = await MPCWallet.verifyRecovery(providers, walletAddress);

    console.log('[API] Recovery status:', result.canRecover ? 'OK' : 'INSUFFICIENT SHARES');
    console.log('[API] Available shares:', result.availableShares);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('[API] Error verifying recovery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify recovery' },
      { status: 500 }
    );
  }
}

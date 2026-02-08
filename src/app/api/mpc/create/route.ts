import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { shamirSplit } from '@/lib/mpc/shamir-simple';
import { ShareEncryption } from '@/lib/mpc/encryption';
import { ShareStorage } from '@/lib/mpc/storage';

/**
 * REAL MPC wallet creation with OAuth + Cloud Storage
 */
export async function POST(request: NextRequest) {
  try {
    const { providers } = await request.json();

    if (!providers || providers.length !== 3) {
      return NextResponse.json(
        { error: 'Need exactly 3 OAuth providers' },
        { status: 400 }
      );
    }

    console.log('[MPC] Creating wallet with OAuth providers:', providers.map((p: any) => p.email));

    // 1. Generate Stellar keypair
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const privateKey = keypair.secret();

    console.log('[MPC] Generated keypair:', publicKey);

    // 2. Convert to hex and split with Shamir
    const privateKeyHex = Buffer.from(privateKey).toString('hex');
    const shares = shamirSplit(privateKeyHex, 3, 2);
    console.log('[MPC] Split into 3 shares');

    // 3. Encrypt and store each share with OAuth provider
    const shareIds = [];

    for (let i = 0; i < shares.length; i++) {
      const provider = providers[i];
      const share = shares[i];

      console.log(`[MPC] Processing share ${i + 1} for ${provider.type}...`);

      // Encrypt share
      const encrypted = await ShareEncryption.encrypt(
        share,
        provider.token,
        provider.userSub
      );

      // Create share package
      const sharePackage = {
        share: encrypted,
        index: i + 1,
        threshold: 2,
        total: 3,
        provider: provider.type,
        walletAddress: publicKey,
        createdAt: Date.now(),
        version: '1.0.0'
      };

      // Store in OAuth provider's cloud storage
      let storageId;

      if (provider.type === 'google') {
        storageId = await ShareStorage.storeInGoogleDrive(sharePackage, provider.token);
        console.log(`[MPC] Stored share ${i + 1} in Google Drive:`, storageId);
      } else if (provider.type === 'github') {
        storageId = await ShareStorage.storeInGitHubGist(sharePackage, provider.token);
        console.log(`[MPC] Stored share ${i + 1} in GitHub Gist:`, storageId);
      } else {
        throw new Error(`Provider ${provider.type} not supported`);
      }

      shareIds.push({
        provider: provider.type,
        storageId,
        index: i + 1
      });
    }

    console.log('[MPC] Wallet created successfully with OAuth cloud storage!');

    return NextResponse.json({
      success: true,
      publicKey,
      shareIds,
      threshold: 2,
      totalShares: 3,
      createdAt: Date.now()
    });

  } catch (error: any) {
    console.error('[MPC] Error creating wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create MPC wallet' },
      { status: 500 }
    );
  }
}

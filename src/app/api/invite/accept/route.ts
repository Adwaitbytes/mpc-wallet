import { NextResponse } from 'next/server';
import { Keypair } from '@stellar/stellar-sdk';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { encryptShare } from '@/lib/crypto';
import { shamirSplit } from '@/lib/mpc/shamir-simple';

async function createWalletForFamily(familyId: string) {
  // 1. Generate Stellar keypair
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();
  const privateKey = keypair.secret();

  console.log('[WALLET] Creating wallet for family:', familyId, 'pubkey:', publicKey);

  try {
    // 2. Shamir split the private key (2-of-3 threshold)
    const privateKeyHex = Buffer.from(privateKey).toString('hex');
    const shares = shamirSplit(privateKeyHex, 3, 2);

    // 3. Get all 3 members (child + 2 parents)
    const members = await sql`
      SELECT id, share_index FROM guardian_members
      WHERE family_id = ${familyId}
      ORDER BY share_index ASC
    `;

    // 4. Encrypt each share with member-specific key and store
    for (const member of members) {
      const shareIdx = member.share_index - 1; // shares array is 0-indexed
      const encrypted = encryptShare(shares[shareIdx], member.id);

      await sql`
        INSERT INTO guardian_wallet_shares (family_id, member_id, share_index, encrypted_share, iv, salt)
        VALUES (${familyId}, ${member.id}, ${member.share_index}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.salt})
      `;
    }

    // 5. Fund with Friendbot
    let funded = false;
    try {
      const friendbotUrl = process.env.NEXT_PUBLIC_FRIENDBOT_URL || 'https://friendbot.stellar.org';
      const fbRes = await fetch(`${friendbotUrl}?addr=${publicKey}`);
      funded = fbRes.ok;
      console.log('[WALLET] Friendbot funding:', funded ? 'success' : 'failed');
    } catch (e) {
      console.error('[WALLET] Friendbot error:', e);
    }

    // 6. Update family record
    await sql`
      UPDATE guardian_families
      SET wallet_public_key = ${publicKey}, wallet_funded = ${funded}, status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${familyId}
    `;

    console.log('[WALLET] Wallet created successfully for family:', familyId);
    return { publicKey, funded };
  } finally {
    // Wipe sensitive data
    keypair.rawSecretKey().fill(0);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Invite token required' }, { status: 400 });
    }

    // Find the invitation
    const inviteRows = await sql`
      SELECT gm.*, gf.child_id, gf.status as family_status
      FROM guardian_members gm
      JOIN guardian_families gf ON gf.id = gm.family_id
      WHERE gm.invite_token = ${token}
    `;

    if (!inviteRows[0]) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invite = inviteRows[0];

    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'Already accepted' }, { status: 400 });
    }

    // Link user to the member record and accept
    await sql`
      UPDATE guardian_members
      SET user_id = ${user.id}, status = 'accepted', accepted_at = CURRENT_TIMESTAMP
      WHERE id = ${invite.id}
    `;

    // Update user role to 'parent'
    await sql`
      UPDATE guardian_users SET role = 'parent', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    // Check if ALL parents have accepted
    const pendingRows = await sql`
      SELECT COUNT(*) as count FROM guardian_members
      WHERE family_id = ${invite.family_id} AND role = 'parent' AND status = 'pending'
    `;

    const pendingCount = parseInt(pendingRows[0].count);

    let walletCreated = false;
    let walletData = null;

    if (pendingCount === 0) {
      // Both parents accepted → create wallet!
      console.log('[INVITE] Both parents accepted! Creating wallet for family:', invite.family_id);
      walletData = await createWalletForFamily(invite.family_id);
      walletCreated = true;
    }

    return NextResponse.json({
      success: true,
      walletCreated,
      walletData,
      message: walletCreated
        ? 'Welcome! The family wallet has been created.'
        : 'Invitation accepted. Waiting for the other parent to accept.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[API] /invite/accept error:', error);
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

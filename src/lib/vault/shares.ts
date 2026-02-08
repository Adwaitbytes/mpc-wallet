/**
 * Vault Share Management
 * Handles Shamir share creation, storage, retrieval, and reconstruction
 * Reuses existing crypto.ts + shamir-simple.ts unchanged
 */

import { sql } from '../db';
import { encryptShare, decryptShare } from '../crypto';
import { shamirSplit, shamirCombine } from '../mpc/shamir-simple';
import { getAdapter } from '../chains/registry';
import type { ChainId, NetworkType } from '../chains/types';

export interface ShareCreationResult {
  publicKey: string;
  funded: boolean;
  sharesStored: number;
}

/**
 * Create wallet + Shamir shares for a vault
 * Generates keypair, splits key, encrypts per-member, stores in DB
 */
export async function createShares(
  vaultId: string,
  memberIds: string[],
  threshold: number,
  chain: ChainId = 'stellar',
  network: NetworkType = 'testnet',
): Promise<ShareCreationResult> {
  const adapter = getAdapter(chain, network);
  const keypair = adapter.generateKeypair();

  console.log(`[SHARES] Creating ${threshold}-of-${memberIds.length} for vault ${vaultId}, pubkey: ${keypair.publicKey}`);

  try {
    // Split private key using Shamir SSS
    const shares = shamirSplit(keypair.privateKeyHex, memberIds.length, threshold);

    // Encrypt and store each share
    for (let i = 0; i < shares.length; i++) {
      const memberId = memberIds[i];
      const encrypted = encryptShare(shares[i], memberId);

      await sql`
        INSERT INTO vault_shares (vault_id, member_id, share_index, encrypted_share, iv, salt)
        VALUES (${vaultId}, ${memberId}, ${i + 1}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.salt})
        ON CONFLICT (vault_id, share_index) DO UPDATE SET
          encrypted_share = EXCLUDED.encrypted_share,
          iv = EXCLUDED.iv,
          salt = EXCLUDED.salt,
          member_id = EXCLUDED.member_id,
          created_at = CURRENT_TIMESTAMP
      `;

      // Update member's share_index
      await sql`
        UPDATE vault_members SET share_index = ${i + 1} WHERE id = ${memberId}
      `;

      // Zero out share from memory
      shares[i] = '';
    }

    // Fund on testnet
    let funded = false;
    if (network === 'testnet') {
      const result = await adapter.fundTestnet(keypair.publicKey);
      funded = result.success;
      console.log(`[SHARES] Testnet funding: ${funded ? 'success' : 'failed'}`);
    }

    // Update vault with wallet info
    await sql`
      UPDATE vault_vaults
      SET wallet_public_key = ${keypair.publicKey},
          wallet_funded = ${funded},
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${vaultId}
    `;

    console.log(`[SHARES] Wallet created for vault ${vaultId}`);
    return { publicKey: keypair.publicKey, funded, sharesStored: memberIds.length };

  } finally {
    // CRITICAL: Wipe private key from memory
    keypair.rawSecretKey.fill(0);
  }
}

/**
 * Reconstruct private key from shares
 * Retrieves and decrypts minimum threshold shares, then combines
 * Returns hex-encoded private key (caller MUST wipe after use)
 */
export async function reconstructKey(
  vaultId: string,
  memberIds: string[],
): Promise<string> {
  if (memberIds.length < 2) {
    throw new Error('Need at least 2 member IDs to reconstruct key');
  }

  console.log(`[SHARES] Reconstructing key for vault ${vaultId} using ${memberIds.length} shares`);

  const decryptedShares: string[] = [];

  for (const memberId of memberIds) {
    const rows = await sql`
      SELECT encrypted_share, iv, salt, share_index, member_id
      FROM vault_shares
      WHERE vault_id = ${vaultId} AND member_id = ${memberId}
      LIMIT 1
    `;

    if (!rows[0]) {
      throw new Error(`Share not found for member ${memberId} in vault ${vaultId}`);
    }

    const share = rows[0];
    const decrypted = decryptShare(
      { ciphertext: share.encrypted_share, iv: share.iv, salt: share.salt },
      share.member_id,
    );

    decryptedShares.push(decrypted);
  }

  // Reconstruct via Lagrange interpolation
  const privateKeyHex = shamirCombine(decryptedShares);

  // Wipe decrypted shares
  for (let i = 0; i < decryptedShares.length; i++) {
    decryptedShares[i] = '';
  }

  return privateKeyHex;
}

/**
 * Rotate shares: re-split the key with new random polynomials
 * Used when members change (e.g., DAO council rotation)
 */
export async function rotateShares(
  vaultId: string,
  currentMemberIds: string[],
  newMemberIds: string[],
  newThreshold: number,
): Promise<{ success: boolean; sharesRotated: number }> {
  console.log(`[SHARES] Rotating shares for vault ${vaultId}: ${currentMemberIds.length} -> ${newMemberIds.length} members`);

  // 1. Reconstruct current key
  const privateKeyHex = await reconstructKey(vaultId, currentMemberIds.slice(0, 2));

  try {
    // 2. Delete old shares
    await sql`DELETE FROM vault_shares WHERE vault_id = ${vaultId}`;

    // 3. Re-split with new parameters
    const shares = shamirSplit(privateKeyHex, newMemberIds.length, newThreshold);

    // 4. Encrypt and store new shares
    for (let i = 0; i < shares.length; i++) {
      const memberId = newMemberIds[i];
      const encrypted = encryptShare(shares[i], memberId);

      await sql`
        INSERT INTO vault_shares (vault_id, member_id, share_index, encrypted_share, iv, salt)
        VALUES (${vaultId}, ${memberId}, ${i + 1}, ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.salt})
      `;

      await sql`
        UPDATE vault_members SET share_index = ${i + 1} WHERE id = ${memberId}
      `;

      shares[i] = '';
    }

    // 5. Update vault threshold
    await sql`
      UPDATE vault_vaults SET threshold = ${newThreshold}, total_shares = ${newMemberIds.length}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${vaultId}
    `;

    console.log(`[SHARES] Rotation complete: ${newMemberIds.length} new shares`);
    return { success: true, sharesRotated: newMemberIds.length };

  } finally {
    // We can't really "wipe" a JS string, but clear the reference
    // The GC will handle the rest
  }
}

/**
 * Get share status for a vault (which members have shares)
 */
export async function getShareStatus(
  vaultId: string,
): Promise<Array<{ memberId: string; shareIndex: number; hasShare: boolean }>> {
  const rows = await sql`
    SELECT vm.id as member_id, vm.share_index, vs.id as share_id
    FROM vault_members vm
    LEFT JOIN vault_shares vs ON vs.vault_id = vm.vault_id AND vs.member_id = vm.id
    WHERE vm.vault_id = ${vaultId}
    ORDER BY vm.share_index ASC
  `;

  return rows.map((r: Record<string, unknown>) => ({
    memberId: r.member_id as string,
    shareIndex: r.share_index as number,
    hasShare: !!r.share_id,
  }));
}

/**
 * Server-side AES-256-GCM encryption for wallet shares
 * Uses scrypt key derivation with member-specific personalization
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptShare(
  plaintext: string,
  memberId: string,
): { ciphertext: string; iv: string; salt: string } {
  const salt = randomBytes(16);
  const key = scryptSync(
    process.env.SHARE_ENCRYPTION_KEY! + memberId,
    salt,
    32,
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted + '.' + authTag.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  };
}

export function decryptShare(
  encrypted: { ciphertext: string; iv: string; salt: string },
  memberId: string,
): string {
  const [ciphertext, authTagB64] = encrypted.ciphertext.split('.');
  const salt = Buffer.from(encrypted.salt, 'base64');
  const key = scryptSync(
    process.env.SHARE_ENCRYPTION_KEY! + memberId,
    salt,
    32,
  );
  const iv = Buffer.from(encrypted.iv, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

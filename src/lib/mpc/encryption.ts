/**
 * Share Encryption Module
 * Encrypts/decrypts shares using OAuth-derived keys
 */

export interface EncryptedShare {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded initialization vector
  salt: string;       // Base64 encoded salt for key derivation
}

export class ShareEncryption {
  /**
   * Encrypt a share with OAuth-derived key
   * @param share - Plaintext share string
   * @param oauthToken - OAuth access token
   * @param userSub - OAuth user subject ID
   * @returns Encrypted share object
   */
  static async encrypt(
    share: string,
    oauthToken: string,
    userSub: string
  ): Promise<EncryptedShare> {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive encryption key from OAuth identity
    const key = await this.deriveKey(oauthToken, userSub, salt);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode share as bytes
    const encoder = new TextEncoder();
    const shareData = encoder.encode(share);

    // Encrypt using AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      shareData
    );

    return {
      ciphertext: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt)
    };
  }

  /**
   * Decrypt a share
   * @param encrypted - Encrypted share object
   * @param oauthToken - OAuth access token
   * @param userSub - OAuth user subject ID
   * @returns Decrypted share string
   */
  static async decrypt(
    encrypted: EncryptedShare,
    oauthToken: string,
    userSub: string
  ): Promise<string> {
    // Parse salt
    const salt = this.base64ToArrayBuffer(encrypted.salt);

    // Derive encryption key (same process as encryption)
    const key = await this.deriveKey(oauthToken, userSub, new Uint8Array(salt));

    // Parse ciphertext and IV
    const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext);
    const iv = this.base64ToArrayBuffer(encrypted.iv);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: 128
      },
      key,
      ciphertext
    );

    // Decode bytes to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Derive encryption key from OAuth identity
   * Uses PBKDF2 for key derivation
   */
  private static async deriveKey(
    oauthToken: string,
    userSub: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // Create key material from OAuth identity
    const keyMaterial = `stellaray-mpc-v1-${userSub}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyMaterial);

    // Import as raw key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES key using PBKDF2
    // Convert Uint8Array to ArrayBuffer for type compatibility
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert ArrayBuffer or Uint8Array to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

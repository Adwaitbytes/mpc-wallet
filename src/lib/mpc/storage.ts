/**
 * Share Storage Module
 * Stores encrypted shares in OAuth provider storage (Google Drive, GitHub, etc.)
 */

import { EncryptedShare } from './encryption';

export type OAuthProvider = 'google' | 'github' | 'apple';

export interface SharePackage {
  share: EncryptedShare;
  index: number;           // 1, 2, or 3
  threshold: number;       // 2 for 2-of-3
  total: number;           // 3 total shares
  provider: OAuthProvider;
  walletAddress: string;   // Stellar public key
  createdAt: number;       // Timestamp
  version: string;         // Schema version
}

export class ShareStorage {
  /**
   * Store share in Google Drive (appDataFolder - hidden from user)
   */
  static async storeInGoogleDrive(
    sharePackage: SharePackage,
    accessToken: string
  ): Promise<string> {
    const fileName = `stellaray-mpc-share-${sharePackage.index}-${sharePackage.walletAddress}.json`;

    // Create file metadata
    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: ['appDataFolder'] // Hidden folder
    };

    // Create multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(sharePackage) +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartRequestBody
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to store share in Google Drive: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id; // Return Google Drive file ID
  }

  /**
   * Retrieve share from Google Drive
   */
  static async retrieveFromGoogleDrive(
    accessToken: string,
    walletAddress: string,
    shareIndex?: number
  ): Promise<SharePackage | null> {
    // Build query
    let query = `name contains 'stellaray-mpc-share' and name contains '${walletAddress}'`;
    if (shareIndex) {
      query += ` and name contains 'share-${shareIndex}'`;
    }

    // Search for file in appDataFolder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `q=${encodeURIComponent(query)}&` +
      `spaces=appDataFolder&` +
      `fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Failed to search Google Drive: ${searchResponse.statusText}`);
    }

    const { files } = await searchResponse.json();

    if (!files || files.length === 0) {
      return null;
    }

    // Get file content
    const fileId = files[0].id;
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!contentResponse.ok) {
      throw new Error(`Failed to retrieve share content: ${contentResponse.statusText}`);
    }

    return await contentResponse.json();
  }

  /**
   * Store share in GitHub Gist (private)
   */
  static async storeInGitHubGist(
    sharePackage: SharePackage,
    accessToken: string
  ): Promise<string> {
    const fileName = `stellaray-mpc-share-${sharePackage.index}.json`;

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        description: `StellaRay MPC Wallet Share ${sharePackage.index} (Encrypted)`,
        public: false,
        files: {
          [fileName]: {
            content: JSON.stringify(sharePackage, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create GitHub Gist: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id; // Return Gist ID
  }

  /**
   * Retrieve share from GitHub Gist
   */
  static async retrieveFromGitHubGist(
    accessToken: string,
    walletAddress: string
  ): Promise<SharePackage | null> {
    // List user's gists
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list GitHub Gists: ${response.statusText}`);
    }

    const gists = await response.json();

    // Find gist with matching wallet address
    for (const gist of gists) {
      if (gist.description?.includes('StellaRay MPC Wallet Share')) {
        const files = Object.values(gist.files) as any[];
        for (const file of files) {
          if (file.filename.startsWith('stellaray-mpc-share')) {
            const sharePackage = JSON.parse(file.content);
            if (sharePackage.walletAddress === walletAddress) {
              return sharePackage;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Delete share from Google Drive
   */
  static async deleteFromGoogleDrive(
    fileId: string,
    accessToken: string
  ): Promise<void> {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
  }

  /**
   * Delete share from GitHub Gist
   */
  static async deleteFromGitHubGist(
    gistId: string,
    accessToken: string
  ): Promise<void> {
    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json'
      }
    });
  }

  /**
   * List all shares for a wallet
   */
  static async listShares(
    providers: Array<{ type: OAuthProvider; token: string }>,
    walletAddress: string
  ): Promise<SharePackage[]> {
    const shares: SharePackage[] = [];

    for (const provider of providers) {
      let share: SharePackage | null = null;

      switch (provider.type) {
        case 'google':
          share = await this.retrieveFromGoogleDrive(provider.token, walletAddress);
          break;
        case 'github':
          share = await this.retrieveFromGitHubGist(provider.token, walletAddress);
          break;
        default:
          console.warn(`Provider ${provider.type} not supported yet`);
      }

      if (share) {
        shares.push(share);
      }
    }

    return shares;
  }
}

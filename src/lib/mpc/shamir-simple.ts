/**
 * Simple Shamir Secret Sharing implementation
 * Works in Next.js environment without native dependencies
 */

// Use crypto for random generation
const randomBytes = (length: number): Uint8Array => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }
  // Node.js
  return require('crypto').randomBytes(length);
};

// GF(256) - Galois Field arithmetic
const GF256_EXP = new Array(256);
const GF256_LOG = new Array(256);

// Initialize GF(256) tables
function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ ((x & 0x80) ? 0x1b : 0);
  }
  GF256_EXP[255] = GF256_EXP[0];
}

initGF256();

function gfMult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  if (a === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] - GF256_LOG[b] + 255) % 255];
}

/**
 * Split secret into shares using Shamir Secret Sharing
 * @param secret - The secret as hex string
 * @param numShares - Total number of shares to create
 * @param threshold - Minimum shares needed to reconstruct
 */
export function shamirSplit(secret: string, numShares: number, threshold: number): string[] {
  if (threshold > numShares) {
    throw new Error('Threshold cannot be greater than number of shares');
  }
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }

  // Convert hex secret to bytes
  const secretBytes = Buffer.from(secret, 'hex');
  const shares: string[] = [];

  // For each byte of the secret
  for (let byteIdx = 0; byteIdx < secretBytes.length; byteIdx++) {
    const secretByte = secretBytes[byteIdx];

    // Generate random coefficients for polynomial
    const coeffs = [secretByte];
    for (let i = 1; i < threshold; i++) {
      coeffs.push(randomBytes(1)[0]);
    }

    // Evaluate polynomial at points 1..numShares
    for (let shareIdx = 0; shareIdx < numShares; shareIdx++) {
      const x = shareIdx + 1;
      let y = 0;

      // Evaluate polynomial: y = a0 + a1*x + a2*x^2 + ... in GF(256)
      for (let i = threshold - 1; i >= 0; i--) {
        y = gfMult(y, x) ^ coeffs[i];
      }

      if (!shares[shareIdx]) {
        shares[shareIdx] = '';
      }
      shares[shareIdx] += y.toString(16).padStart(2, '0');
    }
  }

  // Format: "X-YYYY..." where X is the share index
  return shares.map((share, idx) => `${idx + 1}-${share}`);
}

/**
 * Reconstruct secret from shares using Lagrange interpolation
 * @param shares - Array of share strings (only need threshold number)
 */
export function shamirCombine(shares: string[]): string {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares');
  }

  // Parse shares
  const parsedShares = shares.map(share => {
    const [indexStr, data] = share.split('-');
    return {
      x: parseInt(indexStr),
      data: data
    };
  });

  // Get secret length from share data
  const secretLength = parsedShares[0].data.length / 2;
  const secretBytes: number[] = [];

  // For each byte position
  for (let byteIdx = 0; byteIdx < secretLength; byteIdx++) {
    // Get y values for this byte from all shares
    const points = parsedShares.map(share => ({
      x: share.x,
      y: parseInt(share.data.substring(byteIdx * 2, byteIdx * 2 + 2), 16)
    }));

    // Lagrange interpolation to find secret (coefficient at x=0)
    let secret = 0;
    for (let i = 0; i < points.length; i++) {
      let numerator = 1;
      let denominator = 1;

      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          numerator = gfMult(numerator, points[j].x);
          denominator = gfMult(denominator, points[j].x ^ points[i].x);
        }
      }

      const lagrange = gfDiv(numerator, denominator);
      secret ^= gfMult(points[i].y, lagrange);
    }

    secretBytes.push(secret);
  }

  // Convert back to hex
  return Buffer.from(secretBytes).toString('hex');
}

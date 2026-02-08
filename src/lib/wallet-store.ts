/**
 * Cross-page state management for the family vault
 * Uses localStorage so parent and child dashboards share data
 */

// ─── Types ───

export interface VaultConfig {
  publicKey: string;
  childName: string;
  parent1Name: string;
  parent2Name: string;
  parent1Email?: string;
  parent2Email?: string;
  childEmail?: string;
  allowance: number;
  autoDeposit: boolean;
  threshold: number;
  total: number;
  createdAt: number;
  shares?: Array<{ index: number; preview: string }>;
  zkEnabled: boolean;
}

export interface SpendRequest {
  id: string;
  childName: string;
  childInitial: string;
  amount: number;
  destination: string;
  destinationLabel: string;
  purpose: string;
  category: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'denied';
}

// ─── Storage Keys ───

const VAULT_KEY = 'stellaray_vault';
const REQUESTS_KEY = 'stellaray_requests';

// ─── Vault Operations ───

export function saveVault(config: VaultConfig): void {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable
  }
}

export function getVault(): VaultConfig | null {
  try {
    const data = localStorage.getItem(VAULT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(REQUESTS_KEY);
}

// ─── Spend Request Operations ───

export function addSpendRequest(request: SpendRequest): void {
  const requests = getSpendRequests();
  requests.unshift(request);
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    // Storage full
  }
}

export function getSpendRequests(): SpendRequest[] {
  try {
    const data = localStorage.getItem(REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getPendingRequests(): SpendRequest[] {
  return getSpendRequests().filter((r) => r.status === 'pending');
}

export function updateRequestStatus(
  id: string,
  status: 'approved' | 'denied',
): void {
  const requests = getSpendRequests();
  const updated = requests.map((r) =>
    r.id === id ? { ...r, status } : r,
  );
  try {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
  } catch {
    // Storage full
  }
}

export function clearRequests(): void {
  localStorage.removeItem(REQUESTS_KEY);
}

// ─── Helpers ───

export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

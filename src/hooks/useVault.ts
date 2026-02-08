'use client';

import { useState, useEffect, useCallback } from 'react';

interface VaultBalance {
  native: string;
  nativeFormatted: string;
  symbol: string;
  usdEstimate: string;
  funded: boolean;
  assets?: Array<{ code: string; issuer: string; balance: string }>;
}

interface VaultMember {
  id: string;
  email: string;
  role: string;
  label: string;
  status: string;
  name?: string;
  image?: string;
}

interface VaultAction {
  id: string;
  action_type: string;
  creator_id: string;
  payload: Record<string, unknown>;
  status: string;
  approvals_required: number;
  approvals_received: number;
  denials_received: number;
  time_lock_until: string | null;
  expires_at: string | null;
  tx_hash: string | null;
  created_at: string;
}

interface Vault {
  id: string;
  name: string;
  vault_type: string;
  chain: string;
  network: string;
  status: string;
  wallet_public_key: string | null;
  wallet_funded: boolean;
  threshold: number;
  total_shares: number;
  config: Record<string, unknown>;
  members: VaultMember[];
  created_at: string;
}

interface UseVaultReturn {
  vault: Vault | null;
  balance: VaultBalance | null;
  actions: VaultAction[];
  members: VaultMember[];
  userRole: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createAction: (actionType: string, payload: Record<string, unknown>) => Promise<VaultAction>;
  castVote: (actionId: string, decision: 'approve' | 'deny', reason?: string) => Promise<void>;
  sendHeartbeat: () => Promise<void>;
}

export function useVault(vaultId: string | null): UseVaultReturn {
  const [vault, setVault] = useState<Vault | null>(null);
  const [balance, setBalance] = useState<VaultBalance | null>(null);
  const [actions, setActions] = useState<VaultAction[]>([]);
  const [members, setMembers] = useState<VaultMember[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVault = useCallback(async () => {
    if (!vaultId) { setLoading(false); return; }

    try {
      setLoading(true);
      setError(null);

      // Fetch vault + balance + actions in parallel
      const [vaultRes, balanceRes, actionsRes] = await Promise.all([
        fetch(`/api/v2/vault/${vaultId}`),
        fetch(`/api/v2/vault/${vaultId}/balance`).catch(() => null),
        fetch(`/api/v2/vault/${vaultId}/actions?limit=20`),
      ]);

      if (!vaultRes.ok) {
        const data = await vaultRes.json();
        throw new Error(data.error || 'Failed to load vault');
      }

      const vaultData = await vaultRes.json();
      setVault(vaultData.vault);
      setUserRole(vaultData.userRole);
      setMembers(vaultData.vault.members || []);

      if (balanceRes?.ok) {
        const balData = await balanceRes.json();
        setBalance(balData.balance);
      }

      if (actionsRes.ok) {
        const actData = await actionsRes.json();
        setActions(actData.actions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [vaultId]);

  useEffect(() => {
    fetchVault();
    // Poll every 15 seconds
    const interval = setInterval(fetchVault, 15000);
    return () => clearInterval(interval);
  }, [fetchVault]);

  const createActionFn = async (actionType: string, payload: Record<string, unknown>): Promise<VaultAction> => {
    const res = await fetch(`/api/v2/vault/${vaultId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType, payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchVault();
    return data.action;
  };

  const castVoteFn = async (actionId: string, decision: 'approve' | 'deny', reason?: string) => {
    const res = await fetch(`/api/v2/vault/${vaultId}/actions/${actionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchVault();
  };

  const sendHeartbeat = async () => {
    const res = await fetch(`/api/v2/vault/${vaultId}/heartbeat`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchVault();
  };

  return {
    vault,
    balance,
    actions,
    members,
    userRole,
    loading,
    error,
    refetch: fetchVault,
    createAction: createActionFn,
    castVote: castVoteFn,
    sendHeartbeat,
  };
}

/**
 * Hook to fetch all user vaults
 */
export function useUserVaults() {
  const [vaults, setVaults] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v2/user/vaults');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setVaults(data.vaults || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  return { vaults, loading, error, refetch: fetchVaults };
}

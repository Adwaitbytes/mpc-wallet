/**
 * Chain Adapter Registry
 * Factory function to get the correct adapter for a chain
 */

import type { ChainAdapter, ChainId, NetworkType } from './types';
import { StellarAdapter } from './stellar/adapter';

const adapters: Map<string, ChainAdapter> = new Map();

function key(chain: ChainId, network: NetworkType): string {
  return `${chain}:${network}`;
}

export function getAdapter(chain: ChainId = 'stellar', network: NetworkType = 'testnet'): ChainAdapter {
  const k = key(chain, network);
  let adapter = adapters.get(k);
  if (adapter) return adapter;

  switch (chain) {
    case 'stellar':
      adapter = new StellarAdapter(network);
      break;
    case 'ethereum':
      throw new Error('Ethereum adapter not yet implemented. Coming in Phase 5.');
    case 'solana':
      throw new Error('Solana adapter not yet implemented. Coming in Phase 5.');
    default:
      throw new Error(`Unknown chain: ${chain}`);
  }

  adapters.set(k, adapter);
  return adapter;
}

export function listSupportedChains(): Array<{ chainId: ChainId; name: string; networks: NetworkType[] }> {
  return [
    { chainId: 'stellar', name: 'Stellar', networks: ['testnet', 'mainnet'] },
    // Future:
    // { chainId: 'ethereum', name: 'Ethereum', networks: ['testnet', 'mainnet'] },
    // { chainId: 'solana', name: 'Solana', networks: ['testnet', 'mainnet'] },
  ];
}

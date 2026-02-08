/**
 * Cross-Border Trade Settlement Preset
 * 2-of-3: importer + exporter + bank/intermediary
 * Multi-asset support, document verification, path payments
 */

import type { CreateVaultInput } from '../types';

export interface TradePresetInput {
  tradeName: string;
  importerEmail: string;
  exporterEmail: string;
  bankEmail: string;
  acceptedAssets?: string[];       // Asset codes accepted (default: ['XLM'])
  documentRequired?: boolean;      // Whether documents must be attached
  tradeTerms?: string;            // Terms of trade (Incoterms etc.)
}

export function tradePreset(input: TradePresetInput): CreateVaultInput {
  return {
    name: `Trade: ${input.tradeName}`,
    vaultType: 'trade',
    chain: 'stellar',
    network: 'testnet',
    threshold: 2,
    totalShares: 3,
    config: {
      accepted_assets: input.acceptedAssets || ['XLM'],
      document_required: input.documentRequired !== false,
      trade_terms: input.tradeTerms || '',
    },
    members: [
      {
        email: input.importerEmail,
        role: 'signer',
        label: 'Importer',
        permissions: {
          can_approve: true,
          can_deny: true,
          can_create_actions: true,
          can_upload_documents: true,
          can_view_all: true,
        },
      },
      {
        email: input.exporterEmail,
        role: 'signer',
        label: 'Exporter',
        permissions: {
          can_approve: true,
          can_deny: true,
          can_create_actions: true,
          can_upload_documents: true,
          can_view_all: true,
        },
      },
      {
        email: input.bankEmail,
        role: 'arbiter',
        label: 'Bank / Intermediary',
        permissions: {
          can_approve: true,
          can_deny: true,
          can_verify_documents: true,
          can_view_all: true,
        },
      },
    ],
    rules: [
      {
        ruleType: 'whitelist',
        config: { allowed_addresses: [] }, // Will be populated with verified addresses
        priority: 10,
      },
      {
        ruleType: 'expiration',
        config: { expires_after_hours: 720 }, // 30 days
        priority: 100,
      },
    ],
  };
}

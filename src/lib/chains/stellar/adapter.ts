/**
 * Stellar Chain Adapter
 * Implements ChainAdapter for Stellar network
 * Extracts and consolidates logic from stellar.ts and API routes
 */

import {
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
} from '@stellar/stellar-sdk';
import type {
  ChainAdapter,
  ChainKeypair,
  ChainBalance,
  ChainTransaction,
  PaymentParams,
  PathPaymentParams,
  BatchPaymentParams,
  SubmitResult,
  NetworkType,
} from '../types';

const HORIZON_URLS: Record<NetworkType, string> = {
  testnet: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

const FRIENDBOT_URL = process.env.NEXT_PUBLIC_FRIENDBOT_URL || 'https://friendbot.stellar.org';

// Rough XLM/USD price for estimation (will be replaced with oracle in production)
const XLM_USD_ESTIMATE = 0.12;

export class StellarAdapter implements ChainAdapter {
  readonly chainId = 'stellar' as const;
  readonly symbol = 'XLM';
  readonly name = 'Stellar';
  readonly network: NetworkType;
  private readonly horizonUrl: string;
  private readonly networkPassphrase: string;

  constructor(network: NetworkType = 'testnet') {
    this.network = network;
    this.horizonUrl = HORIZON_URLS[network];
    this.networkPassphrase = network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  }

  generateKeypair(): ChainKeypair {
    const kp = Keypair.random();
    const publicKey = kp.publicKey();
    const rawSecret = kp.rawSecretKey();
    const privateKeyHex = Buffer.from(kp.secret()).toString('hex');

    return {
      publicKey,
      privateKeyHex,
      rawSecretKey: new Uint8Array(rawSecret),
    };
  }

  keypairFromSecret(privateKeyHex: string): ChainKeypair {
    const secret = Buffer.from(privateKeyHex, 'hex').toString();
    const kp = Keypair.fromSecret(secret);
    return {
      publicKey: kp.publicKey(),
      privateKeyHex,
      rawSecretKey: new Uint8Array(kp.rawSecretKey()),
    };
  }

  async getBalance(address: string): Promise<ChainBalance> {
    try {
      const res = await fetch(`${this.horizonUrl}/accounts/${address}`);
      if (res.status === 404) {
        return {
          native: '0',
          nativeFormatted: '0.00',
          symbol: 'XLM',
          usdEstimate: '$0.00',
          funded: false,
          assets: [],
        };
      }
      if (!res.ok) {
        throw new Error(`Horizon error: ${res.status}`);
      }

      const data = await res.json();
      const balances = data.balances || [];

      const nativeBalance = balances.find(
        (b: { asset_type: string }) => b.asset_type === 'native'
      );
      const xlm = nativeBalance ? parseFloat(nativeBalance.balance).toFixed(2) : '0.00';
      const usd = (parseFloat(xlm) * XLM_USD_ESTIMATE).toFixed(2);

      const assets = balances
        .filter((b: { asset_type: string }) => b.asset_type !== 'native')
        .map((b: { asset_code: string; asset_issuer: string; balance: string }) => ({
          code: b.asset_code,
          issuer: b.asset_issuer,
          balance: b.balance,
        }));

      return {
        native: xlm,
        nativeFormatted: parseFloat(xlm).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        symbol: 'XLM',
        usdEstimate: `$${usd}`,
        funded: true,
        assets,
      };
    } catch (error) {
      console.error('[StellarAdapter] getBalance error:', error);
      return {
        native: '0',
        nativeFormatted: '0.00',
        symbol: 'XLM',
        usdEstimate: '$0.00',
        funded: false,
        assets: [],
      };
    }
  }

  async fundTestnet(address: string): Promise<{ success: boolean; balance?: string }> {
    if (this.network !== 'testnet') {
      return { success: false };
    }
    try {
      const res = await fetch(`${FRIENDBOT_URL}?addr=${address}`);
      if (!res.ok) {
        return { success: false };
      }
      const bal = await this.getBalance(address);
      return { success: true, balance: bal.native };
    } catch {
      return { success: false };
    }
  }

  async getTransactions(address: string, limit = 10): Promise<ChainTransaction[]> {
    try {
      const res = await fetch(
        `${this.horizonUrl}/accounts/${address}/payments?order=desc&limit=${limit}`
      );
      if (!res.ok) return [];

      const data = await res.json();
      const records = data._embedded?.records || [];

      return records
        .filter((r: { type: string }) =>
          ['payment', 'create_account', 'path_payment_strict_receive', 'path_payment_strict_send'].includes(r.type)
        )
        .map(
          (r: {
            id: string;
            type: string;
            amount?: string;
            starting_balance?: string;
            source_amount?: string;
            from: string;
            to: string;
            created_at: string;
            transaction_successful: boolean;
            transaction_hash: string;
            asset_code?: string;
            asset_type?: string;
          }) => ({
            id: r.id,
            type: r.type.startsWith('path_payment') ? 'path_payment' as const : r.type as 'payment' | 'create_account',
            amount: r.amount || r.starting_balance || r.source_amount || '0',
            asset: r.asset_type === 'native' ? 'XLM' : (r.asset_code || 'XLM'),
            from: r.from,
            to: r.to,
            createdAt: r.created_at,
            successful: r.transaction_successful,
            hash: r.transaction_hash,
          })
        );
    } catch {
      return [];
    }
  }

  async buildPayment(params: PaymentParams): Promise<string> {
    const accountData = await this.loadAccount(params.source);

    const builder = new TransactionBuilder(
      this.toAccount(params.source, accountData.sequence),
      { fee: '100', networkPassphrase: this.networkPassphrase }
    )
      .addOperation(
        Operation.payment({
          destination: params.destination,
          asset: Asset.native(),
          amount: parseFloat(params.amount).toFixed(7),
        })
      )
      .setTimeout(60);

    if (params.memo) {
      const { Memo } = await import('@stellar/stellar-sdk');
      builder.addMemo(Memo.text(params.memo));
    }

    return builder.build().toXDR();
  }

  async buildPathPayment(params: PathPaymentParams): Promise<string> {
    const accountData = await this.loadAccount(params.source);

    // For now, support native-to-native; cross-asset path payments need asset resolution
    const sendAsset = params.sendAsset === 'XLM' ? Asset.native() : Asset.native();
    const destAsset = params.destAsset === 'XLM' ? Asset.native() : Asset.native();

    const builder = new TransactionBuilder(
      this.toAccount(params.source, accountData.sequence),
      { fee: '100', networkPassphrase: this.networkPassphrase }
    )
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset,
          sendMax: parseFloat(params.maxSend).toFixed(7),
          destination: params.destination,
          destAsset,
          destAmount: parseFloat(params.destAmount).toFixed(7),
          path: [],
        })
      )
      .setTimeout(60);

    return builder.build().toXDR();
  }

  async buildBatchPayment(params: BatchPaymentParams): Promise<string> {
    const accountData = await this.loadAccount(params.source);

    const builder = new TransactionBuilder(
      this.toAccount(params.source, accountData.sequence),
      { fee: (100 * params.payments.length).toString(), networkPassphrase: this.networkPassphrase }
    );

    for (const p of params.payments) {
      builder.addOperation(
        Operation.payment({
          destination: p.destination,
          asset: Asset.native(),
          amount: parseFloat(p.amount).toFixed(7),
        })
      );
    }

    if (params.memo) {
      const { Memo } = await import('@stellar/stellar-sdk');
      builder.addMemo(Memo.text(params.memo));
    }

    builder.setTimeout(60);
    return builder.build().toXDR();
  }

  signTransaction(txXdr: string, privateKeyHex: string): string {
    const { TransactionBuilder: TxBuilder } = require('@stellar/stellar-sdk');
    const tx = TxBuilder.fromXDR(txXdr, this.networkPassphrase);
    const secret = Buffer.from(privateKeyHex, 'hex').toString();
    const kp = Keypair.fromSecret(secret);

    tx.sign(kp);

    // Wipe secret key
    try { kp.rawSecretKey().fill(0); } catch {}

    return tx.toXDR();
  }

  async submitTransaction(signedXdr: string): Promise<SubmitResult> {
    try {
      const res = await fetch(`${this.horizonUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tx=${encodeURIComponent(signedXdr)}`,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[StellarAdapter] Submit failed:', data);
        return {
          success: false,
          hash: '',
          error: 'Transaction submission failed',
          details: data,
        };
      }

      return {
        success: true,
        hash: data.hash,
        ledger: data.ledger,
      };
    } catch (error) {
      return {
        success: false,
        hash: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isValidAddress(address: string): boolean {
    try {
      Keypair.fromPublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  async getAssets(address: string): Promise<Array<{ code: string; issuer: string; balance: string }>> {
    const bal = await this.getBalance(address);
    const assets = [
      { code: 'XLM', issuer: 'native', balance: bal.native },
      ...(bal.assets || []),
    ];
    return assets;
  }

  // --- Private helpers ---

  private async loadAccount(address: string): Promise<{ sequence: string; [key: string]: unknown }> {
    const res = await fetch(`${this.horizonUrl}/accounts/${address}`);
    if (!res.ok) {
      throw new Error(`Failed to load account ${address}: ${res.status}`);
    }
    return res.json();
  }

  private toAccount(publicKey: string, sequence: string) {
    return {
      accountId: () => publicKey,
      sequenceNumber: () => sequence,
      incrementSequenceNumber: () => {},
    } as unknown as import('@stellar/stellar-sdk').Account;
  }
}

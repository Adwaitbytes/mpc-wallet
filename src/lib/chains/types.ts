/**
 * Chain Adapter Interface
 * Abstract blockchain operations for multi-chain support
 * Stellar first, Ethereum/Solana later
 */

export type ChainId = 'stellar' | 'ethereum' | 'solana';
export type NetworkType = 'testnet' | 'mainnet';

export interface ChainKeypair {
  publicKey: string;
  privateKeyHex: string;
  rawSecretKey: Uint8Array;
}

export interface ChainBalance {
  native: string;
  nativeFormatted: string;
  symbol: string;
  usdEstimate: string;
  funded: boolean;
  assets?: Array<{
    code: string;
    issuer: string;
    balance: string;
  }>;
}

export interface ChainTransaction {
  id: string;
  type: 'payment' | 'create_account' | 'path_payment' | 'batch' | 'other';
  amount: string;
  asset: string;
  from: string;
  to: string;
  createdAt: string;
  successful: boolean;
  memo?: string;
  hash?: string;
}

export interface PaymentParams {
  source: string;
  destination: string;
  amount: string;
  asset?: string;
  memo?: string;
}

export interface PathPaymentParams {
  source: string;
  destination: string;
  sendAsset: string;
  destAsset: string;
  destAmount: string;
  maxSend: string;
}

export interface BatchPaymentParams {
  source: string;
  payments: Array<{
    destination: string;
    amount: string;
    asset?: string;
  }>;
  memo?: string;
}

export interface SignedTransaction {
  xdr: string;
  hash: string;
}

export interface SubmitResult {
  success: boolean;
  hash: string;
  ledger?: number;
  error?: string;
  details?: unknown;
}

export interface ChainAdapter {
  readonly chainId: ChainId;
  readonly network: NetworkType;
  readonly symbol: string;
  readonly name: string;

  /** Generate a new random keypair */
  generateKeypair(): ChainKeypair;

  /** Restore keypair from hex-encoded private key */
  keypairFromSecret(privateKeyHex: string): ChainKeypair;

  /** Get account balance */
  getBalance(address: string): Promise<ChainBalance>;

  /** Fund account on testnet (faucet) */
  fundTestnet(address: string): Promise<{ success: boolean; balance?: string }>;

  /** Get recent transactions for an address */
  getTransactions(address: string, limit?: number): Promise<ChainTransaction[]>;

  /** Build a single payment transaction (unsigned XDR) */
  buildPayment(params: PaymentParams): Promise<string>;

  /** Build a path payment (cross-asset swap) */
  buildPathPayment(params: PathPaymentParams): Promise<string>;

  /** Build batch payment (multiple destinations) */
  buildBatchPayment(params: BatchPaymentParams): Promise<string>;

  /** Sign a transaction XDR with a private key */
  signTransaction(txXdr: string, privateKeyHex: string): string;

  /** Submit a signed transaction */
  submitTransaction(signedXdr: string): Promise<SubmitResult>;

  /** Validate an address format */
  isValidAddress(address: string): boolean;

  /** Get available assets for an account */
  getAssets(address: string): Promise<Array<{ code: string; issuer: string; balance: string }>>;
}

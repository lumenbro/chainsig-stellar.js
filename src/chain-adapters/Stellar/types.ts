export interface StellarTransactionRequest {
  from: string
  to: string
  amount: string
  memo?: string
  fee?: string
  timeout?: number
  publicKey: string
}

export interface StellarUnsignedTransaction {
  source: string
  fee: string
  sequence: string
  operations: Array<{
    type: string
    destination: string
    asset: {
      type: string
    }
    amount: string
  }>
  memo?: {
    type: string
    value: string
  }
  timeBounds?: {
    minTime: string
    maxTime: string
  }
  networkPassphrase: string
  toXDR: () => string
  hash: () => Uint8Array
  toEnvelope: () => any
}

export interface StellarAccountInfo {
  sequence: string
  balance: string
  exists: boolean
  balances: Array<{
    asset_type: string
    balance: string
    asset_code?: string
    asset_issuer?: string
  }>
  subentry_count: number
  thresholds: {
    low_threshold: number
    med_threshold: number
    high_threshold: number
  }
}

export interface StellarTransactionHistory {
  hash: string
  ledger: number
  created_at: string
  source_account: string
  type: string
  type_i: number
  successful: boolean
  result_meta_xdr: string
  fee_meta_xdr: string
  memo_type?: string
  memo?: string
  operations: Array<{
    id: string
    type: string
    type_i: number
    source_account: string
    asset_type?: string
    from?: string
    to?: string
    amount?: string
  }>
}

export interface StellarFeeStats {
  min: string
  mode: string
  p10: string
  p20: string
  p30: string
  p40: string
  p50: string
  p60: string
  p70: string
  p80: string
  p90: string
  p95: string
  p99: string
  max: string
}

export interface StellarLedgerInfo {
  sequence: number
  hash: string
  prev_hash: string
  successful_transaction_count: number
  failed_transaction_count: number
  operation_count: number
  closed_at: string
  total_coins: string
  fee_pool: string
  base_fee_in_stroops: number
  base_reserve_in_stroops: number
  max_tx_set_size: number
  protocol_version: number
}

export interface StellarAsset {
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'
  code?: string
  issuer?: string
}

export interface StellarPathPaymentRequest
  extends Omit<StellarTransactionRequest, 'amount'> {
  sendAsset: StellarAsset
  sendMax: string
  destination: string
  destAsset: StellarAsset
  destAmount: string
  path?: StellarAsset[]
}

export interface StellarOfferRequest extends Omit<StellarTransactionRequest, 'to' | 'amount'> {
  selling: StellarAsset
  buying: StellarAsset
  amount: string
  price: string | { n: number; d: number }
  offerId?: number
}

export interface StellarTrustlineRequest
  extends Omit<StellarTransactionRequest, 'to' | 'amount'> {
  asset: StellarAsset
  limit?: string
}

export type StellarOperationType =
  | 'createAccount'
  | 'payment'
  | 'pathPaymentStrictReceive'
  | 'pathPaymentStrictSend'
  | 'manageSellOffer'
  | 'manageBuyOffer'
  | 'createPassiveSellOffer'
  | 'setOptions'
  | 'changeTrust'
  | 'allowTrust'
  | 'accountMerge'
  | 'inflation'
  | 'manageData'
  | 'bumpSequence'
  | 'createClaimableBalance'
  | 'claimClaimableBalance'
  | 'beginSponsoringFutureReserves'
  | 'endSponsoringFutureReserves'
  | 'revokeSponsorship'
  | 'clawback'
  | 'clawbackClaimableBalance'
  | 'setTrustLineFlags'
  | 'liquidityPoolDeposit'
  | 'liquidityPoolWithdraw'

export interface StellarSignedTransaction {
  source: string
  fee: string
  sequence: string
  operations: Array<{
    type: string
    destination: string
    asset: {
      type: string
    }
    amount: string
  }>
  memo?: {
    type: string
    value: string
  }
  timeBounds?: {
    minTime: string
    maxTime: string
  }
  signatures: Array<{
    hint: string
    signature: string
  }>
  networkPassphrase: string
}

export interface StellarSubmitResponse {
  hash: string
  ledger: number
  envelope_xdr: string
  result_xdr: string
  result_meta_xdr: string
  successful: boolean
  paging_token: string
  source_account_sequence: string
  fee_account: string
  fee_charged: string
  max_fee: string
  operation_count: number
  created_at: string
}

export interface StellarNetworkConfig {
  networkId: 'mainnet' | 'testnet'
  horizonUrl: string
  networkPassphrase: string
}

export interface StellarDerivedKey {
  address: string
  publicKey: string
  path: string
}

export interface StellarBalance {
  balance: bigint
  decimals: number
  asset?: StellarAsset
}

export interface StellarTransactionParams {
  transaction: StellarUnsignedTransaction
  hashesToSign: number[][]
}

export interface StellarSigningResult {
  signedTransaction: string
  hash: string
}

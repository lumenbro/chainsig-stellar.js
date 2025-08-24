import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk'

import { ChainAdapter } from '@chain-adapters/ChainAdapter'
import type { ChainSignatureContract } from '@contracts/ChainSignatureContract'
import type { HashToSign, RSVSignature } from '@types'

import type {
  StellarAccountInfo,
  StellarTransactionRequest,
  StellarUnsignedTransaction,
} from './types'

/**
 * Stellar chain adapter implementation
 * 
 * Provides functionality to interact with the Stellar blockchain including
 * balance queries, address derivation, transaction preparation, signing, and broadcasting.
 * 
 * This adapter uses NEAR Chain Signatures with Ed25519 domain (domain_id: 1) for MPC signing.
 */
export class Stellar extends ChainAdapter<
  StellarTransactionRequest,
  StellarUnsignedTransaction
> {
  private readonly networkId: 'mainnet' | 'testnet'
  private readonly horizonUrl: string
  private readonly networkPassphrase: string
  private readonly contract: ChainSignatureContract

  /**
   * Creates a new Stellar chain adapter instance
   * 
   * @param params - Configuration parameters
   * @param params.networkId - Network identifier ('mainnet' or 'testnet')
   * @param params.horizonUrl - Optional custom Horizon server URL
   * @param params.contract - Instance of the chain signature contract for MPC operations
   */
  constructor({
    networkId = 'mainnet',
    horizonUrl,
    contract,
  }: {
    networkId?: 'mainnet' | 'testnet'
    horizonUrl?: string
    contract: ChainSignatureContract
  }) {
    super()

    this.networkId = networkId
    this.horizonUrl =
      horizonUrl ||
      (networkId === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org')
    this.networkPassphrase =
      networkId === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
    this.contract = contract
  }

  /**
   * Gets the native XLM balance for a given Stellar address
   * 
   * @param address - The Stellar G-address to check
   * @returns Promise resolving to balance in stroops and decimals (7)
   */
  async getBalance(address: string): Promise<{
    balance: bigint
    decimals: number
  }> {
    try {
      const response = await fetch(`${this.horizonUrl}/accounts/${address}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // Account doesn't exist
          return { balance: 0n, decimals: 7 }
        }
        throw new Error(`Failed to fetch account: ${response.status}`)
      }

      const accountData: StellarAccountInfo = await response.json()
      const xlmBalance = accountData.balances.find((b) => b.asset_type === 'native')

      if (!xlmBalance) {
        return { balance: 0n, decimals: 7 }
      }

      // Convert XLM to stroops (1 XLM = 10^7 stroops)
      const balanceInStroops = Math.round(parseFloat(xlmBalance.balance) * 10000000)
      return { balance: BigInt(balanceInStroops), decimals: 7 }
    } catch (error) {
      throw new Error(`Failed to get balance: ${(error as Error).message}`)
    }
  }

  /**
   * Derives Stellar address and public key using Chain Signatures
   * 
   * @param predecessor - The NEAR account requesting derivation
   * @param path - The derivation path (e.g., 'stellar-1')
   * @returns Promise resolving to derived address and public key
   */
  async deriveAddressAndPublicKey(
    predecessor: string,
    path: string
  ): Promise<{
    address: string
    publicKey: string
  }> {
    try {
      // Call Chain Signatures derived_public_key with Ed25519 domain
      const derivationResult = await this.contract.derived_public_key({
        path,
        predecessor: null, // Use calling account
        domain_id: 1, // Ed25519 domain for Stellar
      })

      // Parse the result - format: "ed25519:BASE58_KEY"
      let publicKeyBase58: string
      if (typeof derivationResult === 'string' && derivationResult.startsWith('ed25519:')) {
        publicKeyBase58 = derivationResult.replace('ed25519:', '')
      } else {
        throw new Error('Unexpected derivation result format')
      }

      // Decode base58 to get raw public key bytes
      const bs58 = require('bs58').default || require('bs58')
      const publicKeyBytes = bs58.decode(publicKeyBase58)

      if (publicKeyBytes.length !== 32) {
        throw new Error(`Invalid public key length: ${publicKeyBytes.length}, expected 32`)
      }

      // Convert to Stellar G-address
      const stellarAddress = StrKey.encodeEd25519PublicKey(publicKeyBytes)
      const publicKeyHex = Buffer.from(publicKeyBytes).toString('hex')

      return {
        address: stellarAddress,
        publicKey: publicKeyHex,
      }
    } catch (error) {
      throw new Error(`Failed to derive address: ${(error as Error).message}`)
    }
  }

  /**
   * Serializes an unsigned Stellar transaction to XDR string
   * 
   * @param transaction - The Stellar transaction object
   * @returns XDR string representation
   */
  serializeTransaction(transaction: StellarUnsignedTransaction): string {
    return transaction.toXDR()
  }

  /**
   * Deserializes an XDR string back to a Stellar transaction
   * 
   * @param serialized - XDR string
   * @returns Stellar transaction object
   */
  deserializeTransaction(serialized: string): StellarUnsignedTransaction {
    return new Transaction(serialized, this.networkPassphrase) as StellarUnsignedTransaction
  }

  /**
   * Prepares a Stellar transaction for signing
   * 
   * @param transactionRequest - Transaction parameters
   * @returns Promise resolving to prepared transaction and hashes to sign
   */
  async prepareTransactionForSigning(
    transactionRequest: StellarTransactionRequest
  ): Promise<{
    transaction: StellarUnsignedTransaction
    hashesToSign: HashToSign[]
  }> {
    const { from, to, amount, memo, fee = '100', timeout = 300 } = transactionRequest

    try {
      // Load source account details
      const accountResponse = await fetch(`${this.horizonUrl}/accounts/${from}`)
      if (!accountResponse.ok) {
        throw new Error(`Failed to load source account: ${accountResponse.status}`)
      }

      const accountData: StellarAccountInfo = await accountResponse.json()
      const sequenceNumber = accountData.sequence
      const sourceAccount = new Account(from, sequenceNumber)

      // Build transaction
      const transactionBuilder = new TransactionBuilder(sourceAccount, {
        fee,
        networkPassphrase: this.networkPassphrase,
      })

      // Add payment operation
      transactionBuilder.addOperation(
        Operation.payment({
          destination: to,
          asset: Asset.native(),
          amount: amount,
        })
      )

      // Add memo if provided
      if (memo) {
        transactionBuilder.addMemo(Transaction.Memo.text(memo))
      }

      // Set timeout and build
      const transaction = transactionBuilder.setTimeout(timeout).build()

      // Get transaction hash for signing
      const transactionHash = transaction.hash()
      const hashBytes = Array.from(transactionHash) // Convert to number array for chainsig.js compatibility

      return {
        transaction: transaction as StellarUnsignedTransaction,
        hashesToSign: [hashBytes],
      }
    } catch (error) {
      throw new Error(`Failed to prepare transaction: ${(error as Error).message}`)
    }
  }

  /**
   * Adds Chain Signatures MPC-generated signatures to an unsigned transaction
   * 
   * @param params - Parameters for adding signatures
   * @param params.transaction - The unsigned Stellar transaction
   * @param params.rsvSignatures - Array of signatures from Chain Signatures
   * @returns Serialized signed transaction XDR
   */
  finalizeTransactionSigning({
    transaction,
    rsvSignatures,
  }: {
    transaction: StellarUnsignedTransaction
    rsvSignatures: RSVSignature[]
  }): string {
    try {
      if (!rsvSignatures || rsvSignatures.length === 0) {
        throw new Error('No signatures provided')
      }

      // Get the signature from Chain Signatures
      const signature = rsvSignatures[0]
      let signatureBytes: Buffer

      // Handle different signature formats from Chain Signatures
      if (signature.signature && Array.isArray(signature.signature)) {
        // Format: {scheme: "Ed25519", signature: [byte array]}
        signatureBytes = Buffer.from(signature.signature)
      } else if (Array.isArray(signature)) {
        // Direct byte array format
        signatureBytes = Buffer.from(signature)
      } else {
        throw new Error('Unsupported signature format')
      }

      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid Ed25519 signature length: ${signatureBytes.length}, expected 64`)
      }

      // Get the source keypair for signature hint
      const sourceAddress = transaction.source
      const sourceKeypair = Keypair.fromPublicKey(sourceAddress)
      const signatureHint = sourceKeypair.signatureHint()

      // Create decorated signature
      const decoratedSignature = new xdr.DecoratedSignature({
        hint: signatureHint,
        signature: signatureBytes,
      })

      // Add signature to transaction envelope
      const envelope = transaction.toEnvelope()
      envelope.v1().signatures().push(decoratedSignature)

      // Create final signed transaction
      const signedTransaction = new Transaction(envelope, this.networkPassphrase)

      return signedTransaction.toXDR()
    } catch (error) {
      throw new Error(`Failed to finalize transaction signing: ${(error as Error).message}`)
    }
  }

  /**
   * Broadcasts a signed transaction to the Stellar network
   * 
   * @param txSerialized - The serialized signed transaction XDR
   * @returns Promise resolving to transaction hash
   */
  async broadcastTx(txSerialized: string): Promise<{
    hash: string
  }> {
    try {
      const response = await fetch(`${this.horizonUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `tx=${encodeURIComponent(txSerialized)}`,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Transaction failed: ${JSON.stringify(result)}`)
      }

      return {
        hash: result.hash,
      }
    } catch (error) {
      throw new Error(`Failed to broadcast transaction: ${(error as Error).message}`)
    }
  }

  /**
   * Creates a Chain Signatures sign request for a Stellar transaction
   * 
   * @param path - Derivation path used for signing
   * @param transactionHash - Transaction hash to sign
   * @returns Sign request parameters for Chain Signatures
   */
  createSignRequest(
    path: string,
    transactionHash: HashToSign
  ): {
    request: {
      path: string
      domain_id: number
      payload_v2: {
        Eddsa: string
      }
    }
  } {
    // Convert hash to hex string for Chain Signatures
    const hashHex = Buffer.from(transactionHash).toString('hex')

    return {
      request: {
        path,
        domain_id: 1, // Ed25519 domain for Stellar
        payload_v2: {
          Eddsa: hashHex,
        },
      },
    }
  }

  /**
   * Helper method to estimate transaction fee
   * 
   * @param transactionRequest - Transaction parameters
   * @returns Promise resolving to estimated fee in stroops
   */
  async estimateFee(transactionRequest: StellarTransactionRequest): Promise<string> {
    // Stellar has a fixed base fee, but can be dynamic
    // For now, return the standard fee
    return '100' // 100 stroops = 0.00001 XLM
  }

  /**
   * Helper method to get network info
   * 
   * @returns Network information
   */
  getNetworkInfo(): {
    networkId: 'mainnet' | 'testnet'
    horizonUrl: string
    networkPassphrase: string
    nativeAsset: string
    decimals: number
  } {
    return {
      networkId: this.networkId,
      horizonUrl: this.horizonUrl,
      networkPassphrase: this.networkPassphrase,
      nativeAsset: 'XLM',
      decimals: 7,
    }
  }
}

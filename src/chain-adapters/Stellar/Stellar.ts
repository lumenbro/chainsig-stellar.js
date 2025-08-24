import {
  Account,
  Asset,
  Keypair,
  Memo,
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
  private readonly contract: ChainSignatureContract | any

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
    contract: ChainSignatureContract | any // Allow flexible contract interface
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
      // Use the working Chain Signatures method with proper Ed25519 domain
      const pubkeyArgs = {
        path: path,
        predecessor: predecessor, // Use the NEAR account ID as predecessor
        domain_id: 1 // CRITICAL: Forces Ed25519 instead of secp256k1 default
      }

      // Call the NEAR contract directly using the account's viewFunction method
      // This bypasses the ChainSignatureContract wrapper that was causing issues
      const derivationResult = await this.contract.account.viewFunction({
        contractId: 'v1.signer',
        methodName: 'derived_public_key',
        args: pubkeyArgs
      })

      // Parse the result - format: "ed25519:BG7EQVw84cC7L7sSWm7NAwCM7SxdomMydfwor9DrVbCm"
      if (typeof derivationResult !== 'string' || !derivationResult.startsWith('ed25519:')) {
        throw new Error(`Unexpected derivation result format: ${derivationResult}`)
      }

      const publicKeyBase58 = derivationResult.replace('ed25519:', '')
      
      // Decode base58 to get raw public key bytes
      const bs58 = require('bs58').default || require('bs58')
      const derivedPubKeyBytes = bs58.decode(publicKeyBase58)

      if (derivedPubKeyBytes.length !== 32) {
        throw new Error(`Invalid public key length: ${derivedPubKeyBytes.length}, expected 32`)
      }

      // Convert to Stellar G-address using the correct method
      const stellarAddress = StrKey.encodeEd25519PublicKey(derivedPubKeyBytes)
      const publicKeyHex = Buffer.from(derivedPubKeyBytes).toString('hex')

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
        transactionBuilder.addMemo(Memo.text(memo))
      }

      // Set timeout and build
      const transaction = transactionBuilder.setTimeout(timeout).build()

      // Get transaction hash for signing
      const transactionHash = transaction.hash()
      const hashBytes = Array.from(transactionHash) // Convert to number array for chainsig.js compatibility

      return {
        transaction: transaction as any,
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
    transaction: any
    rsvSignatures: any[] // Updated to handle actual Chain Signatures response format
  }): string {
    try {
      if (!rsvSignatures || rsvSignatures.length === 0) {
        throw new Error('No signatures provided')
      }

      // Handle Chain Signatures response format
      // The signature comes from transaction result's SuccessValue
      const signatureResult = rsvSignatures[0]
      let signatureBytes: Buffer

      // Parse signature from Chain Signatures response
      if (signatureResult && typeof signatureResult === 'object') {
        if ('signature' in signatureResult && Array.isArray(signatureResult.signature)) {
          // Direct 64-byte signature array from SuccessValue parsing
          signatureBytes = Buffer.from(signatureResult.signature)
        } else if (Array.isArray(signatureResult)) {
          // Direct array format
          signatureBytes = Buffer.from(signatureResult)
        } else if (signatureResult.transaction_outcome?.outcome?.receipts_outcome?.[0]?.outcome?.executor_outcome?.outcome?.SuccessValue) {
          // Parse from full NEAR transaction result
          const successValue = signatureResult.transaction_outcome.outcome.receipts_outcome[0].outcome.executor_outcome.outcome.SuccessValue
          const parsed = JSON.parse(Buffer.from(successValue, 'base64').toString('utf8'))
          signatureBytes = Buffer.from(parsed.signature)
        } else {
          throw new Error('Unable to extract signature from Chain Signatures response')
        }
      } else {
        throw new Error('Invalid signature format from Chain Signatures')
      }

      if (signatureBytes.length !== 64) {
        throw new Error(`Invalid Ed25519 signature length: ${signatureBytes.length}, expected 64`)
      }

      // Get the source keypair for signature hint
      const sourceAddress = transaction.source
      const sourceKeypair = Keypair.fromPublicKey(sourceAddress)
      const signatureHint = sourceKeypair.signatureHint()

      // Create decorated signature - Apply 64-byte signature directly (no public key concatenation)
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

  /**
   * Alternative method for deriving address when using a direct NEAR account
   * This method works directly with a NEAR account object instead of the contract wrapper
   * 
   * @param nearAccount - Direct NEAR account object
   * @param nearAccountId - The NEAR account ID
   * @param path - Derivation path (e.g., 'stellar-1')
   * @returns Promise resolving to derived address and public key
   */
  async deriveAddressWithNearAccount(
    nearAccount: any,
    nearAccountId: string,
    path: string
  ): Promise<{
    address: string
    publicKey: string
  }> {
    try {
      const pubkeyArgs = {
        path: path,
        predecessor: nearAccountId,
        domain_id: 1 // Ed25519 domain for Stellar
      }

      const result = await nearAccount.viewFunction({
        contractId: 'v1.signer',
        methodName: 'derived_public_key',
        args: pubkeyArgs
      })

      // Parse result: "ed25519:BG7EQVw84cC7L7sSWm7NAwCM7SxdomMydfwor9DrVbCm"
      const parsed = result.replace('ed25519:', '')
      const bs58 = require('bs58').default || require('bs58')
      const derivedPubKeyBytes = bs58.decode(parsed)
      const stellarAddress = StrKey.encodeEd25519PublicKey(derivedPubKeyBytes)
      
      return {
        address: stellarAddress,
        publicKey: Buffer.from(derivedPubKeyBytes).toString('hex')
      }
    } catch (error) {
      throw new Error(`Failed to derive address with NEAR account: ${(error as Error).message}`)
    }
  }

  /**
   * Sign a transaction using a direct NEAR account object
   * This method handles the complete signing process including parsing the response
   * 
   * @param nearAccount - Direct NEAR account object
   * @param nearAccountId - The NEAR account ID
   * @param path - Derivation path used for signing
   * @param transactionHash - Transaction hash to sign
   * @returns Promise resolving to the parsed signature
   */
  async signWithNearAccount(
    nearAccount: any,
    nearAccountId: string,
    path: string,
    transactionHash: Uint8Array
  ): Promise<{
    signature: Buffer
  }> {
    try {
      const txHashHex = Buffer.from(transactionHash).toString('hex')
      
      const signRequest = {
        path: path,
        domain_id: 1, // Ed25519 domain
        payload_v2: {
          Eddsa: txHashHex
        }
      }

      const result = await nearAccount.functionCall({
        contractId: 'v1.signer',
        methodName: 'sign',
        args: { request: signRequest },
        gas: '250000000000000',
        attachedDeposit: '1'
      })

      // Parse signature from SuccessValue
      const signatureBase64 = result.transaction_outcome.outcome.receipts_outcome[0].outcome.executor_outcome.outcome.SuccessValue
      const parsed = JSON.parse(Buffer.from(signatureBase64, 'base64').toString('utf8'))
      const signature64Bytes = Buffer.from(parsed.signature)

      return {
        signature: signature64Bytes
      }
    } catch (error) {
      throw new Error(`Failed to sign with NEAR account: ${(error as Error).message}`)
    }
  }


}

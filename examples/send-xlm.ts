import { connect, type Account } from '@near-js/accounts'
import { type KeyPair } from '@near-js/crypto'
import { InMemoryKeyStore } from '@near-js/keystores'
import { JsonRpcProvider } from '@near-js/providers'

import { chainAdapters, contracts } from '../src/index'

const { MPC_CONTRACT_ID, NEAR_ACCOUNT_ID, NEAR_PRIVATE_KEY } = process.env

if (!MPC_CONTRACT_ID || !NEAR_ACCOUNT_ID || !NEAR_PRIVATE_KEY) {
  throw new Error(
    'Please set MPC_CONTRACT_ID, NEAR_ACCOUNT_ID, and NEAR_PRIVATE_KEY environment variables'
  )
}

const STELLAR_NETWORK = 'mainnet' // or 'testnet'
const FROM_ADDRESS = 'GCMHHIEAAIJCTOMAELYU3RCVZQYGIO34TAJRDA7MCRC7NYMG3U36F3XF' // Replace with your derived address
const TO_ADDRESS = 'GDGF3FVUFVQKSH5VL63ESKKFU5PMP2KIM5SY3RUKP3OFKWGQPR7MQ4U7' // Replace with destination
const AMOUNT = '1.0' // Amount in XLM
const DERIVATION_PATH = 'stellar-1'

async function sendXLM(): Promise<void> {
  console.log('🌟 Sending XLM using NEAR Chain Signatures')

  // Initialize NEAR connection
  const rpcProvider = new JsonRpcProvider({ url: 'https://rpc.fastnear.com' })
  const keyStore = new InMemoryKeyStore()
  const keyPair = KeyPair.fromString(NEAR_PRIVATE_KEY as string)
  await keyStore.setKey('mainnet', NEAR_ACCOUNT_ID as string, keyPair)

  const near = await connect({
    networkId: 'mainnet',
    keyStore,
    nodeUrl: 'https://rpc.fastnear.com',
  })

  const account: Account = await near.account(NEAR_ACCOUNT_ID as string)

  // Initialize Chain Signatures contract
  const contract = new contracts.near.ChainSignatureContract({
    account,
    contractId: MPC_CONTRACT_ID as string,
  })

  // Initialize Stellar chain adapter
  const stellar = new chainAdapters.stellar.Stellar({
    networkId: STELLAR_NETWORK as 'mainnet' | 'testnet',
    contract,
  })

  console.log('🔍 Network info:', stellar.getNetworkInfo())

  try {
    // Step 1: Derive address and verify
    console.log('\n📍 Step 1: Deriving Stellar address...')
    const { address: derivedAddress, publicKey } = await stellar.deriveAddressAndPublicKey(
      NEAR_ACCOUNT_ID as string,
      DERIVATION_PATH
    )

    console.log('Derived address:', derivedAddress)
    console.log('Public key:', publicKey)
    console.log('Expected address:', FROM_ADDRESS)
    console.log('Addresses match:', derivedAddress === FROM_ADDRESS)

    if (derivedAddress !== FROM_ADDRESS) {
      console.warn('⚠️  Address mismatch! Update FROM_ADDRESS to:', derivedAddress)
      return
    }

    // Step 2: Check balance
    console.log('\n💰 Step 2: Checking balance...')
    const { balance, decimals } = await stellar.getBalance(FROM_ADDRESS)
    const balanceXLM = Number(balance) / Math.pow(10, decimals)
    console.log(`Balance: ${balanceXLM} XLM (${balance} stroops)`)

    if (balance === 0n) {
      console.error('❌ Account has no balance. Fund the account first.')
      return
    }

    // Step 3: Prepare transaction
    console.log('\n🔨 Step 3: Preparing transaction...')
    const transactionRequest = {
      from: FROM_ADDRESS,
      to: TO_ADDRESS,
      amount: AMOUNT,
      memo: 'chainsig.js Stellar test',
      publicKey, // Required for some operations
    }

    const { transaction, hashesToSign } = await stellar.prepareTransactionForSigning(
      transactionRequest
    )

    console.log('Transaction prepared successfully')
    console.log('Hashes to sign:', hashesToSign.length)

    // Step 4: Sign with Chain Signatures
    console.log('\n✍️  Step 4: Signing with Chain Signatures...')
    const signRequest = stellar.createSignRequest(DERIVATION_PATH, hashesToSign[0])

    console.log('Sign request:', JSON.stringify(signRequest, null, 2))

    // This calls the MPC contract to get the signature
    const signature = await contract.sign(signRequest)

    console.log('Signature received:', {
      scheme: signature.scheme,
      signatureLength: signature.signature.length,
    })

    // Step 5: Finalize transaction
    console.log('\n📤 Step 5: Finalizing transaction...')
    const signedTx = stellar.finalizeTransactionSigning({
      transaction,
      rsvSignatures: [signature],
    })

    console.log('Transaction signed successfully')

    // Step 6: Broadcast transaction
    console.log('\n🚀 Step 6: Broadcasting transaction...')
    const result = await stellar.broadcastTx(signedTx)

    console.log('✅ Transaction broadcast successfully!')
    console.log('Transaction hash:', result.hash)
    console.log(`🔗 Explorer: https://stellar.expert/explorer/public/tx/${result.hash}`)
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    
    // Provide helpful debugging info
    if (error instanceof Error) {
      if (error.message.includes('tx_bad_auth')) {
        console.log('\n💡 Debug tip: tx_bad_auth usually means:')
        console.log('  - Wrong source address (check derivation)')
        console.log('  - Incorrect signature application')
        console.log('  - Mismatched public key')
      } else if (error.message.includes('op_underfunded')) {
        console.log('\n💡 Debug tip: op_underfunded means insufficient balance')
      } else if (error.message.includes('404')) {
        console.log('\n💡 Debug tip: Account not found - needs to be funded first')
      }
    }
  }
}

// Helper function to just test address derivation
async function testAddressDerivation(): Promise<void> {
  console.log('🧪 Testing address derivation only...')

  const rpcProvider = new JsonRpcProvider({ url: 'https://rpc.fastnear.com' })
  const keyStore = new InMemoryKeyStore()
  const keyPair = KeyPair.fromString(NEAR_PRIVATE_KEY as string)
  await keyStore.setKey('mainnet', NEAR_ACCOUNT_ID as string, keyPair)

  const near = await connect({
    networkId: 'mainnet',
    keyStore,
    nodeUrl: 'https://rpc.fastnear.com',
  })

  const account: Account = await near.account(NEAR_ACCOUNT_ID as string)

  const contract = new contracts.near.ChainSignatureContract({
    account,
    contractId: MPC_CONTRACT_ID as string,
  })

  const stellar = new chainAdapters.stellar.Stellar({
    networkId: 'mainnet',
    contract,
  })

  try {
    const { address, publicKey } = await stellar.deriveAddressAndPublicKey(
      NEAR_ACCOUNT_ID as string,
      DERIVATION_PATH
    )

    console.log('✅ Address derivation successful!')
    console.log('Address:', address)
    console.log('Public key:', publicKey)

    // Check balance
    const { balance, decimals } = await stellar.getBalance(address)
    const balanceXLM = Number(balance) / Math.pow(10, decimals)
    console.log(`Balance: ${balanceXLM} XLM`)
  } catch (error) {
    console.error('❌ Derivation failed:', error instanceof Error ? error.message : error)
  }
}

// Export for testing
export { sendXLM, testAddressDerivation }

// Run if called directly
if (require.main === module) {
  const mode = process.argv[2]
  
  if (mode === 'derive') {
    testAddressDerivation().catch(console.error)
  } else {
    sendXLM().catch(console.error)
  }
}

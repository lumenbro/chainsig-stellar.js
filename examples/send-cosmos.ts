import { InMemoryKeyStore } from '@near-js/keystores'
import { KeyPair } from '@near-js/crypto'
import { connect } from 'near-api-js'
import { getTransactionLastResult } from '@near-js/utils'
import { Action } from '@near-js/transactions'
import { contracts, chainAdapters } from 'chainsig.js'
import { createAction } from '@near-wallet-selector/wallet-utils'
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx'
import dotenv from 'dotenv'
import { KeyPairString } from '@near-js/crypto'

async function main() {
  // Load environment variables
  dotenv.config({ path: '.env' }) // Path relative to the working directory

  // Create an account object
  const accountId = process.env.ACCOUNT_ID!
  // Create a signer from a private key string
  const privateKey = process.env.PRIVATE_KEY as KeyPairString
  const keyPair = KeyPair.fromString(privateKey) // ed25519:5Fg2...

  // Create a keystore and add the key
  const keyStore = new InMemoryKeyStore()
  await (keyStore as any).setKey('testnet', accountId, keyPair)

  // Create a connection to testnet
  const near = await connect({
    networkId: 'testnet',
    keyStore: keyStore as any,
    nodeUrl: 'https://test.rpc.fastnear.com',
  })

  const account = await near.account(accountId)

  const contract = new contracts.ChainSignatureContract({
    networkId: 'testnet',
    contractId: 'v1.signer-prod.testnet',
  })

  const derivationPath = 'any_string'

  // Create Cosmos chain instance for Babylon testnet
  const cosmosChain = new chainAdapters.cosmos.Cosmos({
    chainId: 'bbn-test-5',
    contract,
    endpoints: {
      rpcUrl: 'https://babylon-testnet-rpc.nodes.guru',
      restUrl: 'https://babylon-testnet-api.nodes.guru',
    },
  })

  // Derive address and public key
  const { address, publicKey } = await cosmosChain.deriveAddressAndPublicKey(
    accountId,
    derivationPath
  )

  console.log('address', address)

  // Check balance
  const { balance, decimals } = await cosmosChain.getBalance(address)

  console.log('balance', balance)

  // Create a simple transfer message
  const transferAmount = 100n
  // Replace with actual recipient address - this is just an example
  const recipientAddress = 'bbn1w6x47wpka9mw3u888jmfhgs2tx0fax93hhxy9m' 

  const sendMsg: MsgSend = {
    fromAddress: address,
    toAddress: recipientAddress,
    amount: [
      {
        denom: 'ubbn', // Babylon testnet token denomination
        amount: transferAmount.toString(),
      },
    ],
  }

  // Create and sign transaction
  const { transaction, hashesToSign } =
    await cosmosChain.prepareTransactionForSigning({
      address,
      publicKey,
      messages: [
        {
          typeUrl: '/cosmos.bank.v1beta1.MsgSend',
          value: sendMsg,
        },
      ],
      memo: 'Sent via chainsig.js',
      gas: 200000,
    })

  // Sign with MPC
  const signature = await contract.sign({
    payloads: hashesToSign,
    path: derivationPath,
    keyType: 'Ecdsa',
    signerAccount: {
      accountId: account.accountId,
      signAndSendTransactions: async ({
        transactions: walletSelectorTransactions,
      }) => {
        const transactions = walletSelectorTransactions.map((tx) => {
          return {
            receiverId: tx.receiverId,
            actions: tx.actions.map((a) => createAction(a)),
          } satisfies { receiverId: string; actions: Action[] }
        })

        const txs: any[] = []
        for (const transaction of transactions) {
          const tx = await account.signAndSendTransaction(transaction)
          txs.push(tx)
        }

        return txs.map((tx) => {
          return (getTransactionLastResult as any)(tx)
        })
      },
    },
  })

  // Add signature
  const signedTx = cosmosChain.finalizeTransactionSigning({
    transaction,
    rsvSignatures: signature,
  })

  // Broadcast transaction
  const txHash = await cosmosChain.broadcastTx(signedTx)
  // Print link to transaction on Babylon Explorer
  console.log(`https://testnet.babylon.explorers.guru/transaction/${txHash}`)
}

main().catch(console.error) 
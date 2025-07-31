import { Account } from '@near-js/accounts'
import { KeyPair } from '@near-js/crypto'
import { InMemoryKeyStore } from '@near-js/keystores'
import { JsonRpcProvider } from '@near-js/providers'
import { InMemorySigner } from '@near-js/signers'

import { DONT_CARE_ACCOUNT_ID } from '@contracts/constants'

type SetConnectionArgs =
  | {
      networkId: string
      accountId: string
      keypair: KeyPair
    }
  | {
      networkId: string
      accountId?: never
      keypair?: never
    }

export const getNearAccount = async ({
  networkId,
  accountId = DONT_CARE_ACCOUNT_ID,
  keypair = KeyPair.fromRandom('ed25519'),
}: SetConnectionArgs): Promise<Account> => {
  const keyStore = new InMemoryKeyStore()
  await keyStore.setKey(networkId, accountId, keypair)

  // Create provider using new v2.0.0+ API
  const provider = new JsonRpcProvider({
    url: {
      testnet: 'https://rpc.testnet.near.org',
      mainnet: 'https://rpc.mainnet.near.org',
    }[networkId],
  })

  // Create signer using new v2.0.0+ API
  const signer = await InMemorySigner.fromKeyStore({
    keyStore,
    accountId,
    networkId,
  })

  // Use new Account constructor (v2.0.0+)
  return new Account({
    provider,
    signer,
    accountId,
    networkId,
  })
}

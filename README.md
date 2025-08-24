# ChainSig.js with Stellar Support

A TypeScript library for creating transactions for different chains and signing them with NEAR's MPC (Multi-party Computation) service.

**🌟 This fork adds Stellar (XLM) support to the original chainsig.js library.**

## Overview

This library provides a unified interface for interacting with different blockchain networks through a common set of methods. It uses MPC for secure key management and transaction signing.

## Features

- **Multi-Chain Support**: Built-in support for EVM chains, Bitcoin, Cosmos, Solana, Aptos, SUI, XRP, and **Stellar** networks
- **Unified Interface**: Common API across all supported chains
- **MPC Integration**: Secure key management and transaction signing
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Modular Design**: Easy to extend with new chain implementations
- **Secure**: No private keys stored or transmitted

## Supported Chains

The library provides chain adapters for the following blockchain networks:

- **EVM Chains**: Ethereum, BSC, Polygon, Arbitrum, Optimism, and other EVM-compatible networks
- **Bitcoin**: Bitcoin mainnet and testnet with P2WPKH transaction support
- **Cosmos**: Cosmos Hub, Osmosis, and other Cosmos SDK-based chains
- **Solana**: High-performance blockchain with native token transfers
- **Aptos**: Move-based blockchain with Ed25519 signature support
- **SUI**: Move-based blockchain with Ed25519 signature support
- **XRP Ledger**: XRP mainnet, testnet, and devnet with native XRP transfers
- **Stellar**: Stellar mainnet and testnet with native XLM transfers and Ed25519 MPC signing

Each chain adapter provides a unified interface for:
- Address and public key derivation
- Balance checking
- Transaction preparation and signing
- Transaction broadcasting

## Installation

```bash
npm install chainsig.js
# or
yarn add chainsig.js
# or
pnpm add chainsig.js
```

## Docs and Examples

Examples for sending transfers and function calls with chainsig.js via a NEAR wallet can be found in the [near-multichain](https://github.com/near-examples/near-multichain) repo, along with in depth documentation in the [NEAR docs](https://docs.near.org/chain-abstraction/chain-signatures/implementation).

Examples for sending transfers with chainsig.js via near-api-js/near-js can be found in the [examples folder](./examples/).

Full typedocs for the library can be found [here](https://neardefi.github.io/chainsig.js/).

## Using the Library

Because of underlying dependencies, this library is a Commonjs project. You may need to configure your projects to use this library. 

Here are simple examples in [TypeScript](https://github.com/GregProuty/chainsig-simple-example) and [JavaScript](https://github.com/GregProuty/chainsig-es6-example). 

## Quick Example

```ts twoslash
import { chainAdapters, contracts } from "chainsig.js";
import { KeyPair, type KeyPairString } from "@near-js/crypto";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

// Initialize NEAR connection with credentials from environment
const accountId = process.env.NEAR_ACCOUNT_ID;
const privateKey = process.env.NEAR_PRIVATE_KEY as KeyPairString;

if (!accountId || !privateKey) {
  throw new Error(
    "NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY must be set in environment",
  );
}

const keypair = KeyPair.fromString(privateKey);

const contract = new contracts.near.ChainSignatureContract({
  networkId: "testnet",
  contractId: "v1.signer-prod.testnet",
  accountId,
  keypair,
});

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const evmChain = new chainAdapters.evm.EVM({
  publicClient,
  contract,
});

// Derive address and public key
const { address, publicKey } = await evmChain.deriveAddressAndPublicKey(
  accountId,
  "any_string",
);

// Check balance
const { balance, decimals } = await evmChain.getBalance(address);

// Create and sign transaction
const { transaction, hashesToSign } =
  await evmChain.prepareTransactionForSigning({
    from: "0x...",
    to: "0x...",
    value: 1n,
  });

// Sign with MPC
const signature = await contract.sign({
  payload: hashesToSign[0].payload,
  path: "any_string",
  key_version: 0,
});

// Add signature
const signedTx = evmChain.finalizeTransactionSigning({
  transaction,
  rsvSignatures: [signature],
});

// Broadcast transaction
const txHash = await evmChain.broadcastTx(signedTx);
```

## Stellar Example

```ts
import { chainAdapters, contracts } from "@lumenbro/chainsig-stellar";

// Initialize Stellar chain adapter
const stellarChain = new chainAdapters.stellar.Stellar({
  networkId: "mainnet", // or "testnet"
  contract,
});

// Derive Stellar address
const { address, publicKey } = await stellarChain.deriveAddressAndPublicKey(
  accountId,
  "stellar-1"
);

// Check XLM balance
const { balance, decimals } = await stellarChain.getBalance(address);

// Create and sign Stellar transaction
const { transaction, hashesToSign } = await stellarChain.prepareTransactionForSigning({
  from: address,
  to: "GDGF3FVUFVQKSH5VL63ESKKFU5PMP2KIM5SY3RUKP3OFKWGQPR7MQ4U7",
  amount: "10.5", // XLM amount
  memo: "Payment via ChainSig",
  publicKey,
});

// Sign with MPC using Ed25519 domain
const signature = await contract.sign(
  stellarChain.createSignRequest("stellar-1", hashesToSign[0])
);

// Finalize and broadcast
const signedTx = stellarChain.finalizeTransactionSigning({
  transaction,
  rsvSignatures: [signature],
});

const result = await stellarChain.broadcastTx(signedTx);
console.log("Stellar transaction hash:", result.hash);
```

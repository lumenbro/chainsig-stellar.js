const { chainAdapters, contracts } = require('./dist/node/index.node.cjs');
const { connect } = require('@near-js/accounts');
const { KeyPair } = require('@near-js/crypto');
const { InMemoryKeyStore } = require('@near-js/keystores');
const { JsonRpcProvider } = require('@near-js/providers');

// Test configuration
const TEST_CONFIG = {
  // Use testnet for safety
  networkId: 'testnet',
  contractId: 'v1.signer-prod.testnet',
  
  // Test NEAR account (you can create one at https://wallet.testnet.near.org/)
  nearAccountId: process.env.TEST_NEAR_ACCOUNT_ID || 'test.near',
  nearPrivateKey: process.env.TEST_NEAR_PRIVATE_KEY || 'ed25519:test',
  
  // Test Stellar addresses
  stellarNetwork: 'testnet',
  derivationPath: 'stellar-test-1',
  
  // Test amounts
  testAmount: '1.0', // XLM
};

async function testStellarIntegration() {
  console.log('🌟 Testing Stellar Integration in Clean Fork');
  console.log('============================================');
  
  try {
    // Step 1: Initialize NEAR connection
    console.log('\n📍 Step 1: Initializing NEAR connection...');
    const rpcProvider = new JsonRpcProvider({ url: 'https://rpc.testnet.near.org' });
    const keyStore = new InMemoryKeyStore();
    
    if (TEST_CONFIG.nearPrivateKey !== 'ed25519:test') {
      const keyPair = KeyPair.fromString(TEST_CONFIG.nearPrivateKey);
      await keyStore.setKey('testnet', TEST_CONFIG.nearAccountId, keyPair);
    }
    
    const near = await connect({
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
    });
    
    const account = await near.account(TEST_CONFIG.nearAccountId);
    console.log('✅ NEAR connection established');
    
    // Step 2: Initialize Chain Signatures contract
    console.log('\n🔗 Step 2: Initializing Chain Signatures contract...');
    const contract = new contracts.near.ChainSignatureContract({
      account,
      contractId: TEST_CONFIG.contractId,
    });
    console.log('✅ Chain Signatures contract initialized');
    
    // Step 3: Initialize Stellar chain adapter
    console.log('\n⭐ Step 3: Initializing Stellar chain adapter...');
    const stellar = new chainAdapters.stellar.Stellar({
      networkId: TEST_CONFIG.stellarNetwork,
      contract,
    });
    console.log('✅ Stellar adapter initialized');
    console.log('Network info:', stellar.getNetworkInfo());
    
    // Step 4: Test address derivation
    console.log('\n🔑 Step 4: Testing address derivation...');
    const { address, publicKey } = await stellar.deriveAddressAndPublicKey(
      TEST_CONFIG.nearAccountId,
      TEST_CONFIG.derivationPath
    );
    
    console.log('✅ Address derivation successful!');
    console.log('Derived Stellar address:', address);
    console.log('Public key (hex):', publicKey);
    console.log('Derivation path:', TEST_CONFIG.derivationPath);
    
    // Step 5: Test balance checking
    console.log('\n💰 Step 5: Testing balance checking...');
    const { balance, decimals } = await stellar.getBalance(address);
    const balanceXLM = Number(balance) / Math.pow(10, decimals);
    
    console.log('✅ Balance check successful!');
    console.log(`Balance: ${balanceXLM} XLM (${balance} stroops)`);
    console.log('Decimals:', decimals);
    
    // Step 6: Test transaction preparation (without broadcasting)
    console.log('\n🔨 Step 6: Testing transaction preparation...');
    const transactionRequest = {
      from: address,
      to: 'GALPCCZN4YXA3YMJHKL6CVIECKPLJJCTVMSNYWBTKJW4K5HQLYLDMZ3J', // Testnet address
      amount: TEST_CONFIG.testAmount,
      memo: 'chainsig.js integration test',
      publicKey,
    };
    
    const { transaction, hashesToSign } = await stellar.prepareTransactionForSigning(
      transactionRequest
    );
    
    console.log('✅ Transaction preparation successful!');
    console.log('Transaction source:', transaction.source);
    console.log('Transaction fee:', transaction.fee);
    console.log('Hashes to sign:', hashesToSign.length);
    
    // Step 7: Test sign request creation
    console.log('\n✍️ Step 7: Testing sign request creation...');
    const signRequest = stellar.createSignRequest(TEST_CONFIG.derivationPath, hashesToSign[0]);
    
    console.log('✅ Sign request created!');
    console.log('Sign request:', JSON.stringify(signRequest, null, 2));
    
    // Step 8: Test serialization/deserialization
    console.log('\n📦 Step 8: Testing transaction serialization...');
    const serialized = stellar.serializeTransaction(transaction);
    const deserialized = stellar.deserializeTransaction(serialized);
    
    console.log('✅ Serialization/deserialization successful!');
    console.log('Serialized length:', serialized.length);
    console.log('Deserialized source:', deserialized.source);
    
    // Step 9: Test fee estimation
    console.log('\n💸 Step 9: Testing fee estimation...');
    const estimatedFee = await stellar.estimateFee(transactionRequest);
    console.log('✅ Fee estimation successful!');
    console.log('Estimated fee:', estimatedFee, 'stroops');
    
    console.log('\n🎉 ALL TESTS PASSED! Stellar integration is working correctly.');
    console.log('\n📋 Summary:');
    console.log('- ✅ NEAR connection');
    console.log('- ✅ Chain Signatures contract');
    console.log('- ✅ Stellar adapter initialization');
    console.log('- ✅ Address derivation (Ed25519)');
    console.log('- ✅ Balance checking');
    console.log('- ✅ Transaction preparation');
    console.log('- ✅ Sign request creation');
    console.log('- ✅ Serialization/deserialization');
    console.log('- ✅ Fee estimation');
    
    console.log('\n🚀 Ready for NPM publication!');
    console.log('Package: @lumenbro/chainsig-stellar');
    console.log('Version: 1.2.0');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide helpful debugging info
    if (error.message.includes('derived_public_key')) {
      console.log('\n💡 Debug tip: Check NEAR account and contract ID');
    } else if (error.message.includes('fetch')) {
      console.log('\n💡 Debug tip: Check network connectivity');
    } else if (error.message.includes('import')) {
      console.log('\n💡 Debug tip: Run "npm run build" first');
    }
    
    process.exit(1);
  }
}

// Run the test
testStellarIntegration().catch(console.error);




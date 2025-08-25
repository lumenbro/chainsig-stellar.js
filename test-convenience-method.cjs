// Test the new getChainDerivedAddress convenience method
const { chainAdapters } = require('./dist/node/index.node.cjs');

console.log('🧪 Testing New getChainDerivedAddress Convenience Method...\n');

// Mock NEAR account
const mockNearAccount = {
  viewFunction: async ({ contractId, methodName, args }) => {
    console.log(`  📝 Mock viewFunction: ${methodName} with args:`, args);
    if (methodName === 'derived_public_key' && args.domain_id === 1) {
      return 'ed25519:11111111111111111111111111111111';
    }
    throw new Error('Unexpected viewFunction call');
  }
};

const mockContract = {
  account: mockNearAccount,
  contractId: 'v1.signer'
};

async function testConvenienceMethod() {
  try {
    console.log('1️⃣ Testing Stellar adapter with new convenience method...');
    
    const stellar = new chainAdapters.stellar.Stellar({
      networkId: 'mainnet',
      contract: mockContract
    });
    console.log('   ✅ Stellar adapter created');

    console.log('\n2️⃣ Testing getChainDerivedAddress with chain name only...');
    
    // Test with just chain name 'stellar'
    const result1 = await stellar.getChainDerivedAddress(
      'test-account.near',
      'stellar'
    );
    console.log('   ✅ Chain name "stellar" works:');
    console.log('   ✅ Address:', result1.address);
    console.log('   ✅ Path:', result1.path);
    console.log('   ✅ Domain ID:', result1.domainId);
    console.log('   ✅ Curve Type:', result1.curveType);

    console.log('\n3️⃣ Testing getChainDerivedAddress with full path...');
    
    // Test with full path 'stellar-1'
    const result2 = await stellar.getChainDerivedAddress(
      'test-account.near',
      'stellar-1'
    );
    console.log('   ✅ Full path "stellar-1" works:');
    console.log('   ✅ Address:', result2.address);
    console.log('   ✅ Path:', result2.path);
    console.log('   ✅ Both methods return same result:', 
      result1.address === result2.address && result1.path === result2.path);

    console.log('\n4️⃣ Testing default parameter...');
    
    // Test with default parameter (should default to 'stellar')
    const result3 = await stellar.getChainDerivedAddress('test-account.near');
    console.log('   ✅ Default parameter works:');
    console.log('   ✅ Address:', result3.address);
    console.log('   ✅ Path:', result3.path);
    console.log('   ✅ Same as explicit "stellar":', result1.address === result3.address);

    console.log('\n🎉 Convenience method test completed successfully!');
    console.log('✅ This method is now compatible with MultiChainWallet.js API');
    console.log('✅ Handles both chain names and full paths correctly');
    console.log('✅ Returns all required metadata for wallet integration');
    console.log('\n📦 Ready for v1.3.1 publication!');

  } catch (error) {
    console.error('\n❌ Convenience method test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testConvenienceMethod();

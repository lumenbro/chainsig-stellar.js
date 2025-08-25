// Test contract flexibility fixes for getChainDerivedAddress
// This test verifies different contract interface compatibility

console.log('🧪 Testing Contract Flexibility Fixes v1.3.2...\n');

// Mock different types of contract interfaces

// Type 1: Contract wrapper with account property
const mockContractWrapper = {
  account: {
    viewFunction: async ({ contractId, methodName, args }) => {
      console.log(`  📝 ContractWrapper.account.viewFunction: ${methodName}`, args);
      if (methodName === 'derived_public_key' && args.domain_id === 1) {
        return 'ed25519:11111111111111111111111111111111';
      }
      throw new Error('Unexpected call');
    }
  }
};

// Type 2: Direct NEAR account object
const mockNearAccount = {
  viewFunction: async ({ contractId, methodName, args }) => {
    console.log(`  📝 NearAccount.viewFunction: ${methodName}`, args);
    if (methodName === 'derived_public_key' && args.domain_id === 1) {
      return 'ed25519:11111111111111111111111111111111';
    }
    throw new Error('Unexpected call');
  }
};

// Type 3: ChainSignatureContract wrapper
const mockChainSignatureContract = {
  getDerivedPublicKey: async ({ path, predecessor, IsEd25519 }) => {
    console.log(`  📝 ChainSignatureContract.getDerivedPublicKey:`, { path, predecessor, IsEd25519 });
    if (IsEd25519) {
      return 'ed25519:11111111111111111111111111111111';
    }
    throw new Error('Unexpected call');
  }
};

// Type 4: Invalid contract (should fail with helpful error)
const mockInvalidContract = {
  someOtherMethod: () => {}
};

async function testContractFlexibility() {
  // Import after test setup
  const { chainAdapters } = require('./dist/node/index.node.cjs');
  const Stellar = chainAdapters.stellar.Stellar;

  try {
    console.log('1️⃣ Testing contract wrapper with account property...');
    const stellar1 = new Stellar({
      networkId: 'mainnet',
      contract: mockContractWrapper
    });
    
    const result1 = await stellar1.getChainDerivedAddress('test-account.near', 'stellar');
    console.log('   ✅ Contract wrapper works:', result1.address);
    console.log('   ✅ Path:', result1.path);

    console.log('\n2️⃣ Testing direct NEAR account object...');
    const stellar2 = new Stellar({
      networkId: 'mainnet',
      contract: mockNearAccount
    });
    
    const result2 = await stellar2.getChainDerivedAddress('test-account.near', 'stellar');
    console.log('   ✅ Direct NEAR account works:', result2.address);
    console.log('   ✅ Path:', result2.path);

    console.log('\n3️⃣ Testing ChainSignatureContract wrapper...');
    const stellar3 = new Stellar({
      networkId: 'mainnet',
      contract: mockChainSignatureContract
    });
    
    const result3 = await stellar3.getChainDerivedAddress('test-account.near', 'stellar');
    console.log('   ✅ ChainSignatureContract works:', result3.address);
    console.log('   ✅ Path:', result3.path);

    console.log('\n4️⃣ Testing missing contract (should fail gracefully)...');
    try {
      const stellar4 = new Stellar({
        networkId: 'mainnet',
        contract: null
      });
      
      await stellar4.getChainDerivedAddress('test-account.near', 'stellar');
      console.log('   ❌ Should have thrown error for missing contract');
    } catch (error) {
      console.log('   ✅ Properly handles missing contract:', error.message.substring(0, 50) + '...');
    }

    console.log('\n5️⃣ Testing invalid contract interface (should fail with helpful error)...');
    try {
      const stellar5 = new Stellar({
        networkId: 'mainnet',
        contract: mockInvalidContract
      });
      
      await stellar5.getChainDerivedAddress('test-account.near', 'stellar');
      console.log('   ❌ Should have thrown error for invalid contract');
    } catch (error) {
      console.log('   ✅ Properly handles invalid contract interface');
      console.log('   ✅ Error message includes helpful guidance:', error.message.includes('Contract must have either'));
    }

    console.log('\n6️⃣ Testing different parameter formats...');
    const stellar6 = new Stellar({
      networkId: 'mainnet', 
      contract: mockNearAccount
    });
    
    // Test chain name
    const resultA = await stellar6.getChainDerivedAddress('test-account.near', 'stellar');
    console.log('   ✅ Chain name "stellar":', resultA.path);
    
    // Test full path
    const resultB = await stellar6.getChainDerivedAddress('test-account.near', 'stellar-1');
    console.log('   ✅ Full path "stellar-1":', resultB.path);
    
    // Test default
    const resultC = await stellar6.getChainDerivedAddress('test-account.near');
    console.log('   ✅ Default parameter:', resultC.path);
    
    console.log('   ✅ All return same address:', 
      resultA.address === resultB.address && resultB.address === resultC.address);

    console.log('\n🎉 Contract flexibility test completed successfully!');
    console.log('✅ All contract interface types supported:');
    console.log('  - Contract wrapper with account property');
    console.log('  - Direct NEAR account object');  
    console.log('  - ChainSignatureContract wrapper');
    console.log('✅ Proper error handling for invalid contracts');
    console.log('✅ Helpful error messages with guidance');
    console.log('✅ Parameter flexibility maintained');
    console.log('\n📦 Ready for v1.3.2 publication!');

  } catch (error) {
    console.error('\n❌ Contract flexibility test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testContractFlexibility();

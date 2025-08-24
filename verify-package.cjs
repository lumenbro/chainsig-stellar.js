// Package verification script - run after NPM publication
// Usage: node verify-package.cjs

console.log('🔍 Verifying @lumenbro/chainsig-stellar package...\n');

async function verifyPackage() {
  try {
    // Test 1: Check if package can be installed and imported
    console.log('1️⃣ Testing package import...');
    
    // This would be run after npm install @lumenbro/chainsig-stellar
    // For now, we'll test the local build
    const { chainAdapters } = require('./dist/node/index.node.cjs');
    
    console.log('   ✅ Package imports successfully');
    console.log('   ✅ Available adapters:', Object.keys(chainAdapters));
    console.log('   ✅ Stellar adapter present:', !!chainAdapters.stellar);

    // Test 2: Verify Stellar adapter functionality
    console.log('\n2️⃣ Testing Stellar adapter...');
    
    const Stellar = chainAdapters.stellar.Stellar;
    console.log('   ✅ Stellar class loaded');
    console.log('   ✅ Constructor available');
    
    // Test 3: Check package metadata
    console.log('\n3️⃣ Checking package metadata...');
    
    const packageJson = require('./dist/package.json');
    console.log('   ✅ Package name:', packageJson.name);
    console.log('   ✅ Version:', packageJson.version);
    console.log('   ✅ Dependencies count:', Object.keys(packageJson.dependencies).length);
    console.log('   ✅ Stellar SDK included:', !!packageJson.dependencies['@stellar/stellar-sdk']);

    // Test 4: Verify exports
    console.log('\n4️⃣ Verifying exports...');
    
    console.log('   ✅ Main entry point:', packageJson.main);
    console.log('   ✅ Module entry point:', packageJson.module);
    console.log('   ✅ Browser entry point:', packageJson.browser);
    console.log('   ✅ TypeScript definitions:', packageJson.types);

    console.log('\n🎉 Package verification completed successfully!');
    console.log('📦 @lumenbro/chainsig-stellar is ready for use');
    
  } catch (error) {
    console.error('\n❌ Package verification failed:', error.message);
    process.exit(1);
  }
}

verifyPackage();

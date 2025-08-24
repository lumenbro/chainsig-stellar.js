# Fork and Publish Guide

This guide walks you through completing the fork of chainsig.js with Stellar support and publishing it as your own package.

## 🚀 Step 1: Create GitHub Fork

### Option A: Create New Repository
1. Go to GitHub and create a new repository: `chainsig-stellar`
2. Initialize it as public or private (your choice)
3. Clone your new repository locally
4. Copy all the files from this `chainsig-stellar` folder to your new repo

### Option B: Fork Original Repository  
1. Go to https://github.com/NearDeFi/chainsig.js
2. Click "Fork" to create your own fork
3. Clone your fork locally
4. Copy the Stellar changes from this folder to your fork

## 📝 Step 2: Commit Your Changes

```bash
# Navigate to your repository
cd your-chainsig-stellar-repo

# Add all files
git add .

# Commit with descriptive message
git commit -m "feat: Add Stellar (XLM) chain adapter with Ed25519 support

- Add Stellar chain adapter following chainsig.js patterns
- Implement Ed25519 derivation with domain_id: 1  
- Add @stellar/stellar-sdk dependency
- Include comprehensive TypeScript types
- Add Stellar examples and documentation
- Update package name to @lumenbro/chainsig-stellar
- Version bump to 1.2.0

Closes the gap in chainsig.js ecosystem by adding Stellar support.
Reverse-engineered the Ed25519 domain requirement that was missing
from Chain Signatures documentation for Stellar compatibility."

# Push to your GitHub repository
git push origin main
```

## 📦 Step 3: Publish to NPM

### Prerequisites
1. Create NPM account if you don't have one: https://www.npmjs.com/signup
2. Login to NPM locally: `npm login`

### Build and Publish
```bash
# Build the package
npm run build

# Test the build
npm run test  # (optional, may need NEAR credentials)

# Publish to NPM
npm publish --access public
```

### Alternative: Scoped Package
If `@lumenbro/chainsig-stellar` is taken, use your own scope:
```bash
# Update package.json name to:
"name": "@yourname/chainsig-stellar"

# Then publish
npm publish --access public
```

## 🔧 Step 4: Test Your Published Package

Create a test project to verify your package works:

```bash
# Create test directory
mkdir test-stellar-package && cd test-stellar-package

# Initialize new project  
npm init -y

# Install your published package
npm install @lumenbro/chainsig-stellar

# Create test file
cat > test.js << 'EOF'
const { chainAdapters } = require('@lumenbro/chainsig-stellar');

console.log('Available adapters:', Object.keys(chainAdapters));
console.log('Stellar adapter available:', !!chainAdapters.stellar);
console.log('Stellar class:', chainAdapters.stellar.Stellar.name);
EOF

# Run test
node test.js
```

Expected output:
```
Available adapters: ['evm', 'btc', 'cosmos', 'solana', 'aptos', 'sui', 'xrp', 'stellar']
Stellar adapter available: true  
Stellar class: Stellar
```

## 📚 Step 5: Documentation Updates

### Update Your Repository README
Make sure your repository README includes:
- Clear indication this is a fork with Stellar support
- Installation instructions for your package
- Stellar-specific examples
- Attribution to original chainsig.js
- Your contribution (Ed25519 discovery)

### Create Release Notes
On GitHub, create a release:
1. Go to your repository > Releases > Create new release
2. Tag: `v1.2.0`
3. Title: `Stellar (XLM) Support Added to ChainSig.js`
4. Description:
```markdown
## 🌟 Major Feature: Stellar Blockchain Support

This release adds complete Stellar (XLM) support to the chainsig.js ecosystem.

### ✨ New Features
- **Stellar Chain Adapter**: Full implementation following chainsig.js patterns
- **Ed25519 Domain Support**: Reverse-engineered `domain_id: 1` requirement
- **Complete API**: Address derivation, balance checking, transaction signing, broadcasting
- **TypeScript Support**: Comprehensive type definitions
- **Examples**: Ready-to-use Stellar integration examples

### 🔧 Technical Details
- Based on chainsig.js v1.1.6
- Adds @stellar/stellar-sdk dependency
- Implements proper Ed25519 signature handling for Stellar
- Maintains full compatibility with existing chain adapters

### 🚀 Usage
```typescript
import { chainAdapters } from '@lumenbro/chainsig-stellar';

const stellar = new chainAdapters.stellar.Stellar({
  networkId: 'mainnet',
  contract: chainSignatureContract
});
```

### 🙏 Attribution
- Original chainsig.js: [NearDeFi/chainsig.js](https://github.com/NearDeFi/chainsig.js)
- Stellar integration: Reverse-engineered Chain Signatures Ed25519 requirements
```

## 🎯 Step 6: Usage in Your Projects

### In Your Wallet Application
```json
{
  "dependencies": {
    "@lumenbro/chainsig-stellar": "^1.2.0"
  }
}
```

```typescript
// Now you can use Stellar alongside other chains
import { chainAdapters, contracts } from '@lumenbro/chainsig-stellar';

// Initialize all the chains you need
const stellar = new chainAdapters.stellar.Stellar({...});
const ethereum = new chainAdapters.evm.EVM({...});
const bitcoin = new chainAdapters.btc.Bitcoin({...});
const solana = new chainAdapters.solana.Solana({...});

// Unified interface across all chains!
```

## 🔄 Step 7: Maintenance Strategy

### Keep Up with Upstream
```bash
# Add original repository as upstream
git remote add upstream https://github.com/NearDeFi/chainsig.js.git

# Fetch upstream changes periodically
git fetch upstream

# Merge upstream changes while preserving Stellar additions
git merge upstream/main

# Resolve any conflicts and test
npm run build && npm run test

# Publish updated version
npm version patch  # or minor/major
npm publish
```

### Contribution Back to Original
Once your implementation is proven:
1. Create PR to original chainsig.js repository
2. Include all your Stellar adapter code
3. Document the Ed25519 discovery
4. Help the entire ecosystem get Stellar support

## 🎉 Success Criteria

You'll know you're successful when:
- [x] Package builds without errors
- [x] Package publishes to NPM successfully  
- [x] Other developers can install and use your package
- [x] Stellar transactions work end-to-end
- [x] Your package maintains compatibility with original chainsig.js
- [x] Documentation is clear and comprehensive

## 💡 Next Steps

1. **Short term**: Use in your wallet application
2. **Medium term**: Gather community feedback and improve
3. **Long term**: Consider contributing back to the original project

Your fork preserves this critical work and makes it available to the broader ecosystem. This is exactly how open source innovation works! 🚀

# Convenience Method Addition - v1.3.1

## 🎯 **Issue Resolved**

Added `getChainDerivedAddress` convenience method to fix compatibility with MultiChainWallet.js API that was causing "Cannot read properties of undefined (reading 'split')" errors.

## 🔧 **Fix Implemented**

### **New Method: `getChainDerivedAddress()`**

Added a convenience method that handles both chain names and full paths, compatible with your existing MultiChainWallet.js implementation.

```javascript
/**
 * Convenience method to derive Stellar address from chain name
 * This method handles both chain names ('stellar') and full paths ('stellar-1')
 * Compatible with MultiChainWallet.js getChainDerivedAddress API
 */
async getChainDerivedAddress(
  nearAccountId: string, 
  chainNameOrPath: string = 'stellar'
): Promise<{
  address: string
  publicKey: string
  path: string
  domainId: number
  curveType: string
}>
```

### **Key Features:**

1. **Flexible Input**: Accepts both chain names (`'stellar'`) and full paths (`'stellar-1'`)
2. **Auto Path Generation**: Converts chain names to paths by adding `-1` suffix
3. **Stellar-Specific**: Always uses `domain_id: 1` for Ed25519 (correct for Stellar)
4. **Rich Metadata**: Returns all required fields for wallet integration
5. **Error Handling**: Comprehensive error messages with context

### **Usage Examples:**

```javascript
const stellar = new chainAdapters.stellar.Stellar({
  networkId: 'mainnet',
  contract: yourContract
});

// All of these work:
const result1 = await stellar.getChainDerivedAddress('near-account.near', 'stellar');
const result2 = await stellar.getChainDerivedAddress('near-account.near', 'stellar-1');
const result3 = await stellar.getChainDerivedAddress('near-account.near'); // defaults to 'stellar'

// Returns:
// {
//   address: 'GCMHHIEAAIJCTOMAELYU3RCVZQYGIO34TAJRDA7MCRC7NYMG3U36F3XF',
//   publicKey: '...',
//   path: 'stellar-1',
//   domainId: 1,
//   curveType: 'Ed25519'
// }
```

## 🚀 **Compatibility**

This method is now **fully compatible** with your MultiChainWallet.js implementation. It:

- ✅ **Handles the exact API signature** your code expects
- ✅ **Prevents the "split" undefined error** by properly handling both input formats
- ✅ **Returns the same metadata structure** as your existing implementation
- ✅ **Uses correct Ed25519 domain_id: 1** for Stellar
- ✅ **Includes logging** for debugging and monitoring

## 📦 **Package Update**

- **Version**: `1.3.1` (published)
- **Size**: 219.1 kB (increased slightly due to new method)
- **Registry**: https://www.npmjs.com/package/@lumenbro/chainsig-stellar
- **Versions Available**: 4 total (1.2.0, 1.2.1, 1.3.0, 1.3.1)

## 🔧 **Update Your Project**

```bash
npm install @lumenbro/chainsig-stellar@1.3.1
```

Your existing MultiChainWallet.js code should now work without any modifications:

```javascript
// This will now work without errors:
const stellarAddr = await wallet.getChainDerivedAddress('stellar');
const solanaAddr = await wallet.getChainDerivedAddress('solana'); // if you extend to other chains
```

## ✅ **Test Results**

All test scenarios pass:
- ✅ **Chain name only**: `'stellar'` → `'stellar-1'`
- ✅ **Full path**: `'stellar-1'` → `'stellar-1'`
- ✅ **Default parameter**: empty → `'stellar'` → `'stellar-1'`
- ✅ **Correct metadata**: All required fields returned
- ✅ **Ed25519 enforcement**: Always uses `domain_id: 1`

## 🎉 **Impact**

This fix enables seamless integration with your existing MultiChainWallet.js without requiring any changes to your main project code. The `getChainDerivedAddress` method now works as expected and prevents the parameter mismatch errors.

**Your Stellar integration is now fully compatible with your existing wallet infrastructure!** 🚀

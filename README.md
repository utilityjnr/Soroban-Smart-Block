# Soroban-Smart-Block

An open-source, Soroban-native block explorer designed to translate complex Stellar Smart Contract interactions into clear, human-readable prose.
While the Stellar ecosystem boasts excellent block explorers for Classic network assets, support for Soroban (Stellar's smart contract platform) remains limited. Currently, when a user interacts with a Soroban dApp—such as executing a swap on a DEX—explorers typically display the raw XDR (External Data Representation) bytes or dense hex codes.

This lack of legibility creates a "black box" experience for users and developers alike, hindering trust, slowing down debugging, and dampening the growth of DeFi, NFTs, and emergent web3 use cases on Stellar.

💡 The Solution
This project bridges the readability gap by capturing, decoding, and displaying Soroban transactions natively.

Instead of forcing users to stare at unreadable raw XDR, the Soroban Smart Block Explorer decodes contract data on the fly.

Before (Standard Explorer): AAAAA9hZ...[Raw XDR Bytes]...==

After (This Explorer):

📝 Address GABC... swapped 100 USDC → 98.7 XLM on StellarSwap at block #4521983.

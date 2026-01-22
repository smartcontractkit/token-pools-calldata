# Token Pools Calldata Generator

[![CI](https://github.com/smartcontractkit/token-pools-calldata/actions/workflows/ci.yml/badge.svg)](https://github.com/smartcontractkit/token-pools-calldata/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node: >=22.0.0](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](package.json)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

> **Disclaimer**
>
> _This repository contains example code of how a Chainlink product or service can be used. It is provided solely to demonstrate a potential integration approach and is not intended for production. This repository is provided "AS IS" without warranties of any kind, has not been audited, may be incomplete, and may be missing key checks or error handling mechanisms. You are solely responsible for testing and simulating all code and transactions, validating functionality on testnet environments, and conducting comprehensive security, technical, and engineering reviews before deploying anything to any mainnet or production environments. SmartContract Chainlink Limited SEZC (“Chainlink Labs”) disclaims all liability for any loss or damage arising from or related to your use of or reliance on this repository. Chainlink Labs does not represent or warrant that the repository will be uninterrupted, available at any particular time, or error-free._

A CLI tool to generate calldata for CCIP TokenPool contract interactions. Supports deploying tokens and pools across EVM chains, configuring cross-chain settings, and managing token permissions. Outputs raw calldata, Safe Transaction Builder JSON, or wallet-agnostic transaction JSON.

## Table of Contents

- [What This Tool Does](#what-this-tool-does)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Input File Reference](#input-file-reference)
- [Quick Start: Deploy Cross-Chain Token](#quick-start-deploy-cross-chain-token-base-sepolia--ethereum-sepolia)
- [Finding Chain Selectors and Factory Addresses](#finding-chain-selectors-and-factory-addresses)
- [Commands](#commands)
  - [generate-token-deployment](#generate-token-deployment)
  - [generate-pool-deployment](#generate-pool-deployment)
  - [generate-chain-update](#generate-chain-update)
  - [generate-accept-ownership](#generate-accept-ownership)
  - [generate-register-admin](#generate-register-admin)
  - [generate-token-admin-registry](#generate-token-admin-registry)
  - [generate-grant-roles](#generate-grant-roles)
  - [generate-mint](#generate-mint)
  - [generate-allow-list-updates](#generate-allow-list-updates)
  - [generate-rate-limiter-config](#generate-rate-limiter-config)
  - [check-roles](#check-roles)
  - [check-owner](#check-owner)
  - [check-pool-config](#check-pool-config)
  - [check-token-admin-registry](#check-token-admin-registry)
- [Advanced Configuration](#advanced-configuration)
  - [Pool Types](#pool-types)
  - [Rate Limiter Configuration](#rate-limiter-configuration)
  - [Allow List Configuration](#allow-list-configuration)
- [Understanding CREATE2](#understanding-create2)
- [Output Formats](#output-formats)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Project Structure](#project-structure)
- [Additional Resources](#additional-resources)

## What This Tool Does

This CLI tool generates transactions in JSON format compatible with Safe wallet UI for Cross-Chain Token (CCT) operations. Projects using Safe multisig can upload the generated JSON files directly into their Safe Transaction Builder interface to execute operations securely.

**Primary Use Case**: Managing Cross-Chain Tokens (CCT) through Safe multisig wallets

**Supported Operations**:

- **Deploy tokens and pools** through TokenPoolFactory (uses CREATE2 for deterministic addresses)
- **Register tokens** in the Token Admin Registry
- **Configure token pools** for cross-chain transfers:
  - Add/remove remote chain connections
  - Configure rate limiters (transfer volume limits)
  - Manage sender allow lists
- **Grant/revoke roles** (mint and burn permissions)
- **Mint tokens** for testing and operations

**Output Formats**:

- **Safe JSON** (`-f safe-json`): Safe Transaction Builder JSON files for Safe UI import
- **Raw Calldata** (`-f calldata`): Hex-encoded function calls for direct contract interaction
- **Transaction JSON** (`-f json`): Wallet-agnostic JSON with `to`, `value`, `data` fields for use with any SDK (ethers.js, viem, Avocado, etc.)

## Prerequisites

- Node.js >= 22.0.0
- pnpm: `npm install -g pnpm`
- A Safe multisig wallet (for safe-json format)
- Chain selectors and factory addresses for your chains ([see reference](#finding-chain-selectors-and-factory-addresses))

## Installation

```bash
# Clone the repository
git clone https://github.com/smartcontractkit/token-pools-calldata.git
cd token-pools-calldata

# Install dependencies
pnpm install

# Verify installation
pnpm start --help
```

## Input File Reference

All input files are in JSON format. Ready-to-use examples are in the `examples/` directory.

### Token Deployment (`examples/token-and-pool-deployment.json`)

| Field              | Type   | Description                                                     |
| ------------------ | ------ | --------------------------------------------------------------- |
| `name`             | string | Token name displayed in wallets and explorers                   |
| `symbol`           | string | Token ticker symbol (e.g., `ETH`, `USDC`)                       |
| `decimals`         | number | Decimal places. Use `18` for standard tokens, `6` for USDC-like |
| `maxSupply`        | string | Maximum supply in wei (see conversion below)                    |
| `preMint`          | string | Tokens minted to deployer on deployment, in wei                 |
| `remoteTokenPools` | array  | Remote chain configs. Leave as `[]` for initial deployment      |

**Wei Conversion**: Token amounts are specified in wei (smallest unit). Multiply the human-readable amount by `10^decimals`:

| Human Amount     | Decimals | Wei Value                     |
| ---------------- | -------- | ----------------------------- |
| 1,000,000 tokens | 18       | `"1000000000000000000000000"` |
| 100,000 tokens   | 18       | `"100000000000000000000000"`  |
| 1,000 tokens     | 18       | `"1000000000000000000000"`    |
| 1,000,000 tokens | 6        | `"1000000000000"`             |

### Chain Update (`examples/chain-update.json`)

Format: `[chainsToRemove, chainsToAdd]`

| Field                       | Type     | Description                                                                                                 |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `remoteChainSelector`       | string   | CCIP chain selector (uint64). See [Finding Chain Selectors](#finding-chain-selectors-and-factory-addresses) |
| `remotePoolAddresses`       | string[] | Pool addresses on remote chain                                                                              |
| `remoteTokenAddress`        | string   | Token address on remote chain                                                                               |
| `outboundRateLimiterConfig` | object   | Rate limits for tokens sent TO remote chain                                                                 |
| `inboundRateLimiterConfig`  | object   | Rate limits for tokens received FROM remote chain                                                           |
| `remoteChainType`           | string   | `"evm"` for Ethereum-like chains, `"svm"` for Solana                                                        |

### Rate Limiter Config

| Field       | Type    | Description                                   |
| ----------- | ------- | --------------------------------------------- |
| `isEnabled` | boolean | Enable/disable rate limiting                  |
| `capacity`  | string  | Maximum tokens transferable at once (wei)     |
| `rate`      | string  | Bucket refill rate in tokens per second (wei) |

**Capacity/Rate Values** (for 18-decimal tokens):

| Use Case   | Capacity       | Rate       | Capacity (wei)                | Rate (wei)                  |
| ---------- | -------------- | ---------- | ----------------------------- | --------------------------- |
| Test/Dev   | 100,000 tokens | 1,000/sec  | `"100000000000000000000000"`  | `"1000000000000000000000"`  |
| Low Volume | 1M tokens      | 10,000/sec | `"1000000000000000000000000"` | `"10000000000000000000000"` |

## Quick Start: Deploy Cross-Chain Token (Base Sepolia ↔ Ethereum Sepolia)

This guide deploys a cross-chain token between Base Sepolia and Ethereum Sepolia.

### Before You Start

Gather these values - you'll use them in every command:

| Parameter            | Description                                    | Where to find |
| -------------------- | ---------------------------------------------- | ------------- |
| `YOUR_SAFE_ADDRESS`  | Your Safe multisig address                     | Safe UI       |
| `YOUR_OWNER_ADDRESS` | Address of the Safe owner signing transactions | Your wallet   |

**Chain Reference** (used throughout this guide):

| Chain            | Chain ID   | Chain Selector         | Factory Address                              |
| ---------------- | ---------- | ---------------------- | -------------------------------------------- |
| Base Sepolia     | `84532`    | `10344971235874465080` | `0xff170aD8f1d86eFAC90CA7a2E1204bA64aC5e0f9` |
| Ethereum Sepolia | `11155111` | `16015286601757825753` | `0xBCf47E9195A225813A629BB7580eDF338c2d8202` |

### Step 1: Deploy Token + Pool on Both Chains

The example file `examples/token-and-pool-deployment.json` contains a ready-to-use token configuration. To customize, copy and edit the file (see [Input File Reference](#input-file-reference)).

**Deploy on Base Sepolia:**

```bash
pnpm start generate-token-deployment \
  -i examples/token-and-pool-deployment.json \
  -d 0xff170aD8f1d86eFAC90CA7a2E1204bA64aC5e0f9 \
  --salt 0x0000000000000000000000000000000000000000000000000000000000000001 \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 84532 \
  -o output/base-deployment.json
```

| Flag     | Description                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| `-i`     | Path to input JSON file with token configuration                                                           |
| `-d`     | TokenPoolFactory contract address (from Chain Reference table above)                                       |
| `--salt` | 32-byte hex value for deterministic deployment. Use the same salt on both chains for predictable addresses |
| `-f`     | Output format: `safe-json` for Safe Transaction Builder, `calldata` for raw hex, `json` for wallet-agnostic JSON |
| `-s`     | Your Safe multisig address                                                                                 |
| `-w`     | Address of the Safe owner signing the transaction                                                          |
| `-c`     | Chain ID where the transaction will execute                                                                |
| `-o`     | Output file path                                                                                           |

**Deploy on Ethereum Sepolia** (same input file, different chain parameters):

```bash
pnpm start generate-token-deployment \
  -i examples/token-and-pool-deployment.json \
  -d 0xBCf47E9195A225813A629BB7580eDF338c2d8202 \
  --salt 0x0000000000000000000000000000000000000000000000000000000000000001 \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 11155111 \
  -o output/eth-deployment.json
```

**Execute and record outputs:**

1. Import `output/base-deployment.json` into [Safe Transaction Builder](https://app.safe.global) and execute
2. Import `output/eth-deployment.json` into Safe Transaction Builder and execute
3. From the transaction logs, find the two "Created" contract addresses:
   - **First** "Created" address → Token contract
   - **Second** "Created" address → Token Pool contract

4. Record the deployed addresses:

```
# Save these - you'll need them in Steps 2 and 3
BASE_TOKEN_ADDRESS=0x...   # First "Created" address on Base Sepolia
BASE_POOL_ADDRESS=0x...    # Second "Created" address on Base Sepolia
ETH_TOKEN_ADDRESS=0x...    # First "Created" address on Ethereum Sepolia
ETH_POOL_ADDRESS=0x...     # Second "Created" address on Ethereum Sepolia
```

### Step 2: Accept Ownership

The factory sets your Safe as `pendingOwner` on both the token and pool contracts. You must accept ownership before you can configure cross-chain connections.

**Generate transactions:**

```bash
# Base Sepolia: Accept ownership of token
pnpm start generate-accept-ownership \
  -a BASE_TOKEN_ADDRESS \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 84532 \
  -o output/base-token-accept-ownership.json

# Base Sepolia: Accept ownership of pool
pnpm start generate-accept-ownership \
  -a BASE_POOL_ADDRESS \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 84532 \
  -o output/base-pool-accept-ownership.json

# Ethereum Sepolia: Accept ownership of token
pnpm start generate-accept-ownership \
  -a ETH_TOKEN_ADDRESS \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 11155111 \
  -o output/eth-token-accept-ownership.json

# Ethereum Sepolia: Accept ownership of pool
pnpm start generate-accept-ownership \
  -a ETH_POOL_ADDRESS \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 11155111 \
  -o output/eth-pool-accept-ownership.json
```

| Flag | Description                                             |
| ---- | ------------------------------------------------------- |
| `-a` | Contract address to accept ownership of (token or pool) |

**Execute:**

> **Tip:** To reduce the number of signatures, batch the token and pool transactions per chain. In Safe Transaction Builder, import both JSON files for the same chain, then execute them as a single batched transaction.

1. **Base Sepolia**: Import `base-token-accept-ownership.json` and `base-pool-accept-ownership.json`, batch and execute
2. **Ethereum Sepolia**: Import `eth-token-accept-ownership.json` and `eth-pool-accept-ownership.json`, batch and execute

### Step 3: Configure Cross-Chain Connections

Each pool must know about its counterpart on the other chain. This step uses addresses from **both chains** deployed in Step 1.

**Create `base-to-eth.json`** - configures the Base Sepolia pool to recognize the Ethereum Sepolia pool:

```json
[
  [],
  [
    {
      "remoteChainSelector": "16015286601757825753",
      "remotePoolAddresses": ["ETH_POOL_ADDRESS"],
      "remoteTokenAddress": "ETH_TOKEN_ADDRESS",
      "outboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "inboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "remoteChainType": "evm"
    }
  ]
]
```

Replace `ETH_POOL_ADDRESS` and `ETH_TOKEN_ADDRESS` with the Ethereum Sepolia addresses from Step 1.

**Create `eth-to-base.json`** - configures the Ethereum Sepolia pool to recognize the Base Sepolia pool:

```json
[
  [],
  [
    {
      "remoteChainSelector": "10344971235874465080",
      "remotePoolAddresses": ["BASE_POOL_ADDRESS"],
      "remoteTokenAddress": "BASE_TOKEN_ADDRESS",
      "outboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "inboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "remoteChainType": "evm"
    }
  ]
]
```

Replace `BASE_POOL_ADDRESS` and `BASE_TOKEN_ADDRESS` with the Base Sepolia addresses from Step 1.

**Generate transactions:**

```bash
# Configure Base Sepolia pool (uses BASE_POOL_ADDRESS from Step 1)
pnpm start generate-chain-update \
  -i base-to-eth.json \
  -p BASE_POOL_ADDRESS \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 84532 \
  -o output/base-chain-update.json

# Configure Ethereum Sepolia pool (uses ETH_POOL_ADDRESS from Step 1)
pnpm start generate-chain-update \
  -i eth-to-base.json \
  -p ETH_POOL_ADDRESS \
  -f safe-json \
  -s YOUR_SAFE_ADDRESS \
  -w YOUR_OWNER_ADDRESS \
  -c 11155111 \
  -o output/eth-chain-update.json
```

| Flag | Description                                                    |
| ---- | -------------------------------------------------------------- |
| `-i` | Path to chain update JSON file                                 |
| `-p` | Pool address to configure (the local pool, not the remote one) |

**Execute:** Import and execute both JSON files in Safe.

### Done

Your cross-chain token is configured. Summary of what you deployed:

| Chain            | Token                | Pool                |
| ---------------- | -------------------- | ------------------- |
| Base Sepolia     | `BASE_TOKEN_ADDRESS` | `BASE_POOL_ADDRESS` |
| Ethereum Sepolia | `ETH_TOKEN_ADDRESS`  | `ETH_POOL_ADDRESS`  |

Your Safe received the preMinted tokens (100,000 tCCIP in the example config). To mint additional tokens, use the [`generate-mint`](#generate-mint) command.

To transfer tokens cross-chain, interact with the CCIP Router contract. See the [CCIP Documentation](https://docs.chain.link/ccip) for instructions.

## Finding Chain Selectors and Factory Addresses

Chain selectors and TokenPoolFactory addresses are available from the CCIP API:

- **Mainnet**: https://docs.chain.link/api/ccip/v1/chains?environment=mainnet
- **Testnet**: https://docs.chain.link/api/ccip/v1/chains?environment=testnet

Navigate to `data > evm > [chainId]` to find:

- `selector` - the chain selector (used in `remoteChainSelector`)
- `tokenPoolFactory` - the factory address (used in `-d` flag)

**Common Testnet Values:**

| Chain            | Chain ID | Chain Selector         | Factory Address                              |
| ---------------- | -------- | ---------------------- | -------------------------------------------- |
| Ethereum Sepolia | 11155111 | `16015286601757825753` | `0xBCf47E9195A225813A629BB7580eDF338c2d8202` |
| Base Sepolia     | 84532    | `10344971235874465080` | `0xff170aD8f1d86eFAC90CA7a2E1204bA64aC5e0f9` |
| Arbitrum Sepolia | 421614   | `3478487238524512106`  | Check API                                    |
| Optimism Sepolia | 11155420 | `5224473277236331295`  | Check API                                    |

## Commands

### generate-token-deployment

Deploy a new BurnMintERC20 token and BurnMintTokenPool together using TokenPoolFactory.

**Usage:**

```bash
pnpm start generate-token-deployment \
  -i <input-file> \
  -d <factory-address> \
  --salt <32-byte-hex> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-i, --input <path>`: Input JSON file (required)
- `-d, --deployer <address>`: TokenPoolFactory address (required)
- `--salt <bytes32>`: 32-byte salt for CREATE2 (required)
- `-f, --format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Input JSON** (see `examples/token-and-pool-deployment.json`):

```json
{
  "name": "My Token",
  "symbol": "MTK",
  "decimals": 18,
  "maxSupply": "1000000000000000000000000",
  "preMint": "100000000000000000000000",
  "remoteTokenPools": []
}
```

See [Input File Reference](#input-file-reference) for field descriptions and wei conversion.

- `remoteTokenPools`: Array of remote chain configurations (optional, see [Advanced Configuration](#advanced-configuration))

### generate-pool-deployment

Deploy a TokenPool for an existing ERC20 token.

**Usage:**

```bash
pnpm start generate-pool-deployment \
  -i <input-file> \
  -d <factory-address> \
  --salt <32-byte-hex> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Input JSON:**

```json
{
  "token": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  "decimals": 18,
  "poolType": "BurnMintTokenPool",
  "remoteTokenPools": []
}
```

**Fields:**

- `token`: Existing token contract address (validated Ethereum address)
- `decimals`: Token decimals (number)
- `poolType`: `"BurnMintTokenPool"` or `"LockReleaseTokenPool"`
- `remoteTokenPools`: Array of remote chain configurations (optional)

**Pool Types:**

| Pool Type            | When to Use                                                     | Requirements                           |
| -------------------- | --------------------------------------------------------------- | -------------------------------------- |
| BurnMintTokenPool    | Token should be burned on source chain, minted on destination   | Token must implement burn/mint methods |
| LockReleaseTokenPool | Token should be locked on source chain, released on destination | Standard ERC20 token                   |

### generate-chain-update

Configure cross-chain connections for a TokenPool. Can add new chains, remove existing chains, or both in a single transaction.

**Usage:**

```bash
pnpm start generate-chain-update \
  -i <input-file> \
  -p <pool-address> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-i, --input <path>`: Input JSON file (required)
- `-p, --token-pool <address>`: TokenPool address (optional, defaults to placeholder)
- `-f, --format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Input JSON** (see `examples/chain-update.json`):

```json
[
  ["12532609583862916517"],
  [
    {
      "remoteChainSelector": "16015286601757825753",
      "remotePoolAddresses": ["0x779877A7B0D9E8603169DdbD7836e478b4624789"],
      "remoteTokenAddress": "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05",
      "outboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "inboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "remoteChainType": "evm"
    }
  ]
]
```

**Format**: `[chainsToRemove, chainsToAdd]`

- **First array**: Chain selectors to remove (empty `[]` if only adding)
- **Second array**: Chain configurations to add (empty `[]` if only removing)

See [Input File Reference](#input-file-reference) for field descriptions. Key fields:

- `remoteChainSelector`: Chain selector (find at [CCIP API](#finding-chain-selectors-and-factory-addresses))
- `remotePoolAddresses`: Array of pool addresses on remote chain
- `remoteTokenAddress`: Token address on remote chain
- `remoteChainType`: `"evm"` for Ethereum-like chains, `"svm"` for Solana

**Rate Limiter Configuration:**

| Field     | Type    | Description                                   |
| --------- | ------- | --------------------------------------------- |
| isEnabled | boolean | Enable/disable rate limiting                  |
| capacity  | string  | Maximum tokens transferable at once (wei)     |
| rate      | string  | Bucket refill rate in tokens per second (wei) |

**Recommended Rate Limiter Values** (for 18-decimal tokens):

| Use Case      | Capacity    | Rate          | Capacity (wei)                  | Rate (wei)                    |
| ------------- | ----------- | ------------- | ------------------------------- | ----------------------------- |
| Test/Dev      | 100,000     | 1,000/sec     | `"100000000000000000000000"`    | `"1000000000000000000000"`    |
| Low Volume    | 1,000,000   | 10,000/sec    | `"1000000000000000000000000"`   | `"10000000000000000000000"`   |
| Medium Volume | 10,000,000  | 100,000/sec   | `"10000000000000000000000000"`  | `"100000000000000000000000"`  |
| High Volume   | 100,000,000 | 1,000,000/sec | `"100000000000000000000000000"` | `"1000000000000000000000000"` |

### generate-mint

Generate a mint transaction for BurnMintERC20 tokens. Caller must have minter role.

**Usage:**

```bash
pnpm start generate-mint \
  -t <token-address> \
  -r <receiver-address> \
  -a <amount> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-t, --token <address>`: Token contract address (required)
- `-r, --receiver <address>`: Receiver address (required)
- `-a, --amount <amount>`: Amount to mint (string, required)
- `-f, --format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Example:**

```bash
# Mint 1000 tokens (with 18 decimals)
pnpm start generate-mint \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -r 0x1234567890123456789012345678901234567890 \
  -a 1000000000000000000000 \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532
```

### generate-accept-ownership

Accept ownership of a contract using the two-step ownership transfer pattern.

> **When to use:** After deploying a token and pool via `generate-token-deployment`, the TokenPoolFactory sets your Safe as `pendingOwner`. You must accept ownership before calling owner-only functions like `applyChainUpdates`.

**Usage:**

```bash
pnpm start generate-accept-ownership \
  -a <contract-address> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-a, --address <address>`: Contract address to accept ownership of (required)
- `-f, --format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Examples:**

```bash
# Accept ownership of a token
pnpm start generate-accept-ownership \
  -a 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532 \
  -o output/accept-token-ownership.json

# Accept ownership of a pool
pnpm start generate-accept-ownership \
  -a 0x1234567890123456789012345678901234567890 \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532 \
  -o output/accept-pool-ownership.json
```

### generate-register-admin

Register as the CCIP admin for a token via the RegistryModuleOwnerCustom contract. This is required before you can set pool configurations for tokens you own.

> **When to use:** After deploying a token, you need to register as its CCIP admin in the Token Admin Registry before configuring pools. The registration method depends on how your token manages admin access.

**Usage:**

```bash
pnpm start generate-register-admin \
  -m <module-address> \
  -t <token-address> \
  --method <registration-method> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-m, --module <address>`: RegistryModuleOwnerCustom contract address (required)
- `-t, --token <address>`: Token contract address (required)
- `--method <type>`: Registration method (required) - one of:
  - `get-ccip-admin`: Use token's `getCCIPAdmin()` function
  - `owner`: Use token's `owner()` function (standard Ownable pattern)
  - `access-control`: Use token's `DEFAULT_ADMIN_ROLE` holder
- `-f, --format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Registration Methods:**

| Method | When to Use | Token Requirement |
|--------|-------------|-------------------|
| `get-ccip-admin` | Token has a dedicated CCIP admin function | Must implement `getCCIPAdmin()` |
| `owner` | Token uses standard Ownable pattern | Must implement `owner()` |
| `access-control` | Token uses OpenZeppelin AccessControl | Must have `DEFAULT_ADMIN_ROLE` |

**Finding the RegistryModuleOwnerCustom Address:**

The RegistryModuleOwnerCustom contract address varies by chain. Find it in the CCIP API:
- **Mainnet**: https://docs.chain.link/api/ccip/v1/chains?environment=mainnet
- **Testnet**: https://docs.chain.link/api/ccip/v1/chains?environment=testnet

Navigate to `data > evm > [chainId] > registryModuleOwnerCustom`.

**Examples:**

```bash
# Register using owner() method (most common for Ownable tokens)
pnpm start generate-register-admin \
  -m 0x62e731218d0D47305aba2BE3751E7EE9E5520790 \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --method owner \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532 \
  -o output/register-admin.json

# Register using getCCIPAdmin() method
pnpm start generate-register-admin \
  -m 0x62e731218d0D47305aba2BE3751E7EE9E5520790 \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --method get-ccip-admin \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532

# Register using AccessControl DEFAULT_ADMIN_ROLE
pnpm start generate-register-admin \
  -m 0x62e731218d0D47305aba2BE3751E7EE9E5520790 \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --method access-control \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532
```

### generate-token-admin-registry

Interact with the TokenAdminRegistry contract to manage pool associations and admin role transfers for tokens.

> **When to use:** After registering as CCIP admin, use this command to set the pool for your token, transfer admin role to another address, or accept an admin role that was transferred to you.

**Usage:**

```bash
pnpm start generate-token-admin-registry \
  --token-admin-registry <registry-address> \
  --token <token-address> \
  --method <set-pool|transfer-admin|accept-admin> \
  [--pool <pool-address>] \
  [--new-admin <new-admin-address>] \
  [--format calldata|safe-json|json] \
  [--safe <safe-address>] \
  [--owner <owner-address>] \
  [--chain-id <chain-id>] \
  [--output <output-file>]
```

**Options:**

- `--token-admin-registry <address>`: TokenAdminRegistry contract address (required)
- `--token <address>`: Token contract address (required)
- `--method <type>`: Method to call (required) - one of:
  - `set-pool`: Set the pool for a token
  - `transfer-admin`: Transfer admin role to a new address (two-step process)
  - `accept-admin`: Accept the admin role for a token
- `--pool <address>`: Pool address (required for `set-pool` method)
- `--new-admin <address>`: New admin address (required for `transfer-admin` method)
- `--format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `--safe <address>`: Safe address (required for safe-json)
- `--owner <address>`: Owner address (required for safe-json)
- `--chain-id <id>`: Chain ID (required for safe-json)
- `--output <path>`: Output file (optional, defaults to stdout)

**Methods:**

| Method | Description | Required Options |
|--------|-------------|------------------|
| `set-pool` | Sets the pool for a token in the registry | `--pool` |
| `transfer-admin` | Initiates admin role transfer to new address | `--new-admin` |
| `accept-admin` | Accepts pending admin role for a token | None |

**Finding the TokenAdminRegistry Address:**

The TokenAdminRegistry contract address varies by chain. Find it in the CCIP API:
- **Mainnet**: https://docs.chain.link/api/ccip/v1/chains?environment=mainnet
- **Testnet**: https://docs.chain.link/api/ccip/v1/chains?environment=testnet

Navigate to `data > evm > [chainId] > tokenAdminRegistry`.

**Examples:**

```bash
# Set pool for a token
pnpm start generate-token-admin-registry \
  --token-admin-registry 0x62e731218d0D47305aba2BE3751E7EE9E5520790 \
  --token 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --method set-pool \
  --pool 0x1234567890123456789012345678901234567890 \
  --format safe-json \
  --safe 0xYourSafe \
  --owner 0xYourOwner \
  --chain-id 84532 \
  --output output/set-pool.json

# Transfer admin role to a new address (initiates two-step transfer)
pnpm start generate-token-admin-registry \
  --token-admin-registry 0x62e731218d0D47305aba2BE3751E7EE9E5520790 \
  --token 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --method transfer-admin \
  --new-admin 0xNewAdminAddress123456789012345678901234 \
  --format safe-json \
  --safe 0xYourSafe \
  --owner 0xYourOwner \
  --chain-id 84532 \
  --output output/transfer-admin.json

# Accept admin role for a token (called by the new admin after transfer)
pnpm start generate-token-admin-registry \
  --token-admin-registry 0x62e731218d0D47305aba2BE3751E7EE9E5520790 \
  --token 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --method accept-admin \
  --format safe-json \
  --safe 0xNewAdminSafe \
  --owner 0xNewAdminOwner \
  --chain-id 84532 \
  --output output/accept-admin.json
```

**Admin Role Transfer Process:**

Admin role transfer is a two-step process for security:

1. **Current admin** calls `transfer-admin` to nominate a new admin
2. **New admin** calls `accept-admin` to complete the transfer

This prevents accidental transfers to incorrect addresses.

### generate-grant-roles

Grant or revoke mint and/or burn permissions to/from a TokenPool.

> **When to use:** This command is only needed when deploying a pool for an **existing token** (via `generate-pool-deployment`). When deploying a new token + pool together (via `generate-token-deployment`), the TokenPoolFactory automatically grants mint/burn roles to the pool.

**Usage:**

```bash
pnpm start generate-grant-roles \
  -t <token-address> \
  -p <pool-address> \
  [--action grant|revoke] \
  [--role-type mint|burn|both] \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-t, --token <address>`: Token contract address (required)
- `-p, --pool <address>`: Pool contract address (required)
- `--action <type>`: `grant` or `revoke` (default: `grant`)
- `--role-type <type>`: `mint`, `burn`, or `both` (default: `both`)
- `-f, --format <type>`: `calldata`, `safe-json`, or `json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Granting Roles:**

```bash
# Grant both mint and burn roles (1 transaction)
pnpm start generate-grant-roles \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -p 0x1234567890123456789012345678901234567890 \
  --action grant \
  --role-type both \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532

# Grant mint role only
pnpm start generate-grant-roles \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -p 0x1234567890123456789012345678901234567890 \
  --action grant \
  --role-type mint \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532
```

**Revoking Roles:**

```bash
# Revoke both mint and burn roles (2 transactions - executed atomically in Safe)
pnpm start generate-grant-roles \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -p 0x1234567890123456789012345678901234567890 \
  --action revoke \
  --role-type both \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532

# Revoke mint role only
pnpm start generate-grant-roles \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -p 0x1234567890123456789012345678901234567890 \
  --action revoke \
  --role-type mint \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532

# Revoke burn role only
pnpm start generate-grant-roles \
  -t 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  -p 0x1234567890123456789012345678901234567890 \
  --action revoke \
  --role-type burn \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532
```

**Important Notes:**

- **Revoking both roles**: When using `--action revoke --role-type both`, the tool generates **TWO transactions** that will be executed atomically in Safe:
  1. `revokeMintRole(pool)` - Removes minting permission
  2. `revokeBurnRole(pool)` - Removes burning permission

  This is because the BurnMintERC20 contract provides separate revoke functions but no combined `revokeMintAndBurnRoles()` function (unlike grant operations which have `grantMintAndBurnRoles()`).

- **Backward compatibility**: The `--action` flag defaults to `grant`, so existing scripts continue to work without modification.

### generate-allow-list-updates

Update the sender allow list for a TokenPool. The allow list restricts which addresses can initiate cross-chain transfers through the pool.

**Usage:**

```bash
pnpm start generate-allow-list-updates \
  -i <input-json-path> \
  -p <pool-address> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-i, --input <path>`: Path to input JSON file (required)
- `-p, --pool <address>`: Token pool contract address (required)
- `-f, --format <type>`: Output format - `calldata` or `safe-json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Input JSON** (see `examples/allow-list-updates.json`):

```json
{
  "removes": ["0x1234567890123456789012345678901234567890"],
  "adds": [
    "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "0xa469F39796Cad956bE2E51117693880dB3E6438d"
  ]
}
```

**Parameters:**

- `removes`: Addresses to remove from allow list (optional, defaults to `[]`)
- `adds`: Addresses to add to allow list (optional, defaults to `[]`)

**Example:**

```bash
pnpm start generate-allow-list-updates \
  -i examples/allow-list-updates.json \
  -p 0x1234567890123456789012345678901234567890 \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532 \
  -o output/allow-list-updates.json
```

### generate-rate-limiter-config

Update rate limiter configuration for a specific remote chain on a TokenPool.

**Usage:**

```bash
pnpm start generate-rate-limiter-config \
  -i <input-json-path> \
  -p <pool-address> \
  [-f calldata|safe-json|json] \
  [-s <safe-address>] \
  [-w <owner-address>] \
  [-c <chain-id>] \
  [-o <output-file>]
```

**Options:**

- `-i, --input <path>`: Path to input JSON file (required)
- `-p, --pool <address>`: Token pool contract address (required)
- `-f, --format <type>`: Output format - `calldata` or `safe-json` (default: `calldata`)
- `-s, --safe <address>`: Safe address (required for safe-json)
- `-w, --owner <address>`: Owner address (required for safe-json)
- `-c, --chain-id <id>`: Chain ID (required for safe-json)
- `-o, --output <path>`: Output file (optional, defaults to stdout)

**Input JSON** (see `examples/rate-limiter-config.json`):

```json
{
  "remoteChainSelector": "3478487238524512106",
  "outboundConfig": {
    "isEnabled": true,
    "capacity": "1000000000000000000000",
    "rate": "100000000000000000000"
  },
  "inboundConfig": {
    "isEnabled": true,
    "capacity": "1000000000000000000000",
    "rate": "100000000000000000000"
  }
}
```

**Parameters:**

- `remoteChainSelector`: Chain selector (find at [CCIP API](#finding-chain-selectors-and-factory-addresses))
- `outboundConfig`: Rate limiter for tokens sent TO remote chain
- `inboundConfig`: Rate limiter for tokens received FROM remote chain

**Rate Limiter Configuration:**

| Field     | Type    | Description                                   |
| --------- | ------- | --------------------------------------------- |
| isEnabled | boolean | Enable/disable rate limiting                  |
| capacity  | string  | Maximum tokens in bucket (wei)                |
| rate      | string  | Bucket refill rate in tokens per second (wei) |

See [Input File Reference](#input-file-reference) for wei conversion and recommended values.

**Example:**

```bash
pnpm start generate-rate-limiter-config \
  -i examples/rate-limiter-config.json \
  -p 0x1234567890123456789012345678901234567890 \
  -f safe-json \
  -s 0xYourSafe \
  -w 0xYourOwner \
  -c 84532 \
  -o output/rate-limiter-config.json
```

### check-roles

Query a token contract to check if an account has MINTER_ROLE and BURNER_ROLE. This is a read-only command that connects to the chain via RPC.

Works with BurnMintERC20 tokens and any token contract implementing the same AccessControl role pattern (roles defined as `keccak256("MINTER_ROLE")` and `keccak256("BURNER_ROLE")`).

**Usage:**

```bash
pnpm start check-roles \
  --rpc-url <rpc-url> \
  --token <token-address> \
  --account <account-address>
```

**Options:**

- `--rpc-url <url>`: RPC endpoint URL (required)
- `--token <address>`: Token contract address (required)
- `--account <address>`: Address to check roles for (required)

**Example:**

```bash
# Check if a pool has mint/burn roles on a token
pnpm start check-roles \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --token 0x779877A7B0D9E8603169DdbD7836e478b4624789 \
  --account 0x1234567890123456789012345678901234567890
```

**Output:**

```
Checking roles on token contract...
Token:   0x779877A7B0D9E8603169DdbD7836e478b4624789
Account: 0x1234567890123456789012345678901234567890

Results:
  MINTER_ROLE:        YES
  BURNER_ROLE:        YES
  DEFAULT_ADMIN_ROLE: NO

Account has both MINTER and BURNER roles.
```

### check-owner

Query a contract to get its current owner. This is a read-only command that connects to the chain via RPC.

Works with any Ownable contract including TokenPools, tokens, and other contracts that implement the standard `owner()` function.

**Usage:**

```bash
pnpm start check-owner \
  --rpc-url <rpc-url> \
  --contract <contract-address>
```

**Options:**

- `--rpc-url <url>`: RPC endpoint URL (required)
- `--contract <address>`: Contract address to check owner for (required)

**Example:**

```bash
# Check the owner of a token pool
pnpm start check-owner \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --contract 0xe32f76f9fbdd2951465c9368635cf2c147c73071
```

**Output:**

```
Checking owner of contract...
Contract: 0xe32f76f9fbdd2951465c9368635cf2c147c73071
Owner:    0x9d087fC03ae39b088326b67fA3C788236645b717
```

### check-pool-config

Query a TokenPool contract to get its full configuration including basic pool info and per-chain configuration. This is a read-only command that connects to the chain via RPC.

**Usage:**

```bash
pnpm start check-pool-config \
  --rpc-url <rpc-url> \
  --pool <pool-address> \
  [--chains <chain-selectors>]
```

**Options:**

| Option | Description | Required |
|--------|-------------|----------|
| `--rpc-url <url>` | RPC URL to connect to | Yes |
| `--pool <address>` | TokenPool contract address | Yes |
| `--chains <selectors>` | Comma-separated chain selectors to check (optional, defaults to all supported chains) | No |

**Example - Check all supported chains:**

```bash
pnpm start check-pool-config \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --pool 0xe32f76f9fbdd2951465c9368635cf2c147c73071
```

**Example - Check specific chains:**

```bash
pnpm start check-pool-config \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --pool 0xe32f76f9fbdd2951465c9368635cf2c147c73071 \
  --chains 4949039107694359620,5009297550715157269
```

**Output:**

The command outputs:

1. **Pool basic info**: token address, decimals, owner, router, RMN proxy, rate limit admin, type/version, allow list status
2. **Supported chains count**: Number of configured remote chains
3. **Per-chain configuration**: For each chain:
   - Chain selector
   - Remote pool addresses (raw bytes)
   - Remote token address (raw bytes)
   - Outbound rate limiter state (isEnabled, capacity, rate, currentTokens, lastUpdated)
   - Inbound rate limiter state (isEnabled, capacity, rate, currentTokens, lastUpdated)

```
Pool basic info:
  pool: 0xe32f76f9fbdd2951465c9368635cf2c147c73071
  token: 0x7A46328746F1625Bd5B4b07129d0477fCa099127
  decimals: 18
  owner: 0x9d087fC03ae39b088326b67fA3C788236645b717
  router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59
  rmnProxy: 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991
  rateLimitAdmin: 0x0000000000000000000000000000000000000000
  typeAndVersion: BurnMintTokenPool 1.6.1
  allowListEnabled: false

Supported chains: 4

Chain 4949039107694359620 configuration:
  remotePools: ["0x0000000000000000000000002d29d728c48c3f75e221d28d844e2bdfe5656bfc"]
  remoteToken: 0x00000000000000000000000061e030a56d33e8260fdd81f03b162a79fe3449cd
  outboundRateLimiter:
    isEnabled: true
    capacity: 2000000000000000000000000
    rate: 23148148148148148148
    currentTokens: 2000000000000000000000000
  inboundRateLimiter:
    isEnabled: true
    capacity: 2000000000000000000000000
    rate: 23148148148148148148
    currentTokens: 2000000000000000000000000
```

### check-token-admin-registry

Query the TokenAdminRegistry contract to get configuration for a token. Shows administrator, pending administrator, and linked pool. This is a read-only command that connects to the chain via RPC.

**Usage:**

```bash
pnpm start check-token-admin-registry \
  --rpc-url <rpc-url> \
  --token-admin-registry <registry-address> \
  --token <token-address>
```

**Options:**

| Option | Description | Required |
|--------|-------------|----------|
| `--rpc-url <url>` | RPC URL to connect to | Yes |
| `--token-admin-registry <address>` | TokenAdminRegistry contract address | Yes |
| `--token <address>` | Token contract address to check | Yes |

**Example:**

```bash
pnpm start check-token-admin-registry \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --token-admin-registry 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82 \
  --token 0x7A46328746F1625Bd5B4b07129d0477fCa099127
```

**Output:**

The command outputs:

1. **Token**: The token address being queried
2. **Administrator**: Current CCIP admin for the token (or "(not set)" if none)
3. **Pending Administrator**: Address that can accept admin role (or "(none)" if no transfer in progress)
4. **Token Pool**: The pool linked to this token in the registry (or "(not set)" if none)
5. **Status Summary**: Human-readable explanation of the token's registration state

```
Checking TokenAdminRegistry configuration...
  registry: 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82
  token: 0x7A46328746F1625Bd5B4b07129d0477fCa099127

TokenAdminRegistry configuration:
  token: 0x7A46328746F1625Bd5B4b07129d0477fCa099127
  administrator: 0x9d087fC03ae39b088326b67fA3C788236645b717
  pendingAdministrator: (none)
  tokenPool: 0xe32f76f9fbDd2951465c9368635cF2c147c73071

Token is fully configured with admin and pool
```

**Status Messages:**

- `Token is NOT registered in TokenAdminRegistry - no CCIP admin assigned`: Token has no admin configured
- `Admin transfer is in progress - pending admin must call acceptAdminRole()`: A new admin has been proposed
- `Token has admin but NO pool linked - call setPool() to link a pool`: Admin is set but pool is missing
- `Token is fully configured with admin and pool`: Everything is properly set up

## Advanced Configuration

### Multiple Pool Addresses Per Remote Chain

You can configure multiple pool addresses for a single remote chain. This is useful when:

- Multiple pools manage the same token on the remote chain
- Gradual migration between pool versions
- Multi-token pool architectures

**Example:**

```json
{
  "remoteChainSelector": "16015286601757825753",
  "remotePoolAddresses": [
    "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "0x1234567890123456789012345678901234567890",
    "0xa469F39796Cad956bE2E51117693880dB3E6438d"
  ],
  "remoteTokenAddress": "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05",
  "outboundRateLimiterConfig": { ... },
  "inboundRateLimiterConfig": { ... },
  "remoteChainType": "evm"
}
```

### EVM ↔ SVM (Solana) Cross-Chain

Configure cross-chain connections between EVM and Solana chains.

**Address Formats:**

- **EVM**: Standard 20-byte Ethereum addresses (e.g., `0x779877A7B0D9E8603169DdbD7836e478b4624789`)
- **SVM**: 32-byte Solana public keys in base58 format (e.g., `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)

**Example - Ethereum → Solana:**

```json
[
  [],
  [
    {
      "remoteChainSelector": "SOLANA_CHAIN_SELECTOR",
      "remotePoolAddresses": ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
      "remoteTokenAddress": "So11111111111111111111111111111111111111112",
      "outboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "inboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "100000000000000000000000",
        "rate": "1000000000000000000000"
      },
      "remoteChainType": "svm"
    }
  ]
]
```

**Note**: Set `remoteChainType` to `"svm"` for Solana chains. The tool will automatically encode Solana addresses as `bytes32`.

### Batch Operations

Add and remove chains in a single transaction:

```json
[
  ["12532609583862916517", "3478487238524512106"],
  [
    {
      "remoteChainSelector": "16015286601757825753",
      "remotePoolAddresses": ["0x779877A7B0D9E8603169DdbD7836e478b4624789"],
      "remoteTokenAddress": "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05",
      "outboundRateLimiterConfig": { ... },
      "inboundRateLimiterConfig": { ... },
      "remoteChainType": "evm"
    }
  ]
]
```

This removes chains `12532609583862916517` and `3478487238524512106` while adding chain `16015286601757825753`.

### Remote Token Pools During Deployment

Configure remote chains during initial token/pool deployment:

See `examples/token-deployment-with-remote.json` for a complete example with remote chain configuration.

## Understanding CREATE2

This tool uses CREATE2 for deterministic contract deployment. Key concepts:

**Salt**: A 32-byte value that determines the deployment address. The same salt with the same code and deployer always produces the same address.

**Salt Modification**: The TokenPoolFactory modifies your salt by hashing it with the sender address:

```
modifiedSalt = keccak256(abi.encodePacked(salt, msg.sender))
```

This means the same salt produces different addresses for different senders.

**Address Computation**: The final address is computed as:

```
address = keccak256(0xff, deployer, modifiedSalt, keccak256(initCode))
```

The tool automatically computes and logs the deterministic address before deployment.

**Why This Matters**: You can predict deployment addresses before executing transactions. This is useful for:

- Pre-configuring contracts with addresses
- Coordinating multi-chain deployments
- Verifying deployments

## Output Formats

### Raw Calldata (`-f calldata`)

Hex-encoded function call data. Use with:

- Web3 libraries (ethers.js, web3.js)
- Block explorers (Etherscan)
- Hardware wallets
- Direct contract interaction tools

**Example:**

```
0x4a792d70000000000000000000000000000000000000000000000000000000000000...
```

### Safe Transaction Builder JSON (`-f safe-json`)

Structured JSON compatible with Safe Transaction Builder. Includes:

- Transaction metadata (chain ID, timestamps)
- Safe and owner addresses
- Contract method signatures with full type information
- Human-readable descriptions

**Example:**

```json
{
  "version": "1.0",
  "chainId": "84532",
  "createdAt": 1234567890,
  "meta": {
    "name": "Token and Pool Factory Deployment - My Token",
    "description": "Deploy My Token (MTK) token and associated pool using factory",
    "txBuilderVersion": "1.18.0",
    "createdFromSafeAddress": "0xYourSafe",
    "createdFromOwnerAddress": "0xYourOwner"
  },
  "transactions": [...]
}
```

Import this file directly into Safe Transaction Builder.

### Transaction JSON (`-f json`)

Wallet-agnostic JSON containing the core transaction fields. Use with any SDK or CLI tool:

- ethers.js / viem / web3.js
- Avocado SDK
- Custom transaction submission scripts
- Any tool that accepts standard transaction parameters

**Single transaction example:**

```json
{
  "to": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  "value": "0",
  "data": "0x40c10f19000000000000000000000000..."
}
```

**Multiple transactions example** (e.g., revoking both roles):

```json
[
  {
    "to": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "value": "0",
    "data": "0x..."
  },
  {
    "to": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "value": "0",
    "data": "0x..."
  }
]
```

**Usage with ethers.js:**

```typescript
const txData = JSON.parse(fs.readFileSync("output/tx.json", "utf-8"));
const tx = await wallet.sendTransaction(txData);
await tx.wait();
```

## Troubleshooting

### "Invalid token address" or "Invalid pool address"

**Cause**: Address format is incorrect.

**Solution**: Ensure addresses:

- Start with `0x`
- Are 42 characters long (20 bytes in hex)
- Use valid hex characters (0-9, a-f)

### "Salt must be a 32-byte hex string"

**Cause**: Salt is not exactly 32 bytes.

**Solution**: Salt must be 66 characters total (`0x` + 64 hex characters). Example:

```
0x0000000000000000000000000000000000000000000000000000000000000001
```

### "chainId, safe, and owner are required for Safe Transaction Builder JSON format"

**Cause**: Missing required options for safe-json format.

**Solution**: Add all three options:

```bash
-s YOUR_SAFE_ADDRESS -w YOUR_OWNER_ADDRESS -c CHAIN_ID
```

### "Failed to parse or validate input JSON"

**Cause**: Input JSON doesn't match expected schema.

**Solution**: Check that:

- JSON is valid (use `jq` to validate)
- All required fields are present
- Field types match (strings, numbers, booleans)
- Addresses are valid
- Amounts are strings (not numbers)

### "SenderNotMinter" error when minting

**Cause**: Caller doesn't have minter role.

**Solution**: Grant minter role first:

```bash
pnpm start generate-grant-roles \
  -t TOKEN_ADDRESS \
  -p POOL_OR_MINTER_ADDRESS \
  --role-type mint
```

### Rate limiter values too large

**Cause**: Capacity or rate exceeds uint128 max value.

**Solution**: Values must be ≤ `340282366920938463463374607431768211455`. For reference:

- 100 million tokens (18 decimals): `100000000000000000000000000`
- This is well within uint128 limits

## Development

```bash
# Build
pnpm build

# Lint
pnpm lint:check
pnpm lint:fix

# Format
pnpm format:check
pnpm format:fix

# Test
pnpm test
pnpm test:watch
pnpm test:coverage

# Generate types from ABIs
pnpm typechain
```

## Project Structure

```
.
├── abis/                   # Contract ABIs
├── examples/               # Example input JSON files
│   ├── token-and-pool-deployment.json
│   ├── token-deployment-with-remote.json
│   ├── pool-deployment.json
│   ├── chain-update.json
│   ├── allow-list-updates.json
│   ├── rate-limiter-config.json
│   ├── grant-roles.json
│   ├── revoke-roles.json
│   └── mint.json
├── src/
│   ├── cli.ts             # CLI entry point
│   ├── constants/         # Bytecodes and constants
│   ├── generators/        # Transaction generators
│   ├── types/             # TypeScript types and Zod schemas
│   ├── typechain/         # Generated contract types
│   └── utils/             # Utility functions
└── output/                # Generated transaction files
```

## Additional Resources

- [CCIP Documentation](https://docs.chain.link/ccip)
- [TokenPoolFactory Contract](https://docs.chain.link/ccip/architecture#tokenpoolFactory)
- [Safe Transaction Builder](https://help.safe.global/en/articles/40841-transaction-builder)
- [CREATE2 Explanation](https://eips.ethereum.org/EIPS/eip-1014)

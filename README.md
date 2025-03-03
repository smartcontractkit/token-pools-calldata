# Token Pools Calldata Generator

A tool to generate calldata for TokenPool contract interactions, including token and pool deployment, and chain updates. Supports both raw calldata and Safe Transaction Builder JSON formats.

## Prerequisites

- Node.js >= 20.0.0
- pnpm 
`npm install pnpm`

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
pnpm install
```

## Project Structure

```
.
├── abis/          # Contract ABIs
├── examples/      # Example input files
│   ├── token-deployment.json
│   ├── pool-deployment.json
│   └── chain-update.json
├── src/
│   ├── generators/  # Calldata generation logic
│   ├── types/      # TypeScript types and validation
│   └── utils/      # Utility functions
```

## Usage

### Deploy Token and Pool

The tool supports deploying a new token and its associated pool using the TokenPoolFactory contract. You can either:
1. Deploy both token and pool together using `generate-token-deployment`
2. Deploy just a pool for an existing token using `generate-pool-deployment`

#### Token Deployment Input Format

Create a JSON file with the token parameters (e.g., `examples/token-deployment.json`):

```json
{
  "name": "Test CCIP Token",
  "symbol": "tCCIP",
  "decimals": 18,
  "maxSupply": "1000000000000000000000000",
  "preMint": "100000000000000000000000",
  "remoteTokenPools": []
}
```

#### Generate Token Deployment Transaction

```bash
# Generate Safe Transaction Builder JSON
pnpm start generate-token-deployment \
  -i examples/token-deployment.json \
  -d <factory-address> \
  --salt <32-byte-hex> \
  -f safe-json \
  -s <safe-address> \
  -w <owner-address> \
  -c <chain-id> \
  -o output/token-deployment.json

# Example with actual values:
pnpm start generate-token-deployment \
  -i examples/token-deployment.json \
  -d 0x17d8a409fe2cef2d3808bcb61f14abeffc28876e \
  --salt 0x0000000000000000000000000000000000000000000000000000000123456789 \
  -f safe-json \
  -s 0x5419c6d83473d1c653e7b51e8568fafedce94f01 \
  -w 0x0000000000000000000000000000000000000000 \
  -c 1 \
  -o output/token-deployment.json
```

Command options:
- `-i, --input <path>`: Path to input JSON file (required)
- `-d, --deployer <address>`: TokenPoolFactory contract address (required)
- `--salt <bytes32>`: Salt for CREATE2 deployment (required, must be 32 bytes)
- `-f, --format <type>`: Output format: "calldata" or "safe-json" (optional, defaults to "calldata")
- `-s, --safe <address>`: Safe address for safe-json format (required for safe-json)
- `-w, --owner <address>`: Owner address for safe-json format (required for safe-json)
- `-c, --chain-id <id>`: Chain ID for safe-json format (required for safe-json)
- `-o, --output <path>`: Path to output file (optional, defaults to stdout)

#### Pool Deployment Input Format

For deploying a pool for an existing token, create a JSON file (e.g., `examples/pool-deployment.json`):

```json
{
  "poolType": "BurnMintTokenPool",
  "poolParams": {
    "token": "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    "decimals": 18,
    "allowlist": [
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    ],
    "owner": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "ccipRouter": "0xD0daae2231E9CB96b94C8512223533293C3693Bf"
  }
}
```

#### Generate Pool Deployment Transaction

```bash
# Generate Safe Transaction Builder JSON
pnpm start generate-pool-deployment \
  -i examples/pool-deployment.json \
  -d <factory-address> \
  -t <token-address> \
  --salt <32-byte-hex> \
  -f safe-json \
  -s <safe-address> \
  -w <owner-address> \
  -c <chain-id> \
  -o output/pool-deployment.json
```

Additional options for pool deployment:
- `-t, --token-address <address>`: Address of the existing token (required)

### Generate Chain Update Calldata

The tool supports updating chain configurations for token pools, allowing you to:
1. Remove existing chain configurations
2. Add new chain configurations with rate limiters

#### Chain Update Input Format

Create a JSON file with the chain update parameters (e.g., `examples/chain-update.json`):

```json
[
  [], // Array of chain selectors to remove
  [
    // Array of chain updates to add
    {
      "remoteChainSelector": "12532609583862916517",
      "remotePoolAddresses": ["0x779877A7B0D9E8603169DdbD7836e478b4624789"],
      "remoteTokenAddress": "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05",
      "outboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "1000000",
        "rate": "100000"
      },
      "inboundRateLimiterConfig": {
        "isEnabled": true,
        "capacity": "1000000",
        "rate": "100000"
      }
    }
  ]
]
```

#### Generate Chain Update Transaction

```bash
# Generate Safe Transaction Builder JSON
pnpm start generate-chain-update \
  -i examples/chain-update.json \
  -p <token-pool-address> \
  -f safe-json \
  -s <safe-address> \
  -w <owner-address> \
  -c <chain-id> \
  -o output/chain-update.json

# Example with actual values:
pnpm start generate-chain-update \
  -i examples/chain-update.json \
  -p 0x1234567890123456789012345678901234567890 \
  -f safe-json \
  -s 0xbF6512B1bBEeC3a673Feff43C0A182C2b28DFD9f \
  -w 0x0000000000000000000000000000000000000000 \
  -c 11155111 \
  -o output/chain-update.json
```

Command options:
- `-i, --input <path>`: Path to input JSON file (required)
- `-p, --token-pool <address>`: Token Pool contract address (required for safe-json)
- `-f, --format <type>`: Output format: "calldata" or "safe-json" (optional, defaults to "calldata")
- `-s, --safe <address>`: Safe address for safe-json format (required for safe-json)
- `-w, --owner <address>`: Owner address for safe-json format (required for safe-json)
- `-c, --chain-id <id>`: Chain ID for safe-json format (required for safe-json)
- `-o, --output <path>`: Path to output file (optional, defaults to stdout)

### Command Options

- `--input <path>`: Path to input JSON file (required)
- `--output <path>`: Path to output file (optional, defaults to stdout)
- `--format <type>`: Output format: "calldata" or "safe-json" (optional, defaults to "calldata")
- `--safe <address>`: Safe address for safe-json format (optional, defaults to "--SAFE--")
- `--owner <address>`: Owner address for safe-json format (optional, defaults to "--OWNER--")
- `--chain-id <id>`: Chain ID for safe-json format (required for safe-json)
- `--token-pool <address>`: Token Pool contract address (optional, defaults to "0xYOUR_POOL_ADDRESS")

### Output Formats

#### Raw Calldata

Outputs the encoded function calldata as a hex string.

#### Safe Transaction Builder JSON

Outputs a JSON file compatible with the Safe Transaction Builder format:

```json
{
  "version": "1.0",
  "chainId": "11155111",
  "createdAt": 1234567890,
  "meta": {
    "name": "Token Pool Chain Updates",
    "description": "Apply chain updates to the Token Pool contract",
    "txBuilderVersion": "1.18.0",
    "createdFromSafeAddress": "0xYourSafeAddress",
    "createdFromOwnerAddress": "0xOwnerAddress"
  },
  "transactions": [
    {
      "to": "0xYOUR_POOL_ADDRESS",
      "value": "0",
      "data": "0x...",
      "contractMethod": {
        "inputs": [
          {
            "name": "remoteChainSelectorsToRemove",
            "type": "uint64[]",
            "internalType": "uint64[]"
          },
          {
            "name": "chainsToAdd",
            "type": "tuple[]",
            "internalType": "struct TokenPool.ChainUpdateStruct[]"
          }
        ],
        "name": "applyChainUpdates",
        "payable": false
      },
      "contractInputsValues": null
    }
  ]
}
```

## Development

```bash
# Build the project
pnpm build

# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## Type Generation

The project uses TypeChain to generate TypeScript types from contract ABIs:

```bash
# Generate types from ABIs
pnpm typechain
```

## Error Handling

The tool validates input JSON against a schema and provides detailed error messages for:

- Invalid JSON format
- Invalid Ethereum addresses
- Invalid rate limiter configurations
- Missing required fields
- Missing required parameters for Safe Transaction Builder JSON

## Output

The tool can generate:

- Raw calldata for direct contract interaction
- Safe Transaction Builder JSON for use with Safe Transaction Builder
- Output can be written to stdout or a file

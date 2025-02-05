# Token Pools Calldata Generator

A tool to generate calldata for TokenPool contract interactions, specifically for the `applyChainUpdates` function. Supports both raw calldata and Safe Transaction Builder JSON formats.

## Prerequisites

- Node.js >= 20.0.0
- pnpm

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
│   └── chain-update.json
├── src/
│   ├── generators/  # Calldata generation logic
│   ├── types/      # TypeScript types and validation
│   └── utils/      # Utility functions
```

## Usage

### Generate Chain Update Calldata

```bash
# Generate raw calldata
pnpm start generate-chain-update --input examples/chain-update.json

# Generate Safe Transaction Builder JSON
pnpm start generate-chain-update --input examples/chain-update.json --format safe-json --chain-id 11155111 --safe 0xbF6512B1bBEeC3a673Feff43C0A182C2b28DFD9f --owner 0x0000000000000000000000000000000000000000 --token-pool 0x1234567890123456789012345678901234567890 --output output.json

# Save output to a file
pnpm start generate-chain-update --input examples/chain-update.json --output output.txt

# Show help
pnpm start generate-chain-update --help
```

### Command Options

- `--input <path>`: Path to input JSON file (required)
- `--output <path>`: Path to output file (optional, defaults to stdout)
- `--format <type>`: Output format: "calldata" or "safe-json" (optional, defaults to "calldata")
- `--safe <address>`: Safe address for safe-json format (optional, defaults to "--SAFE--")
- `--owner <address>`: Owner address for safe-json format (optional, defaults to "--OWNER--")
- `--chain-id <id>`: Chain ID for safe-json format (required for safe-json)
- `--token-pool <address>`: Token Pool contract address (optional, defaults to "0xYOUR_POOL_ADDRESS")

### Input Format

The input JSON file should follow this structure:

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

### Output Formats

#### Raw Calldata

Outputs the encoded function calldata as a hex string.

#### Safe Transaction Builder JSON

Outputs a JSON file compatible with the Safe Transaction Builder format. Note that the TokenPool address is set to a placeholder ("0xYOUR_POOL_ADDRESS") which should be replaced with the actual address in the Safe Transaction Builder UI:

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
- Safe Transaction Builder JSON for use with Safe Transaction Builder (with placeholder TokenPool address)
- Output can be written to stdout or a file

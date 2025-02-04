# Token Pools Calldata Generator

A tool to generate calldata for TokenPool contract interactions, specifically for the `applyChainUpdates` function.

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
│   └── chain-update.json
├── src/
│   ├── generators/  # Calldata generation logic
│   ├── types/      # TypeScript types and validation
│   └── utils/      # Utility functions
```

## Usage

### Generate Chain Update Calldata

```bash
# Using ts-node (development)
pnpm start generate-chain-update -i examples/chain-update.json

# Save output to a file
pnpm start generate-chain-update -i examples/chain-update.json -o output.txt

# Show help
pnpm start generate-chain-update --help
```

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

### Example Files

Check the `examples/` directory for sample input files:

- `chain-update.json`: Example of adding multiple chain updates

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

## Output

The tool generates calldata that can be used to call the `applyChainUpdates` function on the TokenPool contract. The output is either:

- Printed to stdout
- Written to a specified output file

#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for TokenPool calldata generation tool.
 *
 * This module implements the command-line interface for generating transaction
 * calldata for Chainlink CCIP TokenPool contract interactions. Built with
 * Commander.js, it provides 7 commands for different TokenPool operations.
 *
 * Architecture:
 * - **Commander.js**: CLI framework with command parsing
 * - **Service Container**: Dependency injection for transaction generation
 * - **Output Service**: Handles calldata and Safe JSON output
 * - **Error Handling**: Automatic wrapping with user-friendly messages
 * - **Validation**: Pre-execution validation of all parameters
 *
 * Available Commands:
 * 1. `generate-chain-update` - Configure cross-chain connections
 * 2. `generate-token-deployment` - Deploy token + pool via factory
 * 3. `generate-pool-deployment` - Deploy pool for existing token
 * 4. `generate-mint` - Mint tokens (requires minter role)
 * 5. `generate-grant-roles` - Grant/revoke mint/burn roles
 * 6. `generate-allow-list-updates` - Update sender allow lists
 * 7. `generate-rate-limiter-config` - Configure token bucket rate limits
 *
 * Output Formats:
 * - **Calldata** (default): Raw hex-encoded function calls for direct execution
 * - **Safe JSON**: Formatted JSON for Safe Transaction Builder UI
 * - **JSON**: Wallet-agnostic transaction JSON with to, value, data fields
 *
 * Common Usage Pattern:
 * ```bash
 * token-pools-calldata <command> \
 *   -i input.json \
 *   -o output.txt \
 *   -f calldata \
 *   [command-specific-options]
 * ```
 *
 * @module cli
 * @see {@link https://github.com/tj/commander.js} Commander.js documentation
 * @see {@link https://docs.chain.link/ccip} Chainlink CCIP documentation
 */

import { Command, Option } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { getServiceContainer } from './services';
import { OUTPUT_FORMAT } from './config';
import { withErrorHandling } from './cli/errorHandler';
import { OutputService } from './output';
import {
  validateChainUpdateOptions,
  validateTokenDeploymentOptions,
  validatePoolDeploymentOptions,
  validateMintOptions,
  validateAllowListOptions,
  validateRateLimiterOptions,
  validateGrantRolesOptions,
  validateRegisterAdminOptions,
  validateTokenAdminRegistryOptions,
} from './validators';

// Get service container with all dependencies wired up
const container = getServiceContainer();
const transactionService = container.transactionService;
const outputService = new OutputService();

/**
 * Base options interface shared across all CLI commands.
 *
 * @remarks
 * Common Parameters:
 * - **input**: Path to JSON input file (required for most commands)
 * - **output**: Path to output file (optional, defaults to stdout)
 * - **format**: Output format (calldata or safe-json)
 * - **safe**: Safe multisig address (required for safe-json format)
 * - **owner**: Safe owner address (required for safe-json format)
 * - **chainId**: Chain ID (required for safe-json format)
 *
 * @internal
 */
interface BaseOptions {
  /** Path to JSON input file */
  input: string;

  /** Path to output file (optional, defaults to stdout) */
  output?: string;

  /** Output format: 'calldata' (default), 'safe-json', or 'json' */
  format?:
    | typeof OUTPUT_FORMAT.CALLDATA
    | typeof OUTPUT_FORMAT.SAFE_JSON
    | typeof OUTPUT_FORMAT.JSON;

  /** Safe multisig contract address (required for safe-json format) */
  safe?: string;

  /** Safe owner address (required for safe-json format) */
  owner?: string;

  /** Chain ID where transaction will be executed (required for safe-json format) */
  chainId?: string;
}

/**
 * Options for chain update command (`generate-chain-update`).
 *
 * @remarks
 * Extends BaseOptions with TokenPool address parameter.
 * Used to configure cross-chain connections (add/remove remote chains).
 *
 * @internal
 */
interface ChainUpdateOptions extends BaseOptions {
  /** TokenPool contract address (optional, defaults to placeholder) */
  tokenPool?: string;
}

/**
 * Base options for deployment commands.
 *
 * @remarks
 * Shared by token and pool deployment commands. Includes factory address
 * and CREATE2 salt for deterministic deployment.
 *
 * @internal
 */
interface BaseDeploymentOptions extends BaseOptions {
  /** TokenPoolFactory contract address */
  deployer: string;

  /** 32-byte salt for CREATE2 deterministic deployment */
  salt: string;

  /** Safe address (required for deployments with safe-json format) */
  safe: string;
}

/**
 * Options for token deployment command (`generate-token-deployment`).
 *
 * @remarks
 * Deploys both BurnMintERC20 token and TokenPool in a single transaction
 * via TokenPoolFactory.deployToken().
 *
 * @internal
 */
interface TokenDeploymentOptions extends BaseDeploymentOptions {}

/**
 * Options for pool deployment command (`generate-pool-deployment`).
 *
 * @remarks
 * Deploys TokenPool for an existing token via TokenPoolFactory.deployPool().
 *
 * @internal
 */
interface PoolDeploymentOptions extends BaseDeploymentOptions {}

/**
 * Options for mint command (`generate-mint`).
 *
 * @remarks
 * Generates mint transaction for BurnMintERC20 tokens. Requires minter role.
 *
 * @internal
 */
interface MintOptions extends BaseOptions {
  /** Token contract address */
  token: string;

  /** Receiver address for minted tokens */
  receiver: string;

  /** Amount to mint (string for large numbers, e.g., "1000000000000000000000") */
  amount: string;
}

/**
 * Options for grant roles command (`generate-grant-roles`).
 *
 * @remarks
 * Grants or revokes mint/burn roles to/from a TokenPool. Required before
 * the pool can burn/mint tokens for cross-chain transfers.
 *
 * @internal
 */
interface GrantRolesOptions extends BaseOptions {
  /** Token contract address */
  token: string;

  /** Pool contract address to grant/revoke roles */
  pool: string;

  /** Role type: 'mint', 'burn', or 'both' (default: 'both') */
  roleType?: 'mint' | 'burn' | 'both';

  /** Action: 'grant' or 'revoke' (default: 'grant') */
  action?: 'grant' | 'revoke';
}

/**
 * Options for allow list updates command (`generate-allow-list-updates`).
 *
 * @remarks
 * Updates the sender allow list for a TokenPool. Controls which
 * addresses can send/receive tokens through the pool.
 *
 * @internal
 */
interface AllowListUpdatesOptions extends BaseOptions {
  /** Path to JSON input file with allow list updates */
  input: string;

  /** TokenPool contract address */
  pool: string;
}

/**
 * Options for rate limiter config command (`generate-rate-limiter-config`).
 *
 * @remarks
 * Configures token bucket rate limiter for a TokenPool. Controls maximum
 * transfer capacity and refill rate.
 *
 * @internal
 */
interface RateLimiterConfigOptions extends BaseOptions {
  /** Path to JSON input file with rate limiter configuration */
  input: string;

  /** TokenPool contract address */
  pool: string;
}

/**
 * Options for accept ownership command (`generate-accept-ownership`).
 *
 * @remarks
 * Accepts ownership of a contract using two-step ownership transfer pattern.
 * Works with any Chainlink contract (tokens, pools, etc.) using this pattern.
 *
 * @internal
 */
interface AcceptOwnershipOptions {
  /** Contract address to accept ownership of */
  address: string;

  /** Path to output file (optional, defaults to stdout) */
  output?: string;

  /** Output format: 'calldata' (default), 'safe-json', or 'json' */
  format?:
    | typeof OUTPUT_FORMAT.CALLDATA
    | typeof OUTPUT_FORMAT.SAFE_JSON
    | typeof OUTPUT_FORMAT.JSON;

  /** Safe multisig contract address (required for safe-json format) */
  safe?: string;

  /** Safe owner address (required for safe-json format) */
  owner?: string;

  /** Chain ID where transaction will be executed (required for safe-json format) */
  chainId?: string;
}

/**
 * Options for register admin command (`generate-register-admin`).
 *
 * @remarks
 * Registers as the CCIP admin for a token via the RegistryModuleOwnerCustom contract.
 *
 * @internal
 */
interface RegisterAdminOptions {
  /** RegistryModuleOwnerCustom contract address */
  module: string;

  /** Token contract address */
  token: string;

  /** Registration method: 'get-ccip-admin', 'owner', or 'access-control' */
  method: 'get-ccip-admin' | 'owner' | 'access-control';

  /** Path to output file (optional, defaults to stdout) */
  output?: string;

  /** Output format: 'calldata' (default), 'safe-json', or 'json' */
  format?:
    | typeof OUTPUT_FORMAT.CALLDATA
    | typeof OUTPUT_FORMAT.SAFE_JSON
    | typeof OUTPUT_FORMAT.JSON;

  /** Safe multisig contract address (required for safe-json format) */
  safe?: string;

  /** Safe owner address (required for safe-json format) */
  owner?: string;

  /** Chain ID where transaction will be executed (required for safe-json format) */
  chainId?: string;
}

/**
 * Options for token admin registry command (`generate-token-admin-registry`).
 *
 * @remarks
 * Interacts with the TokenAdminRegistry contract for managing token pool associations
 * and admin role transfers.
 *
 * @internal
 */
interface TokenAdminRegistryOptions {
  /** TokenAdminRegistry contract address */
  tokenAdminRegistry: string;

  /** Token contract address */
  token: string;

  /** Method: 'set-pool', 'transfer-admin', or 'accept-admin' */
  method: 'set-pool' | 'transfer-admin' | 'accept-admin';

  /** Pool address (required for set-pool method) */
  pool?: string;

  /** New admin address (required for transfer-admin method) */
  newAdmin?: string;

  /** Path to output file (optional, defaults to stdout) */
  output?: string;

  /** Output format: 'calldata' (default), 'safe-json', or 'json' */
  format?:
    | typeof OUTPUT_FORMAT.CALLDATA
    | typeof OUTPUT_FORMAT.SAFE_JSON
    | typeof OUTPUT_FORMAT.JSON;

  /** Safe multisig contract address (required for safe-json format) */
  safe?: string;

  /** Safe owner address (required for safe-json format) */
  owner?: string;

  /** Chain ID where transaction will be executed (required for safe-json format) */
  chainId?: string;
}

/**
 * Creates and configures the Commander.js program instance.
 *
 * Factory function that initializes the root Command with program metadata.
 * Commands are added to this instance later in the module.
 *
 * @returns Configured Commander.js Command instance
 *
 * @remarks
 * Program Configuration:
 * - **name**: 'token-pools-calldata'
 * - **description**: Brief summary of tool purpose
 * - **version**: Current version from package.json
 *
 * @internal
 */
function createProgram(): Command {
  return new Command()
    .name('token-pools-calldata')
    .description('Generate calldata for TokenPool contract interactions')
    .version('1.0.0');
}

/**
 * Handles the `generate-chain-update` command.
 *
 * Generates calldata for configuring cross-chain connections on a TokenPool.
 * Reads chain update configuration from JSON input file and generates transaction.
 *
 * @param options - Command options from Commander.js
 *
 * @remarks
 * Workflow:
 * 1. Validate options (chain ID, safe address if safe-json format)
 * 2. Read input JSON file
 * 3. Build metadata for Safe JSON (if applicable)
 * 4. Generate transaction via TransactionService
 * 5. Write output using OutputService
 *
 * Input JSON Format:
 * ```json
 * {
 *   "chainsToAdd": [{ "remoteChainSelector": "...", ... }],
 *   "chainsToRemove": ["..."]
 * }
 * ```
 *
 * @internal
 */
async function handleChainUpdate(options: ChainUpdateOptions): Promise<void> {
  validateChainUpdateOptions(options);

  const inputPath = path.resolve(options.input);
  const inputJson = await fs.readFile(inputPath, 'utf-8');

  // Use TransactionService to generate transaction and Safe JSON
  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          tokenPoolAddress: options.tokenPool || '0xYOUR_POOL_ADDRESS',
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateChainUpdate(
    inputJson,
    options.tokenPool || '0xYOUR_POOL_ADDRESS',
    metadata,
  );

  // Write output using OutputService
  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-token-deployment` command.
 *
 * Generates deployment transaction for BurnMintERC20 token and TokenPool via
 * TokenPoolFactory.deployToken(). Uses CREATE2 for deterministic addresses.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleTokenDeployment(options: TokenDeploymentOptions): Promise<void> {
  validateTokenDeploymentOptions(options);

  const inputPath = path.resolve(options.input);
  const inputJson = await fs.readFile(inputPath, 'utf-8');

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe,
          ownerAddress: options.owner!,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateTokenDeployment(
    inputJson,
    options.deployer,
    options.salt,
    options.safe,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-pool-deployment` command.
 *
 * Generates deployment transaction for TokenPool (without token) via
 * TokenPoolFactory.deployPool(). For existing tokens.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handlePoolDeployment(options: PoolDeploymentOptions): Promise<void> {
  validatePoolDeploymentOptions(options);

  const inputPath = path.resolve(options.input);
  const inputJson = await fs.readFile(inputPath, 'utf-8');

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe,
          ownerAddress: options.owner!,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generatePoolDeployment(
    inputJson,
    options.deployer,
    options.salt,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-mint` command.
 *
 * Generates mint transaction for BurnMintERC20 tokens. Requires minter role
 * to be granted to the transaction sender.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleMint(options: MintOptions): Promise<void> {
  validateMintOptions(options);

  // Create input JSON from command line options
  const inputJson = JSON.stringify({
    receiver: options.receiver,
    amount: options.amount,
  });

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          tokenAddress: options.token,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateMint(
    inputJson,
    options.token,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-allow-list-updates` command.
 *
 * Generates transaction to update TokenPool allow list. Controls which addresses
 * can send/receive tokens through the pool.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleAllowListUpdates(options: AllowListUpdatesOptions): Promise<void> {
  validateAllowListOptions(options);

  const inputPath = path.resolve(options.input);
  const inputJson = await fs.readFile(inputPath, 'utf-8');

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          tokenPoolAddress: options.pool,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateAllowListUpdates(
    inputJson,
    options.pool,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-rate-limiter-config` command.
 *
 * Generates transaction to configure TokenPool rate limiter. Implements token bucket
 * algorithm to control transfer rate (capacity + refill rate per chain).
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleRateLimiterConfig(options: RateLimiterConfigOptions): Promise<void> {
  validateRateLimiterOptions(options);

  const inputPath = path.resolve(options.input);
  const inputJson = await fs.readFile(inputPath, 'utf-8');

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          tokenPoolAddress: options.pool,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateRateLimiterConfig(
    inputJson,
    options.pool,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-grant-roles` command.
 *
 * Generates transaction(s) to grant or revoke mint/burn roles. Required before
 * a TokenPool can burn/mint tokens for cross-chain transfers.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleGrantRoles(options: GrantRolesOptions): Promise<void> {
  validateGrantRolesOptions(options);

  // Create input JSON from command line options
  const inputJson = JSON.stringify({
    pool: options.pool,
    roleType: options.roleType || 'both',
    action: options.action || 'grant',
  });

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          tokenAddress: options.token,
        }
      : undefined;

  const { transactions, safeJson } = await transactionService.generateRoleManagement(
    inputJson,
    options.token,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transactions,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-accept-ownership` command.
 *
 * Generates transaction to accept ownership of a contract using the two-step
 * ownership transfer pattern. Works with any Chainlink contract (tokens, pools, etc.).
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleAcceptOwnership(options: AcceptOwnershipOptions): Promise<void> {
  // Validate safe-json format requirements
  if (options.format === OUTPUT_FORMAT.SAFE_JSON) {
    if (!options.chainId || !options.safe || !options.owner) {
      throw new Error(
        'Chain ID (-c), safe address (-s), and owner address (-w) are required for safe-json format',
      );
    }
  }

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          contractAddress: options.address,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateAcceptOwnership(
    options.address,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-register-admin` command.
 *
 * Generates transaction to register as the CCIP admin for a token via the
 * RegistryModuleOwnerCustom contract.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleRegisterAdmin(options: RegisterAdminOptions): Promise<void> {
  validateRegisterAdminOptions(options);

  // Create input JSON from command line options
  const inputJson = JSON.stringify({
    moduleAddress: options.module,
    tokenAddress: options.token,
    method: options.method,
  });

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          moduleAddress: options.module,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateRegisterAdmin(
    inputJson,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

/**
 * Handles the `generate-token-admin-registry` command.
 *
 * Generates transaction for TokenAdminRegistry operations: set-pool,
 * transfer-admin, or accept-admin.
 *
 * @param options - Command options from Commander.js
 * @internal
 */
async function handleTokenAdminRegistry(options: TokenAdminRegistryOptions): Promise<void> {
  validateTokenAdminRegistryOptions(options);

  // Create input JSON from command line options based on method
  const inputData: Record<string, string> = {
    registryAddress: options.tokenAdminRegistry,
    tokenAddress: options.token,
    method: options.method,
  };

  // Add method-specific fields
  if (options.method === 'set-pool' && options.pool) {
    inputData.poolAddress = options.pool;
  }
  if (options.method === 'transfer-admin' && options.newAdmin) {
    inputData.newAdminAddress = options.newAdmin;
  }

  const inputJson = JSON.stringify(inputData);

  const metadata =
    options.format === OUTPUT_FORMAT.SAFE_JSON
      ? {
          chainId: options.chainId!,
          safeAddress: options.safe!,
          ownerAddress: options.owner!,
          registryAddress: options.tokenAdminRegistry,
        }
      : undefined;

  const { transaction, safeJson } = await transactionService.generateTokenAdminRegistry(
    inputJson,
    metadata,
  );

  await outputService.write(
    options.format || OUTPUT_FORMAT.CALLDATA,
    transaction,
    safeJson,
    options.output,
  );
}

// Initialize the program
const program = createProgram();

// Add commands
program
  .command('generate-chain-update')
  .description('Generate calldata for applyChainUpdates function')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (for safe-json format)')
  .option(
    '-p, --token-pool <address>',
    'Token Pool contract address (optional, defaults to placeholder)',
  )
  .action(withErrorHandling(handleChainUpdate, 'generate-chain-update'));

program
  .command('generate-token-deployment')
  .description('Generate deployment transaction for BurnMintERC20 token and pool')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .requiredOption('-d, --deployer <address>', 'TokenPoolFactory contract address')
  .requiredOption('--salt <bytes32>', 'Salt for create2')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleTokenDeployment as (options: TokenDeploymentOptions) => Promise<void>,
      'generate-token-deployment',
    ),
  );

program
  .command('generate-pool-deployment')
  .description('Generate deployment transaction for TokenPool')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .requiredOption('-d, --deployer <address>', 'TokenPoolFactory contract address')
  .requiredOption('--salt <bytes32>', 'Salt for create2')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handlePoolDeployment as (options: PoolDeploymentOptions) => Promise<void>,
      'generate-pool-deployment',
    ),
  );

program
  .command('generate-mint')
  .description('Generate mint transaction for BurnMintERC20 token')
  .requiredOption('-t, --token <address>', 'Token contract address')
  .requiredOption('-r, --receiver <address>', 'Receiver address')
  .requiredOption('-a, --amount <amount>', 'Amount to mint (as string for large numbers)')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(handleMint as (options: MintOptions) => Promise<void>, 'generate-mint'),
  );

program
  .command('generate-grant-roles')
  .description('Generate transaction to grant or revoke mint/burn roles to/from token pool')
  .requiredOption('-t, --token <address>', 'Token contract address')
  .requiredOption('-p, --pool <address>', 'Pool contract address')
  .addOption(
    new Option('--role-type <type>', 'Role type').choices(['mint', 'burn', 'both']).default('both'),
  )
  .addOption(
    new Option('--action <type>', 'Action to perform')
      .choices(['grant', 'revoke'])
      .default('grant'),
  )
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleGrantRoles as (options: GrantRolesOptions) => Promise<void>,
      'generate-grant-roles',
    ),
  );

program
  .command('generate-allow-list-updates')
  .description('Generate transaction to update token pool allow list')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .requiredOption('-p, --pool <address>', 'Token pool contract address')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleAllowListUpdates as (options: AllowListUpdatesOptions) => Promise<void>,
      'generate-allow-list-updates',
    ),
  );

program
  .command('generate-rate-limiter-config')
  .description('Generate transaction to update chain rate limiter configuration')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .requiredOption('-p, --pool <address>', 'Token pool contract address')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleRateLimiterConfig as (options: RateLimiterConfigOptions) => Promise<void>,
      'generate-rate-limiter-config',
    ),
  );

program
  .command('generate-accept-ownership')
  .description('Generate transaction to accept ownership of a contract (token, pool, etc.)')
  .requiredOption('-a, --address <address>', 'Contract address to accept ownership of')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleAcceptOwnership as (options: AcceptOwnershipOptions) => Promise<void>,
      'generate-accept-ownership',
    ),
  );

program
  .command('generate-register-admin')
  .description('Generate transaction to register as CCIP admin for a token')
  .requiredOption('-m, --module <address>', 'RegistryModuleOwnerCustom contract address')
  .requiredOption('-t, --token <address>', 'Token address')
  .addOption(
    new Option('--method <type>', 'Registration method')
      .choices(['get-ccip-admin', 'owner', 'access-control'])
      .makeOptionMandatory(true),
  )
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleRegisterAdmin as (options: RegisterAdminOptions) => Promise<void>,
      'generate-register-admin',
    ),
  );

program
  .command('generate-token-admin-registry')
  .description(
    'Generate transaction for TokenAdminRegistry operations (set-pool, transfer-admin, accept-admin)',
  )
  .requiredOption('--token-admin-registry <address>', 'TokenAdminRegistry contract address')
  .requiredOption('--token <address>', 'Token address')
  .addOption(
    new Option('--method <type>', 'Method to call')
      .choices(['set-pool', 'transfer-admin', 'accept-admin'])
      .makeOptionMandatory(true),
  )
  .option('--pool <address>', 'Pool address (required for set-pool method)')
  .option('--new-admin <address>', 'New admin address (required for transfer-admin method)')
  .option('--output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('--format <type>', 'Output format')
      .choices([OUTPUT_FORMAT.CALLDATA, OUTPUT_FORMAT.SAFE_JSON, OUTPUT_FORMAT.JSON])
      .default(OUTPUT_FORMAT.CALLDATA),
  )
  .option('--safe <address>', 'Safe address (required for safe-json format)')
  .option('--owner <address>', 'Owner address (required for safe-json format)')
  .option('--chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(
    withErrorHandling(
      handleTokenAdminRegistry as (options: TokenAdminRegistryOptions) => Promise<void>,
      'generate-token-admin-registry',
    ),
  );

// Parse command line arguments
void program.parse(process.argv);

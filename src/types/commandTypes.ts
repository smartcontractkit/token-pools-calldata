/**
 * @fileoverview Discriminated union types for CLI command configurations.
 *
 * This module defines TypeScript types for all CLI commands using discriminated unions
 * to provide better type safety and enable exhaustive checking. The command types support
 * two output formats: raw calldata and Safe Transaction Builder JSON.
 *
 * Discriminated unions allow the TypeScript compiler to narrow types based on the command
 * type, ensuring correct parameters are provided for each command variant.
 *
 * @module types/commandTypes
 */

import { OUTPUT_FORMAT } from '../config';

/**
 * Base command configuration shared across all commands.
 *
 * Provides the optional output file path that all commands support.
 *
 * @remarks
 * If output is not specified, results are written to stdout.
 *
 * @internal
 */
interface BaseCommandConfig {
  /** Optional output file path (if not provided, writes to stdout) */
  output?: string;
}

/**
 * Configuration for commands that output Safe Transaction Builder JSON format.
 *
 * When using Safe JSON format, additional metadata is required to generate
 * transactions compatible with the Safe Transaction Builder UI.
 *
 * @remarks
 * Safe JSON format requires:
 * - Chain ID where transaction will be executed
 * - Safe multisig contract address
 * - Owner address executing the transaction
 *
 * @example
 * ```typescript
 * const safeConfig: SafeJsonConfig = {
 *   format: OUTPUT_FORMAT.SAFE_JSON,
 *   chainId: "84532",                                       // Base Sepolia
 *   safe: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   owner: "0x0000000000000000000000000000000000000000"
 * };
 * ```
 *
 * @see {@link OUTPUT_FORMAT} for format constant values
 *
 * @public
 */
interface SafeJsonConfig {
  /** Output format must be 'safe-json' */
  format: typeof OUTPUT_FORMAT.SAFE_JSON;

  /** Chain ID where transaction will be executed */
  chainId: string;

  /** Safe multisig contract address */
  safe: string;

  /** Owner address executing the transaction */
  owner: string;
}

/**
 * Configuration for commands that output raw calldata format.
 *
 * Calldata format is the default and requires no additional metadata.
 *
 * @remarks
 * Calldata format outputs hex-encoded function call data that can be:
 * - Used directly with web3 libraries
 * - Pasted into block explorers
 * - Used with cast send (Foundry)
 * - Manually constructed transactions
 *
 * @example
 * ```typescript
 * const calldataConfig: CalldataConfig = {
 *   format: OUTPUT_FORMAT.CALLDATA  // Optional, this is the default
 * };
 * ```
 *
 * @see {@link OUTPUT_FORMAT} for format constant values
 *
 * @public
 */
interface CalldataConfig {
  /** Optional output format (defaults to 'calldata') */
  format?: typeof OUTPUT_FORMAT.CALLDATA;
}

/**
 * Discriminated union for output format configurations.
 *
 * Commands can output either Safe JSON or raw calldata format.
 * The format determines what additional parameters are required.
 *
 * @example
 * ```typescript
 * function processOutput(config: OutputConfig) {
 *   if (isSafeJsonConfig(config)) {
 *     // TypeScript knows config has chainId, safe, owner
 *     console.log(`Safe: ${config.safe}, Chain: ${config.chainId}`);
 *   } else {
 *     // TypeScript knows config is CalldataConfig
 *     console.log('Outputting raw calldata');
 *   }
 * }
 * ```
 *
 * @public
 */
export type OutputConfig = SafeJsonConfig | CalldataConfig;

/**
 * Type guard to check if configuration uses Safe JSON format.
 *
 * Enables TypeScript type narrowing to access Safe-specific properties.
 *
 * @param config - Output configuration to check
 * @returns True if config uses Safe JSON format
 *
 * @example
 * ```typescript
 * const config: OutputConfig = getConfig();
 *
 * if (isSafeJsonConfig(config)) {
 *   // TypeScript knows config is SafeJsonConfig
 *   const metadata = {
 *     chainId: config.chainId,
 *     safeAddress: config.safe,
 *     ownerAddress: config.owner
 *   };
 * }
 * ```
 *
 * @public
 */
export function isSafeJsonConfig(config: OutputConfig): config is SafeJsonConfig {
  return 'format' in config && config.format === OUTPUT_FORMAT.SAFE_JSON;
}

/**
 * Chain update command configuration.
 *
 * Used for `generate-chain-update` CLI command which updates TokenPool
 * cross-chain configurations (adding/removing chains).
 *
 * @remarks
 * Parameters:
 * - **input**: Path to JSON file with chain update configuration
 * - **tokenPool**: Optional TokenPool address (required for Safe JSON format)
 *
 * @example
 * ```typescript
 * const command: ChainUpdateCommand = {
 *   input: "examples/chain-update.json",
 *   tokenPool: "0x1234567890123456789012345678901234567890",
 *   format: OUTPUT_FORMAT.SAFE_JSON,
 *   chainId: "84532",
 *   safe: "0xSafe",
 *   owner: "0xOwner",
 *   output: "output/chain-update.json"
 * };
 * ```
 *
 * @public
 */
export type ChainUpdateCommand = BaseCommandConfig &
  OutputConfig & {
    /** Path to JSON file containing chain update parameters */
    input: string;

    /** Optional TokenPool address (required for Safe JSON format) */
    tokenPool?: string;
  };

/**
 * Deployment command configuration for token and pool deployment.
 *
 * Used for `generate-token-deployment` and `generate-pool-deployment` CLI commands.
 *
 * @remarks
 * Parameters:
 * - **input**: Path to JSON file with deployment parameters
 * - **deployer**: TokenPoolFactory contract address
 * - **salt**: 32-byte salt value for CREATE2 deployment
 *
 * @example
 * ```typescript
 * const command: DeploymentCommand = {
 *   input: "examples/token-deployment.json",
 *   deployer: "0x17d8a409fe2cef2d3808bcb61f14abeffc28876e",
 *   salt: "0x0000000000000000000000000000000000000000000000000000000123456789",
 *   format: OUTPUT_FORMAT.SAFE_JSON,
 *   chainId: "84532",
 *   safe: "0xSafe",
 *   owner: "0xOwner"
 * };
 * ```
 *
 * @public
 */
export type DeploymentCommand = BaseCommandConfig &
  OutputConfig & {
    /** Path to JSON file containing deployment parameters */
    input: string;

    /** TokenPoolFactory contract address */
    deployer: string;

    /** 32-byte salt value for CREATE2 deployment (hex string) */
    salt: string;
  };

/**
 * Mint command configuration.
 *
 * Used for `generate-mint` CLI command which mints tokens to a receiver.
 *
 * @remarks
 * Parameters:
 * - **token**: BurnMintERC20 token contract address
 * - **receiver**: Address receiving the minted tokens
 * - **amount**: Amount to mint in wei (as string)
 *
 * @example
 * ```typescript
 * const command: MintCommand = {
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   receiver: "0x1234567890123456789012345678901234567890",
 *   amount: "1000000000000000000000",  // 1000 tokens
 *   format: OUTPUT_FORMAT.SAFE_JSON,
 *   chainId: "84532",
 *   safe: "0xSafe",
 *   owner: "0xOwner"
 * };
 * ```
 *
 * @public
 */
export type MintCommand = BaseCommandConfig &
  OutputConfig & {
    /** Token contract address */
    token: string;

    /** Receiver address for minted tokens */
    receiver: string;

    /** Amount to mint in wei (string to avoid precision issues) */
    amount: string;
  };

/**
 * Pool operation command configuration.
 *
 * Used for allow list updates and rate limiter configuration commands.
 *
 * @remarks
 * Parameters:
 * - **input**: Path to JSON file with operation parameters
 * - **pool**: TokenPool contract address
 *
 * @example
 * ```typescript
 * const command: PoolOperationCommand = {
 *   input: "examples/allow-list.json",
 *   pool: "0x1234567890123456789012345678901234567890",
 *   format: OUTPUT_FORMAT.CALLDATA,
 *   output: "output/allow-list.txt"
 * };
 * ```
 *
 * @public
 */
export type PoolOperationCommand = BaseCommandConfig &
  OutputConfig & {
    /** Path to JSON file containing operation parameters */
    input: string;

    /** TokenPool contract address */
    pool: string;
  };

/**
 * Grant roles command configuration.
 *
 * Used for `generate-grant-roles` CLI command which grants or revokes
 * mint and burn roles on BurnMintERC20 tokens.
 *
 * @remarks
 * Parameters:
 * - **token**: BurnMintERC20 token contract address
 * - **pool**: Pool or address receiving role grant/revoke
 * - **roleType**: Type of role(s) - 'mint', 'burn', or 'both' (defaults to 'both')
 * - **action**: 'grant' or 'revoke' (defaults to 'grant')
 *
 * @example
 * ```typescript
 * const command: GrantRolesCommand = {
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   pool: "0x1234567890123456789012345678901234567890",
 *   roleType: "both",  // Optional, defaults to 'both'
 *   action: "grant",   // Optional, defaults to 'grant'
 *   format: OUTPUT_FORMAT.SAFE_JSON,
 *   chainId: "84532",
 *   safe: "0xSafe",
 *   owner: "0xOwner"
 * };
 * ```
 *
 * @public
 */
export type GrantRolesCommand = BaseCommandConfig &
  OutputConfig & {
    /** Token contract address */
    token: string;

    /** Pool or address receiving role grant/revoke */
    pool: string;

    /** Type of role(s) to manage - defaults to 'both' */
    roleType?: 'mint' | 'burn' | 'both';

    /** Action to perform - defaults to 'grant' */
    action?: 'grant' | 'revoke';
  };

/**
 * Accept ownership command configuration.
 *
 * Used for `generate-accept-ownership` CLI command which accepts ownership
 * of contracts using the two-step ownership transfer pattern.
 *
 * @remarks
 * Parameters:
 * - **address**: Contract address to accept ownership of (token, pool, or any contract with two-step ownership)
 *
 * Two-Step Ownership Pattern:
 * 1. Current owner calls `transferOwnership(newOwner)` - sets `pendingOwner`
 * 2. New owner (the Safe) calls `acceptOwnership()` - becomes the actual `owner`
 *
 * Common Use Cases:
 * - After TokenPoolFactory deployment, Safe is set as pendingOwner on both token and pool
 * - Safe must accept ownership before it can call owner-only functions like `applyChainUpdates`
 *
 * @example
 * ```typescript
 * const command: AcceptOwnershipCommand = {
 *   address: "0x1234567890123456789012345678901234567890",
 *   format: OUTPUT_FORMAT.SAFE_JSON,
 *   chainId: "84532",
 *   safe: "0xSafe",
 *   owner: "0xOwner"
 * };
 * ```
 *
 * @public
 */
export type AcceptOwnershipCommand = BaseCommandConfig &
  OutputConfig & {
    /** Contract address to accept ownership of (token, pool, etc.) */
    address: string;
  };

/**
 * Discriminated union of all CLI command types.
 *
 * Each command variant has a unique 'type' discriminator enabling exhaustive
 * type checking and pattern matching.
 *
 * @remarks
 * Command Types:
 * - **chain-update**: Update TokenPool chain configurations
 * - **token-deployment**: Deploy BurnMintERC20 token with pool
 * - **pool-deployment**: Deploy pool for existing token
 * - **mint**: Mint tokens to receiver
 * - **allow-list**: Update TokenPool allow list
 * - **rate-limiter**: Configure TokenPool rate limiters
 * - **grant-roles**: Grant/revoke mint and burn roles
 * - **accept-ownership**: Accept ownership of a contract
 *
 * @example
 * ```typescript
 * function handleCommand(command: Command) {
 *   switch (command.type) {
 *     case 'chain-update':
 *       // TypeScript knows command is ChainUpdateCommand
 *       return handleChainUpdate(command);
 *     case 'token-deployment':
 *       // TypeScript knows command is DeploymentCommand
 *       return handleTokenDeployment(command);
 *     case 'mint':
 *       // TypeScript knows command is MintCommand
 *       return handleMint(command);
 *     // ... handle other cases
 *     default:
 *       // Exhaustiveness check: TypeScript error if case missed
 *       const _exhaustive: never = command;
 *       throw new Error(`Unknown command type: ${_exhaustive}`);
 *   }
 * }
 * ```
 *
 * @public
 */
export type Command =
  | ({ type: 'chain-update' } & ChainUpdateCommand)
  | ({ type: 'token-deployment' } & DeploymentCommand)
  | ({ type: 'pool-deployment' } & DeploymentCommand)
  | ({ type: 'mint' } & MintCommand)
  | ({ type: 'allow-list' } & PoolOperationCommand)
  | ({ type: 'rate-limiter' } & PoolOperationCommand)
  | ({ type: 'grant-roles' } & GrantRolesCommand)
  | ({ type: 'accept-ownership' } & AcceptOwnershipCommand);

/**
 * Type guard for command discrimination.
 *
 * Checks if an unknown value is a valid Command with a type discriminator.
 *
 * @param value - Value to check
 * @returns True if value is a Command
 *
 * @remarks
 * This is a lightweight check that only validates the presence of a 'type'
 * field. Full validation is done by command-specific validators.
 *
 * @example
 * ```typescript
 * const input: unknown = parseCliArgs();
 *
 * if (isCommand(input)) {
 *   // TypeScript knows input is Command
 *   handleCommand(input);
 * } else {
 *   throw new Error('Invalid command structure');
 * }
 * ```
 *
 * @public
 */
export function isCommand(value: unknown): value is Command {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Record<string, unknown>).type === 'string'
  );
}

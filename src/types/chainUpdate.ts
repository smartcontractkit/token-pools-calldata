/**
 * @fileoverview Type definitions and validation schemas for cross-chain pool configuration updates.
 *
 * This module defines the input parameters and validation rules for updating TokenPool chain
 * configurations via the applyChainUpdates function. Supports multi-chain architectures
 * including EVM (Ethereum), SVM (Solana), and MVM (Move-based chains, not yet implemented).
 *
 * Chain updates allow adding new remote chains or removing existing chains from a token pool's
 * cross-chain transfer configuration, with separate rate limiting for inbound and outbound transfers.
 *
 * @module types/chainUpdate
 */

import { z } from 'zod';

/**
 * Blockchain architecture type enumeration.
 *
 * Defines the supported blockchain architectures for cross-chain token transfers.
 * Each chain type has different address formats and encoding requirements.
 *
 * @remarks
 * Chain Types:
 * - **EVM**: Ethereum Virtual Machine chains (Ethereum, Base, Arbitrum, etc.)
 *   - Address format: 20-byte hex (e.g., `0x779877A7B0D9E8603169DdbD7836e478b4624789`)
 *   - Encoded as: `address` type in ABI encoding
 *
 * - **SVM**: Solana Virtual Machine (Solana, Solana-based chains)
 *   - Address format: 32-byte base58-encoded public key (e.g., `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
 *   - Encoded as: `bytes32` type in ABI encoding
 *
 * - **MVM**: Move Virtual Machine (Aptos, Sui, etc.)
 *   - Status: Not yet implemented
 *   - Planned for future support
 *
 * The chain type is used by address validators to ensure correct format and by
 * encoders to properly ABI-encode addresses for contract calls.
 *
 * @example
 * ```typescript
 * // EVM chain configuration
 * const evmChain: ChainType = ChainType.EVM;
 *
 * // SVM chain configuration
 * const svmChain: ChainType = ChainType.SVM;
 * ```
 *
 * @see {@link chainUpdateSchema} for usage in chain update validation
 *
 * @public
 */
export enum ChainType {
  /** Ethereum Virtual Machine chains (Ethereum, Base, Arbitrum, etc.) */
  EVM = 'evm',
  /** Solana Virtual Machine (Solana, Solana-based chains) */
  SVM = 'svm',
  /** Move Virtual Machine (Aptos, Sui) - not yet implemented */
  MVM = 'mvm',
}

/**
 * Zod schema for rate limiter configuration in chain updates.
 *
 * Defines token bucket rate limiter parameters that control the rate and capacity
 * of token transfers. This schema is identical to the one in poolDeployment.ts but
 * defined separately to avoid circular dependencies.
 *
 * @remarks
 * Token Bucket Algorithm:
 * - **isEnabled**: Enable/disable the rate limiter for this direction
 * - **capacity**: Maximum tokens in bucket (burst limit) as string wei
 * - **rate**: Token refill rate per second as string wei/sec
 *
 * Amount Format:
 * - Values are strings to avoid JavaScript number precision issues
 * - Represent token amounts in smallest unit (wei)
 * - Example: "1000000000000000000" = 1 token with 18 decimals
 *
 * Bidirectional Rate Limiting:
 * - Each chain connection has TWO rate limiters: inbound and outbound
 * - Outbound: Limits tokens sent FROM this pool TO remote chain
 * - Inbound: Limits tokens received FROM remote chain TO this pool
 *
 * @example
 * ```typescript
 * const config: RateLimiterConfig = {
 *   isEnabled: true,
 *   capacity: "1000000000000000000000",  // 1000 tokens max burst
 *   rate: "100000000000000000"           // 0.1 tokens/sec refill
 * };
 *
 * rateLimiterConfigSchema.parse(config); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Disabled rate limiter
 * const disabled: RateLimiterConfig = {
 *   isEnabled: false,
 *   capacity: "0",
 *   rate: "0"
 * };
 * ```
 *
 * @see {@link chainUpdateSchema} for usage in chain updates
 *
 * @public
 */
export const rateLimiterConfigSchema = z.object({
  /** Enable/disable the rate limiter */
  isEnabled: z.boolean(),

  /** Maximum token amount in bucket (wei as string) */
  capacity: z.string(),

  /** Token refill rate per second (wei/sec as string) */
  rate: z.string(),
});

/**
 * Zod schema for a single chain update operation.
 *
 * Defines the complete configuration for adding or updating a remote chain connection
 * in a token pool. Each chain update specifies the remote pool addresses, token address,
 * and bidirectional rate limiting configuration.
 *
 * @remarks
 * Validation Rules:
 * - **remoteChainSelector**: Chain selector identifying the remote blockchain (uint64 as string)
 * - **remotePoolAddresses**: Array of pool addresses on remote chain (may be empty initially)
 * - **remoteTokenAddress**: Token contract address on remote chain
 * - **outboundRateLimiterConfig**: Rate limits for tokens sent TO remote chain
 * - **inboundRateLimiterConfig**: Rate limits for tokens received FROM remote chain
 * - **remoteChainType**: Chain architecture (EVM, SVM, MVM) for address validation
 *
 * Chain Architecture Handling:
 * - EVM chains: 20-byte addresses (e.g., `0x1234...`)
 * - SVM chains: 32-byte base58 public keys (e.g., `TokenkegQ...`)
 * - MVM chains: Not yet implemented
 *
 * Pool Addresses Array:
 * - Can contain multiple pools on the same chain
 * - Empty array is valid (no pools configured yet)
 * - Used for allow-listing pools authorized to interact with this pool
 *
 * @example
 * ```typescript
 * // EVM chain update (Ethereum Sepolia)
 * const evmUpdate: ChainUpdateInput = {
 *   remoteChainSelector: "16015286601757825753",  // Ethereum Sepolia
 *   remotePoolAddresses: [
 *     "0x1234567890123456789012345678901234567890"
 *   ],
 *   remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *   outboundRateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",
 *     rate: "100000000000000000"
 *   },
 *   inboundRateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "2000000000000000000000",
 *     rate: "200000000000000000"
 *   },
 *   remoteChainType: ChainType.EVM
 * };
 *
 * chainUpdateSchema.parse(evmUpdate); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // SVM chain update (Solana)
 * const svmUpdate: ChainUpdateInput = {
 *   remoteChainSelector: "3734403246176062136",  // Solana Devnet
 *   remotePoolAddresses: [],  // No pools yet
 *   remoteTokenAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
 *   outboundRateLimiterConfig: {
 *     isEnabled: false,
 *     capacity: "0",
 *     rate: "0"
 *   },
 *   inboundRateLimiterConfig: {
 *     isEnabled: false,
 *     capacity: "0",
 *     rate: "0"
 *   },
 *   remoteChainType: ChainType.SVM
 * };
 *
 * chainUpdateSchema.parse(svmUpdate); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Asymmetric rate limiting (different inbound/outbound limits)
 * const asymmetric: ChainUpdateInput = {
 *   remoteChainSelector: "10344971235874465080",  // Base Sepolia
 *   remotePoolAddresses: ["0xPool1", "0xPool2"],
 *   remoteTokenAddress: "0xToken",
 *   outboundRateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "5000000000000000000000",  // 5000 tokens outbound
 *     rate: "500000000000000000"
 *   },
 *   inboundRateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "10000000000000000000000",  // 10000 tokens inbound
 *     rate: "1000000000000000000"
 *   },
 *   remoteChainType: ChainType.EVM
 * };
 * ```
 *
 * @see {@link chainUpdatesInputSchema} for full update operations
 *
 * @public
 */
export const chainUpdateSchema = z.object({
  /** Chain selector identifying the remote blockchain (uint64 as string) */
  remoteChainSelector: z.string(),

  /** Array of pool addresses on remote chain (may be empty) */
  remotePoolAddresses: z.array(z.string()),

  /** Token contract address on remote chain */
  remoteTokenAddress: z.string(),

  /** Rate limiter configuration for outbound transfers (TO remote chain) */
  outboundRateLimiterConfig: rateLimiterConfigSchema,

  /** Rate limiter configuration for inbound transfers (FROM remote chain) */
  inboundRateLimiterConfig: rateLimiterConfigSchema,

  /** Chain architecture type (EVM, SVM, MVM) for address validation and encoding */
  remoteChainType: z.nativeEnum(ChainType),
});

/**
 * Zod schema for complete chain updates input.
 *
 * Defines the tuple structure for the TokenPool's applyChainUpdates function call,
 * which allows both removing existing chains and adding/updating new chains in a
 * single atomic transaction.
 *
 * @remarks
 * Tuple Structure:
 * - **Index 0**: Array of chain selectors to remove (strings representing uint64)
 * - **Index 1**: Array of chain update configurations to add/update
 *
 * Operation Semantics:
 * 1. Removals are processed first (index 0)
 * 2. Additions/updates are processed second (index 1)
 * 3. All operations are atomic (succeed together or fail together)
 *
 * Use Cases:
 * - **Add new chain**: Empty removals array, one or more updates
 * - **Remove chain**: Chain selector in removals, empty updates
 * - **Update existing**: Chain selector in removals AND updates (remove old, add new)
 * - **Batch operations**: Multiple chains added/removed in one transaction
 *
 * @example
 * ```typescript
 * // Add two new chains (no removals)
 * const addChains: ChainUpdatesInput = [
 *   [],  // No chains to remove
 *   [
 *     {
 *       remoteChainSelector: "16015286601757825753",  // Ethereum Sepolia
 *       remotePoolAddresses: ["0xPool1"],
 *       remoteTokenAddress: "0xToken1",
 *       outboundRateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" },
 *       inboundRateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" },
 *       remoteChainType: ChainType.EVM
 *     },
 *     {
 *       remoteChainSelector: "10344971235874465080",  // Base Sepolia
 *       remotePoolAddresses: ["0xPool2"],
 *       remoteTokenAddress: "0xToken2",
 *       outboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *       inboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *       remoteChainType: ChainType.EVM
 *     }
 *   ]
 * ];
 *
 * chainUpdatesInputSchema.parse(addChains); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Remove one chain
 * const removeChain: ChainUpdatesInput = [
 *   ["16015286601757825753"],  // Remove Ethereum Sepolia
 *   []                          // No chains to add
 * ];
 *
 * chainUpdatesInputSchema.parse(removeChain); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Update existing chain (remove old config, add new config)
 * const updateChain: ChainUpdatesInput = [
 *   ["16015286601757825753"],  // Remove old Ethereum Sepolia config
 *   [
 *     {
 *       remoteChainSelector: "16015286601757825753",  // Add new config
 *       remotePoolAddresses: ["0xNewPool"],           // Updated pool
 *       remoteTokenAddress: "0xToken",
 *       outboundRateLimiterConfig: {
 *         isEnabled: true,
 *         capacity: "5000000000000000000000",  // Increased capacity
 *         rate: "500000000000000000"
 *       },
 *       inboundRateLimiterConfig: {
 *         isEnabled: true,
 *         capacity: "5000000000000000000000",
 *         rate: "500000000000000000"
 *       },
 *       remoteChainType: ChainType.EVM
 *     }
 *   ]
 * ];
 * ```
 *
 * @example
 * ```typescript
 * // Mixed EVM and SVM chains
 * const mixedChains: ChainUpdatesInput = [
 *   [],
 *   [
 *     {
 *       remoteChainSelector: "16015286601757825753",  // EVM
 *       remotePoolAddresses: ["0xEVMPool"],
 *       remoteTokenAddress: "0xEVMToken",
 *       outboundRateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" },
 *       inboundRateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" },
 *       remoteChainType: ChainType.EVM
 *     },
 *     {
 *       remoteChainSelector: "3734403246176062136",  // SVM
 *       remotePoolAddresses: [],
 *       remoteTokenAddress: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
 *       outboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *       inboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *       remoteChainType: ChainType.SVM
 *     }
 *   ]
 * ];
 * ```
 *
 * @see {@link ChainUpdateInput} for inferred TypeScript type
 * @see {@link createChainUpdateGenerator} for usage in generator
 *
 * @public
 */
export const chainUpdatesInputSchema = z.tuple([
  z.array(z.string()), // Chain selectors to remove
  z.array(chainUpdateSchema), // Chain updates to add
]);

/**
 * TypeScript type for rate limiter configuration.
 * @public
 */
export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;

/**
 * TypeScript type for a single chain update operation.
 *
 * @example
 * ```typescript
 * function processChainUpdate(update: ChainUpdateInput) {
 *   console.log(`Processing chain ${update.remoteChainSelector}`);
 *   console.log(`Chain type: ${update.remoteChainType}`);
 * }
 * ```
 *
 * @public
 */
export type ChainUpdateInput = z.infer<typeof chainUpdateSchema>;

/**
 * TypeScript type for complete chain updates input.
 *
 * Represents the validated tuple structure for applyChainUpdates function calls.
 *
 * @example
 * ```typescript
 * function applyChainUpdates(updates: ChainUpdatesInput) {
 *   const [removals, additions] = updates;
 *   console.log(`Removing ${removals.length} chains`);
 *   console.log(`Adding ${additions.length} chains`);
 * }
 *
 * const validated = chainUpdatesInputSchema.parse(userInput);
 * applyChainUpdates(validated);
 * ```
 *
 * @public
 */
export type ChainUpdatesInput = z.infer<typeof chainUpdatesInputSchema>;

/**
 * Safe Transaction Builder metadata for chain updates.
 *
 * Defines the metadata required to format chain update transactions for the
 * Safe Transaction Builder JSON format.
 *
 * @remarks
 * This interface is used by the chain update formatter to add transaction
 * metadata when outputting Safe Transaction Builder JSON format.
 *
 * @example
 * ```typescript
 * const metadata: SafeChainUpdateMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   tokenPoolAddress: "0x1234567890123456789012345678901234567890"
 * };
 * ```
 *
 * @see {@link ChainUpdateFormatter} for usage in formatting
 *
 * @public
 */
export interface SafeChainUpdateMetadata {
  /** Chain ID where the transaction will be executed */
  chainId: string;

  /** Address of the Safe multisig contract */
  safeAddress: string;

  /** Address of the Safe owner executing the transaction */
  ownerAddress: string;

  /** Address of the TokenPool contract to update */
  tokenPoolAddress: string;
}

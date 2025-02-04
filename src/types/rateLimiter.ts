/**
 * @fileoverview Type definitions and validation schemas for TokenPool rate limiter configuration.
 *
 * This module defines the input parameters and validation rules for configuring rate limiters
 * on TokenPool cross-chain connections. Rate limiters use a token bucket algorithm to control
 * the rate and capacity of token transfers between chains.
 *
 * Each chain connection has two independent rate limiters:
 * - Outbound: Controls tokens sent FROM this pool TO the remote chain
 * - Inbound: Controls tokens received FROM remote chain TO this pool
 *
 * @module types/rateLimiter
 */

import { z } from 'zod';
import { SafeMetadata } from './safe';

/**
 * Zod schema for rate limiter configuration.
 *
 * Defines token bucket rate limiter parameters that control the rate and capacity
 * of token transfers in one direction (either inbound or outbound).
 *
 * @remarks
 * Token Bucket Algorithm:
 * - **isEnabled**: Enable/disable the rate limiter
 * - **capacity**: Maximum tokens in bucket (burst limit) as string wei
 * - **rate**: Token refill rate per second as string wei/sec
 *
 * Amount Format:
 * - Values are strings to avoid JavaScript number precision issues
 * - Represent token amounts in smallest unit (wei)
 * - Example: "1000000000000000000" = 1 token with 18 decimals
 *
 * Token Bucket Mechanics:
 * - Bucket starts full (at capacity)
 * - Each transfer consumes tokens from bucket
 * - Bucket refills at constant rate per second
 * - Transfer fails if bucket has insufficient tokens
 * - Disabled rate limiter = unlimited transfers
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
 * // Disabled rate limiter (no restrictions)
 * const disabled: RateLimiterConfig = {
 *   isEnabled: false,
 *   capacity: "0",
 *   rate: "0"
 * };
 * ```
 *
 * @see {@link setChainRateLimiterConfigSchema} for full chain rate limiter configuration
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
 * TypeScript type for rate limiter configuration.
 * @public
 */
export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;

/**
 * Zod schema for setting chain-specific rate limiter configuration.
 *
 * Defines the parameters for configuring both inbound and outbound rate limiters
 * for a specific remote chain connection on a TokenPool.
 *
 * @remarks
 * Validation Rules:
 * - **remoteChainSelector**: Chain selector identifying the remote blockchain (uint64 as string)
 * - **outboundConfig**: Rate limiter for tokens sent TO remote chain
 * - **inboundConfig**: Rate limiter for tokens received FROM remote chain
 *
 * Bidirectional Rate Limiting:
 * - Each chain connection has TWO independent rate limiters
 * - Outbound limiter: Controls tokens leaving this pool (local → remote)
 * - Inbound limiter: Controls tokens entering this pool (remote → local)
 * - Limiters can have different capacities and rates
 * - Limiters can be independently enabled/disabled
 *
 * Use Cases:
 * - Asymmetric limits (higher inbound than outbound, or vice versa)
 * - Temporary restrictions (disable temporarily, re-enable later)
 * - Gradual capacity increases (start conservative, increase over time)
 * - Emergency controls (disable transfers during incidents)
 *
 * @example
 * ```typescript
 * // Symmetric rate limiting (same inbound and outbound)
 * const symmetric: SetChainRateLimiterConfigInput = {
 *   remoteChainSelector: "16015286601757825753",  // Ethereum Sepolia
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",  // 1000 tokens
 *     rate: "100000000000000000"           // 0.1 tokens/sec
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",  // 1000 tokens
 *     rate: "100000000000000000"           // 0.1 tokens/sec
 *   }
 * };
 *
 * setChainRateLimiterConfigSchema.parse(symmetric); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Asymmetric rate limiting (higher inbound capacity)
 * const asymmetric: SetChainRateLimiterConfigInput = {
 *   remoteChainSelector: "10344971235874465080",  // Base Sepolia
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "5000000000000000000000",   // 5000 tokens outbound
 *     rate: "500000000000000000"
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "10000000000000000000000",  // 10000 tokens inbound (2x)
 *     rate: "1000000000000000000"
 *   }
 * };
 *
 * setChainRateLimiterConfigSchema.parse(asymmetric); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Disable outbound, enable inbound only
 * const inboundOnly: SetChainRateLimiterConfigInput = {
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: {
 *     isEnabled: false,  // Outbound disabled (unrestricted)
 *     capacity: "0",
 *     rate: "0"
 *   },
 *   inboundConfig: {
 *     isEnabled: true,   // Inbound enabled (restricted)
 *     capacity: "1000000000000000000000",
 *     rate: "100000000000000000"
 *   }
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Disable all rate limiting (emergency override)
 * const emergency: SetChainRateLimiterConfigInput = {
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: {
 *     isEnabled: false,
 *     capacity: "0",
 *     rate: "0"
 *   },
 *   inboundConfig: {
 *     isEnabled: false,
 *     capacity: "0",
 *     rate: "0"
 *   }
 * };
 * ```
 *
 * @see {@link SetChainRateLimiterConfigInput} for inferred TypeScript type
 * @see {@link createRateLimiterConfigGenerator} for usage in generator
 *
 * @public
 */
export const setChainRateLimiterConfigSchema = z.object({
  /** Chain selector identifying the remote blockchain (uint64 as string) */
  remoteChainSelector: z.string(),

  /** Rate limiter configuration for outbound transfers (TO remote chain) */
  outboundConfig: rateLimiterConfigSchema,

  /** Rate limiter configuration for inbound transfers (FROM remote chain) */
  inboundConfig: rateLimiterConfigSchema,
});

/**
 * TypeScript type for validated chain rate limiter configuration.
 *
 * @example
 * ```typescript
 * function setRateLimiter(params: SetChainRateLimiterConfigInput) {
 *   console.log(`Configuring rate limiter for chain ${params.remoteChainSelector}`);
 *   console.log(`Outbound enabled: ${params.outboundConfig.isEnabled}`);
 *   console.log(`Inbound enabled: ${params.inboundConfig.isEnabled}`);
 * }
 *
 * const validated = setChainRateLimiterConfigSchema.parse(userInput);
 * setRateLimiter(validated);
 * ```
 *
 * @public
 */
export type SetChainRateLimiterConfigInput = z.infer<typeof setChainRateLimiterConfigSchema>;

/**
 * Safe Transaction Builder metadata for rate limiter operations.
 *
 * Extends SafeMetadata with TokenPool address information required for formatting
 * rate limiter configuration transactions as Safe Transaction Builder JSON.
 *
 * @remarks
 * This metadata is used by the rate limiter formatter to generate Safe Transaction Builder
 * JSON files for configuring pool rate limiters via multisig.
 *
 * @example
 * ```typescript
 * const metadata: SafeRateLimiterMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   tokenPoolAddress: "0x1234567890123456789012345678901234567890"  // TokenPool
 * };
 *
 * const safeJson = await formatter.formatAsSafeJson(rateLimiterTx, metadata);
 * ```
 *
 * @see {@link SafeMetadata} for base metadata fields
 * @see {@link RateLimiterFormatter} for usage in formatting
 *
 * @public
 */
export interface SafeRateLimiterMetadata extends SafeMetadata {
  /** Address of the TokenPool contract to configure */
  tokenPoolAddress: string;
}

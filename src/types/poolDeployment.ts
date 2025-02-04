/**
 * @fileoverview Type definitions and validation schemas for pool deployment operations.
 *
 * This module defines the input parameters and validation rules for deploying TokenPools
 * for existing tokens via the TokenPoolFactory. Supports both BurnMintTokenPool and
 * LockReleaseTokenPool types with cross-chain configuration and rate limiting.
 *
 * @module types/poolDeployment
 */

import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Zod schema for pool type selection.
 *
 * Defines the two supported pool types that determine token transfer behavior:
 * - **BurnMintTokenPool**: Burns tokens on source chain, mints on destination
 * - **LockReleaseTokenPool**: Locks tokens on one chain, releases on another
 *
 * @remarks
 * Pool type selection depends on token capabilities:
 * - Use BurnMintTokenPool if token has mint/burn functions
 * - Use LockReleaseTokenPool if token has fixed supply or lacks mint/burn
 *
 * The enum values match the contract's PoolType enum (0 = BurnMint, 1 = LockRelease).
 *
 * @example
 * ```typescript
 * const poolType: PoolType = "BurnMintTokenPool";
 * poolTypeSchema.parse(poolType); // Valid
 *
 * poolTypeSchema.parse("InvalidType"); // Throws ZodError
 * ```
 *
 * @public
 */
export const poolTypeSchema = z.enum(['BurnMintTokenPool', 'LockReleaseTokenPool']);

/**
 * Zod schema for rate limiter configuration.
 *
 * Defines token bucket rate limiter parameters that control the rate and capacity
 * of token transfers to/from a specific chain.
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
 *
 * @example
 * ```typescript
 * const config: RateLimiterConfig = {
 *   isEnabled: true,
 *   capacity: "1000000000000000000000",  // 1000 tokens max
 *   rate: "100000000000000000"           // 0.1 tokens/sec refill
 * };
 *
 * rateLimiterConfigSchema.parse(config); // Valid
 * ```
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
 * Zod schema for remote chain configuration.
 *
 * Defines the infrastructure addresses and parameters for a remote blockchain
 * in the CCIP network.
 *
 * @remarks
 * These addresses are chain-specific CCIP infrastructure components:
 * - **remotePoolFactory**: TokenPoolFactory contract on remote chain
 * - **remoteRouter**: CCIP Router contract address
 * - **remoteRMNProxy**: Risk Management Network proxy address
 * - **remoteTokenDecimals**: Token decimals on remote chain (may differ)
 *
 * @example
 * ```typescript
 * const chainConfig: RemoteChainConfig = {
 *   remotePoolFactory: "0x1234567890123456789012345678901234567890",
 *   remoteRouter: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *   remoteRMNProxy: "0x9876543210987654321098765432109876543210",
 *   remoteTokenDecimals: 18
 * };
 *
 * remoteChainConfigSchema.parse(chainConfig); // Valid
 * ```
 *
 * @public
 */
export const remoteChainConfigSchema = z.object({
  /** TokenPoolFactory address on remote chain */
  remotePoolFactory: z.string(),

  /** CCIP Router address on remote chain */
  remoteRouter: z.string(),

  /** Risk Management Network proxy address on remote chain */
  remoteRMNProxy: z.string(),

  /** Token decimals on remote chain (may differ from local) */
  remoteTokenDecimals: z.number(),
});

/**
 * Zod schema for remote token pool information.
 *
 * Defines complete configuration for a token pool on a remote chain, including
 * pool address, token address, deployment bytecode, and rate limiter settings.
 *
 * @remarks
 * This schema is used for configuring cross-chain token transfers. Each remote
 * chain requires its own pool and token addresses.
 *
 * Init Code:
 * - remotePoolInitCode: Bytecode for deploying the pool on remote chain
 * - remoteTokenInitCode: Bytecode for deploying the token on remote chain
 *
 * @example
 * ```typescript
 * const remotePool: RemoteTokenPoolInfo = {
 *   remoteChainSelector: "16015286601757825753",  // Ethereum Sepolia
 *   remotePoolAddress: "0x1234567890123456789012345678901234567890",
 *   remotePoolInitCode: "0x608060...",
 *   remoteChainConfig: {
 *     remotePoolFactory: "0xFactory...",
 *     remoteRouter: "0xRouter...",
 *     remoteRMNProxy: "0xRMN...",
 *     remoteTokenDecimals: 18
 *   },
 *   poolType: "BurnMintTokenPool",
 *   remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *   remoteTokenInitCode: "0x608060...",
 *   rateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",
 *     rate: "100000000000000000"
 *   }
 * };
 *
 * remoteTokenPoolInfoSchema.parse(remotePool); // Valid
 * ```
 *
 * @public
 */
export const remoteTokenPoolInfoSchema = z.object({
  /** Chain selector identifying the remote blockchain (uint64 as string) */
  remoteChainSelector: z.string(),

  /** Address of the pool contract on remote chain */
  remotePoolAddress: z.string(),

  /** Deployment bytecode for remote pool contract */
  remotePoolInitCode: z.string(),

  /** Remote chain infrastructure configuration */
  remoteChainConfig: remoteChainConfigSchema,

  /** Type of pool on remote chain */
  poolType: poolTypeSchema,

  /** Address of the token contract on remote chain */
  remoteTokenAddress: z.string(),

  /** Deployment bytecode for remote token contract */
  remoteTokenInitCode: z.string(),

  /** Rate limiter configuration for this chain connection */
  rateLimiterConfig: rateLimiterConfigSchema,
});

/**
 * Zod schema for pool deployment parameters.
 *
 * Defines the parameters required to deploy a TokenPool for an existing token
 * via the TokenPoolFactory.
 *
 * @remarks
 * Validation Rules:
 * - **token**: Valid Ethereum address of existing token contract
 * - **decimals**: Token decimals (must match token's decimals() value)
 * - **remoteTokenPools**: Optional array of remote chain configurations
 * - **poolType**: BurnMintTokenPool or LockReleaseTokenPool
 *
 * Pool Type Selection:
 * - Check if token has mint() and burn() functions
 * - If yes: Use BurnMintTokenPool
 * - If no: Use LockReleaseTokenPool
 *
 * @example
 * ```typescript
 * // Deploy BurnMintTokenPool for existing token
 * const params: PoolDeploymentParams = {
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   decimals: 18,
 *   poolType: "BurnMintTokenPool",
 *   remoteTokenPools: []  // No remote chains initially
 * };
 *
 * poolDeploymentParamsSchema.parse(params); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Deploy LockReleaseTokenPool with remote chain
 * const params = {
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   decimals: 6,
 *   poolType: "LockReleaseTokenPool",
 *   remoteTokenPools: [{
 *     remoteChainSelector: "10344971235874465080",  // Base Sepolia
 *     remotePoolAddress: "0x1234...",
 *     remotePoolInitCode: "0x...",
 *     remoteChainConfig: { ... },
 *     poolType: "LockReleaseTokenPool",
 *     remoteTokenAddress: "0xabcd...",
 *     remoteTokenInitCode: "0x...",
 *     rateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" }
 *   }]
 * };
 *
 * poolDeploymentParamsSchema.parse(params); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Validation error for invalid address
 * try {
 *   const invalid = {
 *     token: "0xInvalidAddress",  // Invalid address
 *     decimals: 18,
 *     poolType: "BurnMintTokenPool"
 *   };
 *   poolDeploymentParamsSchema.parse(invalid);
 * } catch (error) {
 *   console.error(error.message); // "Invalid Ethereum address format for token"
 * }
 * ```
 *
 * @see {@link PoolDeploymentParams} for inferred TypeScript type
 * @see {@link createPoolDeploymentGenerator} for usage in generator
 *
 * @public
 */
export const poolDeploymentParamsSchema = z.object({
  /** Ethereum address of existing token contract - validated format */
  token: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for token',
  }),

  /** Token decimals (must match token.decimals()) */
  decimals: z.number(),

  /** Optional array of remote chain pool configurations */
  remoteTokenPools: z.array(remoteTokenPoolInfoSchema).optional().default([]),

  /** Pool type determining transfer behavior */
  poolType: poolTypeSchema,
});

/**
 * TypeScript type for pool type enum values.
 * @public
 */
export type PoolType = z.infer<typeof poolTypeSchema>;

/**
 * TypeScript type for rate limiter configuration.
 * @public
 */
export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;

/**
 * TypeScript type for remote chain configuration.
 * @public
 */
export type RemoteChainConfig = z.infer<typeof remoteChainConfigSchema>;

/**
 * TypeScript type for remote token pool information.
 * @public
 */
export type RemoteTokenPoolInfo = z.infer<typeof remoteTokenPoolInfoSchema>;

/**
 * TypeScript type for validated pool deployment parameters.
 *
 * @example
 * ```typescript
 * function deployPool(params: PoolDeploymentParams) {
 *   console.log(`Deploying ${params.poolType} for token ${params.token}`);
 * }
 *
 * const validated = poolDeploymentParamsSchema.parse(userInput);
 * deployPool(validated);
 * ```
 *
 * @public
 */
export type PoolDeploymentParams = z.infer<typeof poolDeploymentParamsSchema>;

/**
 * Contract-specific type with numeric pool type.
 *
 * Used internally when encoding function calls for the smart contract, where
 * pool type is represented as a number (0 = BurnMintTokenPool, 1 = LockReleaseTokenPool).
 *
 * @remarks
 * This type is used by poolTypeConverter to transform string pool types to
 * contract-compatible numeric values before encoding.
 *
 * @see {@link poolTypeConverter} for string-to-number conversion
 *
 * @internal
 */
export type ContractRemoteTokenPoolInfo = Omit<RemoteTokenPoolInfo, 'poolType'> & {
  poolType: number;
};

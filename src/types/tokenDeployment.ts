/**
 * @fileoverview Type definitions and validation schemas for token deployment operations.
 *
 * This module defines the input parameters and validation rules for deploying a new
 * BurnMintERC20 token and its associated TokenPool via the TokenPoolFactory. Uses Zod
 * for runtime type validation and TypeScript type inference.
 *
 * @module types/tokenDeployment
 */

import { z } from 'zod';
import { remoteTokenPoolInfoSchema } from './poolDeployment';

/**
 * Zod validation schema for token deployment parameters.
 *
 * Defines the structure and validation rules for deploying a new BurnMintERC20 token
 * with an associated TokenPool. All fields are validated at runtime using Zod.
 *
 * @remarks
 * Validation Rules:
 * - **name**: Non-empty string (e.g., "My Token")
 * - **symbol**: Non-empty string (e.g., "MTK")
 * - **decimals**: Number between 0 and 18 (standard: 18 for Ether-like, 6 for USDC-like)
 * - **maxSupply**: String representation of maximum token supply in wei (prevents overflow)
 * - **preMint**: String representation of initial mint amount in wei
 * - **remoteTokenPools**: Optional array of remote chain configurations (defaults to empty)
 *
 * Amount Format:
 * - Amounts are strings to avoid JavaScript number precision issues
 * - Represent values in smallest unit (wei)
 * - Example: "1000000000000000000" = 1 token with 18 decimals
 *
 * @example
 * ```typescript
 * // Valid token deployment input
 * const validInput = {
 *   name: "CrossChainToken",
 *   symbol: "CCT",
 *   decimals: 18,
 *   maxSupply: "1000000000000000000000000",  // 1 million tokens
 *   preMint: "100000000000000000000",        // 100 tokens pre-minted
 *   remoteTokenPools: []                      // No remote chains initially
 * };
 *
 * // Validate with Zod
 * const result = tokenDeploymentParamsSchema.parse(validInput);
 * ```
 *
 * @example
 * ```typescript
 * // Token deployment with remote chain configuration
 * const inputWithRemote = {
 *   name: "MultiChainToken",
 *   symbol: "MCT",
 *   decimals: 18,
 *   maxSupply: "1000000000000000000000000",
 *   preMint: "0",
 *   remoteTokenPools: [{
 *     remoteChainSelector: "16015286601757825753",  // Ethereum Sepolia
 *     remotePoolAddress: "0x1234567890123456789012345678901234567890",
 *     remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *     poolType: "BurnMintTokenPool"
 *   }]
 * };
 *
 * const result = tokenDeploymentParamsSchema.parse(inputWithRemote);
 * ```
 *
 * @example
 * ```typescript
 * // USDC-like token (6 decimals)
 * const usdcLikeToken = {
 *   name: "USD Coin",
 *   symbol: "USDC",
 *   decimals: 6,
 *   maxSupply: "1000000000000",     // 1 million USDC (6 decimals)
 *   preMint: "100000000",           // 100 USDC pre-minted
 *   remoteTokenPools: []
 * };
 *
 * const result = tokenDeploymentParamsSchema.parse(usdcLikeToken);
 * ```
 *
 * @example
 * ```typescript
 * // Validation error handling
 * try {
 *   const invalidInput = {
 *     name: "",           // Invalid: empty string
 *     symbol: "MTK",
 *     decimals: 25,       // Invalid: exceeds 18
 *     maxSupply: "1000",
 *     preMint: "0"
 *   };
 *   tokenDeploymentParamsSchema.parse(invalidInput);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Validation failed:', error.errors);
 *     // [
 *     //   { path: ['name'], message: 'Token name cannot be empty' },
 *     //   { path: ['decimals'], message: 'Number must be less than or equal to 18' }
 *     // ]
 *   }
 * }
 * ```
 *
 * @see {@link TokenDeploymentParams} for the inferred TypeScript type
 * @see {@link remoteTokenPoolInfoSchema} for remote chain configuration schema
 * @see {@link createTokenDeploymentGenerator} for usage in generator
 *
 * @public
 */
export const tokenDeploymentParamsSchema = z.object({
  /** Token name (e.g., "My Token") - must be non-empty */
  name: z.string().min(1, 'Token name cannot be empty'),

  /** Token symbol (e.g., "MTK") - must be non-empty */
  symbol: z.string().min(1, 'Token symbol cannot be empty'),

  /** Token decimals (0-18) - standard is 18 for most tokens, 6 for USDC-like */
  decimals: z.number().min(0).max(18),

  /** Maximum token supply in wei as string to avoid precision issues */
  maxSupply: z.string(),

  /** Initial mint amount in wei as string - tokens minted to deployer */
  preMint: z.string(),

  /** Optional array of remote chain pool configurations - defaults to empty array */
  remoteTokenPools: z.array(remoteTokenPoolInfoSchema).optional().default([]),
});

/**
 * TypeScript type inferred from tokenDeploymentParamsSchema.
 *
 * Represents validated token deployment parameters after Zod schema validation.
 * Use this type for function parameters and return types after validation.
 *
 * @example
 * ```typescript
 * function deployToken(params: TokenDeploymentParams) {
 *   // params is guaranteed to match the schema
 *   console.log(`Deploying ${params.name} (${params.symbol})`);
 * }
 *
 * const validated = tokenDeploymentParamsSchema.parse(userInput);
 * deployToken(validated);
 * ```
 *
 * @public
 */
export type TokenDeploymentParams = z.infer<typeof tokenDeploymentParamsSchema>;

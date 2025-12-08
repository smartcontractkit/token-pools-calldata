/**
 * @fileoverview Type definitions and validation schemas for token minting and role management.
 *
 * This module defines the input parameters and validation rules for:
 * - Token minting operations (requires minter role)
 * - Role management (granting/revoking mint and burn roles)
 *
 * These operations are performed on FactoryBurnMintERC20 tokens after deployment.
 * Role management is essential for enabling TokenPools to mint and burn tokens during
 * cross-chain transfers.
 *
 * @module types/tokenMint
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { SafeMetadata } from './safe';

/**
 * Zod schema for token mint parameters.
 *
 * Defines the parameters required to mint tokens to a receiver address.
 * The minter must have the MINTER_ROLE granted on the token contract.
 *
 * @remarks
 * Validation Rules:
 * - **receiver**: Valid Ethereum address (checksummed or lowercase)
 * - **amount**: Token amount as string in wei to avoid JavaScript precision issues
 *
 * Amount Format:
 * - String representation of amount in smallest unit (wei)
 * - Example: "1000000000000000000" = 1 token with 18 decimals
 * - Example: "1000000" = 1 USDC with 6 decimals
 *
 * Permission Requirements:
 * - Transaction sender (Safe) must have MINTER_ROLE on token contract
 * - Use role management operations to grant MINTER_ROLE to Safe or pool
 *
 * @example
 * ```typescript
 * // Mint 1000 tokens (18 decimals) to receiver
 * const mintParams: MintParams = {
 *   receiver: "0x1234567890123456789012345678901234567890",
 *   amount: "1000000000000000000000"  // 1000 * 10^18
 * };
 *
 * mintParamsSchema.parse(mintParams); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Mint 100 USDC (6 decimals) to receiver
 * const usdcMint: MintParams = {
 *   receiver: "0xReceiver",
 *   amount: "100000000"  // 100 * 10^6
 * };
 *
 * mintParamsSchema.parse(usdcMint); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Validation error for invalid address
 * try {
 *   const invalid = {
 *     receiver: "0xInvalidAddress",
 *     amount: "1000"
 *   };
 *   mintParamsSchema.parse(invalid);
 * } catch (error) {
 *   console.error(error.message); // "Invalid Ethereum address format for receiver"
 * }
 * ```
 *
 * @see {@link MintParams} for inferred TypeScript type
 * @see {@link createTokenMintGenerator} for usage in generator
 *
 * @public
 */
export const mintParamsSchema = z.object({
  /** Receiver address for minted tokens - validated format */
  receiver: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for receiver',
  }),

  /** Token amount in wei as string to avoid precision issues */
  amount: z.string(),
});

/**
 * Zod schema for role type selection.
 *
 * Defines which role(s) to grant or revoke on a BurnMintERC20 token contract.
 *
 * @remarks
 * Role Types:
 * - **mint**: MINTER_ROLE only (allows minting tokens)
 * - **burn**: BURNER_ROLE only (allows burning tokens)
 * - **both**: Both MINTER_ROLE and BURNER_ROLE (most common for pools)
 *
 * TokenPool Requirements:
 * - BurnMintTokenPool requires BOTH mint and burn roles to function
 * - Grant both roles to pool after deployment for cross-chain transfers
 *
 * @example
 * ```typescript
 * const roleType: RoleType = "both";  // Grant both roles
 * roleTypeSchema.parse(roleType); // Valid
 * ```
 *
 * @see {@link roleManagementParamsSchema} for usage in role management
 *
 * @public
 */
export const roleTypeSchema = z.enum(['mint', 'burn', 'both']);

/**
 * Zod schema for role action selection.
 *
 * Defines whether to grant or revoke a role.
 *
 * @remarks
 * Action Types:
 * - **grant**: Add role to address (grantRole or grantMintAndBurn)
 * - **revoke**: Remove role from address (revokeRole)
 *
 * Security Considerations:
 * - Granting roles gives permanent permissions until revoked
 * - Revoking roles immediately removes permissions
 * - Ensure Safe has ADMIN_ROLE before granting/revoking roles
 *
 * @example
 * ```typescript
 * const action: ActionType = "grant";
 * actionTypeSchema.parse(action); // Valid
 * ```
 *
 * @see {@link roleManagementParamsSchema} for usage in role management
 *
 * @public
 */
export const actionTypeSchema = z.enum(['grant', 'revoke']);

/**
 * Zod schema for role management parameters.
 *
 * Defines the parameters for granting or revoking mint and burn roles on a
 * BurnMintERC20 token contract. Used to authorize TokenPools or other addresses
 * to mint and burn tokens.
 *
 * @remarks
 * Validation Rules:
 * - **pool**: Valid Ethereum address of the pool or address receiving roles
 * - **roleType**: Type of role(s) to manage (mint, burn, or both) - defaults to 'both'
 * - **action**: Whether to grant or revoke the role(s) - defaults to 'grant'
 *
 * Default Values:
 * - roleType defaults to 'both' (most common for pools)
 * - action defaults to 'grant' (most common operation)
 *
 * Typical Workflow:
 * 1. Deploy token and pool via TokenPoolFactory
 * 2. Grant both mint and burn roles to pool using this schema
 * 3. Pool can now mint/burn tokens during cross-chain transfers
 *
 * @example
 * ```typescript
 * // Grant both roles to pool (typical after deployment)
 * const grantBoth: RoleManagementParams = {
 *   pool: "0x1234567890123456789012345678901234567890",
 *   roleType: "both",  // Optional, defaults to 'both'
 *   action: "grant"     // Optional, defaults to 'grant'
 * };
 *
 * roleManagementParamsSchema.parse(grantBoth); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Grant only mint role
 * const grantMintOnly: RoleManagementParams = {
 *   pool: "0xPoolAddress",
 *   roleType: "mint",
 *   action: "grant"
 * };
 *
 * roleManagementParamsSchema.parse(grantMintOnly); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Revoke burn role
 * const revokeBurn: RoleManagementParams = {
 *   pool: "0xPoolAddress",
 *   roleType: "burn",
 *   action: "revoke"
 * };
 *
 * roleManagementParamsSchema.parse(revokeBurn); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Minimal input (uses defaults: roleType='both', action='grant')
 * const minimal: RoleManagementParams = {
 *   pool: "0xPoolAddress"
 *   // roleType defaults to 'both'
 *   // action defaults to 'grant'
 * };
 *
 * const parsed = roleManagementParamsSchema.parse(minimal);
 * console.log(parsed.roleType); // 'both'
 * console.log(parsed.action);   // 'grant'
 * ```
 *
 * @see {@link RoleManagementParams} for inferred TypeScript type
 * @see {@link createRoleManagementGenerator} for usage in generator
 *
 * @public
 */
export const roleManagementParamsSchema = z.object({
  /** Pool or address receiving role grant/revoke - validated format */
  pool: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for pool',
  }),

  /** Type of role(s) to manage - defaults to 'both' (mint and burn) */
  roleType: roleTypeSchema.optional().default('both'),

  /** Action to perform - defaults to 'grant' */
  action: actionTypeSchema.optional().default('grant'),
});

/**
 * TypeScript type for validated mint parameters.
 *
 * @example
 * ```typescript
 * function mintTokens(params: MintParams) {
 *   console.log(`Minting ${params.amount} tokens to ${params.receiver}`);
 * }
 *
 * const validated = mintParamsSchema.parse(userInput);
 * mintTokens(validated);
 * ```
 *
 * @public
 */
export type MintParams = z.infer<typeof mintParamsSchema>;

/**
 * TypeScript type for role type enum values.
 * @public
 */
export type RoleType = z.infer<typeof roleTypeSchema>;

/**
 * TypeScript type for action type enum values.
 * @public
 */
export type ActionType = z.infer<typeof actionTypeSchema>;

/**
 * TypeScript type for validated role management parameters.
 *
 * @example
 * ```typescript
 * function manageRoles(params: RoleManagementParams) {
 *   console.log(`${params.action} ${params.roleType} role(s) for ${params.pool}`);
 * }
 *
 * const validated = roleManagementParamsSchema.parse(userInput);
 * manageRoles(validated);
 * ```
 *
 * @public
 */
export type RoleManagementParams = z.infer<typeof roleManagementParamsSchema>;

/**
 * Safe Transaction Builder metadata for mint operations.
 *
 * Extends SafeMetadata with token address information required for formatting
 * mint transactions as Safe Transaction Builder JSON.
 *
 * @remarks
 * This metadata is used by the mint formatter to generate Safe Transaction Builder
 * JSON files that can be imported into the Safe UI for multisig token minting.
 *
 * @example
 * ```typescript
 * const metadata: SafeMintMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   tokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789"  // Token to mint
 * };
 *
 * const safeJson = await formatter.formatAsSafeJson(mintTx, metadata);
 * ```
 *
 * @see {@link SafeMetadata} for base metadata fields
 * @see {@link MintFormatter} for usage in formatting
 *
 * @public
 */
export interface SafeMintMetadata extends SafeMetadata {
  /** Address of the token contract to mint from */
  tokenAddress: string;
}

/**
 * Safe Transaction Builder metadata for role management operations.
 *
 * Extends SafeMetadata with token address information required for formatting
 * role management transactions as Safe Transaction Builder JSON.
 *
 * @remarks
 * This metadata is used by the role management formatter to generate Safe
 * Transaction Builder JSON files for granting/revoking mint and burn roles.
 *
 * @example
 * ```typescript
 * const metadata: SafeRoleManagementMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   tokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789"  // Token contract
 * };
 *
 * const safeJson = await formatter.formatAsSafeJson(roleManagementTx, metadata);
 * ```
 *
 * @see {@link SafeMetadata} for base metadata fields
 * @see {@link RoleManagementFormatter} for usage in formatting
 *
 * @public
 */
export interface SafeRoleManagementMetadata extends SafeMetadata {
  /** Address of the token contract for role management */
  tokenAddress: string;
}

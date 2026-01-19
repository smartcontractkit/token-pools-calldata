/**
 * @fileoverview Type definitions and validation schemas for TokenAdminRegistry operations.
 *
 * This module defines the input parameters and validation rules for interacting with
 * the TokenAdminRegistry contract. Supports three methods:
 *
 * Methods:
 * - `set-pool`: Sets the pool for a token via setPool(localToken, pool)
 * - `transfer-admin`: Transfers admin role via transferAdminRole(localToken, newAdmin)
 * - `accept-admin`: Accepts admin role via acceptAdminRole(localToken)
 *
 * @module types/tokenAdminRegistry
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { SafeMetadata } from './safe';

/**
 * TokenAdminRegistry method constants.
 *
 * Maps user-friendly method names to the contract function names they invoke
 * on the TokenAdminRegistry contract.
 *
 * @remarks
 * Method Mapping:
 * - `set-pool` → `setPool(localToken, pool)`
 * - `transfer-admin` → `transferAdminRole(localToken, newAdmin)`
 * - `accept-admin` → `acceptAdminRole(localToken)`
 *
 * @public
 */
export const TOKEN_ADMIN_REGISTRY_METHOD = {
  SET_POOL: 'set-pool',
  TRANSFER_ADMIN: 'transfer-admin',
  ACCEPT_ADMIN: 'accept-admin',
} as const;

/**
 * TypeScript type for TokenAdminRegistry method enum values.
 * @public
 */
export type TokenAdminRegistryMethod =
  (typeof TOKEN_ADMIN_REGISTRY_METHOD)[keyof typeof TOKEN_ADMIN_REGISTRY_METHOD];

/**
 * Zod schema for TokenAdminRegistry method selection.
 *
 * Validates that the method is one of the supported types.
 *
 * @public
 */
export const tokenAdminRegistryMethodSchema = z.enum([
  'set-pool',
  'transfer-admin',
  'accept-admin',
]);

/**
 * Base schema with common fields for all TokenAdminRegistry operations.
 *
 * @internal
 */
const baseSchema = z.object({
  /** TokenAdminRegistry contract address - validated format */
  registryAddress: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for registryAddress',
  }),

  /** Token address to operate on - validated format */
  tokenAddress: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for tokenAddress',
  }),

  /** Method type */
  method: tokenAdminRegistryMethodSchema,
});

/**
 * Schema for set-pool method.
 *
 * Requires pool address in addition to base fields.
 *
 * @public
 */
export const setPoolInputSchema = baseSchema.extend({
  method: z.literal('set-pool'),
  poolAddress: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for poolAddress',
  }),
});

/**
 * Schema for transfer-admin method.
 *
 * Requires new admin address in addition to base fields.
 *
 * @public
 */
export const transferAdminInputSchema = baseSchema.extend({
  method: z.literal('transfer-admin'),
  newAdminAddress: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for newAdminAddress',
  }),
});

/**
 * Schema for accept-admin method.
 *
 * Only requires base fields.
 *
 * @public
 */
export const acceptAdminInputSchema = baseSchema.extend({
  method: z.literal('accept-admin'),
});

/**
 * Discriminated union schema for all TokenAdminRegistry operations.
 *
 * Uses the `method` field to determine which schema to apply for validation.
 *
 * @public
 */
export const tokenAdminRegistryInputSchema = z.discriminatedUnion('method', [
  setPoolInputSchema,
  transferAdminInputSchema,
  acceptAdminInputSchema,
]);

/**
 * TypeScript type for validated TokenAdminRegistry input parameters.
 *
 * Union type that covers all three method types.
 *
 * @public
 */
export type TokenAdminRegistryInput = z.infer<typeof tokenAdminRegistryInputSchema>;

/**
 * TypeScript type for set-pool input parameters.
 * @public
 */
export type SetPoolInput = z.infer<typeof setPoolInputSchema>;

/**
 * TypeScript type for transfer-admin input parameters.
 * @public
 */
export type TransferAdminInput = z.infer<typeof transferAdminInputSchema>;

/**
 * TypeScript type for accept-admin input parameters.
 * @public
 */
export type AcceptAdminInput = z.infer<typeof acceptAdminInputSchema>;

/**
 * Safe Transaction Builder metadata for TokenAdminRegistry operations.
 *
 * Extends SafeMetadata with registry address information required for formatting
 * TokenAdminRegistry transactions as Safe Transaction Builder JSON.
 *
 * @remarks
 * This metadata is used by the TokenAdminRegistry formatter to generate Safe
 * Transaction Builder JSON files for registry operations.
 *
 * @example
 * ```typescript
 * const metadata: SafeTokenAdminRegistryMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   registryAddress: "0x1234567890123456789012345678901234567890"
 * };
 *
 * const safeJson = await formatter.format(transaction, params, metadata);
 * ```
 *
 * @see {@link SafeMetadata} for base metadata fields
 *
 * @public
 */
export interface SafeTokenAdminRegistryMetadata extends SafeMetadata {
  /** Address of the TokenAdminRegistry contract */
  registryAddress: string;
}

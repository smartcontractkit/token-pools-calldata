/**
 * @fileoverview Type definitions and validation schemas for admin registration.
 *
 * This module defines the input parameters and validation rules for registering
 * as the CCIP admin for a token via the RegistryModuleOwnerCustom contract.
 *
 * Registration Methods:
 * - `get-ccip-admin`: Uses token's getCCIPAdmin() function to determine admin
 * - `owner`: Uses token's owner() function (standard Ownable pattern)
 * - `access-control`: Uses token's DEFAULT_ADMIN_ROLE holder
 *
 * @module types/registerAdmin
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { SafeMetadata } from './safe';

/**
 * Registration method constants.
 *
 * Maps user-friendly method names to the contract function names they invoke
 * on the RegistryModuleOwnerCustom contract.
 *
 * @remarks
 * Method Mapping:
 * - `get-ccip-admin` → `registerAdminViaGetCCIPAdmin(token)`
 * - `owner` → `registerAdminViaOwner(token)`
 * - `access-control` → `registerAccessControlDefaultAdmin(token)`
 *
 * @public
 */
export const REGISTRATION_METHOD = {
  GET_CCIP_ADMIN: 'get-ccip-admin',
  OWNER: 'owner',
  ACCESS_CONTROL: 'access-control',
} as const;

/**
 * TypeScript type for registration method enum values.
 * @public
 */
export type RegistrationMethod = (typeof REGISTRATION_METHOD)[keyof typeof REGISTRATION_METHOD];

/**
 * Zod schema for registration method selection.
 *
 * Validates that the method is one of the supported registration types.
 *
 * @public
 */
export const registrationMethodSchema = z.enum(['get-ccip-admin', 'owner', 'access-control']);

/**
 * Zod schema for register admin input parameters.
 *
 * Defines the parameters required to register as CCIP admin for a token.
 *
 * @remarks
 * Validation Rules:
 * - **moduleAddress**: Valid Ethereum address of RegistryModuleOwnerCustom contract
 * - **tokenAddress**: Valid Ethereum address of the token to register for
 * - **method**: Registration method type
 *
 * @example
 * ```typescript
 * // Register using owner() method
 * const input: RegisterAdminInput = {
 *   moduleAddress: "0x1234...",
 *   tokenAddress: "0x5678...",
 *   method: "owner"
 * };
 *
 * registerAdminInputSchema.parse(input); // Valid
 * ```
 *
 * @public
 */
export const registerAdminInputSchema = z.object({
  /** RegistryModuleOwnerCustom contract address - validated format */
  moduleAddress: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for moduleAddress',
  }),

  /** Token address to register as admin for - validated format */
  tokenAddress: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for tokenAddress',
  }),

  /** Registration method type */
  method: registrationMethodSchema,
});

/**
 * TypeScript type for validated register admin input parameters.
 *
 * @example
 * ```typescript
 * function registerAdmin(params: RegisterAdminInput) {
 *   console.log(`Registering admin for token ${params.tokenAddress} via ${params.method}`);
 * }
 *
 * const validated = registerAdminInputSchema.parse(userInput);
 * registerAdmin(validated);
 * ```
 *
 * @public
 */
export type RegisterAdminInput = z.infer<typeof registerAdminInputSchema>;

/**
 * Safe Transaction Builder metadata for register admin operations.
 *
 * Extends SafeMetadata with module address information required for formatting
 * register admin transactions as Safe Transaction Builder JSON.
 *
 * @remarks
 * This metadata is used by the register admin formatter to generate Safe
 * Transaction Builder JSON files for registering as CCIP admin.
 *
 * @example
 * ```typescript
 * const metadata: SafeRegisterAdminMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   moduleAddress: "0x1234567890123456789012345678901234567890"
 * };
 *
 * const safeJson = await formatter.format(transaction, params, metadata);
 * ```
 *
 * @see {@link SafeMetadata} for base metadata fields
 *
 * @public
 */
export interface SafeRegisterAdminMetadata extends SafeMetadata {
  /** Address of the RegistryModuleOwnerCustom contract */
  moduleAddress: string;
}

/**
 * @fileoverview Type definitions and validation schemas for TokenPool allow list management.
 *
 * This module defines the input parameters and validation rules for managing the allow list
 * of addresses authorized to interact with a TokenPool. The allow list controls which addresses
 * can send or receive tokens through the pool's cross-chain transfer functionality.
 *
 * Allow list updates support atomic add/remove operations in a single transaction.
 *
 * @module types/allowList
 */

import { z } from 'zod';
import { ethers } from 'ethers';
import { SafeMetadata } from './safe';

/**
 * Zod schema for allow list update operations.
 *
 * Defines the parameters for adding and removing addresses from a TokenPool's allow list.
 * Supports batching multiple additions and removals in a single atomic transaction.
 *
 * @remarks
 * Validation Rules:
 * - **removes**: Optional array of addresses to remove from allow list (defaults to empty array)
 * - **adds**: Optional array of addresses to add to allow list (defaults to empty array)
 * - All addresses are validated as proper Ethereum addresses
 *
 * Allow List Behavior:
 * - Empty allow list = all addresses permitted (no restrictions)
 * - Non-empty allow list = only listed addresses permitted
 * - Removals are processed before additions
 * - All operations are atomic (succeed together or fail together)
 *
 * Use Cases:
 * - Restrict token transfers to specific addresses or contracts
 * - Whitelist authorized users for compliant tokens
 * - Remove compromised or unauthorized addresses
 * - Batch multiple allow list changes
 *
 * @example
 * ```typescript
 * // Add addresses to allow list
 * const addAddresses: AllowListUpdatesInput = {
 *   removes: [],
 *   adds: [
 *     "0x1234567890123456789012345678901234567890",
 *     "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *   ]
 * };
 *
 * allowListUpdatesSchema.parse(addAddresses); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Remove addresses from allow list
 * const removeAddresses: AllowListUpdatesInput = {
 *   removes: ["0x1234567890123456789012345678901234567890"],
 *   adds: []
 * };
 *
 * allowListUpdatesSchema.parse(removeAddresses); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Replace addresses (remove old, add new) in single transaction
 * const replaceAddresses: AllowListUpdatesInput = {
 *   removes: [
 *     "0xOldAddress1",
 *     "0xOldAddress2"
 *   ],
 *   adds: [
 *     "0xNewAddress1",
 *     "0xNewAddress2",
 *     "0xNewAddress3"
 *   ]
 * };
 *
 * allowListUpdatesSchema.parse(replaceAddresses); // Valid
 * ```
 *
 * @example
 * ```typescript
 * // Clear allow list (remove restrictions)
 * const clearAllowList: AllowListUpdatesInput = {
 *   removes: [
 *     "0xAddress1",
 *     "0xAddress2",
 *     "0xAddress3"
 *   ],
 *   adds: []
 * };
 * // After this, allow list is empty = all addresses permitted
 * ```
 *
 * @example
 * ```typescript
 * // Minimal input (no changes)
 * const noChanges: AllowListUpdatesInput = {
 *   // removes defaults to []
 *   // adds defaults to []
 * };
 *
 * const parsed = allowListUpdatesSchema.parse(noChanges);
 * console.log(parsed.removes); // []
 * console.log(parsed.adds);    // []
 * ```
 *
 * @example
 * ```typescript
 * // Validation error for invalid address
 * try {
 *   const invalid = {
 *     adds: ["0xInvalidAddress"]
 *   };
 *   allowListUpdatesSchema.parse(invalid);
 * } catch (error) {
 *   console.error(error.message); // "Invalid Ethereum address format in adds array"
 * }
 * ```
 *
 * @see {@link AllowListUpdatesInput} for inferred TypeScript type
 * @see {@link createAllowListUpdatesGenerator} for usage in generator
 *
 * @public
 */
export const allowListUpdatesSchema = z.object({
  /** Array of addresses to remove from allow list - validated Ethereum addresses */
  removes: z
    .array(
      z.string().refine((address: string): boolean => ethers.isAddress(address), {
        message: 'Invalid Ethereum address format in removes array',
      }),
    )
    .optional()
    .default([]),

  /** Array of addresses to add to allow list - validated Ethereum addresses */
  adds: z
    .array(
      z.string().refine((address: string): boolean => ethers.isAddress(address), {
        message: 'Invalid Ethereum address format in adds array',
      }),
    )
    .optional()
    .default([]),
});

/**
 * TypeScript type for validated allow list update parameters.
 *
 * @example
 * ```typescript
 * function updateAllowList(params: AllowListUpdatesInput) {
 *   console.log(`Removing ${params.removes.length} addresses`);
 *   console.log(`Adding ${params.adds.length} addresses`);
 * }
 *
 * const validated = allowListUpdatesSchema.parse(userInput);
 * updateAllowList(validated);
 * ```
 *
 * @public
 */
export type AllowListUpdatesInput = z.infer<typeof allowListUpdatesSchema>;

/**
 * Safe Transaction Builder metadata for allow list operations.
 *
 * Extends SafeMetadata with TokenPool address information required for formatting
 * allow list update transactions as Safe Transaction Builder JSON.
 *
 * @remarks
 * This metadata is used by the allow list formatter to generate Safe Transaction Builder
 * JSON files for managing pool allow lists via multisig.
 *
 * @example
 * ```typescript
 * const metadata: SafeAllowListMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000",
 *   tokenPoolAddress: "0x1234567890123456789012345678901234567890"  // TokenPool
 * };
 *
 * const safeJson = await formatter.formatAsSafeJson(allowListTx, metadata);
 * ```
 *
 * @see {@link SafeMetadata} for base metadata fields
 * @see {@link AllowListFormatter} for usage in formatting
 *
 * @public
 */
export interface SafeAllowListMetadata extends SafeMetadata {
  /** Address of the TokenPool contract to update */
  tokenPoolAddress: string;
}

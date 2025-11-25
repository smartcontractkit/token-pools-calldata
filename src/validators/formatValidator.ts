/**
 * @fileoverview Validator for Safe Transaction Builder JSON format parameters.
 *
 * This module validates that all required parameters are provided when using the
 * Safe JSON output format (`-f safe-json`). Safe JSON requires three additional
 * parameters: chain ID, Safe address, and owner address.
 *
 * @module validators/formatValidator
 */

import { VALIDATION_ERRORS } from '../config';
import { ValidationError } from './ValidationError';

/**
 * Validates required parameters for Safe Transaction Builder JSON format.
 *
 * Ensures all three required Safe JSON parameters are provided: chainId, safeAddress,
 * and ownerAddress. All three must be present for Safe JSON format generation.
 *
 * @param chainId - Chain ID where transaction will be executed
 * @param safeAddress - Safe multisig contract address
 * @param ownerAddress - Owner address executing the transaction
 * @throws {ValidationError} If any required parameter is missing
 *
 * @remarks
 * Safe JSON Format Requirements:
 * - **chainId**: Chain ID string (e.g., "1" for Ethereum, "84532" for Base Sepolia)
 * - **safeAddress**: Address of the Safe multisig contract
 * - **ownerAddress**: Address of the Safe owner creating the transaction
 *
 * These parameters are used to generate Safe Transaction Builder JSON files that
 * can be imported into the Safe Transaction Builder UI for multisig signing and
 * execution.
 *
 * CLI Parameters:
 * - `-f, --format safe-json`: Enable Safe JSON format
 * - `-c, --chain-id <id>`: Chain ID (required with safe-json)
 * - `-s, --safe <address>`: Safe address (required with safe-json)
 * - `-w, --owner <address>`: Owner address (required with safe-json)
 *
 * @example
 * ```typescript
 * // All parameters provided - valid
 * validateSafeJsonParams(
 *   "84532",                                       // Base Sepolia
 *   "0x5419c6d83473d1c653e7b51e8568fafedce94f01", // Safe
 *   "0x0000000000000000000000000000000000000000"  // Owner
 * );
 * // No error thrown
 * ```
 *
 * @example
 * ```typescript
 * // Missing chainId
 * try {
 *   validateSafeJsonParams(
 *     undefined,
 *     "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *     "0x0000000000000000000000000000000000000000"
 *   );
 * } catch (error) {
 *   // ValidationError: MISSING_SAFE_JSON_PARAMS
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Missing safeAddress
 * try {
 *   validateSafeJsonParams(
 *     "84532",
 *     undefined,
 *     "0x0000000000000000000000000000000000000000"
 *   );
 * } catch (error) {
 *   // ValidationError: MISSING_SAFE_JSON_PARAMS
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Missing ownerAddress
 * try {
 *   validateSafeJsonParams(
 *     "84532",
 *     "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *     undefined
 *   );
 * } catch (error) {
 *   // ValidationError: MISSING_SAFE_JSON_PARAMS
 * }
 * ```
 *
 * @example
 * ```typescript
 * // All missing
 * try {
 *   validateSafeJsonParams(undefined, undefined, undefined);
 * } catch (error) {
 *   // ValidationError: When using safe-json format, chain ID, Safe address,
 *   // and owner address are required
 * }
 * ```
 *
 * @see {@link VALIDATION_ERRORS.MISSING_SAFE_JSON_PARAMS} for error message
 * @see {@link validateChainUpdateOptions} for usage in command validation
 *
 * @public
 */
export function validateSafeJsonParams(
  chainId: string | undefined,
  safeAddress: string | undefined,
  ownerAddress: string | undefined,
): void {
  if (!chainId || !safeAddress || !ownerAddress) {
    throw new ValidationError(VALIDATION_ERRORS.MISSING_SAFE_JSON_PARAMS);
  }
}

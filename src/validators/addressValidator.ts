/**
 * @fileoverview Ethereum address validation functions for CLI command parameters.
 *
 * This module provides validation functions for Ethereum addresses used throughout
 * the CLI application. Validates addresses using ethers.js isAddress() which checks
 * for valid hexadecimal format and optional checksum validation.
 *
 * Includes both generic validators and specialized validators for specific address
 * types (Safe, owner, token, pool, deployer) with context-specific error messages.
 *
 * @module validators/addressValidator
 */

import { ethers } from 'ethers';
import { VALIDATION_ERRORS } from '../config';
import { ValidationError } from './ValidationError';

/**
 * Validates an Ethereum address with generic error message.
 *
 * Checks if the provided string is a valid Ethereum address (20 bytes, 0x-prefixed hex).
 * Accepts both checksummed and non-checksummed addresses.
 *
 * @param address - The address string to validate
 * @param fieldName - Optional field name for error messages (default: 'address')
 * @throws {ValidationError} If address format is invalid
 *
 * @remarks
 * Uses ethers.isAddress() which validates:
 * - Length is 42 characters (0x + 40 hex chars)
 * - All characters are valid hexadecimal
 * - Checksum is correct (if checksummed)
 *
 * Accepts:
 * - Checksummed addresses: `0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed`
 * - Lowercase addresses: `0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed`
 * - Uppercase addresses: `0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED`
 *
 * @example
 * ```typescript
 * // Valid address
 * validateAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 * // No error thrown
 * ```
 *
 * @example
 * ```typescript
 * // Invalid address
 * try {
 *   validateAddress('0xInvalidAddress', 'tokenAddress');
 * } catch (error) {
 *   // ValidationError: Invalid tokenAddress
 *   console.error(error.message);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom field name in error message
 * try {
 *   validateAddress('0x123', 'receiver');
 * } catch (error) {
 *   // ValidationError {
 *   //   message: 'Invalid receiver',
 *   //   field: 'receiver',
 *   //   value: '0x123'
 *   // }
 * }
 * ```
 *
 * @public
 */
export function validateAddress(address: string, fieldName = 'address'): void {
  if (!ethers.isAddress(address)) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName, address);
  }
}

/**
 * Validates an optional Ethereum address.
 *
 * Similar to validateAddress but allows undefined values. Only validates
 * if an address is actually provided.
 *
 * @param address - The address string to validate (can be undefined)
 * @param fieldName - Optional field name for error messages (default: 'address')
 * @throws {ValidationError} If address is provided but format is invalid
 *
 * @remarks
 * Use this validator when an address parameter is optional in the CLI command.
 * If the address is undefined or not provided, no validation error is thrown.
 *
 * @example
 * ```typescript
 * // Undefined is valid (optional parameter)
 * validateOptionalAddress(undefined, 'tokenPool');
 * // No error thrown
 * ```
 *
 * @example
 * ```typescript
 * // Valid address is accepted
 * validateOptionalAddress(
 *   '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
 *   'tokenPool'
 * );
 * // No error thrown
 * ```
 *
 * @example
 * ```typescript
 * // Invalid address throws error
 * try {
 *   validateOptionalAddress('0xInvalid', 'safe');
 * } catch (error) {
 *   // ValidationError: Invalid safe
 * }
 * ```
 *
 * @public
 */
export function validateOptionalAddress(address: string | undefined, fieldName = 'address'): void {
  if (address && !ethers.isAddress(address)) {
    throw new ValidationError(`Invalid ${fieldName}`, fieldName, address);
  }
}

/**
 * Type for address validation field names.
 *
 * Defines the specific address types used in CLI commands.
 *
 * @internal
 */
type AddressField = 'safe' | 'owner' | 'token' | 'pool' | 'deployer';

/**
 * Mapping of address fields to their validation error messages.
 *
 * Provides context-specific error messages from VALIDATION_ERRORS config.
 *
 * @internal
 */
const ADDRESS_FIELD_ERRORS: Record<AddressField, string> = {
  safe: VALIDATION_ERRORS.INVALID_SAFE_ADDRESS,
  owner: VALIDATION_ERRORS.INVALID_OWNER_ADDRESS,
  token: VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS,
  pool: VALIDATION_ERRORS.INVALID_POOL_ADDRESS,
  deployer: VALIDATION_ERRORS.INVALID_DEPLOYER_ADDRESS,
};

/**
 * Generic validator for specific address fields with custom error messages.
 *
 * Internal helper function used by specialized address validators to provide
 * context-specific error messages.
 *
 * @param address - The address to validate
 * @param field - The field type (safe, owner, token, pool, deployer)
 * @throws {ValidationError} If address is invalid, with field-specific error message
 *
 * @internal
 */
function validateSpecificAddress(address: string, field: AddressField): void {
  if (!ethers.isAddress(address)) {
    throw new ValidationError(ADDRESS_FIELD_ERRORS[field], field, address);
  }
}

/**
 * Validates a Safe multisig contract address.
 *
 * Specialized validator for Safe addresses with context-specific error message.
 * Used when validating the `-s, --safe` CLI parameter.
 *
 * @param address - The Safe address to validate
 * @throws {ValidationError} With message from VALIDATION_ERRORS.INVALID_SAFE_ADDRESS
 *
 * @example
 * ```typescript
 * // Valid Safe address
 * validateSafeAddress('0x5419c6d83473d1c653e7b51e8568fafedce94f01');
 * ```
 *
 * @example
 * ```typescript
 * // Invalid Safe address
 * try {
 *   validateSafeAddress('0xInvalid');
 * } catch (error) {
 *   // ValidationError with INVALID_SAFE_ADDRESS message
 * }
 * ```
 *
 * @public
 */
export function validateSafeAddress(address: string): void {
  validateSpecificAddress(address, 'safe');
}

/**
 * Validates a Safe owner address.
 *
 * Specialized validator for Safe owner addresses with context-specific error message.
 * Used when validating the `-w, --owner` CLI parameter.
 *
 * @param address - The owner address to validate
 * @throws {ValidationError} With message from VALIDATION_ERRORS.INVALID_OWNER_ADDRESS
 *
 * @example
 * ```typescript
 * // Valid owner address
 * validateOwnerAddress('0x0000000000000000000000000000000000000000');
 * ```
 *
 * @public
 */
export function validateOwnerAddress(address: string): void {
  validateSpecificAddress(address, 'owner');
}

/**
 * Validates a token contract address.
 *
 * Specialized validator for token addresses with context-specific error message.
 * Used when validating the `-t, --token` CLI parameter.
 *
 * @param address - The token address to validate
 * @throws {ValidationError} With message from VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS
 *
 * @example
 * ```typescript
 * // Valid token address
 * validateTokenAddress('0x779877A7B0D9E8603169DdbD7836e478b4624789');
 * ```
 *
 * @public
 */
export function validateTokenAddress(address: string): void {
  validateSpecificAddress(address, 'token');
}

/**
 * Validates a TokenPool contract address.
 *
 * Specialized validator for pool addresses with context-specific error message.
 * Used when validating the `-p, --pool` CLI parameter.
 *
 * @param address - The pool address to validate
 * @throws {ValidationError} With message from VALIDATION_ERRORS.INVALID_POOL_ADDRESS
 *
 * @example
 * ```typescript
 * // Valid pool address
 * validatePoolAddress('0x1234567890123456789012345678901234567890');
 * ```
 *
 * @public
 */
export function validatePoolAddress(address: string): void {
  validateSpecificAddress(address, 'pool');
}

/**
 * Validates a TokenPoolFactory (deployer) contract address.
 *
 * Specialized validator for deployer/factory addresses with context-specific error message.
 * Used when validating the `-d, --deployer` CLI parameter.
 *
 * @param address - The deployer/factory address to validate
 * @throws {ValidationError} With message from VALIDATION_ERRORS.INVALID_DEPLOYER_ADDRESS
 *
 * @example
 * ```typescript
 * // Valid deployer address
 * validateDeployerAddress('0x17d8a409fe2cef2d3808bcb61f14abeffc28876e');
 * ```
 *
 * @public
 */
export function validateDeployerAddress(address: string): void {
  validateSpecificAddress(address, 'deployer');
}

/**
 * @fileoverview Salt validation for CREATE2 deterministic contract deployments.
 *
 * This module validates salt values used in CREATE2 deployments via the TokenPoolFactory.
 * The salt must be exactly 32 bytes (66 characters including 0x prefix) to ensure
 * deterministic address computation.
 *
 * The TokenPoolFactory modifies the salt by hashing it with msg.sender before CREATE2
 * deployment, enabling multiple users to use the same salt value without collision.
 *
 * @module validators/saltValidator
 */

import { ethers } from 'ethers';
import { VALIDATION_ERRORS, VALIDATION_RULES } from '../config';
import { ValidationError } from './ValidationError';

/**
 * Validates a salt value for CREATE2 deployment.
 *
 * Ensures the salt is exactly 32 bytes (66 hex characters including 0x prefix).
 * This length requirement is critical for CREATE2 address computation.
 *
 * @param salt - The salt value to validate (hex string)
 * @throws {ValidationError} If salt is missing or not exactly 32 bytes
 *
 * @remarks
 * Salt Requirements:
 * - Must be provided (not undefined or empty)
 * - Must be exactly 32 bytes
 * - Format: `0x` + 64 hexadecimal characters
 * - Total length: 66 characters
 *
 * CREATE2 Address Computation:
 * 1. Factory modifies salt: `modifiedSalt = keccak256(abi.encodePacked(salt, msg.sender))`
 * 2. Compute address: `keccak256(0xff ++ deployer ++ modifiedSalt ++ keccak256(initCode))`
 *
 * Salt Modification:
 * - The TokenPoolFactory hashes the salt with msg.sender
 * - This allows different users to use the same salt value
 * - Each user gets a different deployed address for the same salt
 *
 * @example
 * ```typescript
 * // Valid salt (32 bytes)
 * validateSalt('0x0000000000000000000000000000000000000000000000000000000123456789');
 * // No error thrown
 * ```
 *
 * @example
 * ```typescript
 * // Another valid salt (all zeros)
 * validateSalt('0x0000000000000000000000000000000000000000000000000000000000000000');
 * // No error thrown
 * ```
 *
 * @example
 * ```typescript
 * // Missing salt
 * try {
 *   validateSalt(undefined);
 * } catch (error) {
 *   // ValidationError: Salt is required
 *   // field: 'salt'
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Invalid length (too short)
 * try {
 *   validateSalt('0x1234');
 * } catch (error) {
 *   // ValidationError: Salt must be a 32-byte hex string
 *   // field: 'salt'
 *   // value: '0x1234'
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Invalid length (too long)
 * try {
 *   validateSalt('0x' + '00'.repeat(33)); // 33 bytes
 * } catch (error) {
 *   // ValidationError: Salt must be a 32-byte hex string
 * }
 * ```
 *
 * @see {@link VALIDATION_RULES.SALT_BYTE_LENGTH} for required salt length (32 bytes)
 * @see {@link createAddressComputer} for CREATE2 address computation with salt
 *
 * @public
 */
export function validateSalt(salt: string | undefined): void {
  if (!salt) {
    throw new ValidationError(VALIDATION_ERRORS.SALT_REQUIRED, 'salt');
  }

  if (ethers.dataLength(salt) !== VALIDATION_RULES.SALT_BYTE_LENGTH) {
    throw new ValidationError(
      'Salt must be a 32-byte hex string (0x followed by 64 hex characters)',
      'salt',
      salt,
    );
  }
}

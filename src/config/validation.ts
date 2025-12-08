/**
 * @fileoverview Validation rules and error message constants.
 *
 * This module defines validation constraints for blockchain-related inputs
 * (addresses, salts) and standardized error messages. Used throughout the
 * application for consistent validation and error reporting.
 *
 * Key Features:
 * - Type-safe constants with `as const` assertions
 * - Ethereum address and salt length validation rules
 * - Centralized error messages for validation failures
 * - Immutable configuration objects
 *
 * Usage Pattern:
 * - Import VALIDATION_RULES for length checks
 * - Import VALIDATION_ERRORS for consistent error messages
 * - All values are compile-time constants
 *
 * @example
 * ```typescript
 * import { VALIDATION_RULES, VALIDATION_ERRORS } from './config';
 *
 * if (salt.length !== VALIDATION_RULES.SALT_LENGTH) {
 *   throw new Error(VALIDATION_ERRORS.SALT_REQUIRED);
 * }
 *
 * if (address.length !== VALIDATION_RULES.ADDRESS_LENGTH) {
 *   throw new Error(VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS);
 * }
 * ```
 *
 * @module config/validation
 */

/**
 * Validation rules for blockchain-related inputs.
 *
 * Defines length constraints and formatting rules for Ethereum addresses,
 * CREATE2 salts, and other blockchain primitives. All values are type-safe
 * constants using `as const` assertions.
 *
 * @remarks
 * Constants:
 * - **SALT_LENGTH**: 66 characters (0x + 64 hex digits = 32 bytes)
 * - **ADDRESS_LENGTH**: 42 characters (0x + 40 hex digits = 20 bytes)
 * - **SALT_BYTE_LENGTH**: 32 bytes (raw byte count without 0x prefix)
 *
 * Ethereum Standards:
 * - Addresses: 20 bytes (40 hex chars + 0x prefix)
 * - Salts: 32 bytes for CREATE2 (64 hex chars + 0x prefix)
 * - All hex strings include '0x' prefix in length
 *
 * Type Safety:
 * - `as const` makes all values readonly and literal types
 * - Object itself is readonly via `as const` on container
 * - TypeScript enforces exact values (e.g., 66, not number)
 *
 * @example
 * ```typescript
 * // Salt validation
 * const salt = '0x1234...'; // 66 chars total
 * if (salt.length !== VALIDATION_RULES.SALT_LENGTH) {
 *   throw new Error('Invalid salt length');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Address validation
 * const address = '0xabcd...'; // 42 chars total
 * if (address.length !== VALIDATION_RULES.ADDRESS_LENGTH) {
 *   throw new Error('Invalid address length');
 * }
 * ```
 *
 * @public
 */
export const VALIDATION_RULES = {
  /**
   * Salt string length including 0x prefix (66 characters).
   *
   * @remarks
   * Format: 0x + 64 hexadecimal characters = 32 bytes
   * Used for CREATE2 deterministic deployments
   *
   * @example '0x0000000000000000000000000000000000000000000000000000000123456789'
   */
  SALT_LENGTH: 66 as const,

  /**
   * Ethereum address string length including 0x prefix (42 characters).
   *
   * @remarks
   * Format: 0x + 40 hexadecimal characters = 20 bytes
   * Standard Ethereum address format
   *
   * @example '0x779877A7B0D9E8603169DdbD7836e478b4624789'
   */
  ADDRESS_LENGTH: 42 as const,

  /**
   * Salt byte length without 0x prefix (32 bytes).
   *
   * @remarks
   * Raw byte count used for validation
   * Equivalent to 64 hex characters
   */
  SALT_BYTE_LENGTH: 32 as const,
} as const;

/**
 * Standardized error messages for validation failures.
 *
 * Provides consistent, user-friendly error messages for common validation
 * failures. All messages are type-safe constants using `as const` assertion.
 *
 * @remarks
 * Message Categories:
 * - **Address Validation**: Safe, owner, token, pool, factory, deployer
 * - **Format Requirements**: Safe JSON required parameters
 * - **Salt Validation**: Salt format and length requirements
 *
 * Usage Pattern:
 * - Throw errors with these messages for consistency
 * - Messages are descriptive for end users
 * - Can be extended with context via CLIError technicalDetails
 *
 * Design Philosophy:
 * - Clear, actionable messages
 * - Consistent phrasing across error types
 * - Include format hints where helpful
 *
 * @example
 * ```typescript
 * // Address validation
 * if (!ethers.isAddress(tokenAddress)) {
 *   throw new CLIError(
 *     VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS,
 *     { providedAddress: tokenAddress }
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Salt validation
 * if (salt.length !== VALIDATION_RULES.SALT_LENGTH) {
 *   throw new CLIError(
 *     VALIDATION_ERRORS.SALT_REQUIRED,
 *     { providedSalt: salt, expectedLength: VALIDATION_RULES.SALT_LENGTH }
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Safe JSON format validation
 * if (format === 'safe-json' && !options.chainId) {
 *   throw new CLIError(VALIDATION_ERRORS.MISSING_SAFE_JSON_PARAMS);
 * }
 * ```
 *
 * @public
 */
export const VALIDATION_ERRORS = {
  /** Error when Safe multisig address is invalid or malformed */
  INVALID_SAFE_ADDRESS: 'Invalid Safe address',

  /** Error when Safe owner address is invalid or malformed */
  INVALID_OWNER_ADDRESS: 'Invalid owner address',

  /** Error when token contract address is invalid or malformed */
  INVALID_TOKEN_ADDRESS: 'Invalid token address',

  /** Error when pool contract address is invalid or malformed */
  INVALID_POOL_ADDRESS: 'Invalid pool address',

  /** Error when factory contract address is invalid or malformed */
  INVALID_FACTORY_ADDRESS: 'Invalid factory address',

  /** Error when deployer address is invalid or malformed */
  INVALID_DEPLOYER_ADDRESS: 'Invalid deployer address',

  /**
   * Error when Safe Transaction Builder JSON format requires missing parameters.
   *
   * @remarks
   * Required parameters: chainId, safe (address), owner (address)
   */
  MISSING_SAFE_JSON_PARAMS:
    'chainId, safe, and owner are required for Safe Transaction Builder JSON format',

  /**
   * Error when salt is missing or has incorrect format/length.
   *
   * @remarks
   * Expected format: 0x followed by 64 hexadecimal characters (32 bytes total)
   */
  SALT_REQUIRED:
    'Salt is required and must be 32 bytes (66 characters: 0x followed by 64 hex digits)',
} as const;

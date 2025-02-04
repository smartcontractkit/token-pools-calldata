/**
 * @fileoverview Error message constants.
 *
 * This module defines standardized error messages for validation failures.
 * Provides consistent, user-friendly error messages used throughout the application.
 *
 * @deprecated This module is being phased out in favor of `src/config/validation.ts`.
 * New code should import `VALIDATION_ERRORS` from `@/config` instead.
 *
 * @module constants/errors
 * @see {@link module:config/validation} for current validation configuration
 */

/**
 * Standardized error messages for validation failures.
 *
 * @deprecated Use `VALIDATION_ERRORS` from `src/config/validation.ts` instead.
 *
 * @public
 */
export const ERROR_MESSAGES = {
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
   * Required: chainId, safe (address), owner (address)
   */
  MISSING_SAFE_JSON_PARAMS:
    'chainId, safe, and owner are required for Safe Transaction Builder JSON format',

  /**
   * Error when salt is missing or has incorrect format/length.
   * Expected: 0x followed by 64 hexadecimal characters (32 bytes)
   */
  SALT_REQUIRED:
    'Salt is required and must be 32 bytes (66 characters: 0x followed by 64 hex digits)',
} as const;

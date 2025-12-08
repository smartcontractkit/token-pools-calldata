/**
 * @fileoverview Default value constants.
 *
 * This module defines default values for transactions and Safe multisig operations.
 * Provides immutable constants used throughout the application for transaction
 * generation and output formatting.
 *
 * @deprecated This module is being phased out in favor of `src/config/defaults.ts`.
 * New code should import from `@/config` instead of `@/constants`.
 *
 * @module constants/defaults
 * @see {@link module:config/defaults} for current configuration module
 */

/**
 * Default values for transactions and operations.
 *
 * @deprecated Use `DEFAULTS` from `src/config/defaults.ts` instead.
 *
 * @public
 */
export const DEFAULT_VALUES = {
  /** Default transaction value (0 ETH) */
  TRANSACTION_VALUE: '0',

  /** Safe Transaction Builder JSON version */
  SAFE_TX_VERSION: '1.0',

  /** Default CLI output format */
  OUTPUT_FORMAT: 'calldata' as const,
} as const;

/**
 * Safe multisig operation type constants.
 *
 * @deprecated Use `SAFE_OPERATION` from `src/config/defaults.ts` instead.
 *
 * @public
 */
export const SAFE_OPERATION_TYPE = {
  /** Standard contract call (operation type 0) */
  CALL: 0,

  /** Delegatecall operation (operation type 1) */
  DELEGATE_CALL: 1,
} as const;

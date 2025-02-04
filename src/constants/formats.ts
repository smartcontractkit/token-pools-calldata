/**
 * @fileoverview Output format and validation constants.
 *
 * This module defines output format options and validation rules for CLI commands.
 * Provides constants for format validation and length constraints.
 *
 * @deprecated This module is being phased out in favor of:
 * - `src/config/defaults.ts` for OUTPUT_FORMAT
 * - `src/config/validation.ts` for VALIDATION_RULES
 * New code should import from `@/config` instead.
 *
 * @module constants/formats
 * @see {@link module:config/defaults} for output format configuration
 * @see {@link module:config/validation} for validation rules
 */

/**
 * Output format option constants.
 *
 * @deprecated Use `OUTPUT_FORMAT` from `src/config/defaults.ts` instead.
 *
 * @public
 */
export const OUTPUT_FORMATS = {
  /** Raw hex-encoded calldata format */
  CALLDATA: 'calldata',

  /** Safe Transaction Builder JSON format */
  SAFE_JSON: 'safe-json',
} as const;

/**
 * Validation rules for blockchain inputs.
 *
 * @deprecated Use `VALIDATION_RULES` from `src/config/validation.ts` instead.
 *
 * @public
 */
export const VALIDATION = {
  /** Salt string length including 0x prefix (66 characters) */
  SALT_LENGTH: 66,

  /** Ethereum address string length including 0x prefix (42 characters) */
  ADDRESS_LENGTH: 42,
} as const;

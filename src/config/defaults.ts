/**
 * @fileoverview Default values and configuration constants.
 *
 * This module defines application-wide default values for transactions, Safe
 * multisig operations, and output formatting. Provides type-safe constants for
 * CLI commands and transaction generation.
 *
 * Key Features:
 * - Transaction defaults (value, version)
 * - Safe operation type enums (CALL vs DELEGATE_CALL)
 * - Output format options (calldata vs Safe JSON)
 * - Type-safe constants with `as const` assertions
 *
 * Usage Pattern:
 * - Import DEFAULTS for transaction and output defaults
 * - Import SAFE_OPERATION for operation type values
 * - Import OUTPUT_FORMAT for format validation
 * - Use OutputFormat type for type-safe format parameters
 *
 * @example
 * ```typescript
 * import { DEFAULTS, SAFE_OPERATION, OUTPUT_FORMAT } from './config';
 *
 * const txValue = DEFAULTS.TRANSACTION_VALUE; // '0'
 * const format = DEFAULTS.OUTPUT_FORMAT; // 'calldata'
 * const operation = SAFE_OPERATION.CALL; // 0
 * ```
 *
 * @module config/defaults
 */

/**
 * Default values for transactions and Safe multisig operations.
 *
 * Defines application-wide defaults for transaction value, Safe transaction
 * version, and CLI output format. All values are immutable type-safe constants.
 *
 * @remarks
 * Constants:
 * - **TRANSACTION_VALUE**: '0' (no ETH sent with transactions)
 * - **SAFE_TX_VERSION**: '1.0' (Safe Transaction Builder format version)
 * - **OUTPUT_FORMAT**: 'calldata' (default CLI output format)
 *
 * Design Decisions:
 * - Transaction value is '0' since all operations are contract calls (no ETH transfer)
 * - Safe version '1.0' matches Safe Transaction Builder JSON schema
 * - Default format 'calldata' for simplicity (Safe JSON requires additional params)
 *
 * Type Safety:
 * - `as const` makes all values readonly and literal types
 * - Object itself is readonly via outer `as const`
 * - TypeScript enforces exact string literal types
 *
 * @example
 * ```typescript
 * // Using transaction defaults
 * const transaction = {
 *   value: DEFAULTS.TRANSACTION_VALUE, // '0'
 *   to: contractAddress,
 *   data: calldata
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Using Safe transaction defaults
 * const safeTx = {
 *   version: DEFAULTS.SAFE_TX_VERSION, // '1.0'
 *   chainId: '1',
 *   // ... other Safe tx fields
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Using output format default
 * const format = options.format || DEFAULTS.OUTPUT_FORMAT; // 'calldata'
 * ```
 *
 * @public
 */
export const DEFAULTS = {
  /**
   * Default transaction value in wei (0 ETH).
   *
   * @remarks
   * All generated transactions are contract calls with no ETH transfer.
   * String type for consistency with ethers.js and to avoid precision issues.
   */
  TRANSACTION_VALUE: '0' as const,

  /**
   * Safe Transaction Builder JSON format version.
   *
   * @remarks
   * Version '1.0' matches the Safe Transaction Builder schema.
   * Used in the 'version' field of Safe JSON output.
   */
  SAFE_TX_VERSION: '1.0' as const,

  /**
   * Default CLI output format (raw calldata).
   *
   * @remarks
   * - 'calldata': Hex-encoded function calldata (default)
   * - 'safe-json': Safe Transaction Builder JSON format
   *
   * Calldata is the default for simplicity (no additional params required).
   */
  OUTPUT_FORMAT: 'calldata' as const,
} as const;

/**
 * Safe multisig operation type constants.
 *
 * Defines operation types for Safe Transaction Builder JSON format. Maps
 * operation names to their numeric values used in Safe transactions.
 *
 * @remarks
 * Operation Types:
 * - **CALL (0)**: Standard contract call (most common)
 * - **DELEGATE_CALL (1)**: Delegatecall operation (advanced use cases)
 *
 * Safe Transaction Format:
 * - These values appear in the 'operation' field of Safe transactions
 * - CALL is used for all generated transactions in this application
 * - DELEGATE_CALL allows Safe to execute code in its own context
 *
 * Type Safety:
 * - Numeric literals with `as const` for type narrowing
 * - TypeScript infers exact values (0 | 1) not just number
 *
 * @example
 * ```typescript
 * // Using in Safe transaction
 * const safeTx = {
 *   to: contractAddress,
 *   value: '0',
 *   data: calldata,
 *   operation: SAFE_OPERATION.CALL, // 0
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Advanced: delegatecall operation
 * const delegateTx = {
 *   to: implementationAddress,
 *   value: '0',
 *   data: calldata,
 *   operation: SAFE_OPERATION.DELEGATE_CALL, // 1
 * };
 * ```
 *
 * @public
 */
export const SAFE_OPERATION = {
  /** Standard contract call (operation type 0) */
  CALL: 0 as const,

  /** Delegatecall operation (operation type 1) */
  DELEGATE_CALL: 1 as const,
} as const;

/**
 * Output format option constants.
 *
 * Defines valid output format values for CLI commands. Used for format
 * validation and as the source of truth for supported formats.
 *
 * @remarks
 * Format Options:
 * - **CALLDATA**: Raw hex-encoded calldata (simple, direct)
 * - **SAFE_JSON**: Safe Transaction Builder JSON (requires chainId, safe, owner)
 *
 * Usage Context:
 * - CLI flag validation: `-f, --format <type>`
 * - Output generation routing
 * - Type narrowing via OutputFormat type
 *
 * Type Safety:
 * - String literals with `as const` for exact type inference
 * - Used in OutputFormat discriminated union type
 *
 * @example
 * ```typescript
 * // Format validation
 * const validFormats = Object.values(OUTPUT_FORMAT); // ['calldata', 'safe-json']
 *
 * if (!validFormats.includes(format)) {
 *   throw new Error('Invalid format');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe format checking
 * if (format === OUTPUT_FORMAT.SAFE_JSON) {
 *   // Generate Safe JSON output
 *   return generateSafeJSON(transactions, options);
 * } else if (format === OUTPUT_FORMAT.CALLDATA) {
 *   // Generate raw calldata
 *   return generateCalldata(transactions);
 * }
 * ```
 *
 * @public
 */
export const OUTPUT_FORMAT = {
  /** Raw hex-encoded calldata format */
  CALLDATA: 'calldata' as const,

  /** Safe Transaction Builder JSON format */
  SAFE_JSON: 'safe-json' as const,
} as const;

/**
 * Type representing valid output format values.
 *
 * Union type derived from OUTPUT_FORMAT constant values. Ensures type-safe
 * format parameters throughout the application.
 *
 * @remarks
 * Type Definition:
 * - Extracts all values from OUTPUT_FORMAT object
 * - Results in: 'calldata' | 'safe-json'
 * - Automatically stays in sync with OUTPUT_FORMAT changes
 *
 * Usage:
 * - Function parameters requiring format specification
 * - Type guards for format discrimination
 * - Interface definitions for options objects
 *
 * @example
 * ```typescript
 * // Function parameter typing
 * function generateOutput(
 *   transactions: Transaction[],
 *   format: OutputFormat
 * ): string | SafeJSON {
 *   if (format === 'safe-json') {
 *     return generateSafeJSON(transactions);
 *   }
 *   return generateCalldata(transactions);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Interface usage
 * interface CommandOptions {
 *   format?: OutputFormat; // 'calldata' | 'safe-json'
 *   output?: string;
 * }
 * ```
 *
 * @public
 */
export type OutputFormat = (typeof OUTPUT_FORMAT)[keyof typeof OUTPUT_FORMAT];

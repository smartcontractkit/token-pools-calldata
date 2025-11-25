/**
 * @fileoverview High-level service for CLI output operations.
 *
 * This module provides the OutputService class which orchestrates output writing
 * for CLI commands. Handles format selection (calldata vs Safe JSON), writer
 * instantiation, and destination resolution.
 *
 * The service acts as a facade over the OutputWriter abstraction, providing
 * convenience methods for common output scenarios.
 *
 * @module output/OutputService
 */

import { OUTPUT_FORMAT } from '../config';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import { OutputDestination, OutputWriterFactory } from './OutputWriter';

/**
 * Output format type union.
 *
 * Defines the supported output formats for CLI commands.
 *
 * @public
 */
export type OutputFormat = typeof OUTPUT_FORMAT.CALLDATA | typeof OUTPUT_FORMAT.SAFE_JSON;

/**
 * Service for handling CLI output operations.
 *
 * Provides high-level methods for writing transaction data in different formats.
 * Orchestrates writer selection, format conversion, and output destination.
 *
 * @remarks
 * Responsibilities:
 * - Format selection (calldata vs Safe JSON)
 * - Writer instantiation via factory
 * - Destination resolution (console vs file)
 * - Multiple transaction handling
 * - Error validation for format requirements
 *
 * Usage Pattern:
 * 1. Instantiate service: `const service = new OutputService()`
 * 2. Call appropriate method: `await service.writeCalldata(tx, path)`
 * 3. Or use generic write: `await service.write(format, tx, safeJson, path)`
 *
 * @example
 * ```typescript
 * const service = new OutputService();
 * const transaction = {
 *   to: '0x...',
 *   value: '0',
 *   data: '0x1234...',
 *   operation: SafeOperationType.Call
 * };
 *
 * // Write calldata to console
 * await service.writeCalldata(transaction);
 *
 * // Write calldata to file
 * await service.writeCalldata(transaction, 'output/calldata.txt');
 *
 * // Write Safe JSON
 * const safeJson = { ... }; // SafeTransactionBuilderJSON
 * await service.writeSafeJson(safeJson, 'output/safe.json');
 * ```
 *
 * @public
 */
export class OutputService {
  /**
   * Write transaction data as raw calldata.
   *
   * Extracts calldata from transaction(s) and writes to console or file.
   * Supports both single transactions and arrays of multiple transactions.
   *
   * @param transaction - Transaction or array of transactions
   * @param outputPath - Optional file path (if not provided, writes to console)
   * @returns Promise that resolves when write is complete
   *
   * @remarks
   * Multiple Transactions:
   * - If array provided, extracts calldata from each transaction
   * - Joins multiple calldata with newlines
   * - Each calldata on separate line in output
   *
   * Single Transaction:
   * - Extracts transaction.data field
   * - Writes single hex string
   *
   * Destination:
   * - outputPath provided: Write to file at path
   * - outputPath undefined: Write to console (stdout)
   *
   * @example
   * ```typescript
   * const service = new OutputService();
   * const tx = {
   *   to: '0x1234...',
   *   value: '0',
   *   data: '0xabcdef...',
   *   operation: SafeOperationType.Call
   * };
   *
   * // Write to console
   * await service.writeCalldata(tx);
   * // Output: 0xabcdef...
   *
   * // Write to file
   * await service.writeCalldata(tx, 'output/calldata.txt');
   * // File contains: 0xabcdef...\n
   * ```
   *
   * @example
   * ```typescript
   * // Multiple transactions
   * const transactions = [
   *   { to: '0x...', value: '0', data: '0x1111...', operation: 0 },
   *   { to: '0x...', value: '0', data: '0x2222...', operation: 0 }
   * ];
   *
   * await service.writeCalldata(transactions, 'output/batch.txt');
   * // File contains:
   * // 0x1111...
   * // 0x2222...
   * ```
   */
  async writeCalldata(
    transaction: SafeTransactionDataBase | SafeTransactionDataBase[],
    outputPath?: string,
  ): Promise<void> {
    const writer = OutputWriterFactory.createCalldataWriter();
    const destination: OutputDestination = outputPath
      ? { type: 'file', path: outputPath }
      : { type: 'console' };

    // Handle multiple transactions
    const calldata = Array.isArray(transaction)
      ? transaction.map((tx) => tx.data).join('\n')
      : transaction.data;

    await writer.write(calldata, destination);
  }

  /**
   * Write Safe Transaction Builder JSON.
   *
   * Writes formatted Safe Transaction Builder JSON to console or file.
   * Uses Prettier for consistent JSON formatting.
   *
   * @param safeJson - Complete Safe Transaction Builder JSON structure
   * @param outputPath - Optional file path (if not provided, writes to console)
   * @returns Promise that resolves when write is complete
   *
   * @remarks
   * JSON Formatting:
   * - Serializes to JSON string
   * - Formats with Prettier using project config
   * - Writes formatted JSON
   *
   * Destination:
   * - outputPath provided: Write to file at path
   * - outputPath undefined: Write to console (stdout)
   *
   * Use Case:
   * - Import into Safe Transaction Builder UI
   * - Human-readable transaction review
   * - Version control friendly format
   *
   * @example
   * ```typescript
   * const service = new OutputService();
   * const safeJson: SafeTransactionBuilderJSON = {
   *   version: '1.18.0',
   *   chainId: '84532',
   *   createdAt: Date.now(),
   *   meta: {
   *     name: 'Deploy Token',
   *     description: 'Deploy BurnMintERC20 token',
   *     txBuilderVersion: '1.18.0',
   *     createdFromSafeAddress: '0xSafe',
   *     createdFromOwnerAddress: '0xOwner'
   *   },
   *   transactions: [...]
   * };
   *
   * // Write to console (formatted)
   * await service.writeSafeJson(safeJson);
   *
   * // Write to file
   * await service.writeSafeJson(safeJson, 'output/safe.json');
   * ```
   */
  async writeSafeJson(safeJson: SafeTransactionBuilderJSON, outputPath?: string): Promise<void> {
    const writer = OutputWriterFactory.createJsonWriter();
    const destination: OutputDestination = outputPath
      ? { type: 'file', path: outputPath }
      : { type: 'console' };

    await writer.write(JSON.stringify(safeJson), destination);
  }

  /**
   * Write output based on format selection.
   *
   * Convenience method that automatically selects the appropriate write method
   * based on the output format. Handles format validation and routing.
   *
   * @param format - Output format ('calldata' or 'safe-json')
   * @param transaction - Transaction or array of transactions
   * @param safeJson - Safe JSON (required if format is 'safe-json')
   * @param outputPath - Optional file path
   * @returns Promise that resolves when write is complete
   * @throws {Error} If format is 'safe-json' but safeJson is null
   *
   * @remarks
   * Format Routing:
   * - 'safe-json': Calls writeSafeJson() with safeJson parameter
   * - 'calldata': Calls writeCalldata() with transaction parameter
   *
   * Validation:
   * - If format is 'safe-json', safeJson must be provided (not null)
   * - Throws error if Safe JSON format requested but safeJson is null
   *
   * Use Case:
   * - Generic output handling when format is determined at runtime
   * - CLI handlers that support both output formats
   *
   * @example
   * ```typescript
   * const service = new OutputService();
   * const transaction = { ... };
   * const safeJson = { ... };
   *
   * // Write calldata
   * await service.write(
   *   OUTPUT_FORMAT.CALLDATA,
   *   transaction,
   *   null,
   *   'output/calldata.txt'
   * );
   *
   * // Write Safe JSON
   * await service.write(
   *   OUTPUT_FORMAT.SAFE_JSON,
   *   transaction,
   *   safeJson,
   *   'output/safe.json'
   * );
   * ```
   *
   * @example
   * ```typescript
   * // Error case - Safe JSON format but no safeJson provided
   * try {
   *   await service.write(
   *     OUTPUT_FORMAT.SAFE_JSON,
   *     transaction,
   *     null,  // Missing safeJson
   *     'output.json'
   *   );
   * } catch (error) {
   *   // Error: Safe JSON format requested but no Safe JSON provided
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Format determined at runtime (CLI)
   * const format = options.format || OUTPUT_FORMAT.CALLDATA;
   * await service.write(format, transaction, safeJson, options.output);
   * ```
   */
  async write(
    format: OutputFormat,
    transaction: SafeTransactionDataBase | SafeTransactionDataBase[],
    safeJson: SafeTransactionBuilderJSON | null,
    outputPath?: string,
  ): Promise<void> {
    if (format === OUTPUT_FORMAT.SAFE_JSON) {
      if (!safeJson) {
        throw new Error('Safe JSON format requested but no Safe JSON provided');
      }
      await this.writeSafeJson(safeJson, outputPath);
    } else {
      await this.writeCalldata(transaction, outputPath);
    }
  }
}

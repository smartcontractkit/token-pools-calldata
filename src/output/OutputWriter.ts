/**
 * @fileoverview Output writer abstraction for CLI command results.
 *
 * This module provides an abstraction layer for writing CLI output to either console
 * (stdout) or files. Uses the Strategy pattern with abstract OutputWriter base class
 * and concrete implementations for different output formats.
 *
 * Features:
 * - Calldata writer for raw hex strings
 * - JSON writer with Prettier formatting (for Safe Transaction Builder)
 * - Transaction JSON writer for wallet-agnostic output (to, value, data)
 * - Automatic file path resolution and directory creation
 * - Consistent logging of file writes
 *
 * @module output/OutputWriter
 */

import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';
import logger from '../utils/logger';

/**
 * Output destination discriminated union.
 *
 * Specifies where output should be written: console (stdout) or file system.
 *
 * @remarks
 * Discriminated union enables type-safe handling of console vs file output:
 * - Console: No additional data needed
 * - File: Requires file path
 *
 * @example
 * ```typescript
 * // Write to console
 * const consoleDestination: OutputDestination = { type: 'console' };
 *
 * // Write to file
 * const fileDestination: OutputDestination = {
 *   type: 'file',
 *   path: 'output/transaction.json'
 * };
 * ```
 *
 * @public
 */
export type OutputDestination = { type: 'console' } | { type: 'file'; path: string };

/**
 * Abstract base class for output writers.
 *
 * Defines the contract for output writers using the Strategy pattern. Concrete
 * implementations handle specific output formats (calldata, JSON) with appropriate
 * formatting.
 *
 * @remarks
 * Strategy Pattern:
 * - Abstract write() method implemented by subclasses
 * - Optional format() hook for content formatting
 * - Shared writeToConsole() and writeToFile() utilities
 *
 * Subclasses:
 * - {@link CalldataWriter} for raw hex calldata
 * - {@link JsonWriter} for formatted JSON
 *
 * @example
 * ```typescript
 * // Implementing a custom writer
 * class CustomWriter extends OutputWriter {
 *   async write(content: string, destination: OutputDestination): Promise<void> {
 *     const formatted = await this.format(content);
 *     if (destination.type === 'console') {
 *       this.writeToConsole(formatted);
 *     } else {
 *       await this.writeToFile(formatted, destination.path);
 *     }
 *   }
 *
 *   protected format(content: string): string {
 *     return content.toUpperCase(); // Custom formatting
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class OutputWriter {
  /**
   * Write output to the specified destination.
   *
   * Abstract method that must be implemented by subclasses to handle
   * format-specific output writing.
   *
   * @param content - The content to write (may be unformatted)
   * @param destination - Where to write the output (console or file)
   * @returns Promise that resolves when write is complete
   *
   * @remarks
   * Implementations typically:
   * 1. Format content using format() method
   * 2. Check destination type
   * 3. Write to console or file using protected methods
   */
  abstract write(content: string, destination: OutputDestination): Promise<void>;

  /**
   * Format content before writing.
   *
   * Optional hook for subclasses to transform content before output.
   * Default implementation returns content unchanged.
   *
   * @param content - The content to format
   * @returns Formatted content (synchronous or asynchronous)
   *
   * @remarks
   * Can return string or Promise<string> for flexibility:
   * - CalldataWriter returns string (synchronous)
   * - JsonWriter returns Promise<string> (async Prettier formatting)
   *
   * @protected
   */
  protected format(content: string): string | Promise<string> {
    return content;
  }

  /**
   * Write content to console (stdout).
   *
   * Utility method for writing to console with consistent behavior.
   * Uses console.log for output.
   *
   * @param content - The formatted content to write
   *
   * @protected
   */
  protected writeToConsole(content: string): void {
    console.log(content);
  }

  /**
   * Write content to file system.
   *
   * Utility method for writing to files with path resolution and logging.
   *
   * @param content - The formatted content to write
   * @param filePath - File path (relative or absolute)
   * @returns Promise that resolves when file is written
   *
   * @remarks
   * Features:
   * - Resolves relative paths to absolute paths
   * - Logs successful writes with resolved path
   * - Creates parent directories if needed (Node.js fs.writeFile behavior)
   *
   * @example
   * ```typescript
   * // Relative path
   * await this.writeToFile(content, 'output/result.json');
   * // Resolves to: /path/to/project/output/result.json
   *
   * // Absolute path
   * await this.writeToFile(content, '/tmp/result.json');
   * // Writes to: /tmp/result.json
   * ```
   *
   * @protected
   */
  protected async writeToFile(content: string, filePath: string): Promise<void> {
    const resolvedPath = path.resolve(filePath);
    await fs.writeFile(resolvedPath, content);
    logger.info('Successfully wrote output to file', { outputPath: resolvedPath });
  }
}

/**
 * Calldata output writer for raw hex strings.
 *
 * Writes transaction calldata (hex-encoded function calls) to console or file.
 * Ensures proper newline formatting for file output.
 *
 * @remarks
 * Use Cases:
 * - Raw calldata for web3 libraries
 * - Block explorer transaction construction
 * - Foundry cast send commands
 * - Manual transaction building
 *
 * Formatting:
 * - Adds trailing newline if missing (better file output)
 * - No other formatting applied (preserves hex string)
 *
 * @example
 * ```typescript
 * const writer = new CalldataWriter();
 * const calldata = '0x1234567890abcdef...';
 *
 * // Write to console
 * await writer.write(calldata, { type: 'console' });
 * // Output: 0x1234567890abcdef...
 *
 * // Write to file
 * await writer.write(calldata, { type: 'file', path: 'output/calldata.txt' });
 * // File: 0x1234567890abcdef...\n
 * ```
 *
 * @public
 */
export class CalldataWriter extends OutputWriter {
  /**
   * Write calldata to console or file.
   *
   * @param content - Raw hex calldata string
   * @param destination - Where to write the output
   */
  async write(content: string, destination: OutputDestination): Promise<void> {
    const formatted = await Promise.resolve(this.format(content));

    if (destination.type === 'console') {
      this.writeToConsole(formatted);
    } else {
      await this.writeToFile(formatted, destination.path);
    }
  }

  /**
   * Format calldata by ensuring trailing newline.
   *
   * @param content - Raw hex calldata string
   * @returns Formatted calldata with trailing newline
   *
   * @protected
   */
  protected format(content: string): string {
    // Ensure newline at end for file output
    return content.endsWith('\n') ? content : content + '\n';
  }
}

/**
 * JSON output writer with Prettier formatting.
 *
 * Writes Safe Transaction Builder JSON with automatic formatting using Prettier.
 * Respects project's Prettier configuration.
 *
 * @remarks
 * Use Cases:
 * - Safe Transaction Builder JSON files
 * - Formatted JSON for human review
 * - JSON output with consistent style
 *
 * Formatting:
 * - Parses JSON to validate structure
 * - Formats using Prettier with project config
 * - Uses 'json' parser for proper formatting
 *
 * @example
 * ```typescript
 * const writer = new JsonWriter();
 * const json = '{"version":"1.18.0","chainId":"1","transactions":[]}';
 *
 * // Write formatted JSON to console
 * await writer.write(json, { type: 'console' });
 * // Output:
 * // {
 * //   "version": "1.18.0",
 * //   "chainId": "1",
 * //   "transactions": []
 * // }
 *
 * // Write to file
 * await writer.write(json, { type: 'file', path: 'output/safe.json' });
 * ```
 *
 * @example
 * ```typescript
 * // Handles malformed JSON
 * try {
 *   await writer.write('invalid json', { type: 'console' });
 * } catch (error) {
 *   // JSON.parse error thrown during format()
 * }
 * ```
 *
 * @public
 */
export class JsonWriter extends OutputWriter {
  /**
   * Write formatted JSON to console or file.
   *
   * @param content - JSON string (will be parsed and formatted)
   * @param destination - Where to write the output
   */
  async write(content: string, destination: OutputDestination): Promise<void> {
    const formatted = await this.format(content);

    if (destination.type === 'console') {
      this.writeToConsole(formatted);
    } else {
      await this.writeToFile(formatted, destination.path);
    }
  }

  /**
   * Format JSON using Prettier.
   *
   * Parses JSON to validate, then formats with Prettier using project config.
   *
   * @param content - JSON string to format
   * @returns Formatted JSON string
   * @throws {SyntaxError} If JSON is malformed
   *
   * @remarks
   * Formatting steps:
   * 1. Parse JSON to validate and get object
   * 2. Resolve Prettier config from project
   * 3. Stringify object and format with Prettier
   * 4. Return formatted JSON string
   *
   * @protected
   */
  protected async format(content: string): Promise<string> {
    // Parse and re-format with prettier
    const obj: unknown = JSON.parse(content);
    const config = await prettier.resolveConfig(process.cwd());
    return prettier.format(JSON.stringify(obj), {
      ...config,
      parser: 'json',
    });
  }
}

/**
 * Transaction JSON output writer.
 *
 * Writes raw transaction data as JSON with to, value, and data fields.
 * This format is wallet-agnostic and can be used with any SDK or CLI
 * (e.g., Avocado, ethers.js, viem, etc.).
 *
 * @remarks
 * Use Cases:
 * - Integration with third-party wallet SDKs
 * - Manual transaction submission via any tool
 * - Programmatic transaction building
 * - Copy/paste into wallet interfaces
 *
 * Output Format:
 * Single transaction:
 * ```json
 * {
 *   "to": "0x...",
 *   "value": "0",
 *   "data": "0x..."
 * }
 * ```
 *
 * Multiple transactions:
 * ```json
 * [
 *   { "to": "0x...", "value": "0", "data": "0x..." },
 *   { "to": "0x...", "value": "0", "data": "0x..." }
 * ]
 * ```
 *
 * @example
 * ```typescript
 * const writer = new TransactionJsonWriter();
 * const txJson = JSON.stringify({
 *   to: '0x1234...',
 *   value: '0',
 *   data: '0xabcdef...'
 * });
 *
 * // Write to console
 * await writer.write(txJson, { type: 'console' });
 *
 * // Write to file
 * await writer.write(txJson, { type: 'file', path: 'output/tx.json' });
 * ```
 *
 * @public
 */
export class TransactionJsonWriter extends OutputWriter {
  /**
   * Write transaction JSON to console or file.
   *
   * @param content - JSON string containing transaction data
   * @param destination - Where to write the output
   */
  async write(content: string, destination: OutputDestination): Promise<void> {
    const formatted = await this.format(content);

    if (destination.type === 'console') {
      this.writeToConsole(formatted);
    } else {
      await this.writeToFile(formatted, destination.path);
    }
  }

  /**
   * Format transaction JSON using Prettier.
   *
   * @param content - JSON string to format
   * @returns Formatted JSON string
   * @throws {SyntaxError} If JSON is malformed
   *
   * @protected
   */
  protected async format(content: string): Promise<string> {
    const obj: unknown = JSON.parse(content);
    const config = await prettier.resolveConfig(process.cwd());
    return prettier.format(JSON.stringify(obj), {
      ...config,
      parser: 'json',
    });
  }
}

/**
 * Factory for creating output writers.
 *
 * Provides factory methods for instantiating appropriate writer types.
 * Encapsulates writer construction logic.
 *
 * @remarks
 * Factory Pattern Benefits:
 * - Centralized writer creation
 * - Easy to extend with new writer types
 * - Consistent instantiation
 *
 * @example
 * ```typescript
 * // Create writers using factory
 * const calldataWriter = OutputWriterFactory.createCalldataWriter();
 * const jsonWriter = OutputWriterFactory.createJsonWriter();
 * const txJsonWriter = OutputWriterFactory.createTransactionJsonWriter();
 *
 * // Use writers
 * await calldataWriter.write('0x1234...', { type: 'console' });
 * await jsonWriter.write('{"key":"value"}', { type: 'console' });
 * await txJsonWriter.write('{"to":"0x...","value":"0","data":"0x..."}', { type: 'console' });
 * ```
 *
 * @public
 */
export class OutputWriterFactory {
  /**
   * Create a calldata writer instance.
   *
   * @returns New CalldataWriter instance
   */
  static createCalldataWriter(): CalldataWriter {
    return new CalldataWriter();
  }

  /**
   * Create a JSON writer instance (for Safe Transaction Builder JSON).
   *
   * @returns New JsonWriter instance
   */
  static createJsonWriter(): JsonWriter {
    return new JsonWriter();
  }

  /**
   * Create a transaction JSON writer instance.
   *
   * @returns New TransactionJsonWriter instance
   *
   * @remarks
   * Use this writer for wallet-agnostic transaction JSON output
   * containing to, value, and data fields.
   */
  static createTransactionJsonWriter(): TransactionJsonWriter {
    return new TransactionJsonWriter();
  }
}

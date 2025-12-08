/**
 * @fileoverview CLI error handling and formatting utilities.
 *
 * This module provides error handling infrastructure for CLI commands, separating
 * user-facing error messages from technical logging details. Ensures consistent
 * error formatting across all CLI commands.
 *
 * Key Features:
 * - CLIError class for user-friendly error messages
 * - handleCLIError() for consistent error formatting
 * - withErrorHandling() wrapper for command handlers
 * - Automatic technical detail logging
 * - Clean process exit on errors
 *
 * Error Handling Strategy:
 * - User sees: Clean, actionable error message
 * - Logs contain: Full technical details, stack traces, context
 * - Process exits: With code 1 on any error
 *
 * @module cli/errorHandler
 */

import { ZodError } from 'zod';

import logger from '../utils/logger';

/**
 * Formats a ZodError into a human-readable string.
 *
 * Extracts validation errors from Zod and formats them as "path: message" pairs,
 * making it easy for users to identify exactly which fields failed validation.
 *
 * @param error - The ZodError to format
 * @returns Formatted string with all validation errors
 *
 * @example
 * ```typescript
 * // Single error
 * formatZodError(zodError);
 * // Returns: "remoteChainType: Required"
 *
 * // Nested path
 * formatZodError(zodError);
 * // Returns: "[1][0].remoteChainType: Required"
 *
 * // Multiple errors
 * formatZodError(zodError);
 * // Returns: "remoteChainType: Required, capacity: Expected string, received number"
 * ```
 *
 * @public
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path
        .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
        .join('')
        .replace(/^\./, ''); // Remove leading dot if present
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(', ');
}

/**
 * Custom error class for CLI command failures.
 *
 * Extends standard Error with optional technical details that are logged but
 * not shown to end users. Provides separation between user-facing messages
 * and debugging information.
 *
 * @remarks
 * Design Pattern:
 * - **message**: User-friendly error message (shown in console)
 * - **technicalDetails**: Optional debugging info (logged, not displayed)
 * - **name**: Set to 'CLIError' for error identification
 *
 * Use Cases:
 * - Validation errors with user guidance
 * - Operation failures with technical context
 * - Configuration errors with suggestions
 *
 * @example
 * ```typescript
 * // Simple user message
 * throw new CLIError('Invalid token address format');
 *
 * // With technical details for logging
 * throw new CLIError(
 *   'Failed to generate deployment transaction',
 *   {
 *     deployer: '0x1234...',
 *     salt: '0x5678...',
 *     originalError: error.message
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // In command handler
 * if (!ethers.isAddress(options.token)) {
 *   throw new CLIError(
 *     'Invalid token address. Please provide a valid Ethereum address (0x + 40 hex characters)',
 *     { providedAddress: options.token }
 *   );
 * }
 * ```
 *
 * @public
 */
export class CLIError extends Error {
  /**
   * Creates a new CLIError instance.
   *
   * @param message - User-friendly error message (displayed to user)
   * @param technicalDetails - Optional technical details (logged only)
   */
  constructor(
    message: string,
    public readonly technicalDetails?: unknown,
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Handles and formats CLI command errors for end users.
 *
 * Central error handler that processes errors from CLI commands, displays
 * user-friendly messages, logs technical details, and exits the process.
 * Handles CLIError, standard Error, and unknown error types differently.
 *
 * @param error - The error to handle (any type)
 * @param commandName - Name of the command that failed (e.g., 'generate-token-deployment')
 * @returns Never returns (always exits process)
 *
 * @remarks
 * Error Type Handling:
 *
 * **CLIError**:
 * - Console: User-friendly message from error.message
 * - Log: Error message + technical details (if provided)
 * - Example: "Invalid token address format"
 *
 * **Standard Error**:
 * - Console: Error message
 * - Log: Error message + stack trace
 * - Example: "Failed to read input file"
 *
 * **Unknown Type**:
 * - Console: Generic unknown error message
 * - Log: Raw error value
 * - Example: thrown string or object
 *
 * Process Exit:
 * - Always calls `process.exit(1)` after handling
 * - Ensures CLI exits with error code
 * - Never returns (return type is `never`)
 *
 * Console Output Format:
 * ```
 * Error in generate-token-deployment:
 * Invalid token address. Please provide a valid Ethereum address.
 * ```
 *
 * @example
 * ```typescript
 * try {
 *   await generateTokenDeployment(options);
 * } catch (error) {
 *   handleCLIError(error, 'generate-token-deployment');
 *   // Process exits here with code 1
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handling CLIError with technical details
 * try {
 *   if (!isValid) {
 *     throw new CLIError(
 *       'Deployment failed. Check your parameters.',
 *       { deployer, salt, reason: 'invalid salt length' }
 *     );
 *   }
 * } catch (error) {
 *   handleCLIError(error, 'deploy');
 *   // User sees: "Deployment failed. Check your parameters."
 *   // Log contains: Full technical details
 * }
 * ```
 *
 * @public
 */
export function handleCLIError(error: unknown, commandName: string): never {
  if (error instanceof CLIError) {
    // User-friendly error message
    console.error(`\nError in ${commandName}:`);
    console.error(error.message);

    // Log technical details for debugging
    if (error.technicalDetails) {
      logger.error(`${commandName} failed`, {
        error: error.message,
        technicalDetails: error.technicalDetails,
      });
    } else {
      logger.error(`${commandName} failed`, { error: error.message });
    }
  } else if (error instanceof Error) {
    // Generic error handling
    console.error(`\nError in ${commandName}:`);
    console.error(error.message);

    // Display validation details from cause if available
    if ('cause' in error && error.cause instanceof ZodError) {
      console.error(`Details: ${formatZodError(error.cause)}`);
    } else if ('cause' in error && error.cause instanceof Error) {
      console.error(`Caused by: ${error.cause.message}`);
    }

    logger.error(`${commandName} failed`, {
      error: error.message,
      stack: error.stack,
    });
  } else {
    // Unknown error type
    console.error(`\nUnknown error in ${commandName}`);
    logger.error(`${commandName} failed with unknown error`, { error });
  }

  process.exit(1);
}

/**
 * Wraps a CLI command handler with automatic error handling.
 *
 * Higher-order function that wraps command handlers to catch and handle all
 * errors automatically. Simplifies command definition by removing need for
 * try/catch blocks in each handler.
 *
 * @param handler - The async command handler function to wrap
 * @param commandName - Name of the command (for error messages)
 * @returns Wrapped handler with error handling
 *
 * @remarks
 * Usage Pattern:
 * - Wrap all Commander.js `.action()` handlers
 * - Handler receives options from Commander
 * - Any thrown error is caught and formatted
 * - Process exits on error
 *
 * Benefits:
 * - Consistent error handling across all commands
 * - No need for try/catch in individual handlers
 * - Centralized error formatting and logging
 * - Clean command handler code
 *
 * Type Safety:
 * - Generic `T extends unknown[]` preserves argument types
 * - Works with any async handler signature
 * - Maintains full TypeScript type checking
 *
 * @example
 * ```typescript
 * import { withErrorHandling } from './errorHandler';
 * import { Command } from 'commander';
 *
 * async function handleDeploy(options: DeployOptions): Promise<void> {
 *   // No try/catch needed - errors handled automatically
 *   const inputJson = await fs.readFile(options.input, 'utf-8');
 *   await generateDeployment(inputJson, options.deployer);
 * }
 *
 * const program = new Command();
 * program
 *   .command('deploy')
 *   .requiredOption('-i, --input <path>', 'Input file')
 *   .action(withErrorHandling(handleDeploy, 'deploy'));
 *   //      ^^ Wraps handler with error handling
 * ```
 *
 * @example
 * ```typescript
 * // Without withErrorHandling (manual try/catch)
 * async function handler(options: Options): Promise<void> {
 *   try {
 *     await doWork(options);
 *   } catch (error) {
 *     console.error('Error:', error);
 *     process.exit(1);
 *   }
 * }
 *
 * // With withErrorHandling (automatic)
 * async function handler(options: Options): Promise<void> {
 *   await doWork(options);  // Errors caught automatically
 * }
 *
 * program.action(withErrorHandling(handler, 'command-name'));
 * ```
 *
 * @typeParam T - Tuple type of handler arguments (inferred from handler)
 * @public
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<void>,
  commandName: string,
): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    try {
      await handler(...args);
    } catch (error) {
      handleCLIError(error, commandName);
    }
  };
}

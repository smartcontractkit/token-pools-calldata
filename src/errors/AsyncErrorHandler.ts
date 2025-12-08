/**
 * @fileoverview Async error handling utilities for consistent error patterns.
 *
 * This module provides utility functions for handling asynchronous operations with
 * consistent error handling, logging, and retry logic. Implements common patterns
 * like Result types, error wrapping, and exponential backoff retries.
 *
 * Key Functions:
 * - `wrapAsync()`: Returns Result<T> instead of throwing (Result pattern)
 * - `executeAsync()`: Throws typed errors with context (exception pattern)
 * - `wrapError()`: Converts unknown errors to Error instances
 * - `logError()`: Structured logging for errors
 * - `retryAsync()`: Exponential backoff retry logic
 *
 * @module errors/AsyncErrorHandler
 */

import { BaseError, ErrorContext } from './BaseError';
import logger from '../utils/logger';
import { setTimeout } from 'timers/promises';

/**
 * Result type for operations that can fail (Result pattern).
 *
 * @remarks
 * Discriminated union representing success or failure without using exceptions.
 * Preferred over try/catch when calling code should handle errors explicitly.
 *
 * Success Case:
 * - `success: true` discriminant
 * - `data: T` contains the operation result
 *
 * Failure Case:
 * - `success: false` discriminant
 * - `error: E` contains the error (defaults to Error)
 *
 * @example
 * ```typescript
 * const result: Result<string> = { success: true, data: 'Hello' };
 * if (result.success) {
 *   console.log(result.data); // TypeScript knows data exists
 * } else {
 *   console.error(result.error); // TypeScript knows error exists
 * }
 * ```
 *
 * @typeParam T - Type of successful result data
 * @typeParam E - Type of error (defaults to Error)
 * @public
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Wraps an async operation with standardized error handling (Result pattern).
 *
 * Executes an async operation and returns a Result<T> instead of throwing.
 * Catches all errors and wraps them in a consistent Error format.
 *
 * @param operation - The async operation to execute
 * @param errorMessage - User-friendly error message (prepended to original error)
 * @param context - Optional contextual data for debugging
 * @returns Promise<Result<T>> - Success with data or failure with error
 *
 * @remarks
 * Use Cases:
 * - When calling code should explicitly handle both success and failure
 * - For operations where errors are expected and should be handled gracefully
 * - When you want to avoid try/catch blocks in calling code
 *
 * Error Handling:
 * - Catches all exceptions from the operation
 * - Uses wrapError() to convert unknown errors to Error instances
 * - Preserves original error information via error chaining
 * - Returns Result with success=false and wrapped error
 *
 * @example
 * ```typescript
 * // Without wrapAsync (try/catch pattern)
 * try {
 *   const data = await generateTokenDeployment(params);
 *   console.log('Success:', data);
 * } catch (error) {
 *   console.error('Failed:', error);
 * }
 *
 * // With wrapAsync (Result pattern)
 * const result = await wrapAsync(
 *   () => generateTokenDeployment(params),
 *   'Token deployment generation failed',
 *   { params }
 * );
 *
 * if (result.success) {
 *   console.log('Success:', result.data);
 * } else {
 *   console.error('Failed:', result.error.message);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With context for debugging
 * const result = await wrapAsync(
 *   () => ethers.getAddress(addressInput),
 *   'Invalid address format',
 *   {
 *     address: addressInput,
 *     field: 'tokenAddress',
 *     source: 'user input'
 *   }
 * );
 *
 * if (!result.success) {
 *   logger.error('Address validation failed', { error: result.error });
 * }
 * ```
 *
 * @see {@link executeAsync} for exception-based pattern
 * @public
 */
export async function wrapAsync<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context?: ErrorContext,
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const wrappedError = wrapError(error, errorMessage, context);
    return { success: false, error: wrappedError };
  }
}

/**
 * Wraps an async operation and throws typed errors on failure (exception pattern).
 *
 * Executes an async operation and throws a specific error class on failure.
 * Preserves original error as cause for error chaining.
 *
 * @param operation - The async operation to execute
 * @param ErrorClass - Error class constructor to instantiate on failure
 * @param errorMessage - Human-readable error message
 * @param context - Optional contextual data for debugging
 * @returns Promise<T> - Result data on success
 * @throws {E} Typed error on failure (extends BaseError)
 *
 * @remarks
 * Use Cases:
 * - When errors should propagate up the call stack
 * - For operations where failure is exceptional (not expected)
 * - When you want consistent error types across layers
 *
 * Error Handling:
 * - Catches all exceptions from the operation
 * - Instantiates ErrorClass with message, context, and cause
 * - Preserves original error as `cause` field (if it's an Error instance)
 * - Throws typed error that can be caught by type
 *
 * @example
 * ```typescript
 * import { TokenDeploymentError } from './GeneratorErrors';
 *
 * // Throws TokenDeploymentError on failure
 * async function deployToken(params: TokenDeploymentInput) {
 *   return executeAsync(
 *     () => generateDeploymentCalldata(params),
 *     TokenDeploymentError,
 *     'Failed to generate token deployment calldata',
 *     { deployer: params.deployer, salt: params.salt }
 *   );
 * }
 *
 * // Calling code can catch typed errors
 * try {
 *   await deployToken(params);
 * } catch (error) {
 *   if (error instanceof TokenDeploymentError) {
 *     console.error('Deployment error:', error.code, error.context);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With error chaining
 * try {
 *   const address = await executeAsync(
 *     () => ethers.getAddress(input),
 *     ValidationError,
 *     'Invalid Ethereum address',
 *     { input, field: 'tokenAddress' }
 *   );
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(error.message); // "Invalid Ethereum address"
 *     console.error(error.cause);   // Original ethers error
 *   }
 * }
 * ```
 *
 * @see {@link wrapAsync} for Result-based pattern
 * @typeParam T - Type of operation result
 * @typeParam E - Error type (must extend BaseError)
 * @public
 */
export async function executeAsync<T, E extends BaseError>(
  operation: () => Promise<T>,
  ErrorClass: new (message: string, context?: ErrorContext, cause?: Error) => E,
  errorMessage: string,
  context?: ErrorContext,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const cause = error instanceof Error ? error : undefined;
    throw new ErrorClass(errorMessage, context, cause);
  }
}

/**
 * Converts unknown errors to proper Error instances with context.
 *
 * Ensures all caught errors are Error instances with proper stack traces and
 * error chaining. Used internally by wrapAsync() and executeAsync().
 *
 * @param error - The unknown error to wrap (could be Error, string, object, etc.)
 * @param message - User-friendly error message
 * @param context - Optional contextual data (logged for non-Error values)
 * @returns Error instance with proper message and stack trace
 *
 * @remarks
 * Handling Logic:
 * - **Error instance**: Enhances with message prefix, preserves stack, sets cause
 * - **Non-Error value**: Creates new Error, logs warning with context
 *
 * Error Enhancement (when error is already Error):
 * - Prepends message: `${message}: ${error.message}`
 * - Preserves original stack trace
 * - Sets original error as `cause` field
 *
 * Non-Error Handling:
 * - Creates new Error with message only
 * - Logs warning about non-Error value being thrown
 * - Includes context in log for debugging
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Original error');
 * } catch (error) {
 *   const wrapped = wrapError(error, 'Operation failed');
 *   console.log(wrapped.message);
 *   // "Operation failed: Original error"
 *   console.log(wrapped.cause);
 *   // Original Error instance
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Non-Error value (bad practice but handled)
 * try {
 *   throw 'string error';
 * } catch (error) {
 *   const wrapped = wrapError(error, 'Failed', { operation: 'test' });
 *   console.log(wrapped.message); // "Failed"
 *   // Logs warning: "Non-Error value caught"
 * }
 * ```
 *
 * @public
 */
export function wrapError(error: unknown, message: string, context?: ErrorContext): Error {
  if (error instanceof Error) {
    // Enhance existing error with context
    const enhancedError = new Error(`${message}: ${error.message}`);
    if (error.stack !== undefined) enhancedError.stack = error.stack;
    enhancedError.cause = error;
    return enhancedError;
  }

  // Create new error for non-Error values
  if (context) {
    logger.error('Non-Error value caught', { error, context });
  }
  return new Error(message);
}

/**
 * Logs error with structured format based on error type.
 *
 * Provides consistent error logging across the application. Automatically
 * extracts appropriate fields from different error types.
 *
 * @param error - The error to log (BaseError, Error, or unknown)
 * @param operation - Name of the operation that failed (e.g., 'Token deployment')
 * @param context - Optional additional context for the log
 *
 * @remarks
 * Logging Behavior by Error Type:
 * - **BaseError**: Uses toJSON() for full serialization (code, context, cause, stack)
 * - **Error**: Logs name, message, stack, and context
 * - **Unknown**: Logs as unknown error with raw value and context
 *
 * Log Format:
 * - Log level: `error` (for BaseError and Error) or `error` (for unknown)
 * - Message: `${operation} failed` or `${operation} failed with unknown error`
 * - Structured data includes all relevant error fields
 *
 * @example
 * ```typescript
 * try {
 *   await generateTokenDeployment(params);
 * } catch (error) {
 *   logError(error, 'Token deployment generation', {
 *     deployer: params.deployer,
 *     salt: params.salt
 *   });
 * }
 *
 * // For BaseError, logs:
 * // {
 * //   message: "Token deployment generation failed",
 * //   name: "TokenDeploymentError",
 * //   code: "GENERATION_FAILED",
 * //   context: { deployer: "0x...", salt: "0x..." },
 * //   additionalContext: { ... }
 * // }
 * ```
 *
 * @public
 */
export function logError(error: unknown, operation: string, context?: ErrorContext): void {
  if (error instanceof BaseError) {
    logger.error(`${operation} failed`, {
      ...error.toJSON(),
      additionalContext: context,
    });
  } else if (error instanceof Error) {
    logger.error(`${operation} failed`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  } else {
    logger.error(`${operation} failed with unknown error`, {
      error,
      context,
    });
  }
}

/**
 * Retries an async operation with exponential backoff.
 *
 * Executes an operation with automatic retry logic using exponential backoff.
 * Logs warnings for each retry attempt.
 *
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @returns Promise<T> - Result data on success
 * @throws {Error} Last error if all retries exhausted
 *
 * @remarks
 * Retry Strategy:
 * - Attempts: Initial attempt + maxRetries (total: maxRetries + 1)
 * - Delay: `baseDelay * 2^attempt` (exponential backoff)
 *   - Attempt 0: No delay
 *   - Attempt 1: baseDelay (e.g., 1000ms)
 *   - Attempt 2: baseDelay * 2 (e.g., 2000ms)
 *   - Attempt 3: baseDelay * 4 (e.g., 4000ms)
 * - Logging: Warns on each retry with delay time and error message
 *
 * Use Cases:
 * - Network requests that may fail transiently
 * - RPC calls to blockchain nodes
 * - File system operations with potential locks
 * - Any operation with transient failure modes
 *
 * @example
 * ```typescript
 * // Retry RPC call with default settings (3 retries, 1s base delay)
 * const balance = await retryAsync(
 *   () => provider.getBalance(address)
 * );
 *
 * // Timeline:
 * // Attempt 0: Immediate
 * // Attempt 1: After 1000ms
 * // Attempt 2: After 2000ms
 * // Attempt 3: After 4000ms
 * // Total max time: 7 seconds
 * ```
 *
 * @example
 * ```typescript
 * // Custom retry settings
 * const data = await retryAsync(
 *   () => fetchDataFromAPI(url),
 *   5,    // 5 retries (6 total attempts)
 *   500   // 500ms base delay
 * );
 *
 * // Timeline:
 * // Attempt 0: Immediate
 * // Attempt 1: After 500ms
 * // Attempt 2: After 1000ms
 * // Attempt 3: After 2000ms
 * // Attempt 4: After 4000ms
 * // Attempt 5: After 8000ms
 * // Total max time: 15.5 seconds
 * ```
 *
 * @example
 * ```typescript
 * // With error handling
 * try {
 *   const result = await retryAsync(
 *     () => unstableOperation(),
 *     3,
 *     1000
 *   );
 *   console.log('Success after retries:', result);
 * } catch (error) {
 *   console.error('Failed after all retries:', error);
 * }
 * ```
 *
 * @public
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: lastError.message,
        });
        await setTimeout(delay);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

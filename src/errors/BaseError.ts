/**
 * @fileoverview Base error class with structured context and error chaining.
 *
 * This module provides the foundational error infrastructure for the application.
 * All custom errors extend BaseError, which adds structured context, error codes,
 * and cause chaining to standard JavaScript Error.
 *
 * Features:
 * - Error codes for categorization and filtering
 * - Contextual data for debugging (params, state, etc.)
 * - Error chaining via `cause` field
 * - JSON serialization for logging
 * - Proper stack trace preservation
 *
 * Design Pattern:
 * Abstract base class that should not be instantiated directly. Subclasses
 * define specific error categories (validation, generation, etc.).
 *
 * @module errors/BaseError
 */

/**
 * Error context interface for additional debugging information.
 *
 * @remarks
 * Flexible key-value structure for attaching any relevant data to errors.
 * Common uses:
 * - Function parameters that caused the error
 * - Application state at time of error
 * - IDs or addresses involved in the operation
 * - Computed values that led to failure
 *
 * @example
 * ```typescript
 * const context: ErrorContext = {
 *   tokenAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
 *   receiverAddress: '0x1234567890123456789012345678901234567890',
 *   amount: '1000000000000000000000',
 *   operation: 'mint'
 * };
 * ```
 *
 * @public
 */
export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Abstract base error class with structured context and error chaining.
 *
 * @remarks
 * Foundation for all custom errors in the application. Extends standard Error
 * with additional fields for better error handling, debugging, and logging.
 *
 * Features:
 * - **Error Code**: String code for categorization (e.g., 'INVALID_INPUT')
 * - **Context**: Key-value data structure with debugging information
 * - **Cause**: Original error that triggered this error (error chaining)
 * - **Stack Trace**: Proper stack trace preservation
 * - **JSON Serialization**: toJSON() method for logging and transport
 *
 * Abstract Class:
 * - Cannot be instantiated directly
 * - Must be extended by concrete error classes
 * - Subclasses define specific error categories
 *
 * @example
 * ```typescript
 * // Implementing a concrete error class
 * export class ValidationError extends BaseError {
 *   constructor(message: string, context?: ErrorContext, cause?: Error) {
 *     super(message, 'VALIDATION_ERROR', context, cause);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using with context
 * throw new ValidationError(
 *   'Invalid token address format',
 *   {
 *     address: '0xinvalid',
 *     field: 'tokenAddress',
 *     expectedFormat: '0x followed by 40 hex characters'
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Error chaining with cause
 * try {
 *   await someOperation();
 * } catch (error) {
 *   throw new GenerationError(
 *     'Failed to generate token deployment',
 *     { operation: 'tokenDeployment' },
 *     error as Error  // Original error as cause
 *   );
 * }
 * ```
 *
 * @public
 */
export abstract class BaseError extends Error {
  /**
   * Error code for categorization and filtering.
   *
   * @remarks
   * Used for:
   * - Programmatic error handling (switch/if statements)
   * - Error filtering in logs
   * - Error metrics and monitoring
   * - User-facing error messages
   */
  public readonly code: string;

  /**
   * Additional contextual data for debugging.
   *
   * @remarks
   * Optional key-value structure with any relevant debugging information.
   * Included in JSON serialization for logging.
   */
  public readonly context?: ErrorContext;

  /**
   * Original error that caused this error (error chaining).
   *
   * @remarks
   * Preserves the original error when wrapping or re-throwing. Enables
   * error chain inspection for debugging.
   */
  public readonly cause?: Error;

  /**
   * Creates a new BaseError instance.
   *
   * @param message - Human-readable error message
   * @param code - Error code for categorization
   * @param context - Optional contextual data for debugging
   * @param cause - Optional original error that caused this error
   *
   * @remarks
   * Constructor Behavior:
   * - Sets error name to class name (e.g., 'ValidationError')
   * - Assigns error code for categorization
   * - Stores optional context and cause
   * - Captures stack trace at throw location
   *
   * Stack Trace:
   * - Uses Error.captureStackTrace() for proper stack traces
   * - Excludes constructor from stack trace
   * - Shows exact location where error was thrown
   *
   * @protected
   */
  constructor(message: string, code: string, context?: ErrorContext, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (context !== undefined) this.context = context;
    if (cause !== undefined) this.cause = cause;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializes error to JSON for logging and transport.
   *
   * @returns JSON-serializable object with all error properties
   *
   * @remarks
   * Included Fields:
   * - `name`: Error class name (e.g., 'TokenDeploymentError')
   * - `code`: Error code (e.g., 'GENERATION_FAILED')
   * - `message`: Error message
   * - `context`: Contextual data (if provided)
   * - `stack`: Stack trace string
   * - `cause`: Serialized original error (if provided)
   *
   * Cause Serialization:
   * - If cause exists, serializes name, message, and stack
   * - Prevents circular reference issues
   * - Preserves error chain information
   *
   * Use Cases:
   * - Winston/Pino logging
   * - Error reporting to monitoring services
   * - HTTP response bodies
   * - Error storage in databases
   *
   * @example
   * ```typescript
   * try {
   *   throw new TokenDeploymentError(
   *     'Failed to deploy token',
   *     { deployer: '0x1234...', salt: '0x5678...' }
   *   );
   * } catch (error) {
   *   const json = (error as BaseError).toJSON();
   *   console.log(JSON.stringify(json, null, 2));
   *   // {
   *   //   "name": "TokenDeploymentError",
   *   //   "code": "GENERATION_FAILED",
   *   //   "message": "Failed to deploy token",
   *   //   "context": {
   *   //     "deployer": "0x1234...",
   *   //     "salt": "0x5678..."
   *   //   },
   *   //   "stack": "TokenDeploymentError: Failed to deploy token\n    at ...",
   *   //   "cause": undefined
   *   // }
   * }
   * ```
   *
   * @example
   * ```typescript
   * // With error chaining
   * try {
   *   await ethers.getAddress('invalid');
   * } catch (originalError) {
   *   const error = new ValidationError(
   *     'Invalid address format',
   *     { address: 'invalid' },
   *     originalError as Error
   *   );
   *
   *   const json = error.toJSON();
   *   // json.cause contains serialized originalError
   * }
   * ```
   *
   * @public
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }
}

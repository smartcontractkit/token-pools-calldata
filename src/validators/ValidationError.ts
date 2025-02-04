/**
 * @fileoverview Custom error class and result types for validation operations.
 *
 * This module provides a structured approach to handling validation errors throughout
 * the application. ValidationError extends the standard Error class with additional
 * fields for better error reporting and debugging.
 *
 * Also provides a Result type pattern for validation operations that prefer returning
 * success/failure objects instead of throwing exceptions.
 *
 * @module validators/ValidationError
 */

/**
 * Custom error class for validation failures.
 *
 * Extends the standard Error class with structured information about validation
 * failures, including the specific field that failed validation and the invalid value.
 *
 * @remarks
 * ValidationError provides:
 * - **message**: Human-readable error description
 * - **field**: Optional field name that failed validation (e.g., "safe", "salt")
 * - **value**: Optional invalid value that caused the failure
 * - **name**: Set to "ValidationError" for error type identification
 *
 * This structured approach enables:
 * - Better error messages for CLI users
 * - Programmatic error handling by field name
 * - Debugging by inspecting invalid values
 * - Error logging with context
 *
 * @example
 * ```typescript
 * // Throw validation error with field and value
 * throw new ValidationError(
 *   'Invalid Ethereum address format',
 *   'safe',
 *   '0xInvalidAddress'
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Catch and handle validation errors
 * try {
 *   validateAddress(userInput);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(`Field: ${error.field}`);
 *     console.error(`Value: ${error.value}`);
 *     console.error(`Message: ${error.message}`);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Error without field/value (general validation error)
 * throw new ValidationError('Missing required Safe JSON parameters');
 * ```
 *
 * @public
 */
export class ValidationError extends Error {
  /**
   * Creates a new ValidationError instance.
   *
   * @param message - Human-readable error description
   * @param field - Optional field name that failed validation
   * @param value - Optional invalid value that caused the failure
   */
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Result type for validation operations using the Result pattern.
 *
 * Discriminated union representing either a successful validation with data
 * or a failed validation with an error. This pattern is an alternative to
 * throwing exceptions for validation failures.
 *
 * @typeParam T - Type of the validated data on success
 *
 * @remarks
 * Result Pattern Benefits:
 * - Explicit error handling (compiler enforces checking)
 * - No try-catch blocks needed
 * - Composable validation pipelines
 * - Better type inference
 *
 * The discriminated union uses the `success` field to distinguish between
 * success and failure cases, enabling TypeScript type narrowing.
 *
 * @example
 * ```typescript
 * // Function returning validation result
 * function validateToken(input: string): ValidationResult<string> {
 *   if (!ethers.isAddress(input)) {
 *     return validationFailure('Invalid address', 'token', input);
 *   }
 *   return validationSuccess(input);
 * }
 *
 * // Using the result
 * const result = validateToken(userInput);
 * if (result.success) {
 *   // TypeScript knows result.data is string
 *   console.log(`Valid token: ${result.data}`);
 * } else {
 *   // TypeScript knows result.error is ValidationError
 *   console.error(`Validation failed: ${result.error.message}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Chaining validations with Result pattern
 * function validateAndProcess(input: string): ValidationResult<ProcessedData> {
 *   const addressResult = validateToken(input);
 *   if (!addressResult.success) {
 *     return addressResult; // Forward error
 *   }
 *
 *   // Continue processing with validated data
 *   const processed = processAddress(addressResult.data);
 *   return validationSuccess(processed);
 * }
 * ```
 *
 * @public
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * Helper function to create a successful validation result.
 *
 * Constructs a ValidationResult representing successful validation with
 * the validated data.
 *
 * @typeParam T - Type of the validated data
 * @param data - The validated data
 * @returns ValidationResult indicating success with data
 *
 * @example
 * ```typescript
 * function validatePositiveNumber(value: number): ValidationResult<number> {
 *   if (value <= 0) {
 *     return validationFailure('Must be positive', 'value', value);
 *   }
 *   return validationSuccess(value);
 * }
 *
 * const result = validatePositiveNumber(42);
 * // result = { success: true, data: 42 }
 * ```
 *
 * @public
 */
export function validationSuccess<T>(data: T): ValidationResult<T> {
  return { success: true, data };
}

/**
 * Helper function to create a failed validation result.
 *
 * Constructs a ValidationResult representing validation failure with
 * a ValidationError containing details about the failure.
 *
 * @typeParam T - Type of the data that failed validation
 * @param message - Human-readable error description
 * @param field - Optional field name that failed validation
 * @param value - Optional invalid value that caused the failure
 * @returns ValidationResult indicating failure with error
 *
 * @example
 * ```typescript
 * function validateEmail(email: string): ValidationResult<string> {
 *   if (!email.includes('@')) {
 *     return validationFailure(
 *       'Invalid email format',
 *       'email',
 *       email
 *     );
 *   }
 *   return validationSuccess(email);
 * }
 *
 * const result = validateEmail('invalid');
 * // result = {
 * //   success: false,
 * //   error: ValidationError {
 * //     message: 'Invalid email format',
 * //     field: 'email',
 * //     value: 'invalid'
 * //   }
 * // }
 * ```
 *
 * @public
 */
export function validationFailure<T>(
  message: string,
  field?: string,
  value?: unknown,
): ValidationResult<T> {
  return { success: false, error: new ValidationError(message, field, value) };
}

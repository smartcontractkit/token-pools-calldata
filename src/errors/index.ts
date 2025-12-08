/**
 * @fileoverview Error handling module barrel export.
 *
 * This module re-exports all error handling infrastructure for the application.
 * Provides access to base errors, generator-specific errors, and async error
 * handling utilities.
 *
 * Exported Components:
 *
 * **Base Error Infrastructure** (from BaseError):
 * - {@link BaseError} - Abstract base error class with context and error chaining
 * - {@link ErrorContext} - Key-value interface for error context data
 *
 * **Generator Error Classes** (from GeneratorErrors):
 * - {@link GeneratorError} - Base class for all generator errors
 * - {@link GeneratorErrorCode} - Enum of error codes for categorization
 * - {@link TokenDeploymentError} - Token deployment operation errors
 * - {@link PoolDeploymentError} - Pool deployment operation errors
 * - {@link ChainUpdateError} - Cross-chain configuration errors
 * - {@link TokenMintError} - Token minting operation errors
 * - {@link RoleManagementError} - Role grant/revoke operation errors
 * - {@link AllowListUpdatesError} - Allow list configuration errors
 * - {@link RateLimiterConfigError} - Rate limiter configuration errors
 *
 * **Async Error Handling Utilities** (from AsyncErrorHandler):
 * - {@link Result} - Result type for operations (success/failure discriminated union)
 * - {@link wrapAsync} - Wraps async operations returning Result (Result pattern)
 * - {@link executeAsync} - Wraps async operations throwing typed errors (exception pattern)
 * - {@link wrapError} - Converts unknown errors to Error instances
 * - {@link logError} - Structured error logging
 * - {@link retryAsync} - Exponential backoff retry logic
 *
 * @example
 * ```typescript
 * import {
 *   TokenDeploymentError,
 *   wrapAsync,
 *   logError
 * } from './errors';
 *
 * // Using Result pattern with wrapAsync
 * const result = await wrapAsync(
 *   () => generateTokenDeployment(params),
 *   'Token deployment failed',
 *   { deployer: params.deployer }
 * );
 *
 * if (!result.success) {
 *   logError(result.error, 'Token deployment');
 * }
 * ```
 *
 * @module errors
 */

export * from './BaseError';
export * from './GeneratorErrors';
export * from './AsyncErrorHandler';

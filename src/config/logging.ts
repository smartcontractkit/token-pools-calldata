/**
 * @fileoverview Logging configuration and settings.
 *
 * This module defines logging configuration for the Winston logger, including
 * log levels, file paths, service identification, and environment-based console
 * output control. Provides type-safe, centralized logging configuration.
 *
 * Key Features:
 * - Default log level configuration
 * - Service name for structured logging
 * - File paths for error and combined logs
 * - Environment-based console logging (disabled in production)
 * - Type-safe constants with `as const` assertions
 *
 * Usage Pattern:
 * - Import LOGGING_CONFIG in logger setup
 * - All values are compile-time constants
 * - Console logging auto-disabled in production
 *
 * @example
 * ```typescript
 * import { LOGGING_CONFIG } from './config';
 *
 * const logger = winston.createLogger({
 *   level: LOGGING_CONFIG.level,
 *   defaultMeta: { service: LOGGING_CONFIG.serviceName },
 *   transports: [
 *     new winston.transports.File({ filename: LOGGING_CONFIG.files.error })
 *   ]
 * });
 * ```
 *
 * @module config/logging
 */

import { environment } from './environment';

/**
 * Logging configuration with environment-based settings.
 *
 * Defines Winston logger configuration including log level, service name,
 * file paths, and console output control. Console logging is automatically
 * disabled in production environments.
 *
 * @remarks
 * Configuration Values:
 * - **level**: 'info' (logs info, warn, error levels)
 * - **serviceName**: 'token-pool-calldata' (for structured logging context)
 * - **files.error**: 'error.log' (error-level logs only)
 * - **files.combined**: 'combined.log' (all log levels)
 * - **enableConsole**: false in production, true otherwise
 *
 * Log Levels (Winston):
 * - error: Error messages and exceptions
 * - warn: Warning messages
 * - info: Informational messages (default level)
 * - debug: Debug information (not logged by default)
 *
 * Environment Behavior:
 * - **Production**: File logging only (no console output)
 * - **Development/Test**: Both file and console logging
 * - Console auto-disabled via `!environment.isProduction`
 *
 * Type Safety:
 * - All values use `as const` for literal type inference
 * - Object is readonly via outer `as const`
 * - TypeScript enforces exact values
 *
 * @example
 * ```typescript
 * // Winston logger configuration
 * const logger = winston.createLogger({
 *   level: LOGGING_CONFIG.level,
 *   defaultMeta: { service: LOGGING_CONFIG.serviceName },
 *   transports: [
 *     new winston.transports.File({
 *       filename: LOGGING_CONFIG.files.error,
 *       level: 'error'
 *     }),
 *     new winston.transports.File({
 *       filename: LOGGING_CONFIG.files.combined
 *     })
 *   ]
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Conditional console transport
 * if (LOGGING_CONFIG.enableConsole) {
 *   logger.add(new winston.transports.Console({
 *     format: winston.format.simple()
 *   }));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Service context in logs
 * logger.info('Operation completed', {
 *   // service: 'token-pool-calldata' added automatically
 *   operation: 'token-deployment',
 *   duration: 1234
 * });
 * ```
 *
 * @public
 */
export const LOGGING_CONFIG = {
  /**
   * Default Winston log level.
   *
   * @remarks
   * Level 'info' captures: error, warn, info (excludes debug).
   * Winston levels: error(0) > warn(1) > info(2) > debug(3).
   */
  level: 'info' as const,

  /**
   * Service identifier for structured logging.
   *
   * @remarks
   * Used in Winston's defaultMeta for log correlation.
   * Appears in all log entries for service identification.
   */
  serviceName: 'token-pool-calldata' as const,

  /**
   * Log file path configuration.
   *
   * @remarks
   * - **error**: Error-level logs only (level: 'error')
   * - **combined**: All log levels (level: LOGGING_CONFIG.level)
   */
  files: {
    /** Error log file path (error level only) */
    error: 'error.log' as const,

    /** Combined log file path (all levels) */
    combined: 'combined.log' as const,
  },

  /**
   * Console logging flag (environment-based).
   *
   * @remarks
   * - **true**: Development and test environments (console output enabled)
   * - **false**: Production environment (console output disabled)
   *
   * Automatically set via `!environment.isProduction`.
   */
  enableConsole: !environment.isProduction,
} as const;

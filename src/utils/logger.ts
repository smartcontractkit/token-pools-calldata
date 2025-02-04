/**
 * @fileoverview Winston-based logger implementation for structured logging.
 *
 * Provides a production-ready logger implementation using Winston with file and console
 * transports. Implements the ILogger interface for dependency injection throughout the
 * application.
 *
 * @module utils/logger
 */

import * as winston from 'winston';
import { Logger, format, transports } from 'winston';
import { LOGGING_CONFIG } from '../config';
import { ILogger } from '../interfaces';

/**
 * Creates a Winston logger instance implementing ILogger interface.
 *
 * Factory function that configures a Winston logger with file transports for error
 * and combined logs, plus optional console output for development. Uses JSON format
 * for structured logging with timestamps.
 *
 * @returns Logger instance implementing ILogger interface
 *
 * @remarks
 * Logger Configuration:
 * - **Level**: Configurable via LOGGING_CONFIG (default: 'info')
 * - **Format**: JSON with timestamps for structured logging
 * - **Transports**:
 *   - File transport for errors (error.log)
 *   - File transport for all logs (combined.log)
 *   - Console transport (development only, colorized)
 * - **Metadata**: Includes service name in all log entries
 *
 * The logger is used throughout the application for:
 * - Transaction generation progress
 * - Validation results
 * - Error reporting
 * - Debug information
 *
 * @example
 * ```typescript
 * const logger = createLogger();
 *
 * // Info logging with metadata
 * logger.info('Token deployment transaction generated', {
 *   tokenAddress: '0x123...',
 *   poolAddress: '0xabc...',
 *   factoryAddress: '0xdef...'
 * });
 *
 * // Error logging
 * logger.error('Failed to validate input', {
 *   error: error.message,
 *   inputJson,
 *   stack: error.stack
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Dependency injection (recommended)
 * const generator = createTokenDeploymentGenerator(
 *   createLogger(),  // Fresh logger instance
 *   interfaceProvider,
 *   addressComputer
 * );
 * ```
 *
 * @see {@link ILogger} for interface definition
 * @see {@link LOGGING_CONFIG} for configuration options
 *
 * @public
 */
export function createLogger(): ILogger {
  const logger = winston.createLogger({
    level: LOGGING_CONFIG.level,
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: LOGGING_CONFIG.serviceName } as const,
    transports: [
      new transports.File({ filename: LOGGING_CONFIG.files.error, level: 'error' }),
      new transports.File({ filename: LOGGING_CONFIG.files.combined }),
    ],
  }) satisfies Logger;

  // If console logging is enabled (non-production), log to the console as well
  if (LOGGING_CONFIG.enableConsole) {
    logger.add(
      new transports.Console({
        format: format.combine(format.colorize(), format.simple()),
      }),
    );
  }

  return logger;
}

/**
 * Default logger instance for utility functions and error handlers
 * For application code, use dependency injection via createLogger()
 */
const defaultLogger = createLogger();
export default defaultLogger;

/**
 * @fileoverview Configuration module barrel export.
 *
 * This module provides centralized configuration management for the application.
 * Re-exports all configuration modules for convenient single-import access.
 *
 * Configuration Categories:
 * - **Environment**: NODE_ENV detection and environment flags
 * - **Validation**: Rules and constraints for input validation
 * - **Defaults**: Default values for transactions and operations
 * - **Logging**: Logging configuration and settings
 * - **Bytecodes**: Contract bytecodes (re-exported from constants)
 *
 * @example
 * ```typescript
 * import {
 *   environment,
 *   VALIDATION_RULES,
 *   DEFAULTS,
 *   LOGGING_CONFIG,
 *   OUTPUT_FORMAT
 * } from './config';
 *
 * console.log(environment.isDevelopment);
 * console.log(VALIDATION_RULES.SALT_LENGTH);
 * console.log(DEFAULTS.TRANSACTION_VALUE);
 * ```
 *
 * @module config
 */

// Environment configuration
export * from './environment';

// Validation configuration
export * from './validation';

// Default values and constants
export * from './defaults';

// Logging configuration
export * from './logging';

// Re-export bytecodes from constants (keep these separate due to size)
export { BYTECODES } from '../constants/bytecodes';

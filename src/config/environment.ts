/**
 * @fileoverview Environment detection and configuration.
 *
 * This module provides runtime environment detection based on NODE_ENV,
 * with convenient boolean flags for production, development, and test modes.
 * Implements singleton pattern for consistent environment state across the
 * application.
 *
 * Key Features:
 * - NODE_ENV detection with 'development' default
 * - Boolean flags for environment checks (isProduction, isDevelopment, isTest)
 * - Singleton instance for global access
 * - Type-safe environment configuration
 *
 * Usage Pattern:
 * - Import `environment` singleton for most use cases
 * - Use `getEnvironmentConfig()` only when fresh detection needed
 *
 * @example
 * ```typescript
 * import { environment } from './config';
 *
 * if (environment.isDevelopment) {
 *   console.log('Running in development mode');
 * }
 *
 * if (environment.isProduction) {
 *   // Production-only configuration
 * }
 * ```
 *
 * @module config/environment
 */

/**
 * Environment configuration interface.
 *
 * Provides type-safe access to environment settings with convenient boolean
 * flags for common environment checks.
 *
 * @remarks
 * Environment Values:
 * - **production**: Set NODE_ENV=production for production builds
 * - **development**: Default if NODE_ENV not set
 * - **test**: Set NODE_ENV=test for test runs
 *
 * Boolean Flags:
 * - Only one flag will be true at a time
 * - Flags derived from nodeEnv via strict equality check
 * - Custom environments will have all flags false
 *
 * @example
 * ```typescript
 * const config: EnvironmentConfig = {
 *   nodeEnv: 'production',
 *   isProduction: true,
 *   isDevelopment: false,
 *   isTest: false
 * };
 * ```
 *
 * @public
 */
export interface EnvironmentConfig {
  /** Current NODE_ENV value (defaults to 'development') */
  nodeEnv: string;

  /** True when NODE_ENV === 'production' */
  isProduction: boolean;

  /** True when NODE_ENV === 'development' (default) */
  isDevelopment: boolean;

  /** True when NODE_ENV === 'test' */
  isTest: boolean;
}

/**
 * Creates environment configuration from current NODE_ENV.
 *
 * Factory function that reads process.env.NODE_ENV and constructs an
 * EnvironmentConfig with derived boolean flags. Defaults to 'development'
 * if NODE_ENV is not set.
 *
 * @returns Environment configuration object with flags
 *
 * @remarks
 * Default Behavior:
 * - Reads process.env.NODE_ENV
 * - Falls back to 'development' if undefined
 * - Creates boolean flags via strict equality
 *
 * Environment Detection:
 * - Production: NODE_ENV=production
 * - Development: NODE_ENV=development (or unset)
 * - Test: NODE_ENV=test
 *
 * Singleton Pattern:
 * - Exported `environment` const calls this once at import
 * - Use `environment` singleton for most cases
 * - Call this function directly only if fresh detection needed
 *
 * @example
 * ```typescript
 * // Manual environment detection
 * const config = getEnvironmentConfig();
 * console.log(config.nodeEnv); // 'development'
 * console.log(config.isDevelopment); // true
 * ```
 *
 * @example
 * ```typescript
 * // With NODE_ENV set
 * process.env.NODE_ENV = 'production';
 * const config = getEnvironmentConfig();
 * console.log(config.isProduction); // true
 * console.log(config.isDevelopment); // false
 * ```
 *
 * @public
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
  };
}

/**
 * Singleton environment configuration instance.
 *
 * Pre-initialized environment config available for import across the
 * application. Provides immediate access to environment flags without
 * needing to call getEnvironmentConfig().
 *
 * @remarks
 * Design Pattern:
 * - Singleton pattern for consistent state
 * - Initialized once at module import
 * - Environment detected at application startup
 * - Prefer this over calling getEnvironmentConfig()
 *
 * Use Cases:
 * - Conditional logic based on environment
 * - Environment-specific logging
 * - Feature flags for dev/prod
 * - Test-specific behavior
 *
 * @example
 * ```typescript
 * import { environment } from './config';
 *
 * // Environment-based conditional logic
 * if (environment.isProduction) {
 *   // Production configuration
 *   enableProductionLogging();
 * } else if (environment.isDevelopment) {
 *   // Development configuration
 *   enableDebugMode();
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Environment-based feature flags
 * const shouldLogDetails = environment.isDevelopment || environment.isTest;
 *
 * if (shouldLogDetails) {
 *   logger.debug('Detailed debug information', { context });
 * }
 * ```
 *
 * @public
 */
export const environment = getEnvironmentConfig();

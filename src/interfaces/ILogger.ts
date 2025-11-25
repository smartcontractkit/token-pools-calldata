/**
 * @fileoverview Logger interface for dependency injection and testing.
 *
 * Defines a standard logging contract used throughout the application. Enables
 * dependency injection of logging implementations and facilitates testing with
 * mock loggers.
 *
 * @module interfaces/ILogger
 */

/**
 * Logger interface for structured application logging.
 *
 * Provides standard logging levels (info, error, warn, debug) with support for
 * structured metadata. Implementations can use Winston, console, or custom loggers.
 *
 * @remarks
 * This interface enables:
 * - Dependency injection of logging implementations
 * - Easy testing with mock loggers
 * - Consistent logging across all modules
 * - Structured logging with metadata support
 *
 * The production implementation uses Winston (see utils/logger.ts).
 * Tests typically use mock implementations or silent loggers.
 *
 * @example
 * ```typescript
 * // Production usage
 * const logger = createLogger();  // Winston implementation
 * logger.info('Token deployment successful', {
 *   tokenAddress: '0x123...',
 *   poolAddress: '0xabc...'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Testing usage
 * const mockLogger: ILogger = {
 *   info: jest.fn(),
 *   error: jest.fn(),
 *   warn: jest.fn(),
 *   debug: jest.fn()
 * };
 *
 * const generator = createTokenDeploymentGenerator(
 *   mockLogger,  // Inject mock
 *   interfaceProvider,
 *   addressComputer
 * );
 * ```
 *
 * @public
 */
export interface ILogger {
  /**
   * Logs an informational message with optional structured metadata.
   *
   * @param message - Human-readable log message
   * @param meta - Optional structured metadata (object with key-value pairs)
   *
   * @example
   * ```typescript
   * logger.info('Successfully validated input', {
   *   chainSelector: '16015286601757825753',
   *   poolType: 'BurnMintTokenPool'
   * });
   * ```
   */
  info(message: string, meta?: object): void;

  /**
   * Logs an error message with optional structured metadata.
   *
   * @param message - Human-readable error description
   * @param meta - Optional error details (stack trace, context, etc.)
   *
   * @example
   * ```typescript
   * logger.error('Transaction generation failed', {
   *   error: error.message,
   *   inputJson,
   *   factoryAddress
   * });
   * ```
   */
  error(message: string, meta?: object): void;

  /**
   * Logs a warning message with optional structured metadata.
   *
   * @param message - Human-readable warning description
   * @param meta - Optional warning context
   *
   * @example
   * ```typescript
   * logger.warn('Using deprecated pool type', {
   *   poolType: 'LockReleaseTokenPool',
   *   suggested: 'BurnMintTokenPool'
   * });
   * ```
   */
  warn(message: string, meta?: object): void;

  /**
   * Logs a debug message with optional structured metadata.
   *
   * @param message - Human-readable debug information
   * @param meta - Optional debug context
   *
   * @remarks
   * Debug logs are typically disabled in production and used during development
   * or troubleshooting to trace execution flow.
   *
   * @example
   * ```typescript
   * logger.debug('Computing CREATE2 address', {
   *   salt: '0x000...123',
   *   deployer: factoryAddress,
   *   initCodeHash: '0xabc...'
   * });
   * ```
   */
  debug(message: string, meta?: object): void;
}

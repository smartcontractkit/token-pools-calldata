/**
 * @fileoverview Generator-specific error classes for CLI operations.
 *
 * This module defines error classes for all generator operations in the CLI.
 * Each generator function (token deployment, pool deployment, chain update, etc.)
 * has its own error class for precise error categorization and handling.
 *
 * Error Hierarchy:
 * ```
 * BaseError (abstract)
 *   └─ GeneratorError (base for all generator errors)
 *      ├─ TokenDeploymentError
 *      ├─ PoolDeploymentError
 *      ├─ ChainUpdateError
 *      ├─ TokenMintError
 *      ├─ RoleManagementError
 *      ├─ AllowListUpdatesError
 *      └─ RateLimiterConfigError
 * ```
 *
 * All errors include:
 * - Error code (from GeneratorErrorCode enum)
 * - Human-readable message
 * - Optional context for debugging
 * - Optional cause (original error)
 *
 * @module errors/GeneratorErrors
 * @see {@link BaseError} for base error infrastructure
 */

import { BaseError, ErrorContext } from './BaseError';

/**
 * Error codes for generator operations.
 *
 * @remarks
 * Categories:
 * - **Validation**: Input validation failures (INVALID_INPUT, INVALID_ADDRESS, INVALID_PARAMETER)
 * - **Generation**: Transaction generation failures (GENERATION_FAILED, ENCODING_FAILED, ADDRESS_COMPUTATION_FAILED)
 * - **Chain Types**: Cross-chain operation failures (UNSUPPORTED_CHAIN_TYPE, CHAIN_CONVERSION_FAILED)
 *
 * Use Cases:
 * - Programmatic error handling in CLI commands
 * - Error filtering and categorization in logs
 * - Error metrics and monitoring dashboards
 * - User-facing error messages
 *
 * @example
 * ```typescript
 * // Using error codes for handling
 * try {
 *   await generateTokenDeployment(params);
 * } catch (error) {
 *   if (error instanceof GeneratorError) {
 *     switch (error.code) {
 *       case GeneratorErrorCode.INVALID_INPUT:
 *         console.error('Invalid input parameters');
 *         break;
 *       case GeneratorErrorCode.ENCODING_FAILED:
 *         console.error('Failed to encode transaction data');
 *         break;
 *       default:
 *         console.error('Unknown generator error');
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export enum GeneratorErrorCode {
  /** Input validation failed (malformed JSON, missing fields, etc.) */
  INVALID_INPUT = 'INVALID_INPUT',

  /** Invalid Ethereum address format */
  INVALID_ADDRESS = 'INVALID_ADDRESS',

  /** Invalid parameter value (out of range, wrong type, etc.) */
  INVALID_PARAMETER = 'INVALID_PARAMETER',

  /** Transaction generation failed (generic generation error) */
  GENERATION_FAILED = 'GENERATION_FAILED',

  /** Failed to encode transaction data (ABI encoding error) */
  ENCODING_FAILED = 'ENCODING_FAILED',

  /** Failed to compute CREATE2 address */
  ADDRESS_COMPUTATION_FAILED = 'ADDRESS_COMPUTATION_FAILED',

  /** Unsupported chain type (e.g., MVM not yet implemented) */
  UNSUPPORTED_CHAIN_TYPE = 'UNSUPPORTED_CHAIN_TYPE',

  /** Failed to convert chain-specific address format */
  CHAIN_CONVERSION_FAILED = 'CHAIN_CONVERSION_FAILED',
}

/**
 * Base error class for all generator operations.
 *
 * @remarks
 * Extends BaseError with generator-specific error codes. All generator-specific
 * errors (TokenDeploymentError, PoolDeploymentError, etc.) extend this class.
 *
 * Typically not thrown directly - use specific error classes for each operation
 * type for better error categorization.
 *
 * @example
 * ```typescript
 * // Used as base class for specific errors
 * export class TokenDeploymentError extends GeneratorError {
 *   constructor(message: string, context?: ErrorContext, cause?: Error) {
 *     super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Can be used for instanceof checks
 * try {
 *   await generateTokenDeployment(params);
 * } catch (error) {
 *   if (error instanceof GeneratorError) {
 *     // Handle any generator error
 *     console.error(`Generator error: ${error.code}`);
 *   }
 * }
 * ```
 *
 * @public
 */
export class GeneratorError extends BaseError {
  /**
   * Creates a new GeneratorError instance.
   *
   * @param message - Human-readable error message
   * @param code - Error code from GeneratorErrorCode enum
   * @param context - Optional contextual data for debugging
   * @param cause - Optional original error that caused this error
   */
  constructor(message: string, code: GeneratorErrorCode, context?: ErrorContext, cause?: Error) {
    super(message, code, context, cause);
  }
}

/**
 * Error for token deployment operations.
 *
 * @remarks
 * Thrown when token deployment generation fails. Covers both token+pool deployment
 * (`generate-token-deployment` command) and any related failures during the process.
 *
 * Common Causes:
 * - Invalid token parameters (name, symbol, decimals)
 * - Invalid pool parameters (pool type, initial config)
 * - Encoding failures for TokenPoolFactory calls
 * - CREATE2 address computation failures
 *
 * @example
 * ```typescript
 * throw new TokenDeploymentError(
 *   'Failed to compute token address',
 *   {
 *     deployer: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 *     salt: '0x0000000000000000000000000000000000000000000000000000000123456789'
 *   }
 * );
 * ```
 *
 * @public
 */
export class TokenDeploymentError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error for pool deployment operations.
 *
 * @remarks
 * Thrown when pool deployment generation fails. Covers pool-only deployment
 * (`generate-pool-deployment` command) for existing tokens.
 *
 * Common Causes:
 * - Invalid pool type (must be BurnMintTokenPool or LockReleaseTokenPool)
 * - Invalid pool configuration parameters
 * - Encoding failures for TokenPoolFactory.deployPool calls
 * - Token address validation failures
 *
 * @example
 * ```typescript
 * throw new PoolDeploymentError(
 *   'Invalid pool type specified',
 *   {
 *     poolType: 'InvalidType',
 *     expectedTypes: ['BurnMintTokenPool', 'LockReleaseTokenPool']
 *   }
 * );
 * ```
 *
 * @public
 */
export class PoolDeploymentError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error for chain update operations.
 *
 * @remarks
 * Thrown when cross-chain configuration generation fails. Covers adding/removing
 * remote chains (`generate-chain-update` command) for TokenPool contracts.
 *
 * Common Causes:
 * - Unsupported chain type (EVM, SVM supported; MVM not yet implemented)
 * - Invalid remote token address format
 * - Chain selector validation failures
 * - Address encoding failures (EVM vs SVM address formats)
 *
 * @example
 * ```typescript
 * throw new ChainUpdateError(
 *   'Unsupported chain type: MVM',
 *   {
 *     chainType: 'MVM',
 *     supportedTypes: ['EVM', 'SVM']
 *   }
 * );
 * ```
 *
 * @public
 */
export class ChainUpdateError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error for token mint operations.
 *
 * @remarks
 * Thrown when token minting transaction generation fails. Covers the
 * `generate-mint` command for BurnMintERC20 tokens.
 *
 * Common Causes:
 * - Invalid receiver address format
 * - Invalid amount (must be numeric string, cannot be negative)
 * - Token address validation failures
 * - Encoding failures for mint() function calls
 *
 * @example
 * ```typescript
 * throw new TokenMintError(
 *   'Invalid mint amount',
 *   {
 *     amount: '-1000',
 *     receiver: '0x1234567890123456789012345678901234567890'
 *   }
 * );
 * ```
 *
 * @public
 */
export class TokenMintError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error for role management operations.
 *
 * @remarks
 * Thrown when role grant/revoke transaction generation fails. Covers the
 * `generate-grant-roles` command for granting mint/burn roles to pools.
 *
 * Common Causes:
 * - Invalid token or pool address format
 * - Invalid role type (must be 'mint', 'burn', or 'both')
 * - Encoding failures for grantRole/revokeRole calls
 * - Missing role parameters
 *
 * @example
 * ```typescript
 * throw new RoleManagementError(
 *   'Invalid role type specified',
 *   {
 *     roleType: 'invalid',
 *     expectedTypes: ['mint', 'burn', 'both'],
 *     tokenAddress: '0x779877...',
 *     poolAddress: '0x123456...'
 *   }
 * );
 * ```
 *
 * @public
 */
export class RoleManagementError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error for allow list update operations.
 *
 * @remarks
 * Thrown when allow list configuration generation fails. Covers updating the
 * allowed senders list for TokenPool contracts.
 *
 * Common Causes:
 * - Invalid address format in allow list
 * - Empty allow list when required
 * - Pool address validation failures
 * - Encoding failures for applyAllowListUpdates calls
 *
 * @example
 * ```typescript
 * throw new AllowListUpdatesError(
 *   'Invalid address in allow list',
 *   {
 *     invalidAddress: '0xinvalid',
 *     poolAddress: '0x1234567890123456789012345678901234567890'
 *   }
 * );
 * ```
 *
 * @public
 */
export class AllowListUpdatesError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error for rate limiter configuration operations.
 *
 * @remarks
 * Thrown when rate limiter configuration generation fails. Covers updating the
 * token bucket rate limiter settings for TokenPool contracts.
 *
 * Common Causes:
 * - Invalid capacity or rate values (must be numeric strings)
 * - Negative capacity or rate values
 * - Pool address validation failures
 * - Encoding failures for setRateLimiterConfig calls
 *
 * @example
 * ```typescript
 * throw new RateLimiterConfigError(
 *   'Invalid rate limiter capacity',
 *   {
 *     capacity: '-100',
 *     rate: '10',
 *     poolAddress: '0x1234567890123456789012345678901234567890'
 *   }
 * );
 * ```
 *
 * @public
 */
export class RateLimiterConfigError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error thrown during accept ownership transaction generation.
 *
 * Used when generating transactions to accept ownership of contracts using
 * the two-step ownership transfer pattern. Common causes include invalid
 * contract addresses.
 *
 * @example
 * ```typescript
 * throw new AcceptOwnershipError(
 *   'Invalid contract address format',
 *   {
 *     contractAddress: '0xinvalid'
 *   }
 * );
 * ```
 *
 * @public
 */
export class AcceptOwnershipError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error thrown during register admin transaction generation.
 *
 * Used when generating transactions to register as CCIP admin for a token
 * via the RegistryModuleOwnerCustom contract. Common causes include invalid
 * module or token addresses, or invalid registration method.
 *
 * @example
 * ```typescript
 * throw new RegisterAdminError(
 *   'Invalid registration method',
 *   {
 *     method: 'invalid',
 *     expectedMethods: ['get-ccip-admin', 'owner', 'access-control']
 *   }
 * );
 * ```
 *
 * @public
 */
export class RegisterAdminError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

/**
 * Error thrown during TokenAdminRegistry transaction generation.
 *
 * Used when generating transactions to interact with the TokenAdminRegistry
 * contract (setPool, transferAdminRole, acceptAdminRole). Common causes include
 * invalid registry, token, pool, or admin addresses, or invalid method type.
 *
 * @example
 * ```typescript
 * throw new TokenAdminRegistryError(
 *   'Invalid method type',
 *   {
 *     method: 'invalid',
 *     expectedMethods: ['set-pool', 'transfer-admin', 'accept-admin']
 *   }
 * );
 * ```
 *
 * @public
 */
export class TokenAdminRegistryError extends GeneratorError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, GeneratorErrorCode.GENERATION_FAILED, context, cause);
  }
}

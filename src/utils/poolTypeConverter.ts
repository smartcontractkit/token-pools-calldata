/**
 * @fileoverview Pool type conversion utilities for TokenPool contracts.
 *
 * This module provides bidirectional conversion between TypeScript PoolType enum
 * values (string literals) and the numeric values used in Solidity contracts.
 *
 * TokenPool contracts use numeric enum values in Solidity:
 * - 0 = BurnMintTokenPool (tokens burned on source chain, minted on destination)
 * - 1 = LockReleaseTokenPool (tokens locked on source chain, released on destination)
 *
 * TypeScript uses string literal types for better type safety and readability:
 * - "BurnMintTokenPool"
 * - "LockReleaseTokenPool"
 *
 * These converters bridge the gap between TypeScript types and contract values.
 *
 * @module utils/poolTypeConverter
 */

import { PoolType } from '../types/poolDeployment';

/**
 * Converts PoolType string to Solidity contract numeric value.
 *
 * Maps TypeScript PoolType enum to the numeric value expected by TokenPoolFactory
 * contracts. Used when encoding function calls for pool deployment.
 *
 * @param poolType - The pool type enum value
 * @returns The numeric value used in the contract (0 or 1)
 *
 * @remarks
 * Mapping:
 * - "BurnMintTokenPool" → 0
 * - "LockReleaseTokenPool" → 1
 *
 * Pool Type Semantics:
 * - **BurnMintTokenPool (0)**: For mintable/burnable tokens. Burns tokens when
 *   sending cross-chain, mints tokens when receiving. Requires mint/burn roles.
 * - **LockReleaseTokenPool (1)**: For non-mintable tokens. Locks tokens in the
 *   pool when sending, releases from pool when receiving. Requires token balance.
 *
 * @example
 * ```typescript
 * import { poolTypeToNumber } from './poolTypeConverter';
 *
 * // Convert for BurnMintTokenPool
 * const burnMintValue = poolTypeToNumber('BurnMintTokenPool');
 * console.log(burnMintValue); // 0
 *
 * // Convert for LockReleaseTokenPool
 * const lockReleaseValue = poolTypeToNumber('LockReleaseTokenPool');
 * console.log(lockReleaseValue); // 1
 * ```
 *
 * @example
 * ```typescript
 * // Using in contract call encoding
 * const poolType = 'BurnMintTokenPool';
 * const encodedData = factoryInterface.encodeFunctionData('deployPool', [
 *   tokenAddress,
 *   poolTypeToNumber(poolType),  // Converts to 0
 *   salt
 * ]);
 * ```
 *
 * @see {@link numberToPoolType} for reverse conversion
 * @public
 */
export function poolTypeToNumber(poolType: PoolType): number {
  return poolType === 'BurnMintTokenPool' ? 0 : 1;
}

/**
 * Converts Solidity contract numeric value to PoolType string.
 *
 * Maps numeric values from TokenPoolFactory contracts back to TypeScript PoolType
 * enum. Used when decoding contract responses or validating pool configurations.
 *
 * @param value - The numeric value from the contract (0 or 1)
 * @returns The corresponding PoolType enum value
 * @throws {Error} If value is not 0 or 1
 *
 * @remarks
 * Mapping:
 * - 0 → "BurnMintTokenPool"
 * - 1 → "LockReleaseTokenPool"
 * - Any other value → Error
 *
 * Validation:
 * - Only accepts 0 or 1
 * - Throws descriptive error for invalid values
 * - Ensures type safety when reading from contracts
 *
 * @example
 * ```typescript
 * import { numberToPoolType } from './poolTypeConverter';
 *
 * // Convert from contract value 0
 * const poolType0 = numberToPoolType(0);
 * console.log(poolType0); // "BurnMintTokenPool"
 *
 * // Convert from contract value 1
 * const poolType1 = numberToPoolType(1);
 * console.log(poolType1); // "LockReleaseTokenPool"
 * ```
 *
 * @example
 * ```typescript
 * // Error case - invalid value
 * try {
 *   const poolType = numberToPoolType(2);
 * } catch (error) {
 *   // Error: Invalid pool type value: 2. Expected 0 or 1.
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using with contract response
 * const poolTypeValue = await poolContract.getPoolType();
 * const poolType = numberToPoolType(poolTypeValue);
 *
 * if (poolType === 'BurnMintTokenPool') {
 *   console.log('Pool requires mint/burn roles');
 * } else {
 *   console.log('Pool requires token balance');
 * }
 * ```
 *
 * @see {@link poolTypeToNumber} for reverse conversion
 * @public
 */
export function numberToPoolType(value: number): PoolType {
  if (value === 0) return 'BurnMintTokenPool';
  if (value === 1) return 'LockReleaseTokenPool';
  throw new Error(`Invalid pool type value: ${value}. Expected 0 or 1.`);
}

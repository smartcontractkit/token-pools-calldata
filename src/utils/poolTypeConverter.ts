import { PoolType } from '../types/poolDeployment';

/**
 * Converts a PoolType enum value to its corresponding contract numeric value
 * @param poolType - The pool type enum value
 * @returns The numeric value used in the contract (0 for BurnMintTokenPool, 1 for LockReleaseTokenPool)
 */
export function poolTypeToNumber(poolType: PoolType): number {
  return poolType === 'BurnMintTokenPool' ? 0 : 1;
}

/**
 * Converts a contract numeric value to its corresponding PoolType enum value
 * @param value - The numeric value from the contract (0 or 1)
 * @returns The corresponding PoolType enum value
 * @throws Error if the value is not 0 or 1
 */
export function numberToPoolType(value: number): PoolType {
  if (value === 0) return 'BurnMintTokenPool';
  if (value === 1) return 'LockReleaseTokenPool';
  throw new Error(`Invalid pool type value: ${value}. Expected 0 or 1.`);
}

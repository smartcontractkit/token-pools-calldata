/**
 * Tests for poolTypeConverter utility
 * Covers conversion between PoolType enum and contract numeric values
 */

import { poolTypeToNumber, numberToPoolType } from '../../utils/poolTypeConverter';
import { PoolType } from '../../types/poolDeployment';

describe('poolTypeToNumber', () => {
  it('should convert BurnMintTokenPool to 0', () => {
    const result = poolTypeToNumber('BurnMintTokenPool');
    expect(result).toBe(0);
  });

  it('should convert LockReleaseTokenPool to 1', () => {
    const result = poolTypeToNumber('LockReleaseTokenPool');
    expect(result).toBe(1);
  });

  it('should be consistent for multiple calls with same input', () => {
    const result1 = poolTypeToNumber('BurnMintTokenPool');
    const result2 = poolTypeToNumber('BurnMintTokenPool');
    expect(result1).toBe(result2);
  });

  it('should handle PoolType type correctly', () => {
    const poolType: PoolType = 'BurnMintTokenPool';
    const result = poolTypeToNumber(poolType);
    expect(result).toBe(0);
  });

  it('should return different values for different pool types', () => {
    const burnMintResult = poolTypeToNumber('BurnMintTokenPool');
    const lockReleaseResult = poolTypeToNumber('LockReleaseTokenPool');
    expect(burnMintResult).not.toBe(lockReleaseResult);
  });
});

describe('numberToPoolType', () => {
  it('should convert 0 to BurnMintTokenPool', () => {
    const result = numberToPoolType(0);
    expect(result).toBe('BurnMintTokenPool');
  });

  it('should convert 1 to LockReleaseTokenPool', () => {
    const result = numberToPoolType(1);
    expect(result).toBe('LockReleaseTokenPool');
  });

  it('should throw error for invalid value 2', () => {
    expect(() => numberToPoolType(2)).toThrow('Invalid pool type value: 2. Expected 0 or 1.');
  });

  it('should throw error for invalid value -1', () => {
    expect(() => numberToPoolType(-1)).toThrow('Invalid pool type value: -1. Expected 0 or 1.');
  });

  it('should throw error for invalid value 999', () => {
    expect(() => numberToPoolType(999)).toThrow('Invalid pool type value: 999. Expected 0 or 1.');
  });

  it('should throw error for NaN', () => {
    expect(() => numberToPoolType(NaN)).toThrow('Invalid pool type value: NaN. Expected 0 or 1.');
  });

  it('should throw error for Infinity', () => {
    expect(() => numberToPoolType(Infinity)).toThrow(
      'Invalid pool type value: Infinity. Expected 0 or 1.',
    );
  });

  it('should throw error for negative Infinity', () => {
    expect(() => numberToPoolType(-Infinity)).toThrow(
      'Invalid pool type value: -Infinity. Expected 0 or 1.',
    );
  });

  it('should be consistent for multiple calls with same input', () => {
    const result1 = numberToPoolType(0);
    const result2 = numberToPoolType(0);
    expect(result1).toBe(result2);
  });

  it('should return PoolType type', () => {
    const result = numberToPoolType(0);
    const poolType: PoolType = result;
    expect(poolType).toBe('BurnMintTokenPool');
  });

  it('should return different values for different numbers', () => {
    const zeroResult = numberToPoolType(0);
    const oneResult = numberToPoolType(1);
    expect(zeroResult).not.toBe(oneResult);
  });
});

describe('Round-trip conversions', () => {
  it('should convert BurnMintTokenPool to number and back', () => {
    const poolType: PoolType = 'BurnMintTokenPool';
    const number = poolTypeToNumber(poolType);
    const result = numberToPoolType(number);
    expect(result).toBe(poolType);
  });

  it('should convert LockReleaseTokenPool to number and back', () => {
    const poolType: PoolType = 'LockReleaseTokenPool';
    const number = poolTypeToNumber(poolType);
    const result = numberToPoolType(number);
    expect(result).toBe(poolType);
  });

  it('should convert 0 to PoolType and back', () => {
    const number = 0;
    const poolType = numberToPoolType(number);
    const result = poolTypeToNumber(poolType);
    expect(result).toBe(number);
  });

  it('should convert 1 to PoolType and back', () => {
    const number = 1;
    const poolType = numberToPoolType(number);
    const result = poolTypeToNumber(poolType);
    expect(result).toBe(number);
  });

  it('should maintain consistency across multiple conversions', () => {
    const original: PoolType = 'BurnMintTokenPool';
    const num1 = poolTypeToNumber(original);
    const poolType1 = numberToPoolType(num1);
    const num2 = poolTypeToNumber(poolType1);
    const poolType2 = numberToPoolType(num2);

    expect(poolType1).toBe(original);
    expect(poolType2).toBe(original);
    expect(num1).toBe(num2);
  });
});

describe('Contract compatibility', () => {
  it('should match expected contract enum values for BurnMintTokenPool', () => {
    // In Solidity contracts, BurnMintTokenPool is typically enum value 0
    const result = poolTypeToNumber('BurnMintTokenPool');
    expect(result).toBe(0);
  });

  it('should match expected contract enum values for LockReleaseTokenPool', () => {
    // In Solidity contracts, LockReleaseTokenPool is typically enum value 1
    const result = poolTypeToNumber('LockReleaseTokenPool');
    expect(result).toBe(1);
  });

  it('should provide valid values for contract calls', () => {
    const poolTypes: PoolType[] = ['BurnMintTokenPool', 'LockReleaseTokenPool'];

    poolTypes.forEach((poolType) => {
      const numericValue = poolTypeToNumber(poolType);
      expect(numericValue).toBeGreaterThanOrEqual(0);
      expect(numericValue).toBeLessThanOrEqual(1);
      expect(Number.isInteger(numericValue)).toBe(true);
    });
  });

  it('should handle all valid PoolType values', () => {
    const validPoolTypes: PoolType[] = ['BurnMintTokenPool', 'LockReleaseTokenPool'];

    validPoolTypes.forEach((poolType) => {
      expect(() => poolTypeToNumber(poolType)).not.toThrow();
    });
  });
});

describe('Type safety', () => {
  it('should accept PoolType from type system', () => {
    const createPoolConfig = (type: PoolType) => {
      return {
        type,
        numericType: poolTypeToNumber(type),
      };
    };

    const config1 = createPoolConfig('BurnMintTokenPool');
    const config2 = createPoolConfig('LockReleaseTokenPool');

    expect(config1.numericType).toBe(0);
    expect(config2.numericType).toBe(1);
  });

  it('should work with const assertions', () => {
    const poolType = 'BurnMintTokenPool' as const;
    const result = poolTypeToNumber(poolType);
    expect(result).toBe(0);
  });

  it('should work in conditional expressions', () => {
    const poolType: PoolType = 'BurnMintTokenPool';
    const numericValue = poolTypeToNumber(poolType);

    const isBurnMint = numericValue === 0;
    const isLockRelease = numericValue === 1;

    expect(isBurnMint).toBe(true);
    expect(isLockRelease).toBe(false);
  });
});

describe('Edge cases', () => {
  it('should throw error for float 0.5', () => {
    expect(() => numberToPoolType(0.5)).toThrow('Invalid pool type value: 0.5. Expected 0 or 1.');
  });

  it('should throw error for float 0.9', () => {
    expect(() => numberToPoolType(0.9)).toThrow('Invalid pool type value: 0.9. Expected 0 or 1.');
  });

  it('should throw error for float 1.1', () => {
    expect(() => numberToPoolType(1.1)).toThrow('Invalid pool type value: 1.1. Expected 0 or 1.');
  });

  it('should handle negative zero', () => {
    const result = numberToPoolType(-0);
    expect(result).toBe('BurnMintTokenPool');
  });

  it('should work with number from parsing', () => {
    const numString = '0';
    const num = parseInt(numString, 10);
    const result = numberToPoolType(num);
    expect(result).toBe('BurnMintTokenPool');
  });

  it('should work with number from calculation', () => {
    const num = 2 - 2; // Results in 0
    const result = numberToPoolType(num);
    expect(result).toBe('BurnMintTokenPool');
  });

  it('should maintain type consistency in arrays', () => {
    const poolTypes: PoolType[] = ['BurnMintTokenPool', 'LockReleaseTokenPool'];
    const numericTypes = poolTypes.map(poolTypeToNumber);

    expect(numericTypes).toEqual([0, 1]);

    const converted = numericTypes.map(numberToPoolType);
    expect(converted).toEqual(poolTypes);
  });

  it('should handle Object.is strict equality', () => {
    const num1 = poolTypeToNumber('BurnMintTokenPool');
    const num2 = poolTypeToNumber('BurnMintTokenPool');

    expect(Object.is(num1, num2)).toBe(true);
  });
});

describe('Error messages', () => {
  it('should provide clear error message with actual value', () => {
    try {
      numberToPoolType(5);
      fail('Should have thrown error');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('5');
        expect(error.message).toContain('Expected 0 or 1');
      } else {
        fail('Error should be instance of Error');
      }
    }
  });

  it('should provide clear error message for large numbers', () => {
    try {
      numberToPoolType(1000000);
      fail('Should have thrown error');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('1000000');
      } else {
        fail('Error should be instance of Error');
      }
    }
  });

  it('should include "Invalid pool type value" in error message', () => {
    try {
      numberToPoolType(42);
      fail('Should have thrown error');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('Invalid pool type value');
      } else {
        fail('Error should be instance of Error');
      }
    }
  });
});

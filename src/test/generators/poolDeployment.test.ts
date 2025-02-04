/**
 * Tests for poolDeployment generator
 * Covers pool-only deployment for existing tokens
 */

import { createPoolDeploymentGenerator } from '../../generators/poolDeployment';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  VALID_ADDRESSES,
  VALID_SALTS,
  INVALID_SALTS,
  VALID_POOL_PARAMS,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { TokenPoolFactory__factory } from '../../typechain';

describe('PoolDeploymentGenerator', () => {
  let generator: ReturnType<typeof createPoolDeploymentGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const factoryInterface = TokenPoolFactory__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      TokenPoolFactory: factoryInterface,
    });

    generator = createPoolDeploymentGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('BurnMintTokenPool Deployment', () => {
    it('should generate transaction for BurnMintTokenPool deployment', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.deployer);
      expect(result.value).toBe('0');
      expectValidCalldata(result.data);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should handle different salts for BurnMint pools', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result1 = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.zero,
      );

      const result2 = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result1);
      expectValidTransaction(result2);
      // Both should generate valid but different calldata
      expect(result1.data).not.toBe(result2.data);
    });

    it('should handle different token addresses', async () => {
      const inputJson1 = JSON.stringify({
        ...VALID_POOL_PARAMS,
        token: VALID_ADDRESSES.token,
        poolType: 'BurnMintTokenPool',
      });

      const inputJson2 = JSON.stringify({
        ...VALID_POOL_PARAMS,
        token: VALID_ADDRESSES.receiver,
        poolType: 'BurnMintTokenPool',
      });

      const result1 = await generator.generate(
        inputJson1,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      const result2 = await generator.generate(
        inputJson2,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result1);
      expectValidTransaction(result2);
      expect(result1.data).not.toBe(result2.data);
    });
  });

  describe('LockReleaseTokenPool Deployment', () => {
    it('should generate transaction for LockReleaseTokenPool deployment', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'LockReleaseTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.deployer);
      expectValidCalldata(result.data);
    });

    it('should handle acceptLiquidity parameter for LockRelease', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'LockReleaseTokenPool',
        acceptLiquidity: true,
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle acceptLiquidity false for LockRelease', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'LockReleaseTokenPool',
        acceptLiquidity: false,
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('Decimals Parameter', () => {
    it('should handle different decimals values', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        decimals: 6,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(
        generator.generate('invalid json', VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for invalid factory address', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, 'invalid-address', VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for invalid token address', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        token: 'invalid-address',
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for missing token field', async () => {
      const inputJson = JSON.stringify({
        decimals: 18,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for missing poolType field', async () => {
      const inputJson = JSON.stringify({
        token: VALID_ADDRESSES.token,
        decimals: 18,
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for missing decimals field', async () => {
      const inputJson = JSON.stringify({
        token: VALID_ADDRESSES.token,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for invalid pool type', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'InvalidPoolType',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });

    it('should throw error for invalid decimals value', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        decimals: -1,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, VALID_SALTS.sequential),
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle deployment with remoteTokenPools', async () => {
      const inputJson = JSON.stringify({
        token: VALID_ADDRESSES.token,
        decimals: 18,
        poolType: 'BurnMintTokenPool',
        remoteTokenPools: [],
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
    });

    it('should handle deployment with minimal parameters', async () => {
      const inputJson = JSON.stringify({
        token: VALID_ADDRESSES.token,
        decimals: 18,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(result);
    });

    it('should generate different calldata for different pool types with same token', async () => {
      const inputJsonBurnMint = JSON.stringify({
        token: VALID_ADDRESSES.token,
        decimals: 18,
        poolType: 'BurnMintTokenPool',
      });

      const inputJsonLockRelease = JSON.stringify({
        token: VALID_ADDRESSES.token,
        decimals: 18,
        poolType: 'LockReleaseTokenPool',
      });

      const resultBurnMint = await generator.generate(
        inputJsonBurnMint,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      const resultLockRelease = await generator.generate(
        inputJsonLockRelease,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
      );

      expectValidTransaction(resultBurnMint);
      expectValidTransaction(resultLockRelease);
      expect(resultBurnMint.data).not.toBe(resultLockRelease.data);
    });
  });

  describe('Salt Validation', () => {
    it('should reject salt that is too short', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, INVALID_SALTS.tooShort),
      ).rejects.toThrow();
    });

    it('should reject salt that is too long', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, INVALID_SALTS.tooLong),
      ).rejects.toThrow();
    });

    it('should reject non-hex salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, INVALID_SALTS.notHex),
      ).rejects.toThrow();
    });

    it('should reject salt missing 0x prefix', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, INVALID_SALTS.missing0x),
      ).rejects.toThrow();
    });

    it('should reject empty salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.deployer, '')).rejects.toThrow(
        /required/i,
      );
    });

    it('should reject undefined salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, undefined as unknown as string),
      ).rejects.toThrow();
    });

    it('should accept valid 32-byte zero salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.zero,
      );

      expectValidTransaction(result);
    });

    it('should accept valid 32-byte random salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_POOL_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.random,
      );

      expectValidTransaction(result);
    });
  });
});

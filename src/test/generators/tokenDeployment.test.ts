/**
 * Tests for tokenDeployment generator
 * Covers token and pool deployment with CREATE2 address computation
 */

import { createTokenDeploymentGenerator } from '../../generators/tokenDeployment';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  createMockAddressComputer,
  VALID_ADDRESSES,
  VALID_SALTS,
  INVALID_SALTS,
  VALID_TOKEN_PARAMS,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { TokenPoolFactory__factory, FactoryBurnMintERC20__factory } from '../../typechain';

describe('TokenDeploymentGenerator', () => {
  let generator: ReturnType<typeof createTokenDeploymentGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;
  let mockAddressComputer: ReturnType<typeof createMockAddressComputer>;

  const predictedTokenAddress = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa';

  beforeEach(() => {
    mockLogger = createMockLogger();
    const factoryInterface = TokenPoolFactory__factory.createInterface();
    const tokenInterface = FactoryBurnMintERC20__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      TokenPoolFactory: factoryInterface,
      BurnMintERC20: tokenInterface,
    });
    mockAddressComputer = createMockAddressComputer(predictedTokenAddress);

    generator = createTokenDeploymentGenerator(
      mockLogger,
      mockInterfaceProvider,
      mockAddressComputer,
    );
  });

  describe('BurnMintTokenPool Deployment', () => {
    it('should generate transaction for token and BurnMintTokenPool deployment', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.deployer);
      expect(result.value).toBe('0');
      expectValidCalldata(result.data);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should generate different calldata for different salts', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result1 = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.zero,
        VALID_ADDRESSES.safe,
      );

      const result2 = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result1);
      expectValidTransaction(result2);
      // Different salts should generate different calldata
      expect(result1.data).not.toBe(result2.data);
    });

    it('should handle zero preMint', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        preMint: '0',
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle non-zero preMint', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        preMint: '1000000000000000000000',
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle large maxSupply values', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        maxSupply: '999999999999999999999999999999',
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('LockReleaseTokenPool Deployment', () => {
    it('should generate transaction for token and LockReleaseTokenPool deployment', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'LockReleaseTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.deployer);
      expectValidCalldata(result.data);
    });

    it('should accept valid acceptLiquidity for LockRelease', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'LockReleaseTokenPool',
        acceptLiquidity: true,
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
    });
  });

  describe('Token Parameters', () => {
    it('should handle different decimal values', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        decimals: 6,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
    });

    it('should handle different token names and symbols', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        name: 'My Custom Token',
        symbol: 'MCT',
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(
        generator.generate(
          'invalid json',
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should throw error for invalid factory address', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          'invalid-address',
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should throw error for invalid safe address', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          'invalid-address',
        ),
      ).rejects.toThrow();
    });

    it('should throw error for missing required fields', async () => {
      const inputJson = JSON.stringify({
        name: 'Test',
        // Missing symbol, decimals, etc.
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should throw error for negative decimals', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        decimals: -1,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should throw error for decimals > 18', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        decimals: 19,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token name', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        name: '',
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should handle empty symbol', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        symbol: '',
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          VALID_SALTS.sequential,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should handle preMint exceeding maxSupply', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        maxSupply: '1000',
        preMint: '10000',
        poolType: 'BurnMintTokenPool',
      });

      // This validation might be done in the contract, not the generator
      // If generator validates, this should throw. Otherwise, it should succeed.
      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.sequential,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
    });
  });

  describe('Salt Validation', () => {
    it('should reject salt that is too short', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          INVALID_SALTS.tooShort,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should reject salt that is too long', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          INVALID_SALTS.tooLong,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should reject non-hex salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          INVALID_SALTS.notHex,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should reject salt missing 0x prefix', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          INVALID_SALTS.missing0x,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should reject empty salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(inputJson, VALID_ADDRESSES.deployer, '', VALID_ADDRESSES.safe),
      ).rejects.toThrow(/required/i);
    });

    it('should reject undefined salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      await expect(
        generator.generate(
          inputJson,
          VALID_ADDRESSES.deployer,
          undefined as unknown as string,
          VALID_ADDRESSES.safe,
        ),
      ).rejects.toThrow();
    });

    it('should accept valid 32-byte zero salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.zero,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
    });

    it('should accept valid 32-byte random salt', async () => {
      const inputJson = JSON.stringify({
        ...VALID_TOKEN_PARAMS,
        poolType: 'BurnMintTokenPool',
      });

      const result = await generator.generate(
        inputJson,
        VALID_ADDRESSES.deployer,
        VALID_SALTS.random,
        VALID_ADDRESSES.safe,
      );

      expectValidTransaction(result);
    });
  });
});

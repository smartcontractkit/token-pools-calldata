/**
 * Tests for tokenAdminRegistry generator
 * Covers all three methods for TokenAdminRegistry operations
 */

import { createTokenAdminRegistryGenerator } from '../../generators/tokenAdminRegistry';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  VALID_ADDRESSES,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { TokenAdminRegistry__factory } from '../../typechain';

describe('TokenAdminRegistryGenerator', () => {
  let generator: ReturnType<typeof createTokenAdminRegistryGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const registryInterface = TokenAdminRegistry__factory.createInterface();

    // Create a mock interface provider that includes the TokenAdminRegistry interface
    const mockInterfaceProvider = {
      getTokenPoolInterface: jest.fn(),
      getTokenPoolFactoryInterface: jest.fn(),
      getFactoryBurnMintERC20Interface: jest.fn(),
      getRegistryModuleOwnerCustomInterface: jest.fn(),
      getTokenAdminRegistryInterface: () => registryInterface,
    };

    generator = createTokenAdminRegistryGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('set-pool method', () => {
    it('should generate transaction for set-pool method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'set-pool',
        poolAddress: VALID_ADDRESSES.pool,
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expect(result.functionName).toBe('setPool');
      expect(result.transaction.to).toBe(VALID_ADDRESSES.deployer);
      expect(result.transaction.value).toBe('0');
      expectValidCalldata(result.transaction.data);
      expect(result.transaction.operation).toBe(SafeOperationType.Call);
    });

    it('should throw error if poolAddress is missing for set-pool method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'set-pool',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });
  });

  describe('transfer-admin method', () => {
    it('should generate transaction for transfer-admin method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'transfer-admin',
        newAdminAddress: VALID_ADDRESSES.safe,
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expect(result.functionName).toBe('transferAdminRole');
      expect(result.transaction.to).toBe(VALID_ADDRESSES.deployer);
      expectValidCalldata(result.transaction.data);
    });

    it('should throw error if newAdminAddress is missing for transfer-admin method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'transfer-admin',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });
  });

  describe('accept-admin method', () => {
    it('should generate transaction for accept-admin method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expect(result.functionName).toBe('acceptAdminRole');
      expect(result.transaction.to).toBe(VALID_ADDRESSES.deployer);
      expectValidCalldata(result.transaction.data);
    });
  });

  describe('Different Methods Generate Different Calldata', () => {
    it('should generate different calldata for each method', async () => {
      const baseParams = {
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
      };

      const resultSetPool = await generator.generate(
        JSON.stringify({ ...baseParams, method: 'set-pool', poolAddress: VALID_ADDRESSES.pool }),
      );
      const resultTransferAdmin = await generator.generate(
        JSON.stringify({
          ...baseParams,
          method: 'transfer-admin',
          newAdminAddress: VALID_ADDRESSES.safe,
        }),
      );
      const resultAcceptAdmin = await generator.generate(
        JSON.stringify({ ...baseParams, method: 'accept-admin' }),
      );

      // All should have different calldata due to different function selectors
      expect(resultSetPool.transaction.data).not.toBe(resultTransferAdmin.transaction.data);
      expect(resultTransferAdmin.transaction.data).not.toBe(resultAcceptAdmin.transaction.data);
      expect(resultSetPool.transaction.data).not.toBe(resultAcceptAdmin.transaction.data);
    });
  });

  describe('Address Handling', () => {
    it('should use registry address as transaction target', async () => {
      const registryAddress = VALID_ADDRESSES.pool;
      const inputJson = JSON.stringify({
        registryAddress,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      const result = await generator.generate(inputJson);

      expect(result.transaction.to).toBe(registryAddress);
    });

    it('should encode token address in calldata', async () => {
      const inputJson1 = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });
      const inputJson2 = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.pool,
        method: 'accept-admin',
      });

      const result1 = await generator.generate(inputJson1);
      const result2 = await generator.generate(inputJson2);

      // Different token addresses should produce different calldata
      expect(result1.transaction.data).not.toBe(result2.transaction.data);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(generator.generate('invalid json')).rejects.toThrow();
    });

    it('should throw error for invalid registry address', async () => {
      const inputJson = JSON.stringify({
        registryAddress: 'invalid-address',
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid token address', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: 'invalid-address',
        method: 'accept-admin',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing registry address', async () => {
      const inputJson = JSON.stringify({
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing token address', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        method: 'accept-admin',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid method', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'invalid-method',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid pool address in set-pool', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'set-pool',
        poolAddress: 'invalid-address',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid new admin address in transfer-admin', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'transfer-admin',
        newAdminAddress: 'invalid-address',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });
  });

  describe('Transaction Properties', () => {
    it('should set value to 0', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      const result = await generator.generate(inputJson);

      expect(result.transaction.value).toBe('0');
    });

    it('should set operation to Call', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      const result = await generator.generate(inputJson);

      expect(result.transaction.operation).toBe(SafeOperationType.Call);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle lowercase addresses', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer.toLowerCase(),
        tokenAddress: VALID_ADDRESSES.token.toLowerCase(),
        method: 'accept-admin',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expectValidCalldata(result.transaction.data);
    });

    it('should handle checksummed addresses', async () => {
      const inputJson = JSON.stringify({
        registryAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'accept-admin',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expectValidCalldata(result.transaction.data);
    });
  });
});

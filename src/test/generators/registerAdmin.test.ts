/**
 * Tests for registerAdmin generator
 * Covers all three registration methods for CCIP admin registration
 */

import { createRegisterAdminGenerator } from '../../generators/registerAdmin';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  VALID_ADDRESSES,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { RegistryModuleOwnerCustom__factory } from '../../typechain';

describe('RegisterAdminGenerator', () => {
  let generator: ReturnType<typeof createRegisterAdminGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const registryInterface = RegistryModuleOwnerCustom__factory.createInterface();

    // Create a mock interface provider that includes the RegistryModuleOwnerCustom interface
    mockInterfaceProvider = {
      getTokenPoolInterface: jest.fn(),
      getTokenPoolFactoryInterface: jest.fn(),
      getFactoryBurnMintERC20Interface: jest.fn(),
      getRegistryModuleOwnerCustomInterface: () => registryInterface,
      getTokenAdminRegistryInterface: jest.fn(),
    };

    generator = createRegisterAdminGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('Registration Methods', () => {
    it('should generate transaction for get-ccip-admin method', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'get-ccip-admin',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expect(result.functionName).toBe('registerAdminViaGetCCIPAdmin');
      expect(result.transaction.to).toBe(VALID_ADDRESSES.deployer);
      expect(result.transaction.value).toBe('0');
      expectValidCalldata(result.transaction.data);
      expect(result.transaction.operation).toBe(SafeOperationType.Call);
    });

    it('should generate transaction for owner method', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expect(result.functionName).toBe('registerAdminViaOwner');
      expect(result.transaction.to).toBe(VALID_ADDRESSES.deployer);
      expectValidCalldata(result.transaction.data);
    });

    it('should generate transaction for access-control method', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'access-control',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expect(result.functionName).toBe('registerAccessControlDefaultAdmin');
      expect(result.transaction.to).toBe(VALID_ADDRESSES.deployer);
      expectValidCalldata(result.transaction.data);
    });

    it('should generate different calldata for each method', async () => {
      const baseParams = {
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
      };

      const resultGetCCIPAdmin = await generator.generate(
        JSON.stringify({ ...baseParams, method: 'get-ccip-admin' }),
      );
      const resultOwner = await generator.generate(
        JSON.stringify({ ...baseParams, method: 'owner' }),
      );
      const resultAccessControl = await generator.generate(
        JSON.stringify({ ...baseParams, method: 'access-control' }),
      );

      // All should have different calldata due to different function selectors
      expect(resultGetCCIPAdmin.transaction.data).not.toBe(resultOwner.transaction.data);
      expect(resultOwner.transaction.data).not.toBe(resultAccessControl.transaction.data);
      expect(resultGetCCIPAdmin.transaction.data).not.toBe(resultAccessControl.transaction.data);
    });
  });

  describe('Address Handling', () => {
    it('should use module address as transaction target', async () => {
      const moduleAddress = VALID_ADDRESSES.pool;
      const inputJson = JSON.stringify({
        moduleAddress,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      const result = await generator.generate(inputJson);

      expect(result.transaction.to).toBe(moduleAddress);
    });

    it('should encode token address in calldata', async () => {
      const inputJson1 = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });
      const inputJson2 = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.pool,
        method: 'owner',
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

    it('should throw error for invalid module address', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: 'invalid-address',
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid token address', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: 'invalid-address',
        method: 'owner',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing module address', async () => {
      const inputJson = JSON.stringify({
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing token address', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        method: 'owner',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing method', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid method', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'invalid-method',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });
  });

  describe('Transaction Properties', () => {
    it('should set value to 0', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      const result = await generator.generate(inputJson);

      expect(result.transaction.value).toBe('0');
    });

    it('should set operation to Call', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      const result = await generator.generate(inputJson);

      expect(result.transaction.operation).toBe(SafeOperationType.Call);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle lowercase addresses', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer.toLowerCase(),
        tokenAddress: VALID_ADDRESSES.token.toLowerCase(),
        method: 'owner',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expectValidCalldata(result.transaction.data);
    });

    it('should handle checksummed addresses', async () => {
      const inputJson = JSON.stringify({
        moduleAddress: VALID_ADDRESSES.deployer,
        tokenAddress: VALID_ADDRESSES.token,
        method: 'owner',
      });

      const result = await generator.generate(inputJson);

      expectValidTransaction(result.transaction);
      expectValidCalldata(result.transaction.data);
    });
  });
});

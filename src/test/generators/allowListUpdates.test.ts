/**
 * Tests for allowListUpdates generator
 * Covers adding and removing addresses from pool allow lists
 */

import { createAllowListUpdatesGenerator } from '../../generators/allowListUpdates';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  VALID_ADDRESSES,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { TokenPool__factory } from '../../typechain';

describe('AllowListUpdatesGenerator', () => {
  let generator: ReturnType<typeof createAllowListUpdatesGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const tokenPoolInterface = TokenPool__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      TokenPool: tokenPoolInterface,
    });

    generator = createAllowListUpdatesGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('Add Addresses', () => {
    it('should generate transaction for adding single address', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
        removes: [],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.pool);
      expect(result.value).toBe('0');
      expectValidCalldata(result.data);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should generate transaction for adding multiple addresses', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver, VALID_ADDRESSES.token, VALID_ADDRESSES.deployer],
        removes: [],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle adding zero address', async () => {
      const inputJson = JSON.stringify({
        adds: ['0x0000000000000000000000000000000000000000'],
        removes: [],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
    });
  });

  describe('Remove Addresses', () => {
    it('should generate transaction for removing single address', async () => {
      const inputJson = JSON.stringify({
        adds: [],
        removes: [VALID_ADDRESSES.receiver],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should generate transaction for removing multiple addresses', async () => {
      const inputJson = JSON.stringify({
        adds: [],
        removes: [VALID_ADDRESSES.receiver, VALID_ADDRESSES.token],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('Add and Remove Together', () => {
    it('should generate transaction for adding and removing addresses', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
        removes: [VALID_ADDRESSES.token],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should generate transaction for multiple adds and removes', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver, VALID_ADDRESSES.deployer],
        removes: [VALID_ADDRESSES.token, VALID_ADDRESSES.safe],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(generator.generate('invalid json', VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for invalid pool address', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
        removes: [],
      });

      await expect(generator.generate(inputJson, 'invalid-address')).rejects.toThrow();
    });

    it('should throw error for invalid address in adds', async () => {
      const inputJson = JSON.stringify({
        adds: ['invalid-address'],
        removes: [],
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for invalid address in removes', async () => {
      const inputJson = JSON.stringify({
        adds: [],
        removes: ['invalid-address'],
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should use default empty arrays when fields are missing', async () => {
      const inputJson1 = JSON.stringify({
        removes: [VALID_ADDRESSES.receiver],
      });

      const inputJson2 = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
      });

      const result1 = await generator.generate(inputJson1, VALID_ADDRESSES.pool);
      const result2 = await generator.generate(inputJson2, VALID_ADDRESSES.pool);

      expectValidTransaction(result1);
      expectValidTransaction(result2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty add and remove arrays', async () => {
      const inputJson = JSON.stringify({
        adds: [],
        removes: [],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
    });

    it('should handle same address in both add and remove', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
        removes: [VALID_ADDRESSES.receiver],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
    });

    it('should handle duplicate addresses in addAddresses', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver, VALID_ADDRESSES.receiver],
        removes: [],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
    });

    it('should handle duplicate addresses in removeAddresses', async () => {
      const inputJson = JSON.stringify({
        adds: [],
        removes: [VALID_ADDRESSES.receiver, VALID_ADDRESSES.receiver],
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
    });

    it('should generate different calldata for different pool addresses', async () => {
      const inputJson = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
        removes: [],
      });

      const result1 = await generator.generate(inputJson, VALID_ADDRESSES.pool);
      const result2 = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result1.to).toBe(VALID_ADDRESSES.pool);
      expect(result2.to).toBe(VALID_ADDRESSES.token);
    });

    it('should generate different calldata for different operations', async () => {
      const inputJsonAdd = JSON.stringify({
        adds: [VALID_ADDRESSES.receiver],
        removes: [],
      });

      const inputJsonRemove = JSON.stringify({
        adds: [],
        removes: [VALID_ADDRESSES.receiver],
      });

      const resultAdd = await generator.generate(inputJsonAdd, VALID_ADDRESSES.pool);
      const resultRemove = await generator.generate(inputJsonRemove, VALID_ADDRESSES.pool);

      expect(resultAdd.data).not.toBe(resultRemove.data);
    });
  });
});

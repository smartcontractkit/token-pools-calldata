/**
 * Tests for tokenMint generator
 * Covers token minting functionality
 */

import { createTokenMintGenerator } from '../../generators/tokenMint';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  VALID_ADDRESSES,
  VALID_MINT_PARAMS,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { FactoryBurnMintERC20__factory } from '../../typechain';

describe('TokenMintGenerator', () => {
  let generator: ReturnType<typeof createTokenMintGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const tokenInterface = FactoryBurnMintERC20__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      BurnMintERC20: tokenInterface,
    });

    generator = createTokenMintGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('Valid Mint Operations', () => {
    it('should generate transaction for minting tokens', async () => {
      const inputJson = JSON.stringify(VALID_MINT_PARAMS);

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.token);
      expect(result.value).toBe('0');
      expectValidCalldata(result.data);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should handle small amounts', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '1',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle large amounts', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '999999999999999999999999999999',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle different receiver addresses', async () => {
      const inputJson1 = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '1000000000000000000000',
      });

      const inputJson2 = JSON.stringify({
        receiver: VALID_ADDRESSES.pool,
        amount: '1000000000000000000000',
      });

      const result1 = await generator.generate(inputJson1, VALID_ADDRESSES.token);
      const result2 = await generator.generate(inputJson2, VALID_ADDRESSES.token);

      expectValidTransaction(result1);
      expectValidTransaction(result2);
      expect(result1.data).not.toBe(result2.data);
    });

    it('should handle minting to zero address', async () => {
      const inputJson = JSON.stringify({
        receiver: '0x0000000000000000000000000000000000000000',
        amount: '1000000000000000000000',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(generator.generate('invalid json', VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for invalid token address', async () => {
      const inputJson = JSON.stringify(VALID_MINT_PARAMS);

      await expect(generator.generate(inputJson, 'invalid-address')).rejects.toThrow();
    });

    it('should throw error for invalid receiver address', async () => {
      const inputJson = JSON.stringify({
        receiver: 'invalid-address',
        amount: '1000000000000000000000',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for missing receiver field', async () => {
      const inputJson = JSON.stringify({
        amount: '1000000000000000000000',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for missing amount field', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for negative amount', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '-1000',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for non-numeric amount', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: 'not-a-number',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for empty amount string', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '0',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle amount with leading zeros', async () => {
      const inputJson = JSON.stringify({
        receiver: VALID_ADDRESSES.receiver,
        amount: '00001000',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle different token addresses', async () => {
      const inputJson = JSON.stringify(VALID_MINT_PARAMS);

      const result1 = await generator.generate(inputJson, VALID_ADDRESSES.token);
      const result2 = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result1);
      expectValidTransaction(result2);
      expect(result1.to).toBe(VALID_ADDRESSES.token);
      expect(result2.to).toBe(VALID_ADDRESSES.pool);
    });

    it('should generate same calldata for same inputs', async () => {
      const inputJson = JSON.stringify(VALID_MINT_PARAMS);

      const result1 = await generator.generate(inputJson, VALID_ADDRESSES.token);
      const result2 = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result1.data).toBe(result2.data);
    });
  });
});

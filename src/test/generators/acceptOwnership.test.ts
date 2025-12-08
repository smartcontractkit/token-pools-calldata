/**
 * Tests for acceptOwnership generator
 * Covers generating transactions to accept ownership of contracts
 */

import { createAcceptOwnershipGenerator } from '../../generators/acceptOwnership';
import { SafeOperationType } from '../../types/safe';
import { AcceptOwnershipError } from '../../errors';
import { VALID_ADDRESSES, expectValidTransaction } from '../helpers';
import { ILogger } from '../../interfaces';

describe('AcceptOwnershipGenerator', () => {
  let generator: ReturnType<typeof createAcceptOwnershipGenerator>;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    generator = createAcceptOwnershipGenerator(mockLogger);
  });

  describe('generate', () => {
    it('should generate accept ownership transaction for a pool address', async () => {
      const result = await generator.generate(VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.pool);
      expect(result.value).toBe('0');
      // acceptOwnership() has no parameters, calldata is just the function selector
      expect(result.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should generate accept ownership transaction for a token address', async () => {
      const result = await generator.generate(VALID_ADDRESSES.token);

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.token);
      expect(result.value).toBe('0');
      expect(result.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should generate correct function selector for acceptOwnership()', async () => {
      const result = await generator.generate(VALID_ADDRESSES.pool);

      // acceptOwnership() function selector is 0x79ba5097
      expect(result.data.slice(0, 10)).toBe('0x79ba5097');
    });

    it('should generate calldata with only function selector (no parameters)', async () => {
      const result = await generator.generate(VALID_ADDRESSES.pool);

      // acceptOwnership() has no parameters, so calldata should be exactly 10 chars (0x + 8 hex)
      expect(result.data).toBe('0x79ba5097');
    });

    it('should throw error for invalid address format', async () => {
      await expect(generator.generate('0xinvalid')).rejects.toThrow(AcceptOwnershipError);
      await expect(generator.generate('0xinvalid')).rejects.toThrow('Address validation failed');
    });

    it('should throw error for empty address', async () => {
      await expect(generator.generate('')).rejects.toThrow(AcceptOwnershipError);
    });

    it('should throw error for address that is too short', async () => {
      await expect(generator.generate('0x1234')).rejects.toThrow(AcceptOwnershipError);
    });

    it('should log info messages during generation', async () => {
      await generator.generate(VALID_ADDRESSES.pool);

      expect(mockLogger.info).toHaveBeenCalledWith('Generating accept ownership transaction', {
        contractAddress: VALID_ADDRESSES.pool,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully generated accept ownership transaction',
        expect.objectContaining({
          contractAddress: VALID_ADDRESSES.pool,
          functionSelector: '0x79ba5097',
        }),
      );
    });

    it('should work with any valid Ethereum address', async () => {
      const addresses = [
        VALID_ADDRESSES.pool,
        VALID_ADDRESSES.token,
        VALID_ADDRESSES.safe,
        VALID_ADDRESSES.receiver,
      ];

      for (const address of addresses) {
        const result = await generator.generate(address);
        expectValidTransaction(result);
        expect(result.to).toBe(address);
        expect(result.data).toBe('0x79ba5097');
      }
    });
  });
});

/**
 * Tests for rateLimiterConfig generator
 * Covers setting rate limiter configurations for token pools
 */

import { createRateLimiterConfigGenerator } from '../../generators/rateLimiterConfig';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  VALID_ADDRESSES,
  VALID_CHAIN_SELECTORS,
  VALID_RATE_LIMITER_CONFIG,
  DISABLED_RATE_LIMITER_CONFIG,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { TokenPool__factory } from '../../typechain';

describe('RateLimiterConfigGenerator', () => {
  let generator: ReturnType<typeof createRateLimiterConfigGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const tokenPoolInterface = TokenPool__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      TokenPool: tokenPoolInterface,
    });

    generator = createRateLimiterConfigGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('Valid Rate Limiter Configs', () => {
    it('should generate transaction for setting rate limiter config', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expect(result.to).toBe(VALID_ADDRESSES.pool);
      expect(result.value).toBe('0');
      expectValidCalldata(result.data);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should handle enabled rate limiters with custom values', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.baseSepolia,
        outboundConfig: {
          isEnabled: true,
          capacity: '5000000',
          rate: '500000',
        },
        inboundConfig: {
          isEnabled: true,
          capacity: '10000000',
          rate: '1000000',
        },
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle disabled rate limiters', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: DISABLED_RATE_LIMITER_CONFIG,
        inboundConfig: DISABLED_RATE_LIMITER_CONFIG,
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle mixed enabled/disabled rate limiters', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: DISABLED_RATE_LIMITER_CONFIG,
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle large capacity and rate values', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: {
          isEnabled: true,
          capacity: '999999999999999999999999',
          rate: '999999999999999999999999',
        },
        inboundConfig: {
          isEnabled: true,
          capacity: '999999999999999999999999',
          rate: '999999999999999999999999',
        },
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('Different Chain Selectors', () => {
    it('should handle different chain selectors', async () => {
      const inputJson1 = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      const inputJson2 = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.baseSepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      const result1 = await generator.generate(inputJson1, VALID_ADDRESSES.pool);
      const result2 = await generator.generate(inputJson2, VALID_ADDRESSES.pool);

      expectValidTransaction(result1);
      expectValidTransaction(result2);
      expect(result1.data).not.toBe(result2.data);
    });

    it('should handle multiple different chain selectors', async () => {
      const chainSelectors = [
        VALID_CHAIN_SELECTORS.sepolia,
        VALID_CHAIN_SELECTORS.baseSepolia,
        VALID_CHAIN_SELECTORS.ethereum,
      ];

      const results = await Promise.all(
        chainSelectors.map((selector) => {
          const inputJson = JSON.stringify({
            remoteChainSelector: selector,
            outboundConfig: VALID_RATE_LIMITER_CONFIG,
            inboundConfig: VALID_RATE_LIMITER_CONFIG,
          });
          return generator.generate(inputJson, VALID_ADDRESSES.pool);
        }),
      );

      results.forEach((result) => {
        expectValidTransaction(result);
        expectValidCalldata(result.data);
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(generator.generate('invalid json', VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for invalid pool address', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, 'invalid-address')).rejects.toThrow();
    });

    it('should throw error for missing remoteChainSelector', async () => {
      const inputJson = JSON.stringify({
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for missing outboundRateLimiterConfig', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for missing inboundRateLimiterConfig', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for invalid chain selector', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: 'not-a-number',
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for negative capacity', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: {
          isEnabled: true,
          capacity: '-1000',
          rate: '100',
        },
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for negative rate', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: {
          isEnabled: true,
          capacity: '1000',
          rate: '-100',
        },
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });

    it('should throw error for non-numeric capacity', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: {
          isEnabled: true,
          capacity: 'not-a-number',
          rate: '100',
        },
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.pool)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero capacity and rate when disabled', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: {
          isEnabled: false,
          capacity: '0',
          rate: '0',
        },
        inboundConfig: {
          isEnabled: false,
          capacity: '0',
          rate: '0',
        },
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should handle different pool addresses', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      const result1 = await generator.generate(inputJson, VALID_ADDRESSES.pool);
      const result2 = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result1.to).toBe(VALID_ADDRESSES.pool);
      expect(result2.to).toBe(VALID_ADDRESSES.token);
    });

    it('should generate same calldata for same inputs', async () => {
      const inputJson = JSON.stringify({
        remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
        outboundConfig: VALID_RATE_LIMITER_CONFIG,
        inboundConfig: VALID_RATE_LIMITER_CONFIG,
      });

      const result1 = await generator.generate(inputJson, VALID_ADDRESSES.pool);
      const result2 = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expect(result1.data).toBe(result2.data);
    });
  });
});

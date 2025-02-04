/**
 * Tests for chainUpdateCalldata generator
 * Covers EVM, SVM, MVM chain types and all edge cases
 */

import {
  createChainUpdateGenerator,
  convertToContractFormat,
} from '../../generators/chainUpdateCalldata';
import { ChainType, ChainUpdateInput } from '../../types/chainUpdate';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  BASE_EVM_CHAIN_UPDATE,
  BASE_SVM_CHAIN_UPDATE,
  VALID_CHAIN_SELECTORS,
  VALID_ADDRESSES,
  VALID_SOLANA_ADDRESSES,
  INVALID_ADDRESSES,
  VALID_RATE_LIMITER_CONFIG,
  DISABLED_RATE_LIMITER_CONFIG,
  expectValidTransaction,
  expectValidCalldata,
} from '../helpers';
import { TokenPool__factory } from '../../typechain';

describe('convertToContractFormat', () => {
  describe('EVM Chain Type', () => {
    it('should convert EVM chain update correctly', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.remoteChainSelector).toBe(BASE_EVM_CHAIN_UPDATE.remoteChainSelector);
      expect(result.remotePoolAddresses).toHaveLength(1);
      expect(result.remoteTokenAddress).toBeDefined();
      expect(result.remoteTokenAddress).toMatch(/^0x[a-f0-9]+$/);
    });

    it('should handle multiple pool addresses for EVM', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remotePoolAddresses: [VALID_ADDRESSES.pool, VALID_ADDRESSES.receiver],
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.remotePoolAddresses).toHaveLength(2);
      expect(result.remotePoolAddresses[0]).toMatch(/^0x[a-f0-9]+$/);
      expect(result.remotePoolAddresses[1]).toMatch(/^0x[a-f0-9]+$/);
    });

    it('should throw error for invalid EVM addresses', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remotePoolAddresses: [INVALID_ADDRESSES.tooShort],
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(
        /Failed to convert remote evm chain update/,
      );
    });

    it('should throw error for invalid EVM token address', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteTokenAddress: INVALID_ADDRESSES.notHex,
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(
        /Failed to convert remote evm chain update/,
      );
    });

    it('should handle rate limiter configs for EVM', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.outboundRateLimiterConfig).toEqual(VALID_RATE_LIMITER_CONFIG);
      expect(result.inboundRateLimiterConfig).toEqual(VALID_RATE_LIMITER_CONFIG);
    });
  });

  describe('SVM Chain Type', () => {
    it('should convert SVM chain update correctly', () => {
      const chainUpdate = {
        ...BASE_SVM_CHAIN_UPDATE,
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.remoteChainSelector).toBe(BASE_SVM_CHAIN_UPDATE.remoteChainSelector);
      expect(result.remotePoolAddresses).toHaveLength(1);
      expect(result.remoteTokenAddress).toBeDefined();

      const EVM_HEX_LENGTH = 42;
      expect(result.remoteTokenAddress.length).toBeGreaterThan(EVM_HEX_LENGTH);
    });

    it('should handle multiple pool addresses for SVM', () => {
      const chainUpdate = {
        ...BASE_SVM_CHAIN_UPDATE,
        remotePoolAddresses: [VALID_SOLANA_ADDRESSES.pool, VALID_SOLANA_ADDRESSES.tokenProgram],
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.remotePoolAddresses).toHaveLength(2);
    });

    it('should throw error for invalid Solana pool addresses', () => {
      const chainUpdate = {
        ...BASE_SVM_CHAIN_UPDATE,
        remotePoolAddresses: [INVALID_ADDRESSES.invalidSolana],
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(
        /Failed to convert remote svm chain update/,
      );
    });

    it('should throw error for invalid Solana token address', () => {
      const chainUpdate = {
        ...BASE_SVM_CHAIN_UPDATE,
        remoteTokenAddress: INVALID_ADDRESSES.invalidSolana,
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(
        /Failed to convert remote svm chain update/,
      );
    });

    it('should handle rate limiter configs for SVM', () => {
      const chainUpdate = {
        ...BASE_SVM_CHAIN_UPDATE,
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.outboundRateLimiterConfig).toEqual(VALID_RATE_LIMITER_CONFIG);
      expect(result.inboundRateLimiterConfig).toEqual(VALID_RATE_LIMITER_CONFIG);
    });
  });

  describe('MVM Chain Type', () => {
    it('should throw error for MVM (not implemented)', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteChainType: ChainType.MVM,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(
        /Move Virtual Machine Address validation not implemented/,
      );
    });
  });

  describe('Invalid Chain Type', () => {
    it('should throw error for invalid chain type', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteChainType: 'FakeVM' as ChainType,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(/Invalid ChainType provided/);
    });

    it('should throw error for undefined chain type', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteChainType: undefined,
      };

      // @ts-expect-error Testing invalid input
      expect(() => convertToContractFormat(chainUpdate)).toThrow(/Invalid ChainType provided/);
    });

    it('should throw error for null chain type', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        remoteChainType: null,
      };

      // @ts-expect-error Testing invalid input
      expect(() => convertToContractFormat(chainUpdate)).toThrow(/Invalid ChainType provided/);
    });
  });

  describe('Rate Limiter Edge Cases', () => {
    it('should handle disabled rate limiters', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        outboundRateLimiterConfig: DISABLED_RATE_LIMITER_CONFIG,
        inboundRateLimiterConfig: DISABLED_RATE_LIMITER_CONFIG,
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.outboundRateLimiterConfig.isEnabled).toBe(false);
      expect(result.inboundRateLimiterConfig.isEnabled).toBe(false);
    });

    it('should handle mixed rate limiter states', () => {
      const chainUpdate = {
        ...BASE_EVM_CHAIN_UPDATE,
        outboundRateLimiterConfig: VALID_RATE_LIMITER_CONFIG,
        inboundRateLimiterConfig: DISABLED_RATE_LIMITER_CONFIG,
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.outboundRateLimiterConfig.isEnabled).toBe(true);
      expect(result.inboundRateLimiterConfig.isEnabled).toBe(false);
    });
  });
});

describe('ChainUpdateGenerator', () => {
  let generator: ReturnType<typeof createChainUpdateGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const tokenPoolInterface = TokenPool__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      TokenPool: tokenPoolInterface,
    });

    generator = createChainUpdateGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('EVM Chain Updates', () => {
    it('should generate transaction for adding EVM chain', async () => {
      const inputJson = JSON.stringify([
        [], // Chain selectors to remove
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remoteChainType: ChainType.EVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expect(result.to).toBe('');
      expect(result.value).toBe('0');
      expectValidCalldata(result.data);
      expect(result.operation).toBe(SafeOperationType.Call);
    });

    it('should generate transaction for multiple EVM chains', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
            remoteChainType: ChainType.EVM,
          },
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remoteChainSelector: VALID_CHAIN_SELECTORS.baseSepolia,
            remoteChainType: ChainType.EVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should generate transaction for removing chains', async () => {
      const inputJson = JSON.stringify([
        [VALID_CHAIN_SELECTORS.sepolia, VALID_CHAIN_SELECTORS.baseSepolia],
        [],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should generate transaction for adding and removing chains', async () => {
      const inputJson = JSON.stringify([
        [VALID_CHAIN_SELECTORS.sepolia],
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remoteChainSelector: VALID_CHAIN_SELECTORS.baseSepolia,
            remoteChainType: ChainType.EVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('SVM Chain Updates', () => {
    it('should generate transaction for adding SVM chain', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            ...BASE_SVM_CHAIN_UPDATE,
            remoteChainType: ChainType.SVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });

    it('should generate transaction for mixed EVM and SVM chains', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
            remoteChainType: ChainType.EVM,
          },
          {
            ...BASE_SVM_CHAIN_UPDATE,
            remoteChainSelector: '9999999999999999999',
            remoteChainType: ChainType.SVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(generator.generate('invalid json')).rejects.toThrow();
    });

    it('should throw error for malformed input structure', async () => {
      const inputJson = JSON.stringify({
        wrong: 'structure',
      });

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for invalid chain selector', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remoteChainSelector: 'not-a-number',
            remoteChainType: ChainType.EVM,
          },
        ],
      ]);

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should throw error for missing required fields', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
            // Missing other required fields
          },
        ],
      ]);

      await expect(generator.generate(inputJson)).rejects.toThrow();
    });

    it('should allow empty pool addresses array', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            remotePoolAddresses: [],
            remoteChainType: ChainType.EVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);
      expectValidTransaction(result);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chain updates', async () => {
      const inputJson = JSON.stringify([[], []]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
    });

    it('should handle large capacity values', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            ...BASE_EVM_CHAIN_UPDATE,
            outboundRateLimiterConfig: {
              isEnabled: true,
              capacity: '999999999999999999999999',
              rate: '999999999999999999999999',
            },
            remoteChainType: ChainType.EVM,
          },
        ],
      ]);

      const result = await generator.generate(inputJson);

      expectValidTransaction(result);
      expectValidCalldata(result.data);
    });
  });
});

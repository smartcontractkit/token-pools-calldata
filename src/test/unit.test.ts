import {
  convertToContractFormat,
  generateChainUpdateTransaction,
  ChainUpdateError,
} from '../generators/chainUpdateCalldata';
import { SafeOperationType } from '../types/safe';
import { ChainType, ChainUpdateInput } from '../types/chainUpdate';

describe('convertToContractFormat', () => {
  const baseChainUpdateStub: Partial<ChainUpdateInput> = {
    remoteChainSelector: '12532609583862916517',
    remotePoolAddresses: ['0x779877A7B0D9E8603169DdbD7836e478b4624789'],
    remoteTokenAddress: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
    outboundRateLimiterConfig: {
      isEnabled: true,
      capacity: '1000000',
      rate: '100000',
    },
    inboundRateLimiterConfig: {
      isEnabled: true,
      capacity: '1000000',
      rate: '100000',
    },
  };

  describe('Explicity EVM Chain Type', () => {
    it('should handle ChainType.EVM correctly', () => {
      const chainUpdate = {
        ...baseChainUpdateStub,
        remoteChainType: ChainType.EVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.remoteChainSelector).toBe('12532609583862916517');
      expect(result.remotePoolAddresses).toHaveLength(1);
      expect(result.remoteTokenAddress).toBeDefined();
      // Should encode as address type for EVM
      expect(result.remoteTokenAddress).toMatch(/^0x[a-f0-9]+$/);
    });
  });

  describe('SVM Chain Type', () => {
    it('should handle ChainType.SVM correctly', () => {
      const chainUpdate = {
        ...baseChainUpdateStub,
        remotePoolAddresses: ['11111111111111111111111111111112'], // Valid Solana address
        remoteTokenAddress: 'So11111111111111111111111111111111111111112', // Valid Solana token
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      const result = convertToContractFormat(chainUpdate);

      expect(result.remoteChainSelector).toBe('12532609583862916517');
      expect(result.remotePoolAddresses).toHaveLength(1);
      expect(result.remoteTokenAddress).toBeDefined();
      // Should encode as bytes32 for SVM (longer than EVM addresses)
      expect(result.remoteTokenAddress.length).toBeGreaterThan(42); // Longer than EVM address
    });

    it('should throw error for invalid Solana addresses', () => {
      const chainUpdate = {
        ...baseChainUpdateStub,
        remotePoolAddresses: ['invalid-solana-address'],
        remoteChainType: ChainType.SVM,
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(ChainUpdateError);
    });
  });

  describe('MVM Chain Type', () => {
    it('should throw error for ChainType.MVM (not implemented)', () => {
      const chainUpdate = {
        ...baseChainUpdateStub,
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
        ...baseChainUpdateStub,
        remoteChainType: 'fakeVM' as ChainType, // Forced casting to ChainType
      } as ChainUpdateInput;

      expect(() => convertToContractFormat(chainUpdate)).toThrow(/Invalid ChainType provided/);
    });

    it('should throw error for undefined ChainType', () => {
      const chainUpdate = {
        ...baseChainUpdateStub,
        remoteChainType: undefined,
      };

      // @ts-expect-error test when undefined as ChainType. Undefined will not satisfy arg of ChainUpdateInput type.
      expect(() => convertToContractFormat(chainUpdate)).toThrow(/Invalid ChainType provided/);
    });
  });
});
describe('generateChainUpdateTransaction', () => {
  describe('EVM Chain Type', () => {
    it('should generate transaction for EVM chain updates', async () => {
      const inputJson = JSON.stringify([
        [],
        [
          {
            remoteChainSelector: '12532609583862916517',
            remotePoolAddresses: [
              '0x779877A7B0D9E8603169DdbD7836e478b4624789',
              '0x1234567890123456789012345678901234567890',
            ],
            remoteTokenAddress: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
            outboundRateLimiterConfig: {
              isEnabled: true,
              capacity: '1000000',
              rate: '100000',
            },
            inboundRateLimiterConfig: {
              isEnabled: true,
              capacity: '1000000',
              rate: '100000',
            },
            remoteChainType: 'evm',
          },
        ],
      ]);

      const result = await generateChainUpdateTransaction(inputJson);

      expect(result).toHaveProperty('to', '');
      expect(result).toHaveProperty('value', '0');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('operation', SafeOperationType.Call);
      expect(result.data).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(result.data.length).toBeGreaterThan(10);
    });
  });
});

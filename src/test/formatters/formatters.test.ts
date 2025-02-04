/**
 * Tests for all formatter modules
 * Covers formatting transaction results into Safe JSON format
 */

import { createMintFormatter } from '../../formatters/mintFormatter';
import { createAllowListFormatter } from '../../formatters/allowListFormatter';
import { createRoleManagementFormatter } from '../../formatters/roleManagementFormatter';
import { createTokenDeploymentFormatter } from '../../formatters/tokenDeploymentFormatter';
import { createPoolDeploymentFormatter } from '../../formatters/poolDeploymentFormatter';
import { createChainUpdateFormatter } from '../../formatters/chainUpdateFormatter';
import { createRateLimiterFormatter } from '../../formatters/rateLimiterFormatter';
import { createMockInterfaceProvider } from '../helpers';
import {
  TokenPool__factory,
  TokenPoolFactory__factory,
  FactoryBurnMintERC20__factory,
} from '../../typechain';
import { SafeOperationType } from '../../types/safe';

describe('Formatters', () => {
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  const mockTransaction = {
    to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    value: '0',
    data: '0x1234',
    operation: SafeOperationType.Call,
  };

  const mockBasicMetadata = {
    chainId: '11155111',
    safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
    ownerAddress: '0x0000000000000000000000000000000000000000',
  };

  const mockMintMetadata = {
    ...mockBasicMetadata,
    tokenAddress: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
  };

  const mockPoolAddressMetadata = {
    ...mockBasicMetadata,
    tokenPoolAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  };

  const mockRoleMetadata = {
    ...mockBasicMetadata,
    tokenAddress: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
  };

  beforeEach(() => {
    mockInterfaceProvider = createMockInterfaceProvider({
      TokenPool: TokenPool__factory.createInterface(),
      TokenPoolFactory: TokenPoolFactory__factory.createInterface(),
      BurnMintERC20: FactoryBurnMintERC20__factory.createInterface(),
    });
  });

  describe('MintFormatter', () => {
    let formatter: ReturnType<typeof createMintFormatter>;

    beforeEach(() => {
      formatter = createMintFormatter(mockInterfaceProvider);
    });

    it('should format mint transaction correctly', () => {
      const params = {
        receiver: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result).toMatchObject({
        chainId: mockMintMetadata.chainId,
        meta: {
          name: 'Mint Tokens',
          createdFromSafeAddress: mockMintMetadata.safeAddress,
          createdFromOwnerAddress: mockMintMetadata.ownerAddress,
        },
      });
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]?.contractMethod?.name).toBe('mint');
    });

    it('should include amount and receiver in description', () => {
      const params = {
        receiver: '0x1234567890123456789012345678901234567890',
        amount: '5000000000000000000',
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.meta.description).toContain(params.amount);
      expect(result.meta.description).toContain(params.receiver);
    });

    it('should handle different amounts', () => {
      const params1 = { receiver: '0x1234567890123456789012345678901234567890', amount: '1' };
      const params2 = {
        receiver: '0x1234567890123456789012345678901234567890',
        amount: '999999999999999999999999',
      };

      const result1 = formatter.format(mockTransaction, params1, mockMintMetadata);
      const result2 = formatter.format(mockTransaction, params2, mockMintMetadata);

      expect(result1.meta.description).toContain('1');
      expect(result2.meta.description).toContain('999999999999999999999999');
    });

    it('should use correct contract interface', () => {
      const params = {
        receiver: '0x1234567890123456789012345678901234567890',
        amount: '1000',
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.transactions[0]?.contractMethod).toBeDefined();
      expect(result.transactions[0]?.contractMethod?.name).toBe('mint');
    });
  });

  describe('AllowListFormatter', () => {
    let formatter: ReturnType<typeof createAllowListFormatter>;

    beforeEach(() => {
      formatter = createAllowListFormatter(mockInterfaceProvider);
    });

    it('should format allow list transaction with adds and removes', () => {
      const input = {
        adds: ['0x1234567890123456789012345678901234567890'],
        removes: ['0x0987654321098765432109876543210987654321'],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.name).toBe('Update Token Pool Allow List');
      expect(result.meta.description).toContain('remove 1 address');
      expect(result.meta.description).toContain('add 1 address');
    });

    it('should format description for only adds', () => {
      const input = {
        adds: [
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321',
        ],
        removes: [],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('add 2 addresses');
      expect(result.meta.description).not.toContain('remove');
    });

    it('should format description for only removes', () => {
      const input = {
        adds: [],
        removes: ['0x1234567890123456789012345678901234567890'],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toBe('Update allow list for token pool: remove 1 address');
      expect(result.meta.description).not.toMatch(/\badd\b/); // Match 'add' as whole word
    });

    it('should format description for no changes', () => {
      const input = {
        adds: [],
        removes: [],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('no changes');
    });

    it('should use singular form for single address', () => {
      const input = {
        adds: ['0x1234567890123456789012345678901234567890'],
        removes: [],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('add 1 address');
      expect(result.meta.description).not.toContain('addresses');
    });

    it('should use plural form for multiple addresses', () => {
      const input = {
        adds: [
          '0x1234567890123456789012345678901234567890',
          '0x0987654321098765432109876543210987654321',
        ],
        removes: [
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        ],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('remove 2 addresses');
      expect(result.meta.description).toContain('add 2 addresses');
    });

    it('should use correct contract interface and function name', () => {
      const input = {
        adds: ['0x1234567890123456789012345678901234567890'],
        removes: [],
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.transactions[0]?.contractMethod?.name).toBe('applyAllowListUpdates');
    });
  });

  describe('RoleManagementFormatter', () => {
    let formatter: ReturnType<typeof createRoleManagementFormatter>;

    beforeEach(() => {
      formatter = createRoleManagementFormatter(mockInterfaceProvider);
    });

    it('should format grant mint role transaction', () => {
      const transactionResult = {
        transactions: [mockTransaction],
        functionNames: ['grantMintRole' as const],
      };

      const params = {
        pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        roleType: 'mint' as const,
        action: 'grant' as const,
      };

      const result = formatter.format(transactionResult, params, mockRoleMetadata);

      expect(result.meta.name).toBe('Grant Token Pool Roles');
      expect(result.meta.description).toContain('Grant mint role');
      expect(result.meta.description).toContain('to pool');
    });

    it('should format revoke burn role transaction', () => {
      const transactionResult = {
        transactions: [mockTransaction],
        functionNames: ['revokeBurnRole' as const],
      };

      const params = {
        pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        roleType: 'burn' as const,
        action: 'revoke' as const,
      };

      const result = formatter.format(transactionResult, params, mockRoleMetadata);

      expect(result.meta.name).toBe('Revoke Token Pool Roles');
      expect(result.meta.description).toContain('Revoke burn role');
      expect(result.meta.description).toContain('from pool');
    });

    it('should format grant both roles transaction', () => {
      const transactionResult = {
        transactions: [mockTransaction],
        functionNames: ['grantMintAndBurnRoles' as const],
      };

      const params = {
        pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        roleType: 'both' as const,
        action: 'grant' as const,
      };

      const result = formatter.format(transactionResult, params, mockRoleMetadata);

      expect(result.meta.description).toContain('Grant mint and burn roles');
      expect(result.meta.description).toContain('to pool');
    });

    it('should format revoke both roles transaction', () => {
      const transactionResult = {
        transactions: [mockTransaction, mockTransaction],
        functionNames: ['revokeMintRole' as const, 'revokeBurnRole' as const],
      };

      const params = {
        pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        roleType: 'both' as const,
        action: 'revoke' as const,
      };

      const result = formatter.format(transactionResult, params, mockRoleMetadata);

      expect(result.meta.description).toContain('Revoke mint and burn roles');
      expect(result.meta.description).toContain('from pool');
      expect(result.transactions).toHaveLength(2);
    });

    it('should include pool address in description', () => {
      const transactionResult = {
        transactions: [mockTransaction],
        functionNames: ['grantMintRole' as const],
      };

      const params = {
        pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        roleType: 'mint' as const,
        action: 'grant' as const,
      };

      const result = formatter.format(transactionResult, params, mockRoleMetadata);

      expect(result.meta.description).toContain(params.pool);
    });
  });

  describe('TokenDeploymentFormatter', () => {
    let formatter: ReturnType<typeof createTokenDeploymentFormatter>;

    beforeEach(() => {
      formatter = createTokenDeploymentFormatter(mockInterfaceProvider);
    });

    it('should format token deployment transaction', () => {
      const params = {
        name: 'Test Token',
        symbol: 'TST',
        decimals: 18,
        maxSupply: '1000000',
        preMint: '0',
        remoteTokenPools: [],
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.meta.name).toContain('Test Token');
      expect(result.meta.description).toContain('Test Token');
      expect(result.meta.description).toContain('TST');
    });

    it('should include token name in title', () => {
      const params = {
        name: 'My Custom Token',
        symbol: 'MCT',
        decimals: 6,
        maxSupply: '1000000',
        preMint: '0',
        remoteTokenPools: [],
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.meta.name).toBe('Token and Pool Factory Deployment - My Custom Token');
    });

    it('should use correct contract interface', () => {
      const params = {
        name: 'Test Token',
        symbol: 'TST',
        decimals: 18,
        maxSupply: '1000000',
        preMint: '0',
        remoteTokenPools: [],
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.transactions[0]?.contractMethod?.name).toBe('deployTokenAndTokenPool');
    });
  });

  describe('PoolDeploymentFormatter', () => {
    let formatter: ReturnType<typeof createPoolDeploymentFormatter>;

    beforeEach(() => {
      formatter = createPoolDeploymentFormatter(mockInterfaceProvider);
    });

    it('should format BurnMintTokenPool deployment', () => {
      const params = {
        token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
        decimals: 18,
        poolType: 'BurnMintTokenPool' as const,
        remoteTokenPools: [],
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.meta.name).toContain('BurnMintTokenPool');
      expect(result.meta.description).toContain('BurnMintTokenPool');
      expect(result.meta.description).toContain(params.token);
    });

    it('should format LockReleaseTokenPool deployment', () => {
      const params = {
        token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
        decimals: 18,
        poolType: 'LockReleaseTokenPool' as const,
        remoteTokenPools: [],
        acceptLiquidity: true,
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.meta.name).toContain('LockReleaseTokenPool');
      expect(result.meta.description).toContain('LockReleaseTokenPool');
    });

    it('should use correct contract interface', () => {
      const params = {
        token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
        decimals: 18,
        poolType: 'BurnMintTokenPool' as const,
        remoteTokenPools: [],
      };

      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      expect(result.transactions[0]?.contractMethod?.name).toBe('deployTokenPoolWithExistingToken');
    });
  });

  describe('ChainUpdateFormatter', () => {
    let formatter: ReturnType<typeof createChainUpdateFormatter>;

    beforeEach(() => {
      formatter = createChainUpdateFormatter(mockInterfaceProvider);
    });

    it('should format chain update transaction', () => {
      const result = formatter.format(mockTransaction, mockPoolAddressMetadata);

      expect(result.meta.name).toBe('Token Pool Chain Updates');
      expect(result.meta.description).toBe('Apply chain updates to the Token Pool contract');
    });

    it('should set transaction to address to token pool address', () => {
      const result = formatter.format(mockTransaction, mockPoolAddressMetadata);

      expect(result.transactions[0]?.to).toBe(mockPoolAddressMetadata.tokenPoolAddress);
    });

    it('should preserve original transaction data except to address', () => {
      const result = formatter.format(mockTransaction, mockPoolAddressMetadata);

      expect(result.transactions[0]?.value).toBe(mockTransaction.value);
      expect(result.transactions[0]?.data).toBe(mockTransaction.data);
      expect(result.transactions[0]?.operation).toBe(mockTransaction.operation);
    });

    it('should use correct contract interface', () => {
      const result = formatter.format(mockTransaction, mockPoolAddressMetadata);

      expect(result.transactions[0]?.contractMethod?.name).toBe('applyChainUpdates');
    });
  });

  describe('RateLimiterFormatter', () => {
    let formatter: ReturnType<typeof createRateLimiterFormatter>;

    beforeEach(() => {
      formatter = createRateLimiterFormatter(mockInterfaceProvider);
    });

    it('should format rate limiter config with both enabled', () => {
      const input = {
        remoteChainSelector: '16015286601757825753',
        outboundConfig: { isEnabled: true, capacity: '1000', rate: '100' },
        inboundConfig: { isEnabled: true, capacity: '2000', rate: '200' },
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.name).toBe('Update Chain Rate Limiter Configuration');
      expect(result.meta.description).toContain('chain 16015286601757825753');
      expect(result.meta.description).toContain('outbound enabled');
      expect(result.meta.description).toContain('inbound enabled');
    });

    it('should format rate limiter config with both disabled', () => {
      const input = {
        remoteChainSelector: '16015286601757825753',
        outboundConfig: { isEnabled: false, capacity: '0', rate: '0' },
        inboundConfig: { isEnabled: false, capacity: '0', rate: '0' },
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('outbound disabled');
      expect(result.meta.description).toContain('inbound disabled');
    });

    it('should format rate limiter config with mixed states', () => {
      const input = {
        remoteChainSelector: '16015286601757825753',
        outboundConfig: { isEnabled: true, capacity: '1000', rate: '100' },
        inboundConfig: { isEnabled: false, capacity: '0', rate: '0' },
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('outbound enabled');
      expect(result.meta.description).toContain('inbound disabled');
    });

    it('should include chain selector in description', () => {
      const input = {
        remoteChainSelector: '5009297550715157269',
        outboundConfig: { isEnabled: true, capacity: '1000', rate: '100' },
        inboundConfig: { isEnabled: true, capacity: '2000', rate: '200' },
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.meta.description).toContain('5009297550715157269');
    });

    it('should use correct contract interface', () => {
      const input = {
        remoteChainSelector: '16015286601757825753',
        outboundConfig: { isEnabled: true, capacity: '1000', rate: '100' },
        inboundConfig: { isEnabled: true, capacity: '2000', rate: '200' },
      };

      const result = formatter.format(mockTransaction, input, mockPoolAddressMetadata);

      expect(result.transactions[0]?.contractMethod?.name).toBe('setChainRateLimiterConfig');
    });
  });

  describe('Common Formatter Behavior', () => {
    it('all formatters should include chain ID', () => {
      const mintFormatter = createMintFormatter(mockInterfaceProvider);
      const allowListFormatter = createAllowListFormatter(mockInterfaceProvider);
      const tokenDeploymentFormatter = createTokenDeploymentFormatter(mockInterfaceProvider);
      const poolDeploymentFormatter = createPoolDeploymentFormatter(mockInterfaceProvider);
      const rateLimiterFormatter = createRateLimiterFormatter(mockInterfaceProvider);

      const mintResult = mintFormatter.format(
        mockTransaction,
        { receiver: '0x1234567890123456789012345678901234567890', amount: '1' },
        mockMintMetadata,
      );
      const allowListResult = allowListFormatter.format(
        mockTransaction,
        { adds: [], removes: [] },
        mockPoolAddressMetadata,
      );
      const tokenResult = tokenDeploymentFormatter.format(
        mockTransaction,
        {
          name: 'T',
          symbol: 'T',
          decimals: 18,
          maxSupply: '1',
          preMint: '0',
          remoteTokenPools: [],
        },
        mockBasicMetadata,
      );
      const poolResult = poolDeploymentFormatter.format(
        mockTransaction,
        {
          token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
          decimals: 18,
          poolType: 'BurnMintTokenPool',
          remoteTokenPools: [],
        },
        mockBasicMetadata,
      );
      const rateLimiterResult = rateLimiterFormatter.format(
        mockTransaction,
        {
          remoteChainSelector: '1',
          outboundConfig: { isEnabled: true, capacity: '1', rate: '1' },
          inboundConfig: { isEnabled: true, capacity: '1', rate: '1' },
        },
        mockPoolAddressMetadata,
      );

      [mintResult, allowListResult, tokenResult, poolResult, rateLimiterResult].forEach(
        (result) => {
          expect(result.chainId).toBe(mockBasicMetadata.chainId);
        },
      );
    });

    it('all formatters should include safe address in metadata', () => {
      const mintFormatter = createMintFormatter(mockInterfaceProvider);
      const allowListFormatter = createAllowListFormatter(mockInterfaceProvider);
      const tokenDeploymentFormatter = createTokenDeploymentFormatter(mockInterfaceProvider);
      const poolDeploymentFormatter = createPoolDeploymentFormatter(mockInterfaceProvider);
      const rateLimiterFormatter = createRateLimiterFormatter(mockInterfaceProvider);

      const mintResult = mintFormatter.format(
        mockTransaction,
        { receiver: '0x1234567890123456789012345678901234567890', amount: '1' },
        mockMintMetadata,
      );
      const allowListResult = allowListFormatter.format(
        mockTransaction,
        { adds: [], removes: [] },
        mockPoolAddressMetadata,
      );
      const tokenResult = tokenDeploymentFormatter.format(
        mockTransaction,
        {
          name: 'T',
          symbol: 'T',
          decimals: 18,
          maxSupply: '1',
          preMint: '0',
          remoteTokenPools: [],
        },
        mockBasicMetadata,
      );
      const poolResult = poolDeploymentFormatter.format(
        mockTransaction,
        {
          token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
          decimals: 18,
          poolType: 'BurnMintTokenPool',
          remoteTokenPools: [],
        },
        mockBasicMetadata,
      );
      const rateLimiterResult = rateLimiterFormatter.format(
        mockTransaction,
        {
          remoteChainSelector: '1',
          outboundConfig: { isEnabled: true, capacity: '1', rate: '1' },
          inboundConfig: { isEnabled: true, capacity: '1', rate: '1' },
        },
        mockPoolAddressMetadata,
      );

      [mintResult, allowListResult, tokenResult, poolResult, rateLimiterResult].forEach(
        (result) => {
          expect(result.meta.createdFromSafeAddress).toBe(mockBasicMetadata.safeAddress);
        },
      );
    });

    it('all formatters should include timestamp', () => {
      const beforeTime = Date.now();

      const formatter = createMintFormatter(mockInterfaceProvider);
      const params = {
        receiver: '0x1234567890123456789012345678901234567890',
        amount: '1000',
      };
      const result = formatter.format(mockTransaction, params, mockMintMetadata);

      const afterTime = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.createdAt).toBeLessThanOrEqual(afterTime);
    });

    it('all formatters should return valid Safe JSON structure', () => {
      const mintFormatter = createMintFormatter(mockInterfaceProvider);
      const allowListFormatter = createAllowListFormatter(mockInterfaceProvider);
      const tokenDeploymentFormatter = createTokenDeploymentFormatter(mockInterfaceProvider);
      const poolDeploymentFormatter = createPoolDeploymentFormatter(mockInterfaceProvider);
      const rateLimiterFormatter = createRateLimiterFormatter(mockInterfaceProvider);

      const mintResult = mintFormatter.format(
        mockTransaction,
        { receiver: '0x1234567890123456789012345678901234567890', amount: '1' },
        mockMintMetadata,
      );
      const allowListResult = allowListFormatter.format(
        mockTransaction,
        { adds: [], removes: [] },
        mockPoolAddressMetadata,
      );
      const tokenResult = tokenDeploymentFormatter.format(
        mockTransaction,
        {
          name: 'T',
          symbol: 'T',
          decimals: 18,
          maxSupply: '1',
          preMint: '0',
          remoteTokenPools: [],
        },
        mockBasicMetadata,
      );
      const poolResult = poolDeploymentFormatter.format(
        mockTransaction,
        {
          token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
          decimals: 18,
          poolType: 'BurnMintTokenPool',
          remoteTokenPools: [],
        },
        mockBasicMetadata,
      );
      const rateLimiterResult = rateLimiterFormatter.format(
        mockTransaction,
        {
          remoteChainSelector: '1',
          outboundConfig: { isEnabled: true, capacity: '1', rate: '1' },
          inboundConfig: { isEnabled: true, capacity: '1', rate: '1' },
        },
        mockPoolAddressMetadata,
      );

      [mintResult, allowListResult, tokenResult, poolResult, rateLimiterResult].forEach(
        (result) => {
          expect(result).toHaveProperty('version');
          expect(result).toHaveProperty('chainId');
          expect(result).toHaveProperty('createdAt');
          expect(result).toHaveProperty('meta');
          expect(result).toHaveProperty('transactions');
          expect(Array.isArray(result.transactions)).toBe(true);
        },
      );
    });
  });
});

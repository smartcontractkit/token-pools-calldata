/**
 * Tests for TransactionService
 * Covers transaction generation and formatting coordination
 */

import { TransactionService, createTransactionService } from '../../services/TransactionService';
import { SafeOperationType } from '../../types/safe';
import type { ChainUpdateGenerator } from '../../generators/chainUpdateCalldata';
import type { TokenDeploymentGenerator } from '../../generators/tokenDeployment';
import type { PoolDeploymentGenerator } from '../../generators/poolDeployment';
import type { TokenMintGenerator } from '../../generators/tokenMint';
import type { RoleManagementGenerator } from '../../generators/roleManagement';
import type { AllowListUpdatesGenerator } from '../../generators/allowListUpdates';
import type { RateLimiterConfigGenerator } from '../../generators/rateLimiterConfig';
import type { ChainUpdateFormatter } from '../../formatters/chainUpdateFormatter';
import type { TokenDeploymentFormatter } from '../../formatters/tokenDeploymentFormatter';
import type { PoolDeploymentFormatter } from '../../formatters/poolDeploymentFormatter';
import type { MintFormatter } from '../../formatters/mintFormatter';
import type { RoleManagementFormatter } from '../../formatters/roleManagementFormatter';
import type { AllowListFormatter } from '../../formatters/allowListFormatter';
import type { RateLimiterFormatter } from '../../formatters/rateLimiterFormatter';
import type { AcceptOwnershipGenerator } from '../../generators/acceptOwnership';
import type { AcceptOwnershipFormatter } from '../../formatters/acceptOwnershipFormatter';
import type { RegisterAdminGenerator } from '../../generators/registerAdmin';
import type { RegisterAdminFormatter } from '../../formatters/registerAdminFormatter';
import type { TokenAdminRegistryGenerator } from '../../generators/tokenAdminRegistry';
import type { TokenAdminRegistryFormatter } from '../../formatters/tokenAdminRegistryFormatter';

describe('TransactionService', () => {
  let service: TransactionService;

  // Mock generators - properly typed
  const mockChainUpdateGenerator: jest.Mocked<ChainUpdateGenerator> = {
    generate: jest.fn(),
  };

  const mockTokenDeploymentGenerator: jest.Mocked<TokenDeploymentGenerator> = {
    generate: jest.fn(),
  };

  const mockPoolDeploymentGenerator: jest.Mocked<PoolDeploymentGenerator> = {
    generate: jest.fn(),
  };

  const mockTokenMintGenerator: jest.Mocked<TokenMintGenerator> = {
    generate: jest.fn(),
  };

  const mockRoleManagementGenerator: jest.Mocked<RoleManagementGenerator> = {
    generate: jest.fn(),
  };

  const mockAllowListUpdatesGenerator: jest.Mocked<AllowListUpdatesGenerator> = {
    generate: jest.fn(),
  };

  const mockRateLimiterConfigGenerator: jest.Mocked<RateLimiterConfigGenerator> = {
    generate: jest.fn(),
  };

  // Mock formatters - properly typed
  const mockChainUpdateFormatter: jest.Mocked<ChainUpdateFormatter> = {
    format: jest.fn(),
  };

  const mockTokenDeploymentFormatter: jest.Mocked<TokenDeploymentFormatter> = {
    format: jest.fn(),
  };

  const mockPoolDeploymentFormatter: jest.Mocked<PoolDeploymentFormatter> = {
    format: jest.fn(),
  };

  const mockMintFormatter: jest.Mocked<MintFormatter> = {
    format: jest.fn(),
  };

  const mockRoleManagementFormatter: jest.Mocked<RoleManagementFormatter> = {
    format: jest.fn(),
  };

  const mockAllowListFormatter: jest.Mocked<AllowListFormatter> = {
    format: jest.fn(),
  };

  const mockRateLimiterFormatter: jest.Mocked<RateLimiterFormatter> = {
    format: jest.fn(),
  };

  const mockAcceptOwnershipGenerator: jest.Mocked<AcceptOwnershipGenerator> = {
    generate: jest.fn(),
  };

  const mockAcceptOwnershipFormatter: jest.Mocked<AcceptOwnershipFormatter> = {
    format: jest.fn(),
  };

  const mockRegisterAdminGenerator: jest.Mocked<RegisterAdminGenerator> = {
    generate: jest.fn(),
  };

  const mockRegisterAdminFormatter: jest.Mocked<RegisterAdminFormatter> = {
    format: jest.fn(),
  };

  const mockTokenAdminRegistryGenerator: jest.Mocked<TokenAdminRegistryGenerator> = {
    generate: jest.fn(),
  };

  const mockTokenAdminRegistryFormatter: jest.Mocked<TokenAdminRegistryFormatter> = {
    format: jest.fn(),
  };

  const mockTransaction = {
    to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    value: '0',
    data: '0x1234',
    operation: SafeOperationType.Call,
    contractMethod: {
      inputs: [],
      name: 'testMethod',
      payable: false,
    },
    contractInputsValues: null,
  };

  const mockSafeJson = {
    version: '1.0',
    chainId: '11155111',
    createdAt: Date.now(),
    meta: {
      name: 'Test',
      description: 'Test transaction',
      txBuilderVersion: '1.16.0',
      createdFromSafeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
      createdFromOwnerAddress: '0x0000000000000000000000000000000000000000',
    },
    transactions: [mockTransaction],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = createTransactionService({
      chainUpdateGenerator: mockChainUpdateGenerator,
      tokenDeploymentGenerator: mockTokenDeploymentGenerator,
      poolDeploymentGenerator: mockPoolDeploymentGenerator,
      tokenMintGenerator: mockTokenMintGenerator,
      roleManagementGenerator: mockRoleManagementGenerator,
      allowListUpdatesGenerator: mockAllowListUpdatesGenerator,
      rateLimiterConfigGenerator: mockRateLimiterConfigGenerator,
      acceptOwnershipGenerator: mockAcceptOwnershipGenerator,
      registerAdminGenerator: mockRegisterAdminGenerator,
      tokenAdminRegistryGenerator: mockTokenAdminRegistryGenerator,
      chainUpdateFormatter: mockChainUpdateFormatter,
      tokenDeploymentFormatter: mockTokenDeploymentFormatter,
      poolDeploymentFormatter: mockPoolDeploymentFormatter,
      mintFormatter: mockMintFormatter,
      roleManagementFormatter: mockRoleManagementFormatter,
      allowListFormatter: mockAllowListFormatter,
      rateLimiterFormatter: mockRateLimiterFormatter,
      acceptOwnershipFormatter: mockAcceptOwnershipFormatter,
      registerAdminFormatter: mockRegisterAdminFormatter,
      tokenAdminRegistryFormatter: mockTokenAdminRegistryFormatter,
    });
  });

  describe('generateChainUpdate', () => {
    it('should generate transaction without Safe JSON', async () => {
      mockChainUpdateGenerator.generate.mockResolvedValue(mockTransaction);

      const result = await service.generateChainUpdate(
        '[]',
        '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
      expect(mockChainUpdateGenerator.generate).toHaveBeenCalledWith('[]');
      expect(mockChainUpdateFormatter.format).not.toHaveBeenCalled();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockChainUpdateGenerator.generate.mockResolvedValue(mockTransaction);
      mockChainUpdateFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
        tokenPoolAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      };

      const result = await service.generateChainUpdate(
        '[]',
        '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        metadata,
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
      expect(mockChainUpdateFormatter.format).toHaveBeenCalledWith(mockTransaction, metadata);
    });
  });

  describe('generateTokenDeployment', () => {
    const inputJson = JSON.stringify({
      name: 'Test Token',
      symbol: 'TST',
      decimals: 18,
      maxSupply: '1000000',
      preMint: '0',
      remoteTokenPools: [],
    });

    it('should generate transaction without Safe JSON', async () => {
      mockTokenDeploymentGenerator.generate.mockResolvedValue(mockTransaction);

      const result = await service.generateTokenDeployment(
        inputJson,
        '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
      expect(mockTokenDeploymentFormatter.format).not.toHaveBeenCalled();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockTokenDeploymentGenerator.generate.mockResolvedValue(mockTransaction);
      mockTokenDeploymentFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
      };

      const result = await service.generateTokenDeployment(
        inputJson,
        '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        metadata,
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
      expect(mockTokenDeploymentFormatter.format).toHaveBeenCalled();
    });
  });

  describe('generatePoolDeployment', () => {
    const inputJson = JSON.stringify({
      token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      decimals: 18,
      poolType: 'BurnMintTokenPool',
      remoteTokenPools: [],
    });

    it('should generate transaction without Safe JSON', async () => {
      mockPoolDeploymentGenerator.generate.mockResolvedValue(mockTransaction);

      const result = await service.generatePoolDeployment(
        inputJson,
        '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockPoolDeploymentGenerator.generate.mockResolvedValue(mockTransaction);
      mockPoolDeploymentFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
      };

      const result = await service.generatePoolDeployment(
        inputJson,
        '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        metadata,
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
    });
  });

  describe('generateMint', () => {
    const inputJson = JSON.stringify({
      receiver: '0x1234567890123456789012345678901234567890',
      amount: '1000000000000000000',
    });

    it('should generate transaction without Safe JSON', async () => {
      mockTokenMintGenerator.generate.mockResolvedValue(mockTransaction);

      const result = await service.generateMint(
        inputJson,
        '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockTokenMintGenerator.generate.mockResolvedValue(mockTransaction);
      mockMintFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
        tokenAddress: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      };

      const result = await service.generateMint(
        inputJson,
        '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
        metadata,
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
    });
  });

  describe('generateRoleManagement', () => {
    const inputJson = JSON.stringify({
      pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      roleType: 'both',
      action: 'grant',
    });

    it('should generate transactions without Safe JSON', async () => {
      mockRoleManagementGenerator.generate.mockResolvedValue({
        transactions: [mockTransaction],
        functionNames: ['grantMintAndBurnRoles' as const],
      });

      const result = await service.generateRoleManagement(
        inputJson,
        '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      );

      expect(result.transactions).toEqual([mockTransaction]);
      expect(result.safeJson).toBeNull();
    });

    it('should generate transactions with Safe JSON when metadata provided', async () => {
      mockRoleManagementGenerator.generate.mockResolvedValue({
        transactions: [mockTransaction],
        functionNames: ['grantMintAndBurnRoles' as const],
      });
      mockRoleManagementFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
        tokenAddress: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      };

      const result = await service.generateRoleManagement(
        inputJson,
        '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
        metadata,
      );

      expect(result.transactions).toEqual([mockTransaction]);
      expect(result.safeJson).toEqual(mockSafeJson);
    });
  });

  describe('generateAllowListUpdates', () => {
    const inputJson = JSON.stringify({
      adds: ['0x1234567890123456789012345678901234567890'],
      removes: [],
    });

    it('should generate transaction without Safe JSON', async () => {
      mockAllowListUpdatesGenerator.generate.mockResolvedValue(mockTransaction);

      const result = await service.generateAllowListUpdates(
        inputJson,
        '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockAllowListUpdatesGenerator.generate.mockResolvedValue(mockTransaction);
      mockAllowListFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
        tokenPoolAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      };

      const result = await service.generateAllowListUpdates(
        inputJson,
        '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        metadata,
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
    });
  });

  describe('generateRateLimiterConfig', () => {
    const inputJson = JSON.stringify({
      remoteChainSelector: '16015286601757825753',
      outboundConfig: { isEnabled: true, capacity: '1000', rate: '100' },
      inboundConfig: { isEnabled: true, capacity: '2000', rate: '200' },
    });

    it('should generate transaction without Safe JSON', async () => {
      mockRateLimiterConfigGenerator.generate.mockResolvedValue(mockTransaction);

      const result = await service.generateRateLimiterConfig(
        inputJson,
        '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockRateLimiterConfigGenerator.generate.mockResolvedValue(mockTransaction);
      mockRateLimiterFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
        tokenPoolAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      };

      const result = await service.generateRateLimiterConfig(
        inputJson,
        '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        metadata,
      );

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
    });
  });

  describe('generateTokenAdminRegistry', () => {
    const setPoolInputJson = JSON.stringify({
      registryAddress: '0x1234567890123456789012345678901234567890',
      tokenAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      method: 'set-pool',
      poolAddress: '0xabcdef1234567890123456789012345678901234',
    });

    it('should generate transaction without Safe JSON', async () => {
      mockTokenAdminRegistryGenerator.generate.mockResolvedValue({
        transaction: mockTransaction,
        functionName: 'setPool',
      });

      const result = await service.generateTokenAdminRegistry(setPoolInputJson);

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toBeNull();
      expect(mockTokenAdminRegistryGenerator.generate).toHaveBeenCalledWith(setPoolInputJson);
      expect(mockTokenAdminRegistryFormatter.format).not.toHaveBeenCalled();
    });

    it('should generate transaction with Safe JSON when metadata provided', async () => {
      mockTokenAdminRegistryGenerator.generate.mockResolvedValue({
        transaction: mockTransaction,
        functionName: 'setPool',
      });
      mockTokenAdminRegistryFormatter.format.mockReturnValue(mockSafeJson);

      const metadata = {
        chainId: '11155111',
        safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
        ownerAddress: '0x0000000000000000000000000000000000000000',
        registryAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = await service.generateTokenAdminRegistry(setPoolInputJson, metadata);

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.safeJson).toEqual(mockSafeJson);
      expect(mockTokenAdminRegistryFormatter.format).toHaveBeenCalled();
    });
  });

  describe('createTransactionService', () => {
    it('should create a TransactionService instance', () => {
      const service = createTransactionService({
        chainUpdateGenerator: mockChainUpdateGenerator,
        tokenDeploymentGenerator: mockTokenDeploymentGenerator,
        poolDeploymentGenerator: mockPoolDeploymentGenerator,
        tokenMintGenerator: mockTokenMintGenerator,
        roleManagementGenerator: mockRoleManagementGenerator,
        allowListUpdatesGenerator: mockAllowListUpdatesGenerator,
        rateLimiterConfigGenerator: mockRateLimiterConfigGenerator,
        acceptOwnershipGenerator: mockAcceptOwnershipGenerator,
        registerAdminGenerator: mockRegisterAdminGenerator,
        tokenAdminRegistryGenerator: mockTokenAdminRegistryGenerator,
        chainUpdateFormatter: mockChainUpdateFormatter,
        tokenDeploymentFormatter: mockTokenDeploymentFormatter,
        poolDeploymentFormatter: mockPoolDeploymentFormatter,
        mintFormatter: mockMintFormatter,
        roleManagementFormatter: mockRoleManagementFormatter,
        allowListFormatter: mockAllowListFormatter,
        rateLimiterFormatter: mockRateLimiterFormatter,
        acceptOwnershipFormatter: mockAcceptOwnershipFormatter,
        registerAdminFormatter: mockRegisterAdminFormatter,
        tokenAdminRegistryFormatter: mockTokenAdminRegistryFormatter,
      });

      expect(service).toBeInstanceOf(TransactionService);
    });
  });
});

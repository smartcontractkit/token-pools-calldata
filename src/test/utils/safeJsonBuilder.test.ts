/**
 * Tests for safeJsonBuilder utility
 * Covers Safe Transaction Builder JSON creation
 */

import { ethers } from 'ethers';
import {
  buildSafeTransactionJson,
  buildMultiSafeTransactionJson,
  SafeJsonBuilderOptions,
  MultiSafeJsonBuilderOptions,
} from '../../utils/safeJsonBuilder';
import { SafeOperationType, SAFE_TX_BUILDER_VERSION } from '../../types/safe';
import { DEFAULTS } from '../../config';
import { TokenPool__factory, FactoryBurnMintERC20__factory } from '../../typechain';

describe('buildSafeTransactionJson', () => {
  const mockMetadata = {
    chainId: '11155111',
    safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
    ownerAddress: '0x0000000000000000000000000000000000000000',
  };

  const mockTransaction = {
    to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    value: '0',
    data: '0x1234',
    operation: SafeOperationType.Call,
  };

  let tokenPoolInterface: ethers.Interface;

  beforeEach(() => {
    tokenPoolInterface = TokenPool__factory.createInterface();
  });

  it('should build valid Safe transaction JSON', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test Transaction',
      description: 'Test Description',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result).toMatchObject({
      version: DEFAULTS.SAFE_TX_VERSION,
      chainId: mockMetadata.chainId,
      meta: {
        name: 'Test Transaction',
        description: 'Test Description',
        txBuilderVersion: SAFE_TX_BUILDER_VERSION,
        createdFromSafeAddress: mockMetadata.safeAddress,
        createdFromOwnerAddress: mockMetadata.ownerAddress,
      },
    });
  });

  it('should include transaction data correctly', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      to: mockTransaction.to,
      value: mockTransaction.value,
      data: mockTransaction.data,
      operation: mockTransaction.operation,
    });
  });

  it('should include contract method information', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.contractMethod).toMatchObject({
      name: 'applyChainUpdates',
      payable: false,
    });
    expect(result.transactions[0]?.contractMethod?.inputs).toBeDefined();
    expect(Array.isArray(result.transactions[0]?.contractMethod?.inputs)).toBe(true);
  });

  it('should map function inputs correctly', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);
    const inputs = result.transactions[0]?.contractMethod?.inputs;

    expect(inputs).toBeDefined();
    expect(inputs?.length).toBeGreaterThan(0);
    inputs?.forEach((input) => {
      expect(input).toHaveProperty('name');
      expect(input).toHaveProperty('type');
      expect(input).toHaveProperty('internalType');
    });
  });

  it('should set contractInputsValues to null', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.contractInputsValues).toBeNull();
  });

  it('should include timestamp in createdAt', () => {
    const beforeTime = Date.now();

    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);
    const afterTime = Date.now();

    expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
    expect(result.createdAt).toBeLessThanOrEqual(afterTime);
  });

  it('should throw error for non-existent function', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'nonExistentFunction',
    };

    expect(() => buildSafeTransactionJson(options)).toThrow(
      'Function nonExistentFunction not found in contract interface',
    );
  });

  it('should handle different operation types', () => {
    const delegateCallTx = {
      ...mockTransaction,
      operation: SafeOperationType.DelegateCall,
    };

    const options: SafeJsonBuilderOptions = {
      transaction: delegateCallTx,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.operation).toBe(SafeOperationType.DelegateCall);
  });

  it('should handle different chain IDs', () => {
    const differentMetadata = {
      ...mockMetadata,
      chainId: '84532', // Base Sepolia
    };

    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: differentMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.chainId).toBe('84532');
  });

  it('should handle non-zero value transactions', () => {
    const valueTx = {
      ...mockTransaction,
      value: '1000000000000000000', // 1 ETH
    };

    const options: SafeJsonBuilderOptions = {
      transaction: valueTx,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.value).toBe('1000000000000000000');
  });

  it('should handle different contract interfaces', () => {
    const burnMintInterface = FactoryBurnMintERC20__factory.createInterface();

    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionName: 'mint',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.contractMethod?.name).toBe('mint');
  });

  it('should handle payable functions', () => {
    // Note: Most contract functions are non-payable, but testing the mapping
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.contractMethod).toHaveProperty('payable');
  });
});

describe('buildMultiSafeTransactionJson', () => {
  const mockMetadata = {
    chainId: '11155111',
    safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
    ownerAddress: '0x0000000000000000000000000000000000000000',
  };

  let burnMintInterface: ethers.Interface;

  beforeEach(() => {
    burnMintInterface = FactoryBurnMintERC20__factory.createInterface();
  });

  it('should build valid multi-transaction Safe JSON', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Multi Test',
      description: 'Multi Description',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    expect(result).toMatchObject({
      version: DEFAULTS.SAFE_TX_VERSION,
      chainId: mockMetadata.chainId,
      meta: {
        name: 'Multi Test',
        description: 'Multi Description',
        txBuilderVersion: SAFE_TX_BUILDER_VERSION,
      },
    });
  });

  it('should include all transactions', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject(mockTransactions[0]!);
    expect(result.transactions[1]).toMatchObject(mockTransactions[1]!);
  });

  it('should map function names correctly', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    expect(result.transactions[0]?.contractMethod?.name).toBe('grantMintRole');
    expect(result.transactions[1]?.contractMethod?.name).toBe('grantBurnRole');
  });

  it('should throw error for mismatched array lengths', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole'], // Only 1 function name for 2 transactions
    };

    expect(() => buildMultiSafeTransactionJson(options)).toThrow(
      'Mismatch between transactions (2) and functionNames (1)',
    );
  });

  it('should throw error for non-existent function', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['nonExistentFunction'],
    };

    expect(() => buildMultiSafeTransactionJson(options)).toThrow(
      'Function nonExistentFunction not found in contract interface',
    );
  });

  it('should handle single transaction array', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    expect(result.transactions).toHaveLength(1);
  });

  it('should handle many transactions', () => {
    const mockTransactions = Array.from({ length: 5 }, (_, i) => ({
      to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      value: '0',
      data: `0x${i}`,
      operation: SafeOperationType.Call,
    }));

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole', 'grantMintRole', 'grantBurnRole', 'mint'],
    };

    const result = buildMultiSafeTransactionJson(options);

    expect(result.transactions).toHaveLength(5);
  });

  it('should include contract method inputs for all transactions', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    result.transactions.forEach((tx) => {
      expect(tx.contractMethod).toBeDefined();
      expect(tx.contractMethod?.inputs).toBeDefined();
      expect(Array.isArray(tx.contractMethod?.inputs)).toBe(true);
    });
  });

  it('should set contractInputsValues to null for all transactions', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    result.transactions.forEach((tx) => {
      expect(tx.contractInputsValues).toBeNull();
    });
  });

  it('should handle mixed operation types', () => {
    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x5678',
        operation: SafeOperationType.DelegateCall,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole', 'grantBurnRole'],
    };

    const result = buildMultiSafeTransactionJson(options);

    expect(result.transactions[0]?.operation).toBe(SafeOperationType.Call);
    expect(result.transactions[1]?.operation).toBe(SafeOperationType.DelegateCall);
  });

  it('should include timestamp in createdAt', () => {
    const beforeTime = Date.now();

    const mockTransactions = [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234',
        operation: SafeOperationType.Call,
      },
    ];

    const options: MultiSafeJsonBuilderOptions = {
      transactions: mockTransactions,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: burnMintInterface,
      functionNames: ['grantMintRole'],
    };

    const result = buildMultiSafeTransactionJson(options);
    const afterTime = Date.now();

    expect(result.createdAt).toBeGreaterThanOrEqual(beforeTime);
    expect(result.createdAt).toBeLessThanOrEqual(afterTime);
  });
});

describe('Edge Cases', () => {
  const mockMetadata = {
    chainId: '1',
    safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
    ownerAddress: '0x0000000000000000000000000000000000000000',
  };

  const mockTransaction = {
    to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    value: '0',
    data: '0x',
    operation: SafeOperationType.Call,
  };

  let tokenPoolInterface: ethers.Interface;

  beforeEach(() => {
    tokenPoolInterface = TokenPool__factory.createInterface();
  });

  it('should handle empty transaction data', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.transactions[0]?.data).toBe('0x');
  });

  it('should handle empty name and description', () => {
    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: '',
      description: '',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.meta.name).toBe('');
    expect(result.meta.description).toBe('');
  });

  it('should handle long name and description', () => {
    const longString = 'x'.repeat(1000);

    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: mockMetadata,
      name: longString,
      description: longString,
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.meta.name).toBe(longString);
    expect(result.meta.description).toBe(longString);
  });

  it('should handle zero address as Safe address', () => {
    const zeroMetadata = {
      ...mockMetadata,
      safeAddress: '0x0000000000000000000000000000000000000000',
    };

    const options: SafeJsonBuilderOptions = {
      transaction: mockTransaction,
      metadata: zeroMetadata,
      name: 'Test',
      description: 'Test',
      contractInterface: tokenPoolInterface,
      functionName: 'applyChainUpdates',
    };

    const result = buildSafeTransactionJson(options);

    expect(result.meta.createdFromSafeAddress).toBe('0x0000000000000000000000000000000000000000');
  });
});

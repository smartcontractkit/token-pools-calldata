/**
 * Tests for transactionFactory
 * Covers Safe transaction object creation
 */

import { ethers } from 'ethers';
import {
  createTransaction,
  encodeFunctionData,
  createFunctionCallTransaction,
  TransactionOptions,
} from '../../utils/transactionFactory';
import { SafeOperationType } from '../../types/safe';
import { DEFAULTS } from '../../config';
import { VALID_ADDRESSES } from '../helpers/fixtures';

// Create a simple ABI for testing
const TEST_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function noParams()',
];

describe('createTransaction', () => {
  const mockCalldata = '0x1234567890abcdef';

  describe('with required options only', () => {
    it('should create transaction with default values', () => {
      const options: TransactionOptions = {
        to: VALID_ADDRESSES.token,
        data: mockCalldata,
      };

      const transaction = createTransaction(options);

      expect(transaction).toEqual({
        to: VALID_ADDRESSES.token,
        value: DEFAULTS.TRANSACTION_VALUE,
        data: mockCalldata,
        operation: SafeOperationType.Call,
      });
    });

    it('should use DEFAULTS.TRANSACTION_VALUE as default value', () => {
      const transaction = createTransaction({
        to: VALID_ADDRESSES.pool,
        data: '0x',
      });

      expect(transaction.value).toBe(DEFAULTS.TRANSACTION_VALUE);
      expect(transaction.value).toBe('0');
    });

    it('should use SafeOperationType.Call as default operation', () => {
      const transaction = createTransaction({
        to: VALID_ADDRESSES.deployer,
        data: '0xabcd',
      });

      expect(transaction.operation).toBe(SafeOperationType.Call);
      expect(transaction.operation).toBe(0);
    });
  });

  describe('with custom options', () => {
    it('should accept custom value', () => {
      const options: TransactionOptions = {
        to: VALID_ADDRESSES.token,
        data: mockCalldata,
        value: '1000000000000000000', // 1 ETH
      };

      const transaction = createTransaction(options);

      expect(transaction.value).toBe('1000000000000000000');
    });

    it('should accept custom operation (DelegateCall)', () => {
      const options: TransactionOptions = {
        to: VALID_ADDRESSES.token,
        data: mockCalldata,
        operation: SafeOperationType.DelegateCall,
      };

      const transaction = createTransaction(options);

      expect(transaction.operation).toBe(SafeOperationType.DelegateCall);
      expect(transaction.operation).toBe(1);
    });

    it('should accept both custom value and operation', () => {
      const options: TransactionOptions = {
        to: VALID_ADDRESSES.safe,
        data: '0x',
        value: '500',
        operation: SafeOperationType.DelegateCall,
      };

      const transaction = createTransaction(options);

      expect(transaction.value).toBe('500');
      expect(transaction.operation).toBe(SafeOperationType.DelegateCall);
    });
  });

  describe('transaction data handling', () => {
    it('should handle empty data (0x)', () => {
      const transaction = createTransaction({
        to: VALID_ADDRESSES.token,
        data: '0x',
      });

      expect(transaction.data).toBe('0x');
    });

    it('should handle long calldata', () => {
      const longCalldata = '0x' + 'ab'.repeat(1000);

      const transaction = createTransaction({
        to: VALID_ADDRESSES.token,
        data: longCalldata,
      });

      expect(transaction.data).toBe(longCalldata);
    });

    it('should preserve exact calldata format', () => {
      const calldata = '0xAbCdEf1234567890';

      const transaction = createTransaction({
        to: VALID_ADDRESSES.token,
        data: calldata,
      });

      expect(transaction.data).toBe(calldata);
    });
  });

  describe('address handling', () => {
    it('should preserve exact address format', () => {
      const transaction = createTransaction({
        to: VALID_ADDRESSES.safe,
        data: '0x',
      });

      expect(transaction.to).toBe(VALID_ADDRESSES.safe);
    });

    it('should work with zero address', () => {
      const transaction = createTransaction({
        to: VALID_ADDRESSES.owner,
        data: '0x',
      });

      expect(transaction.to).toBe(VALID_ADDRESSES.owner);
    });
  });
});

describe('encodeFunctionData', () => {
  let testInterface: ethers.Interface;

  beforeEach(() => {
    testInterface = new ethers.Interface(TEST_ABI);
  });

  describe('successful encoding', () => {
    it('should encode simple function call', () => {
      const calldata = encodeFunctionData(testInterface, 'transfer', [
        VALID_ADDRESSES.receiver,
        '1000000000000000000',
      ]);

      expect(calldata).toMatch(/^0x/);
      expect(calldata.length).toBeGreaterThan(10);
    });

    it('should encode function with no parameters', () => {
      const calldata = encodeFunctionData(testInterface, 'noParams', []);

      expect(calldata).toMatch(/^0x/);
      // Function selector only (4 bytes = 8 hex chars + 0x)
      expect(calldata.length).toBe(10);
    });

    it('should encode approve function', () => {
      const calldata = encodeFunctionData(testInterface, 'approve', [
        VALID_ADDRESSES.pool,
        '999999999999',
      ]);

      expect(calldata).toMatch(/^0x/);
    });

    it('should encode mint function', () => {
      const calldata = encodeFunctionData(testInterface, 'mint', [
        VALID_ADDRESSES.receiver,
        '1000',
      ]);

      expect(calldata).toMatch(/^0x/);
    });

    it('should produce different calldata for different args', () => {
      const calldata1 = encodeFunctionData(testInterface, 'transfer', [
        VALID_ADDRESSES.receiver,
        '100',
      ]);
      const calldata2 = encodeFunctionData(testInterface, 'transfer', [
        VALID_ADDRESSES.receiver,
        '200',
      ]);

      expect(calldata1).not.toBe(calldata2);
    });

    it('should produce same calldata for same args', () => {
      const calldata1 = encodeFunctionData(testInterface, 'transfer', [
        VALID_ADDRESSES.receiver,
        '100',
      ]);
      const calldata2 = encodeFunctionData(testInterface, 'transfer', [
        VALID_ADDRESSES.receiver,
        '100',
      ]);

      expect(calldata1).toBe(calldata2);
    });
  });

  describe('error cases', () => {
    it('should throw for non-existent function', () => {
      expect(() => encodeFunctionData(testInterface, 'nonExistentFunction', [])).toThrow();
    });

    it('should throw for wrong number of arguments', () => {
      expect(() =>
        encodeFunctionData(testInterface, 'transfer', [VALID_ADDRESSES.receiver]),
      ).toThrow();
    });

    it('should throw for wrong argument types', () => {
      expect(() =>
        encodeFunctionData(testInterface, 'transfer', ['not-an-address', '100']),
      ).toThrow();
    });
  });
});

describe('createFunctionCallTransaction', () => {
  let testInterface: ethers.Interface;

  beforeEach(() => {
    testInterface = new ethers.Interface(TEST_ABI);
  });

  describe('successful creation', () => {
    it('should create transaction with encoded function data', () => {
      const transaction = createFunctionCallTransaction(
        VALID_ADDRESSES.token,
        testInterface,
        'transfer',
        [VALID_ADDRESSES.receiver, '1000000000000000000'],
      );

      expect(transaction.to).toBe(VALID_ADDRESSES.token);
      expect(transaction.data).toMatch(/^0x/);
      expect(transaction.data.length).toBeGreaterThan(10);
      expect(transaction.value).toBe(DEFAULTS.TRANSACTION_VALUE);
      expect(transaction.operation).toBe(SafeOperationType.Call);
    });

    it('should create transaction for function with no params', () => {
      const transaction = createFunctionCallTransaction(
        VALID_ADDRESSES.token,
        testInterface,
        'noParams',
        [],
      );

      expect(transaction.to).toBe(VALID_ADDRESSES.token);
      expect(transaction.data.length).toBe(10); // Just selector
    });

    it('should apply custom options', () => {
      const transaction = createFunctionCallTransaction(
        VALID_ADDRESSES.token,
        testInterface,
        'transfer',
        [VALID_ADDRESSES.receiver, '100'],
        {
          value: '1000',
          operation: SafeOperationType.DelegateCall,
        },
      );

      expect(transaction.value).toBe('1000');
      expect(transaction.operation).toBe(SafeOperationType.DelegateCall);
    });

    it('should override only specified options', () => {
      const transaction = createFunctionCallTransaction(
        VALID_ADDRESSES.token,
        testInterface,
        'transfer',
        [VALID_ADDRESSES.receiver, '100'],
        {
          value: '500',
          // operation not specified, should use default
        },
      );

      expect(transaction.value).toBe('500');
      expect(transaction.operation).toBe(SafeOperationType.Call);
    });
  });

  describe('encoding integration', () => {
    it('should produce same calldata as encodeFunctionData', () => {
      const args = [VALID_ADDRESSES.receiver, '12345'];

      const encodedData = encodeFunctionData(testInterface, 'transfer', args);
      const transaction = createFunctionCallTransaction(
        VALID_ADDRESSES.token,
        testInterface,
        'transfer',
        args,
      );

      expect(transaction.data).toBe(encodedData);
    });

    it('should handle complex function arguments', () => {
      // Create interface with more complex types
      const complexInterface = new ethers.Interface([
        'function complexFunction(address[] addresses, uint256[] amounts)',
      ]);

      const transaction = createFunctionCallTransaction(
        VALID_ADDRESSES.token,
        complexInterface,
        'complexFunction',
        [
          [VALID_ADDRESSES.receiver, VALID_ADDRESSES.pool],
          ['100', '200'],
        ],
      );

      expect(transaction.data).toMatch(/^0x/);
      expect(transaction.data.length).toBeGreaterThan(10);
    });
  });

  describe('error propagation', () => {
    it('should propagate encoding errors', () => {
      expect(() =>
        createFunctionCallTransaction(VALID_ADDRESSES.token, testInterface, 'nonExistent', []),
      ).toThrow();
    });

    it('should propagate argument type errors', () => {
      expect(() =>
        createFunctionCallTransaction(VALID_ADDRESSES.token, testInterface, 'transfer', [
          'invalid-address',
          '100',
        ]),
      ).toThrow();
    });
  });
});

describe('Integration scenarios', () => {
  let erc20Interface: ethers.Interface;

  beforeEach(() => {
    erc20Interface = new ethers.Interface(TEST_ABI);
  });

  it('should create valid transaction for token transfer', () => {
    const transaction = createFunctionCallTransaction(
      VALID_ADDRESSES.token,
      erc20Interface,
      'transfer',
      [VALID_ADDRESSES.receiver, '1000000000000000000000'], // 1000 tokens
    );

    expect(transaction.to).toBe(VALID_ADDRESSES.token);
    expect(transaction.value).toBe('0');
    expect(transaction.data).toMatch(/^0xa9059cbb/); // transfer selector
    expect(transaction.operation).toBe(0);
  });

  it('should create valid transaction for approve', () => {
    const transaction = createFunctionCallTransaction(
      VALID_ADDRESSES.token,
      erc20Interface,
      'approve',
      [
        VALID_ADDRESSES.pool,
        '115792089237316195423570985008687907853269984665640564039457584007913129639935', // max uint256
      ],
    );

    expect(transaction.to).toBe(VALID_ADDRESSES.token);
    expect(transaction.value).toBe('0');
    expect(transaction.data).toMatch(/^0x095ea7b3/); // approve selector
    expect(transaction.operation).toBe(0);
  });

  it('should create valid transaction for mint', () => {
    const transaction = createFunctionCallTransaction(
      VALID_ADDRESSES.token,
      erc20Interface,
      'mint',
      [VALID_ADDRESSES.receiver, '1000000000000000000'],
    );

    expect(transaction.to).toBe(VALID_ADDRESSES.token);
    expect(transaction.value).toBe('0');
    expect(transaction.data).toMatch(/^0x40c10f19/); // mint selector
    expect(transaction.operation).toBe(0);
  });
});

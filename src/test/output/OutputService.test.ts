/**
 * Tests for OutputService
 * Covers high-level output operations for CLI commands
 */

import { OutputService } from '../../output/OutputService';
import { OutputWriterFactory } from '../../output/OutputWriter';
import {
  SafeOperationType,
  SafeTransactionBuilderJSON,
  SAFE_TX_BUILDER_VERSION,
} from '../../types/safe';
import { OUTPUT_FORMAT } from '../../config';

// Mock the OutputWriter module
jest.mock('../../output/OutputWriter', () => {
  const mockCalldataWriter = {
    write: jest.fn().mockResolvedValue(undefined),
  };
  const mockJsonWriter = {
    write: jest.fn().mockResolvedValue(undefined),
  };
  const mockTransactionJsonWriter = {
    write: jest.fn().mockResolvedValue(undefined),
  };
  return {
    CalldataWriter: jest.fn(() => mockCalldataWriter),
    JsonWriter: jest.fn(() => mockJsonWriter),
    TransactionJsonWriter: jest.fn(() => mockTransactionJsonWriter),
    OutputWriterFactory: {
      createCalldataWriter: jest.fn(() => mockCalldataWriter),
      createJsonWriter: jest.fn(() => mockJsonWriter),
      createTransactionJsonWriter: jest.fn(() => mockTransactionJsonWriter),
    },
  };
});

describe('OutputService', () => {
  let service: OutputService;
  let mockCalldataWriter: { write: jest.Mock };
  let mockJsonWriter: { write: jest.Mock };
  let mockTransactionJsonWriter: { write: jest.Mock };

  const mockTransaction = {
    to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    value: '0',
    data: '0x1234567890abcdef',
    operation: SafeOperationType.Call,
  };

  const mockSafeJson: SafeTransactionBuilderJSON = {
    version: '1.18.0',
    chainId: '84532',
    createdAt: Date.now(),
    meta: {
      name: 'Test Transaction',
      description: 'Test Description',
      txBuilderVersion: SAFE_TX_BUILDER_VERSION,
      createdFromSafeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
      createdFromOwnerAddress: '0x0000000000000000000000000000000000000000',
    },
    transactions: [
      {
        to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        value: '0',
        data: '0x1234567890abcdef',
        operation: SafeOperationType.Call,
        contractMethod: {
          inputs: [],
          name: 'testFunction',
          payable: false,
        },
        contractInputsValues: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OutputService();
    mockCalldataWriter = OutputWriterFactory.createCalldataWriter() as unknown as {
      write: jest.Mock;
    };
    mockJsonWriter = OutputWriterFactory.createJsonWriter() as unknown as { write: jest.Mock };
    mockTransactionJsonWriter = OutputWriterFactory.createTransactionJsonWriter() as unknown as {
      write: jest.Mock;
    };
  });

  describe('writeCalldata', () => {
    it('should write single transaction calldata to console', async () => {
      await service.writeCalldata(mockTransaction);

      expect(OutputWriterFactory.createCalldataWriter).toHaveBeenCalled();
      expect(mockCalldataWriter.write).toHaveBeenCalledWith(mockTransaction.data, {
        type: 'console',
      });
    });

    it('should write single transaction calldata to file', async () => {
      const outputPath = 'output/calldata.txt';
      await service.writeCalldata(mockTransaction, outputPath);

      expect(OutputWriterFactory.createCalldataWriter).toHaveBeenCalled();
      expect(mockCalldataWriter.write).toHaveBeenCalledWith(mockTransaction.data, {
        type: 'file',
        path: outputPath,
      });
    });

    it('should write multiple transactions calldata to console', async () => {
      const transactions = [mockTransaction, { ...mockTransaction, data: '0xabcdef1234567890' }];

      await service.writeCalldata(transactions);

      expect(mockCalldataWriter.write).toHaveBeenCalledWith(
        `${mockTransaction.data}\n0xabcdef1234567890`,
        { type: 'console' },
      );
    });

    it('should write multiple transactions calldata to file', async () => {
      const transactions = [
        mockTransaction,
        { ...mockTransaction, data: '0xabcdef1234567890' },
        { ...mockTransaction, data: '0x9999999999999999' },
      ];
      const outputPath = 'output/batch.txt';

      await service.writeCalldata(transactions, outputPath);

      expect(mockCalldataWriter.write).toHaveBeenCalledWith(
        `${mockTransaction.data}\n0xabcdef1234567890\n0x9999999999999999`,
        { type: 'file', path: outputPath },
      );
    });

    it('should handle empty transaction array', async () => {
      const transactions: (typeof mockTransaction)[] = [];

      await service.writeCalldata(transactions);

      expect(mockCalldataWriter.write).toHaveBeenCalledWith('', { type: 'console' });
    });
  });

  describe('writeSafeJson', () => {
    it('should write Safe JSON to console', async () => {
      await service.writeSafeJson(mockSafeJson);

      expect(OutputWriterFactory.createJsonWriter).toHaveBeenCalled();
      expect(mockJsonWriter.write).toHaveBeenCalledWith(JSON.stringify(mockSafeJson), {
        type: 'console',
      });
    });

    it('should write Safe JSON to file', async () => {
      const outputPath = 'output/safe.json';
      await service.writeSafeJson(mockSafeJson, outputPath);

      expect(OutputWriterFactory.createJsonWriter).toHaveBeenCalled();
      expect(mockJsonWriter.write).toHaveBeenCalledWith(JSON.stringify(mockSafeJson), {
        type: 'file',
        path: outputPath,
      });
    });

    it('should handle Safe JSON with multiple transactions', async () => {
      const multiTxSafeJson: SafeTransactionBuilderJSON = {
        ...mockSafeJson,
        transactions: [
          mockSafeJson.transactions[0]!,
          {
            ...mockSafeJson.transactions[0]!,
            data: '0xsecondtx',
          },
        ],
      };

      await service.writeSafeJson(multiTxSafeJson);

      expect(mockJsonWriter.write).toHaveBeenCalledWith(JSON.stringify(multiTxSafeJson), {
        type: 'console',
      });
    });
  });

  describe('write', () => {
    it('should route to writeSafeJson when format is safe-json', async () => {
      const outputPath = 'output/safe.json';

      await service.write(OUTPUT_FORMAT.SAFE_JSON, mockTransaction, mockSafeJson, outputPath);

      expect(OutputWriterFactory.createJsonWriter).toHaveBeenCalled();
      expect(mockJsonWriter.write).toHaveBeenCalled();
    });

    it('should route to writeCalldata when format is calldata', async () => {
      const outputPath = 'output/calldata.txt';

      await service.write(OUTPUT_FORMAT.CALLDATA, mockTransaction, null, outputPath);

      expect(OutputWriterFactory.createCalldataWriter).toHaveBeenCalled();
      expect(mockCalldataWriter.write).toHaveBeenCalled();
    });

    it('should throw error when safe-json format but no safeJson provided', async () => {
      await expect(
        service.write(OUTPUT_FORMAT.SAFE_JSON, mockTransaction, null, 'output/safe.json'),
      ).rejects.toThrow('Safe JSON format requested but no Safe JSON provided');
    });

    it('should write to console when no outputPath provided for calldata', async () => {
      await service.write(OUTPUT_FORMAT.CALLDATA, mockTransaction, null, undefined);

      expect(mockCalldataWriter.write).toHaveBeenCalledWith(mockTransaction.data, {
        type: 'console',
      });
    });

    it('should write to console when no outputPath provided for safe-json', async () => {
      await service.write(OUTPUT_FORMAT.SAFE_JSON, mockTransaction, mockSafeJson, undefined);

      expect(mockJsonWriter.write).toHaveBeenCalledWith(JSON.stringify(mockSafeJson), {
        type: 'console',
      });
    });

    it('should handle multiple transactions with calldata format', async () => {
      const transactions = [mockTransaction, mockTransaction];

      await service.write(OUTPUT_FORMAT.CALLDATA, transactions, null, 'output/batch.txt');

      expect(mockCalldataWriter.write).toHaveBeenCalledWith(
        `${mockTransaction.data}\n${mockTransaction.data}`,
        { type: 'file', path: 'output/batch.txt' },
      );
    });

    it('should ignore safeJson when format is calldata', async () => {
      await service.write(
        OUTPUT_FORMAT.CALLDATA,
        mockTransaction,
        mockSafeJson, // Provided but should be ignored
        'output/calldata.txt',
      );

      expect(mockCalldataWriter.write).toHaveBeenCalledWith(mockTransaction.data, {
        type: 'file',
        path: 'output/calldata.txt',
      });
      expect(mockJsonWriter.write).not.toHaveBeenCalled();
    });

    it('should route to writeTransactionJson when format is json', async () => {
      const outputPath = 'output/tx.json';

      await service.write(OUTPUT_FORMAT.JSON, mockTransaction, null, outputPath);

      expect(OutputWriterFactory.createTransactionJsonWriter).toHaveBeenCalled();
      expect(mockTransactionJsonWriter.write).toHaveBeenCalled();
    });

    it('should handle single transaction with json format', async () => {
      await service.write(OUTPUT_FORMAT.JSON, mockTransaction, null, 'output/tx.json');

      // Should extract to, value, data (omit operation)
      const expectedJson = JSON.stringify({
        to: mockTransaction.to,
        value: mockTransaction.value,
        data: mockTransaction.data,
      });

      expect(mockTransactionJsonWriter.write).toHaveBeenCalledWith(expectedJson, {
        type: 'file',
        path: 'output/tx.json',
      });
    });

    it('should handle multiple transactions with json format', async () => {
      const transactions = [mockTransaction, { ...mockTransaction, data: '0xsecondtx' }];

      await service.write(OUTPUT_FORMAT.JSON, transactions, null, 'output/batch.json');

      // Should extract to, value, data for each transaction
      const expectedJson = JSON.stringify([
        { to: mockTransaction.to, value: mockTransaction.value, data: mockTransaction.data },
        { to: mockTransaction.to, value: mockTransaction.value, data: '0xsecondtx' },
      ]);

      expect(mockTransactionJsonWriter.write).toHaveBeenCalledWith(expectedJson, {
        type: 'file',
        path: 'output/batch.json',
      });
    });
  });

  describe('writeTransactionJson', () => {
    it('should write single transaction JSON to console', async () => {
      await service.writeTransactionJson(mockTransaction);

      expect(OutputWriterFactory.createTransactionJsonWriter).toHaveBeenCalled();
      const expectedJson = JSON.stringify({
        to: mockTransaction.to,
        value: mockTransaction.value,
        data: mockTransaction.data,
      });
      expect(mockTransactionJsonWriter.write).toHaveBeenCalledWith(expectedJson, {
        type: 'console',
      });
    });

    it('should write single transaction JSON to file', async () => {
      const outputPath = 'output/tx.json';
      await service.writeTransactionJson(mockTransaction, outputPath);

      expect(OutputWriterFactory.createTransactionJsonWriter).toHaveBeenCalled();
      const expectedJson = JSON.stringify({
        to: mockTransaction.to,
        value: mockTransaction.value,
        data: mockTransaction.data,
      });
      expect(mockTransactionJsonWriter.write).toHaveBeenCalledWith(expectedJson, {
        type: 'file',
        path: outputPath,
      });
    });

    it('should omit operation field from output (Safe-specific)', async () => {
      await service.writeTransactionJson(mockTransaction);

      // Verify that the JSON does not include 'operation' field
      const callArgs = mockTransactionJsonWriter.write.mock.calls[0] as [string, unknown];
      const writtenJson = JSON.parse(callArgs[0]) as Record<string, unknown>;
      expect(writtenJson).not.toHaveProperty('operation');
      expect(writtenJson).toEqual({
        to: mockTransaction.to,
        value: mockTransaction.value,
        data: mockTransaction.data,
      });
    });
  });
});

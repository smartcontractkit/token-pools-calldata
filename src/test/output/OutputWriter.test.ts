/**
 * Tests for OutputWriter classes
 * Covers CalldataWriter, JsonWriter, and OutputWriterFactory
 */

import fs from 'fs/promises';
import path from 'path';
import { CalldataWriter, JsonWriter, OutputWriterFactory } from '../../output/OutputWriter';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('prettier', () => ({
  __esModule: true,
  default: {
    resolveConfig: jest.fn().mockResolvedValue({}),
    format: jest.fn().mockImplementation((content: string) => Promise.resolve(content)),
  },
}));
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CalldataWriter', () => {
  let writer: CalldataWriter;
  const mockCalldata = '0x1234567890abcdef';

  beforeEach(() => {
    jest.clearAllMocks();
    writer = new CalldataWriter();
  });

  describe('write to console', () => {
    it('should write calldata to console with trailing newline', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await writer.write(mockCalldata, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalledWith(`${mockCalldata}\n`);
      consoleSpy.mockRestore();
    });

    it('should not add extra newline if calldata already ends with newline', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const calldataWithNewline = `${mockCalldata}\n`;

      await writer.write(calldataWithNewline, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalledWith(calldataWithNewline);
      consoleSpy.mockRestore();
    });

    it('should handle empty calldata', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await writer.write('', { type: 'console' });

      expect(consoleSpy).toHaveBeenCalledWith('\n');
      consoleSpy.mockRestore();
    });

    it('should handle multi-line calldata', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const multiLineCalldata = '0x1234\n0x5678';

      await writer.write(multiLineCalldata, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalledWith(`${multiLineCalldata}\n`);
      consoleSpy.mockRestore();
    });
  });

  describe('write to file', () => {
    it('should write calldata to file with trailing newline', async () => {
      const filePath = 'output/calldata.txt';
      const resolvedPath = path.resolve(filePath);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.write(mockCalldata, { type: 'file', path: filePath });

      expect(fs.writeFile).toHaveBeenCalledWith(resolvedPath, `${mockCalldata}\n`);
      expect(logger.info).toHaveBeenCalledWith('Successfully wrote output to file', {
        outputPath: resolvedPath,
      });
    });

    it('should resolve relative paths to absolute paths', async () => {
      const relativePath = 'output/calldata.txt';
      const expectedAbsolutePath = path.resolve(relativePath);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.write(mockCalldata, { type: 'file', path: relativePath });

      expect(fs.writeFile).toHaveBeenCalledWith(expectedAbsolutePath, expect.any(String));
    });

    it('should handle absolute paths', async () => {
      const absolutePath = '/tmp/calldata.txt';
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.write(mockCalldata, { type: 'file', path: absolutePath });

      expect(fs.writeFile).toHaveBeenCalledWith(absolutePath, `${mockCalldata}\n`);
    });

    it('should not add extra newline if calldata already ends with newline', async () => {
      const filePath = 'output/calldata.txt';
      const calldataWithNewline = `${mockCalldata}\n`;
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.write(calldataWithNewline, { type: 'file', path: filePath });

      expect(fs.writeFile).toHaveBeenCalledWith(path.resolve(filePath), calldataWithNewline);
    });

    it('should propagate file write errors', async () => {
      const filePath = 'output/calldata.txt';
      const writeError = new Error('Permission denied');
      (fs.writeFile as jest.Mock).mockRejectedValue(writeError);

      await expect(writer.write(mockCalldata, { type: 'file', path: filePath })).rejects.toThrow(
        'Permission denied',
      );
    });
  });
});

describe('JsonWriter', () => {
  let writer: JsonWriter;
  const mockJson = { key: 'value', nested: { data: 123 } };
  const mockJsonString = JSON.stringify(mockJson);

  beforeEach(() => {
    jest.clearAllMocks();
    writer = new JsonWriter();
  });

  describe('write to console', () => {
    it('should format and write JSON to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await writer.write(mockJsonString, { type: 'console' });

      // Should output formatted JSON
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
      const firstCall = consoleSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const output = (firstCall?.[0] ?? '') as string;
      expect(output).toContain('key');
      expect(output).toContain('value');
      consoleSpy.mockRestore();
    });

    it('should handle empty JSON object', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const emptyJson = '{}';

      await writer.write(emptyJson, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
      const firstCall = consoleSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const output = (firstCall?.[0] ?? '') as string;
      expect(output.trim()).toBe('{}');
      consoleSpy.mockRestore();
    });

    it('should throw error for invalid JSON', async () => {
      await expect(writer.write('not valid json', { type: 'console' })).rejects.toThrow();
    });
  });

  describe('write to file', () => {
    it('should format and write JSON to file', async () => {
      const filePath = 'output/safe.json';
      const resolvedPath = path.resolve(filePath);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.write(mockJsonString, { type: 'file', path: filePath });

      expect(fs.writeFile).toHaveBeenCalledWith(resolvedPath, expect.any(String));
      expect(logger.info).toHaveBeenCalledWith('Successfully wrote output to file', {
        outputPath: resolvedPath,
      });
    });

    it('should resolve relative paths to absolute paths', async () => {
      const relativePath = 'output/safe.json';
      const expectedAbsolutePath = path.resolve(relativePath);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await writer.write(mockJsonString, { type: 'file', path: relativePath });

      expect(fs.writeFile).toHaveBeenCalledWith(expectedAbsolutePath, expect.any(String));
    });

    it('should propagate file write errors', async () => {
      const filePath = 'output/safe.json';
      const writeError = new Error('Disk full');
      (fs.writeFile as jest.Mock).mockRejectedValue(writeError);

      await expect(writer.write(mockJsonString, { type: 'file', path: filePath })).rejects.toThrow(
        'Disk full',
      );
    });
  });

  describe('JSON parsing', () => {
    it('should handle complex nested JSON', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const complexJson = {
        version: '1.18.0',
        chainId: '84532',
        meta: {
          name: 'Test',
          nested: {
            deep: {
              value: true,
            },
          },
        },
        transactions: [{ to: '0x123', value: '0' }],
      };
      const complexJsonString = JSON.stringify(complexJson);

      await writer.write(complexJsonString, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle JSON with special characters', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const jsonWithSpecialChars = { message: 'Hello "world"' };
      const jsonString = JSON.stringify(jsonWithSpecialChars);

      await writer.write(jsonString, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle JSON arrays', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const jsonArray = [1, 2, 3, { key: 'value' }];
      const jsonString = JSON.stringify(jsonArray);

      await writer.write(jsonString, { type: 'console' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('OutputWriterFactory', () => {
  it('should create CalldataWriter instance', () => {
    const writer = OutputWriterFactory.createCalldataWriter();

    expect(writer).toBeInstanceOf(CalldataWriter);
  });

  it('should create JsonWriter instance', () => {
    const writer = OutputWriterFactory.createJsonWriter();

    expect(writer).toBeInstanceOf(JsonWriter);
  });

  it('should create new instances each time', () => {
    const writer1 = OutputWriterFactory.createCalldataWriter();
    const writer2 = OutputWriterFactory.createCalldataWriter();

    expect(writer1).not.toBe(writer2);
  });

  it('should create different writer types', () => {
    const calldataWriter = OutputWriterFactory.createCalldataWriter();
    const jsonWriter = OutputWriterFactory.createJsonWriter();

    expect(calldataWriter).toBeInstanceOf(CalldataWriter);
    expect(jsonWriter).toBeInstanceOf(JsonWriter);
    expect(calldataWriter).not.toBeInstanceOf(JsonWriter);
    expect(jsonWriter).not.toBeInstanceOf(CalldataWriter);
  });
});

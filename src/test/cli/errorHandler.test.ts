/**
 * Tests for CLI error handling utilities.
 * Covers error formatting, ZodError extraction, and user-facing messages.
 */

import { z, ZodError } from 'zod';

import { CLIError, formatZodError, handleCLIError } from '../../cli/errorHandler';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// Mock process.exit to prevent test from exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Mock console.error to capture output
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatZodError', () => {
    it('should format single field error', () => {
      const schema = z.object({
        name: z.string(),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ name: 123 });
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      expect(zodError).toBeDefined();
      const formatted = formatZodError(zodError!);
      expect(formatted).toContain('name:');
      expect(formatted).toContain('string');
    });

    it('should format nested path errors', () => {
      const schema = z.object({
        config: z.object({
          remoteChainType: z.string(),
        }),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ config: {} });
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      expect(zodError).toBeDefined();
      const formatted = formatZodError(zodError!);
      expect(formatted).toContain('config.remoteChainType:');
    });

    it('should format array index paths', () => {
      const schema = z.tuple([z.array(z.string()), z.array(z.object({ type: z.string() }))]);

      let zodError: ZodError | undefined;
      try {
        schema.parse([[], [{ notType: 'value' }]]);
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      expect(zodError).toBeDefined();
      const formatted = formatZodError(zodError!);
      expect(formatted).toContain('[1][0].type:');
    });

    it('should format multiple errors', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({});
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      expect(zodError).toBeDefined();
      const formatted = formatZodError(zodError!);
      expect(formatted).toContain('name:');
      expect(formatted).toContain('age:');
      expect(formatted).toContain(', ');
    });

    it('should handle empty path (root-level error)', () => {
      const schema = z.string();

      let zodError: ZodError | undefined;
      try {
        schema.parse(123);
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      expect(zodError).toBeDefined();
      const formatted = formatZodError(zodError!);
      // Root-level error should not have a field path prefix (no "fieldName: message" pattern)
      // The message may contain colons in the Zod error text itself
      expect(formatted).not.toMatch(/^[a-zA-Z_]+:/);
      expect(formatted.toLowerCase()).toContain('string');
    });

    it('should format deeply nested paths correctly', () => {
      const schema = z.object({
        level1: z.object({
          level2: z.array(
            z.object({
              level3: z.string(),
            }),
          ),
        }),
      });

      let zodError: ZodError | undefined;
      try {
        schema.parse({ level1: { level2: [{ level3: 123 }] } });
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      expect(zodError).toBeDefined();
      const formatted = formatZodError(zodError!);
      expect(formatted).toContain('level1.level2[0].level3:');
    });
  });

  describe('handleCLIError', () => {
    it('should display ZodError details from cause', () => {
      const schema = z.object({ remoteChainType: z.string() });

      let zodError: ZodError | undefined;
      try {
        schema.parse({});
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      const wrappedError = new Error('Invalid input format');
      (wrappedError as Error & { cause: Error }).cause = zodError!;

      expect(() => handleCLIError(wrappedError, 'generate-chain-update')).toThrow(
        'process.exit called',
      );

      expect(mockConsoleError).toHaveBeenCalledWith('\nError in generate-chain-update:');
      expect(mockConsoleError).toHaveBeenCalledWith('Invalid input format');
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Details:'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('remoteChainType:'));
    });

    it('should display generic cause message for non-Zod errors', () => {
      const originalError = new Error('Connection timeout');
      const wrappedError = new Error('Failed to fetch data');
      (wrappedError as Error & { cause: Error }).cause = originalError;

      expect(() => handleCLIError(wrappedError, 'fetch-data')).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('\nError in fetch-data:');
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to fetch data');
      expect(mockConsoleError).toHaveBeenCalledWith('Caused by: Connection timeout');
    });

    it('should handle CLIError with technical details', () => {
      const cliError = new CLIError('Invalid address format', {
        providedAddress: '0xinvalid',
        expectedFormat: '0x + 40 hex characters',
      });

      expect(() => handleCLIError(cliError, 'validate-address')).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('\nError in validate-address:');
      expect(mockConsoleError).toHaveBeenCalledWith('Invalid address format');
      // Technical details should be logged, not displayed
      expect(logger.error).toHaveBeenCalledWith('validate-address failed', {
        error: 'Invalid address format',
        technicalDetails: {
          providedAddress: '0xinvalid',
          expectedFormat: '0x + 40 hex characters',
        },
      });
    });

    it('should handle CLIError without technical details', () => {
      const cliError = new CLIError('Simple error message');

      expect(() => handleCLIError(cliError, 'simple-command')).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('\nError in simple-command:');
      expect(mockConsoleError).toHaveBeenCalledWith('Simple error message');
      expect(logger.error).toHaveBeenCalledWith('simple-command failed', {
        error: 'Simple error message',
      });
    });

    it('should handle Error without cause', () => {
      const error = new Error('Something went wrong');

      expect(() => handleCLIError(error, 'some-command')).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('\nError in some-command:');
      expect(mockConsoleError).toHaveBeenCalledWith('Something went wrong');
      // Should NOT display any "Caused by" or "Details" line
      expect(mockConsoleError).not.toHaveBeenCalledWith(expect.stringContaining('Caused by:'));
      expect(mockConsoleError).not.toHaveBeenCalledWith(expect.stringContaining('Details:'));
    });

    it('should handle unknown error type', () => {
      const unknownError = 'string error thrown';

      expect(() => handleCLIError(unknownError, 'unknown-command')).toThrow('process.exit called');

      expect(mockConsoleError).toHaveBeenCalledWith('\nUnknown error in unknown-command');
      expect(logger.error).toHaveBeenCalledWith('unknown-command failed with unknown error', {
        error: 'string error thrown',
      });
    });

    it('should log error with stack trace for standard Error', () => {
      const error = new Error('Test error');

      expect(() => handleCLIError(error, 'test-command')).toThrow('process.exit called');

      expect(logger.error).toHaveBeenCalledWith(
        'test-command failed',
        expect.objectContaining({
          error: 'Test error',
          stack: expect.stringContaining('Error: Test error') as unknown,
        }),
      );
    });

    it('should call process.exit with code 1', () => {
      const error = new Error('Any error');

      expect(() => handleCLIError(error, 'any-command')).toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should display nested ZodError from chain update validation', () => {
      // Simulate the exact error structure from chain update validation
      const chainUpdateSchema = z.tuple([
        z.array(z.string()),
        z.array(
          z.object({
            remoteChainSelector: z.string(),
            remotePoolAddresses: z.array(z.string()),
            remoteTokenAddress: z.string(),
            remoteChainType: z.enum(['evm', 'svm', 'mvm']),
          }),
        ),
      ]);

      let zodError: ZodError | undefined;
      try {
        // Missing remoteChainType - exactly what the user experienced
        chainUpdateSchema.parse([
          [],
          [
            {
              remoteChainSelector: '16015286601757825753',
              remotePoolAddresses: ['0x992Aa783128AbaBFd522C27cde4B9A4bD457785e'],
              remoteTokenAddress: '0x885e0E447CdB950798f81bB33B669A640BcB08F2',
            },
          ],
        ]);
      } catch (error) {
        if (error instanceof ZodError) {
          zodError = error;
        }
      }

      const wrappedError = new Error('Invalid input format');
      (wrappedError as Error & { cause: Error }).cause = zodError!;

      expect(() => handleCLIError(wrappedError, 'generate-chain-update')).toThrow(
        'process.exit called',
      );

      // The user should see exactly what field is missing
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[1][0].remoteChainType'),
      );
    });
  });
});

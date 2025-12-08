/**
 * Tests for AsyncErrorHandler
 * Covers async error handling utilities and retry logic
 */

import {
  wrapAsync,
  executeAsync,
  wrapError,
  logError,
  retryAsync,
  Result,
} from '../../errors/AsyncErrorHandler';
import { BaseError, ErrorContext } from '../../errors/BaseError';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// Mock setTimeout to speed up tests
jest.mock('timers/promises', () => ({
  setTimeout: jest.fn((_delay: number) => Promise.resolve()),
}));

class TestError extends BaseError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, 'TEST_ERROR', context, cause);
  }
}

describe('AsyncErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wrapAsync', () => {
    it('should return success result when operation succeeds', async () => {
      const operation = async (): Promise<string> => 'success data';
      const result = await wrapAsync(operation, 'Test operation');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success data');
      }
    });

    it('should return failure result when operation throws Error', async () => {
      const operation = async (): Promise<never> => {
        throw new Error('Operation failed');
      };
      const result = await wrapAsync(operation, 'Test operation');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Test operation');
        expect(result.error.message).toContain('Operation failed');
      }
    });

    it('should wrap non-Error values', async () => {
      const operation = async (): Promise<never> => {
        throw 'string error';
      };
      const result = await wrapAsync(operation, 'Test operation');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Test operation');
      }
    });

    it('should include context in error', async () => {
      const operation = async (): Promise<never> => {
        throw new Error('Failed');
      };
      const context = { userId: '123', action: 'test' };
      const result = await wrapAsync(operation, 'Test operation', context);

      expect(result.success).toBe(false);
    });

    it('should return correct type for successful operations', async () => {
      const operation = async (): Promise<{ foo: string; count: number }> => ({
        foo: 'bar',
        count: 42,
      });
      const result: Result<{ foo: string; count: number }> = await wrapAsync(
        operation,
        'Test operation',
      );

      if (result.success) {
        expect(result.data.foo).toBe('bar');
        expect(result.data.count).toBe(42);
      }
    });

    it('should handle async operations that return promises', async () => {
      const operation = async (): Promise<string> => Promise.resolve('async result');
      const result = await wrapAsync(operation, 'Test operation');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('async result');
      }
    });
  });

  describe('executeAsync', () => {
    it('should return result when operation succeeds', async () => {
      const operation = async (): Promise<string> => 'success';
      const result = await executeAsync(operation, TestError, 'Test operation');

      expect(result).toBe('success');
    });

    it('should throw custom error when operation fails with Error', async () => {
      const operation = async (): Promise<never> => {
        throw new Error('Original error');
      };

      await expect(executeAsync(operation, TestError, 'Test operation')).rejects.toThrow(TestError);
      await expect(executeAsync(operation, TestError, 'Test operation')).rejects.toThrow(
        'Test operation',
      );
    });

    it('should throw custom error when operation fails with non-Error', async () => {
      const operation = async (): Promise<never> => {
        throw 'string error';
      };

      await expect(executeAsync(operation, TestError, 'Test operation')).rejects.toThrow(TestError);
    });

    it('should include context in thrown error', async () => {
      const operation = async (): Promise<never> => {
        throw new Error('Failed');
      };
      const context = { key: 'value' };

      try {
        await executeAsync(operation, TestError, 'Test operation', context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TestError);
        if (error instanceof TestError) {
          expect(error.context).toEqual(context);
        }
      }
    });

    it('should preserve original error as cause', async () => {
      const originalError = new Error('Original');
      const operation = async (): Promise<never> => {
        throw originalError;
      };

      try {
        await executeAsync(operation, TestError, 'Test operation');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TestError);
        if (error instanceof TestError) {
          expect(error.cause).toBe(originalError);
        }
      }
    });
  });

  describe('wrapError', () => {
    it('should wrap Error with enhanced message', () => {
      const originalError = new Error('Original message');
      const wrapped = wrapError(originalError, 'Operation failed');

      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('Operation failed: Original message');
      expect(wrapped.cause).toBe(originalError);
    });

    it('should preserve stack trace from original Error', () => {
      const originalError = new Error('Original');
      const originalStack = originalError.stack;
      const wrapped = wrapError(originalError, 'Wrapped');

      expect(wrapped.stack).toBe(originalStack);
    });

    it('should handle Error without stack', () => {
      const originalError = new Error('Original');
      delete originalError.stack;
      const wrapped = wrapError(originalError, 'Wrapped');

      expect(wrapped.message).toBe('Wrapped: Original');
    });

    it('should create new Error for string', () => {
      const wrapped = wrapError('string error', 'Operation failed');

      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('Operation failed');
    });

    it('should create new Error for number', () => {
      const wrapped = wrapError(42, 'Operation failed');

      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('Operation failed');
    });

    it('should create new Error for object', () => {
      const wrapped = wrapError({ error: 'details' }, 'Operation failed');

      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.message).toBe('Operation failed');
    });

    it('should log non-Error values with context', () => {
      const context = { key: 'value' };
      wrapError('string error', 'Operation failed', context);

      expect(logger.error).toHaveBeenCalledWith('Non-Error value caught', {
        error: 'string error',
        context,
      });
    });

    it('should not log when wrapping Error', () => {
      const originalError = new Error('Original');
      wrapError(originalError, 'Wrapped');

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should log BaseError with toJSON', () => {
      const error = new TestError('Test error', { userId: '123' });
      logError(error, 'test operation', { additional: 'context' });

      expect(logger.error).toHaveBeenCalledWith('test operation failed', {
        ...error.toJSON(),
        additionalContext: { additional: 'context' },
      });
    });

    it('should log regular Error', () => {
      const error = new Error('Regular error');
      logError(error, 'test operation', { key: 'value' });

      expect(logger.error).toHaveBeenCalledWith('test operation failed', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context: { key: 'value' },
      });
    });

    it('should log unknown error type', () => {
      const error = 'string error';
      logError(error, 'test operation', { key: 'value' });

      expect(logger.error).toHaveBeenCalledWith('test operation failed with unknown error', {
        error: 'string error',
        context: { key: 'value' },
      });
    });

    it('should handle error without context', () => {
      const error = new Error('Test');
      logError(error, 'test operation');

      expect(logger.error).toHaveBeenCalledWith('test operation failed', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context: undefined,
      });
    });

    it('should log BaseError without additional context', () => {
      const error = new TestError('Test error');
      logError(error, 'test operation');

      expect(logger.error).toHaveBeenCalledWith('test operation failed', {
        ...error.toJSON(),
        additionalContext: undefined,
      });
    });
  });

  describe('retryAsync', () => {
    const { setTimeout: mockSetTimeout } = jest.requireMock<{
      setTimeout: jest.Mock<Promise<void>, [number]>;
    }>('timers/promises');

    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await retryAsync(operation, 3, 1000);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await retryAsync(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff delays', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      await retryAsync(operation, 3, 100);

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, 100); // 100 * 2^0
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, 200); // 100 * 2^1
    });

    it('should throw last error after max retries', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(retryAsync(operation, 2, 100)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should log retry attempts', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      await retryAsync(operation, 3, 100);

      expect(logger.warn).toHaveBeenCalledWith('Retry attempt 1/3 after 100ms', {
        error: 'Fail',
      });
    });

    it('should handle non-Error throws', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(retryAsync(operation, 2, 100)).rejects.toThrow('string error');
    });

    it('should use default maxRetries and baseDelay', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await retryAsync(operation);

      expect(result).toBe('success');
    });

    it('should retry correct number of times with custom maxRetries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      await expect(retryAsync(operation, 5, 100)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(6); // Initial + 5 retries
    });

    it('should handle undefined throw by converting to error', async () => {
      // This is an edge case that shouldn't happen in practice
      const operation = jest.fn().mockImplementation(() => {
        throw undefined;
      });

      await expect(retryAsync(operation, 1, 100)).rejects.toThrow('undefined');
    });

    it('should calculate correct delays for multiple retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockRejectedValueOnce(new Error('3'))
        .mockResolvedValue('success');

      await retryAsync(operation, 5, 1000);

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, 1000); // 2^0
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, 2000); // 2^1
      expect(mockSetTimeout).toHaveBeenNthCalledWith(3, 4000); // 2^2
    });
  });
});

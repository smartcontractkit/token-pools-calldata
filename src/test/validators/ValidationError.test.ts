/**
 * Tests for ValidationError and validation result helpers
 */

import {
  ValidationError,
  validationSuccess,
  validationFailure,
} from '../../validators/ValidationError';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create error with message only', () => {
      const error = new ValidationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
    });

    it('should create error with message and field', () => {
      const error = new ValidationError('Invalid address', 'tokenAddress');

      expect(error.message).toBe('Invalid address');
      expect(error.field).toBe('tokenAddress');
      expect(error.value).toBeUndefined();
    });

    it('should create error with message, field, and value', () => {
      const error = new ValidationError('Invalid address', 'safe', '0xInvalid');

      expect(error.message).toBe('Invalid address');
      expect(error.field).toBe('safe');
      expect(error.value).toBe('0xInvalid');
    });

    it('should be instanceof Error', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });
});

describe('validationSuccess', () => {
  it('should create success result with data', () => {
    const result = validationSuccess('valid data');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('valid data');
    }
  });

  it('should work with complex objects', () => {
    const data = { address: '0x123', chainId: 1 };
    const result = validationSuccess(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(data);
    }
  });

  it('should work with arrays', () => {
    const data = [1, 2, 3];
    const result = validationSuccess(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });
});

describe('validationFailure', () => {
  it('should create failure result with message only', () => {
    const result = validationFailure<string>('Validation failed');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toBe('Validation failed');
      expect(result.error.field).toBeUndefined();
      expect(result.error.value).toBeUndefined();
    }
  });

  it('should create failure result with message and field', () => {
    const result = validationFailure<string>('Invalid format', 'chainId');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Invalid format');
      expect(result.error.field).toBe('chainId');
    }
  });

  it('should create failure result with message, field, and value', () => {
    const result = validationFailure<string>('Invalid address', 'token', '0xBad');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Invalid address');
      expect(result.error.field).toBe('token');
      expect(result.error.value).toBe('0xBad');
    }
  });

  it('should work with generic types', () => {
    const result = validationFailure<{ id: number }>('ID must be positive', 'id', -1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.value).toBe(-1);
    }
  });
});

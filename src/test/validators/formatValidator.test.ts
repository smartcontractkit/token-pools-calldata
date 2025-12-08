/**
 * Tests for formatValidator
 * Covers Safe JSON format parameter validation
 */

import { validateSafeJsonParams } from '../../validators/formatValidator';
import { ValidationError } from '../../validators/ValidationError';
import { VALIDATION_ERRORS } from '../../config';
import { VALID_ADDRESSES } from '../helpers/fixtures';

describe('validateSafeJsonParams', () => {
  const validChainId = '84532';
  const validSafeAddress = VALID_ADDRESSES.safe;
  const validOwnerAddress = VALID_ADDRESSES.owner;

  describe('valid parameters', () => {
    it('should accept all required parameters', () => {
      expect(() =>
        validateSafeJsonParams(validChainId, validSafeAddress, validOwnerAddress),
      ).not.toThrow();
    });

    it('should accept different chain IDs', () => {
      expect(() => validateSafeJsonParams('1', validSafeAddress, validOwnerAddress)).not.toThrow();
      expect(() =>
        validateSafeJsonParams('11155111', validSafeAddress, validOwnerAddress),
      ).not.toThrow();
      expect(() =>
        validateSafeJsonParams('137', validSafeAddress, validOwnerAddress),
      ).not.toThrow();
    });

    it('should accept various valid addresses', () => {
      expect(() =>
        validateSafeJsonParams(validChainId, VALID_ADDRESSES.deployer, VALID_ADDRESSES.receiver),
      ).not.toThrow();
    });

    it('should accept zero address as owner', () => {
      expect(() =>
        validateSafeJsonParams(validChainId, validSafeAddress, VALID_ADDRESSES.owner),
      ).not.toThrow();
    });
  });

  describe('missing chainId', () => {
    it('should throw when chainId is undefined', () => {
      expect(() => validateSafeJsonParams(undefined, validSafeAddress, validOwnerAddress)).toThrow(
        ValidationError,
      );
    });

    it('should throw when chainId is empty string', () => {
      expect(() => validateSafeJsonParams('', validSafeAddress, validOwnerAddress)).toThrow(
        ValidationError,
      );
    });

    it('should use MISSING_SAFE_JSON_PARAMS error message', () => {
      try {
        validateSafeJsonParams(undefined, validSafeAddress, validOwnerAddress);
      } catch (error) {
        expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.MISSING_SAFE_JSON_PARAMS);
      }
    });
  });

  describe('missing safeAddress', () => {
    it('should throw when safeAddress is undefined', () => {
      expect(() => validateSafeJsonParams(validChainId, undefined, validOwnerAddress)).toThrow(
        ValidationError,
      );
    });

    it('should throw when safeAddress is empty string', () => {
      expect(() => validateSafeJsonParams(validChainId, '', validOwnerAddress)).toThrow(
        ValidationError,
      );
    });

    it('should use MISSING_SAFE_JSON_PARAMS error message', () => {
      try {
        validateSafeJsonParams(validChainId, undefined, validOwnerAddress);
      } catch (error) {
        expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.MISSING_SAFE_JSON_PARAMS);
      }
    });
  });

  describe('missing ownerAddress', () => {
    it('should throw when ownerAddress is undefined', () => {
      expect(() => validateSafeJsonParams(validChainId, validSafeAddress, undefined)).toThrow(
        ValidationError,
      );
    });

    it('should throw when ownerAddress is empty string', () => {
      expect(() => validateSafeJsonParams(validChainId, validSafeAddress, '')).toThrow(
        ValidationError,
      );
    });

    it('should use MISSING_SAFE_JSON_PARAMS error message', () => {
      try {
        validateSafeJsonParams(validChainId, validSafeAddress, undefined);
      } catch (error) {
        expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.MISSING_SAFE_JSON_PARAMS);
      }
    });
  });

  describe('multiple missing parameters', () => {
    it('should throw when all parameters are undefined', () => {
      expect(() => validateSafeJsonParams(undefined, undefined, undefined)).toThrow(
        ValidationError,
      );
    });

    it('should throw when all parameters are empty strings', () => {
      expect(() => validateSafeJsonParams('', '', '')).toThrow(ValidationError);
    });

    it('should throw when chainId and safeAddress are missing', () => {
      expect(() => validateSafeJsonParams(undefined, undefined, validOwnerAddress)).toThrow(
        ValidationError,
      );
    });

    it('should throw when chainId and ownerAddress are missing', () => {
      expect(() => validateSafeJsonParams(undefined, validSafeAddress, undefined)).toThrow(
        ValidationError,
      );
    });

    it('should throw when safeAddress and ownerAddress are missing', () => {
      expect(() => validateSafeJsonParams(validChainId, undefined, undefined)).toThrow(
        ValidationError,
      );
    });
  });

  describe('edge cases', () => {
    it('should accept numeric-looking chain IDs as strings', () => {
      expect(() =>
        validateSafeJsonParams('12345678901234567890', validSafeAddress, validOwnerAddress),
      ).not.toThrow();
    });

    it('should accept chain ID "0"', () => {
      expect(() => validateSafeJsonParams('0', validSafeAddress, validOwnerAddress)).not.toThrow();
    });

    it('should handle whitespace-only chainId as truthy but unusual', () => {
      // Note: whitespace is truthy in JavaScript, so this won't throw
      expect(() =>
        validateSafeJsonParams('   ', validSafeAddress, validOwnerAddress),
      ).not.toThrow();
    });

    it('should handle addresses that are not validated for format here', () => {
      // formatValidator only checks for presence, not format
      // Address format validation is done by addressValidator
      expect(() =>
        validateSafeJsonParams(validChainId, 'not-a-real-address', 'also-not-valid'),
      ).not.toThrow();
    });
  });

  describe('error properties', () => {
    it('should throw ValidationError instance', () => {
      try {
        validateSafeJsonParams(undefined, validSafeAddress, validOwnerAddress);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });

    it('should set error name to ValidationError', () => {
      try {
        validateSafeJsonParams(undefined, validSafeAddress, validOwnerAddress);
      } catch (error) {
        expect((error as ValidationError).name).toBe('ValidationError');
      }
    });
  });
});

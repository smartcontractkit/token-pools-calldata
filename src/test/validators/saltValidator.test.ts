/**
 * Tests for saltValidator
 * Covers CREATE2 salt validation
 */

import { validateSalt } from '../../validators/saltValidator';
import { ValidationError } from '../../validators/ValidationError';
import { VALIDATION_ERRORS } from '../../config';
import { VALID_SALTS, INVALID_SALTS } from '../helpers/fixtures';

describe('validateSalt', () => {
  describe('valid salts', () => {
    it('should accept valid zero salt', () => {
      expect(() => validateSalt(VALID_SALTS.zero)).not.toThrow();
    });

    it('should accept valid sequential salt', () => {
      expect(() => validateSalt(VALID_SALTS.sequential)).not.toThrow();
    });

    it('should accept valid random salt', () => {
      expect(() => validateSalt(VALID_SALTS.random)).not.toThrow();
    });

    it('should accept lowercase hex salt', () => {
      const lowercaseSalt = VALID_SALTS.random.toLowerCase();
      expect(() => validateSalt(lowercaseSalt)).not.toThrow();
    });

    it('should accept uppercase hex salt', () => {
      const uppercaseSalt = '0x' + VALID_SALTS.random.slice(2).toUpperCase();
      expect(() => validateSalt(uppercaseSalt)).not.toThrow();
    });

    it('should accept mixed case hex salt', () => {
      const mixedCaseSalt = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890';
      expect(() => validateSalt(mixedCaseSalt)).not.toThrow();
    });

    it('should accept salt with all same digits', () => {
      const allOnes = '0x' + '1'.repeat(64);
      expect(() => validateSalt(allOnes)).not.toThrow();
    });

    it('should accept salt with all F digits', () => {
      const allFs = '0x' + 'f'.repeat(64);
      expect(() => validateSalt(allFs)).not.toThrow();
    });
  });

  describe('missing salt', () => {
    it('should throw for undefined salt', () => {
      expect(() => validateSalt(undefined)).toThrow(ValidationError);
    });

    it('should throw for empty string salt', () => {
      expect(() => validateSalt('')).toThrow(ValidationError);
    });

    it('should use SALT_REQUIRED error message for missing salt', () => {
      try {
        validateSalt(undefined);
      } catch (error) {
        expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.SALT_REQUIRED);
        expect((error as ValidationError).field).toBe('salt');
      }
    });
  });

  describe('invalid salt length', () => {
    it('should throw for salt too short', () => {
      expect(() => validateSalt(INVALID_SALTS.tooShort)).toThrow(ValidationError);
    });

    it('should throw for salt too long', () => {
      expect(() => validateSalt(INVALID_SALTS.tooLong)).toThrow(ValidationError);
    });

    it('should include helpful message for wrong length', () => {
      try {
        validateSalt(INVALID_SALTS.tooShort);
      } catch (error) {
        expect((error as ValidationError).message).toContain('32-byte');
        expect((error as ValidationError).message).toContain('64 hex characters');
      }
    });

    it('should include salt value in error', () => {
      try {
        validateSalt(INVALID_SALTS.tooShort);
      } catch (error) {
        expect((error as ValidationError).value).toBe(INVALID_SALTS.tooShort);
      }
    });
  });

  describe('invalid salt format', () => {
    it('should throw for salt without 0x prefix', () => {
      // May throw TypeError from ethers (invalid BytesLike) or ValidationError
      expect(() => validateSalt(INVALID_SALTS.missing0x)).toThrow();
    });

    it('should throw for salt with invalid hex characters', () => {
      // ethers.dataLength throws TypeError for invalid hex
      expect(() => validateSalt(INVALID_SALTS.notHex)).toThrow();
    });

    it('should throw for salt with only 0x prefix', () => {
      // ethers.dataLength will return 0, triggering ValidationError
      expect(() => validateSalt('0x')).toThrow();
    });

    it('should throw for salt with spaces', () => {
      const saltWithSpaces = '0x 0000000000000000000000000000000000000000000000000000000000000000';
      // May throw TypeError from ethers or ValidationError
      expect(() => validateSalt(saltWithSpaces)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 31 bytes (too short by 1)', () => {
      const thirtyOneBytes = '0x' + '00'.repeat(31);
      expect(() => validateSalt(thirtyOneBytes)).toThrow(ValidationError);
    });

    it('should handle exactly 33 bytes (too long by 1)', () => {
      const thirtyThreeBytes = '0x' + '00'.repeat(33);
      expect(() => validateSalt(thirtyThreeBytes)).toThrow(ValidationError);
    });

    it('should handle salt with leading zeros', () => {
      const leadingZeros = '0x0000000000000000000000000000000000000000000000000000000000000001';
      expect(() => validateSalt(leadingZeros)).not.toThrow();
    });

    it('should handle salt that looks like a number', () => {
      const numberLikeSalt = '0x0000000000000000000000000000000000000000000000000000000000000123';
      expect(() => validateSalt(numberLikeSalt)).not.toThrow();
    });

    it('should handle whitespace-only string', () => {
      // May throw TypeError from ethers or ValidationError
      expect(() => validateSalt('   ')).toThrow();
    });

    it('should handle salt with newline', () => {
      const saltWithNewline = VALID_SALTS.zero + '\n';
      // Salt with newline should be rejected as it changes the string
      expect(() => validateSalt(saltWithNewline)).toThrow();
    });
  });

  describe('ValidationError properties', () => {
    it('should set field to "salt" for missing salt', () => {
      try {
        validateSalt(undefined);
      } catch (error) {
        expect((error as ValidationError).field).toBe('salt');
      }
    });

    it('should set field to "salt" for invalid salt', () => {
      try {
        validateSalt(INVALID_SALTS.tooShort);
      } catch (error) {
        expect((error as ValidationError).field).toBe('salt');
      }
    });

    it('should not include value for missing salt', () => {
      try {
        validateSalt(undefined);
      } catch (error) {
        expect((error as ValidationError).value).toBeUndefined();
      }
    });

    it('should include value for invalid salt', () => {
      try {
        validateSalt(INVALID_SALTS.tooShort);
      } catch (error) {
        expect((error as ValidationError).value).toBe(INVALID_SALTS.tooShort);
      }
    });
  });
});

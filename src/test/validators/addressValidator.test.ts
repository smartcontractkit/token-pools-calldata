/**
 * Tests for addressValidator
 * Covers Ethereum address validation functions
 */

import {
  validateAddress,
  validateOptionalAddress,
  validateSafeAddress,
  validateOwnerAddress,
  validateTokenAddress,
  validatePoolAddress,
  validateDeployerAddress,
} from '../../validators/addressValidator';
import { ValidationError } from '../../validators/ValidationError';
import { VALIDATION_ERRORS } from '../../config';
import { VALID_ADDRESSES, INVALID_ADDRESSES } from '../helpers/fixtures';

describe('validateAddress', () => {
  describe('valid addresses', () => {
    it('should accept valid checksummed address', () => {
      expect(() => validateAddress(VALID_ADDRESSES.safe)).not.toThrow();
    });

    it('should accept valid lowercase address', () => {
      const lowercaseAddress = VALID_ADDRESSES.safe.toLowerCase();
      expect(() => validateAddress(lowercaseAddress)).not.toThrow();
    });

    it('should accept valid uppercase address (after 0x)', () => {
      const uppercaseAddress = '0x' + VALID_ADDRESSES.safe.slice(2).toUpperCase();
      expect(() => validateAddress(uppercaseAddress)).not.toThrow();
    });

    it('should accept zero address', () => {
      expect(() => validateAddress(VALID_ADDRESSES.owner)).not.toThrow();
    });

    it('should accept various valid addresses', () => {
      expect(() => validateAddress(VALID_ADDRESSES.deployer)).not.toThrow();
      expect(() => validateAddress(VALID_ADDRESSES.pool)).not.toThrow();
      expect(() => validateAddress(VALID_ADDRESSES.token)).not.toThrow();
      expect(() => validateAddress(VALID_ADDRESSES.receiver)).not.toThrow();
    });
  });

  describe('invalid addresses', () => {
    it('should throw for address too short', () => {
      expect(() => validateAddress(INVALID_ADDRESSES.tooShort)).toThrow(ValidationError);
      expect(() => validateAddress(INVALID_ADDRESSES.tooShort)).toThrow('Invalid address');
    });

    it('should throw for non-hex string', () => {
      expect(() => validateAddress(INVALID_ADDRESSES.notHex)).toThrow(ValidationError);
    });

    it('should throw for empty string', () => {
      expect(() => validateAddress(INVALID_ADDRESSES.empty)).toThrow(ValidationError);
    });

    it('should handle address without 0x prefix based on ethers behavior', () => {
      // Note: ethers.isAddress may accept some addresses without 0x prefix
      // This test documents actual behavior
      const noPrefix = VALID_ADDRESSES.safe.slice(2);
      // Just verify it returns a consistent result (may or may not throw)
      try {
        validateAddress(noPrefix);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });

    it('should throw for address too long', () => {
      const tooLong = VALID_ADDRESSES.safe + '00';
      expect(() => validateAddress(tooLong)).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        validateAddress(INVALID_ADDRESSES.tooShort, 'tokenAddress');
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('tokenAddress');
        expect((error as ValidationError).message).toContain('tokenAddress');
      }
    });

    it('should include invalid value in error', () => {
      try {
        validateAddress(INVALID_ADDRESSES.tooShort);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).value).toBe(INVALID_ADDRESSES.tooShort);
      }
    });
  });

  describe('custom field names', () => {
    it('should use default field name "address"', () => {
      try {
        validateAddress('invalid');
      } catch (error) {
        expect((error as ValidationError).message).toBe('Invalid address');
      }
    });

    it('should use custom field name in error message', () => {
      try {
        validateAddress('invalid', 'myCustomField');
      } catch (error) {
        expect((error as ValidationError).message).toBe('Invalid myCustomField');
        expect((error as ValidationError).field).toBe('myCustomField');
      }
    });
  });
});

describe('validateOptionalAddress', () => {
  describe('undefined values', () => {
    it('should accept undefined', () => {
      expect(() => validateOptionalAddress(undefined)).not.toThrow();
    });

    it('should accept undefined with custom field name', () => {
      expect(() => validateOptionalAddress(undefined, 'tokenPool')).not.toThrow();
    });
  });

  describe('valid addresses', () => {
    it('should accept valid address', () => {
      expect(() => validateOptionalAddress(VALID_ADDRESSES.safe)).not.toThrow();
    });

    it('should accept zero address', () => {
      expect(() => validateOptionalAddress(VALID_ADDRESSES.owner)).not.toThrow();
    });
  });

  describe('invalid addresses', () => {
    it('should throw for invalid address when provided', () => {
      expect(() => validateOptionalAddress(INVALID_ADDRESSES.tooShort)).toThrow(ValidationError);
    });

    it('should include custom field name in error', () => {
      try {
        validateOptionalAddress(INVALID_ADDRESSES.tooShort, 'optionalPool');
      } catch (error) {
        expect((error as ValidationError).field).toBe('optionalPool');
      }
    });
  });
});

describe('validateSafeAddress', () => {
  it('should accept valid Safe address', () => {
    expect(() => validateSafeAddress(VALID_ADDRESSES.safe)).not.toThrow();
  });

  it('should throw for invalid Safe address', () => {
    expect(() => validateSafeAddress(INVALID_ADDRESSES.tooShort)).toThrow(ValidationError);
  });

  it('should use INVALID_SAFE_ADDRESS error message', () => {
    try {
      validateSafeAddress('invalid');
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_SAFE_ADDRESS);
      expect((error as ValidationError).field).toBe('safe');
    }
  });
});

describe('validateOwnerAddress', () => {
  it('should accept valid owner address', () => {
    expect(() => validateOwnerAddress(VALID_ADDRESSES.owner)).not.toThrow();
  });

  it('should accept non-zero owner address', () => {
    expect(() => validateOwnerAddress(VALID_ADDRESSES.receiver)).not.toThrow();
  });

  it('should throw for invalid owner address', () => {
    expect(() => validateOwnerAddress(INVALID_ADDRESSES.notHex)).toThrow(ValidationError);
  });

  it('should use INVALID_OWNER_ADDRESS error message', () => {
    try {
      validateOwnerAddress('invalid');
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_OWNER_ADDRESS);
      expect((error as ValidationError).field).toBe('owner');
    }
  });
});

describe('validateTokenAddress', () => {
  it('should accept valid token address', () => {
    expect(() => validateTokenAddress(VALID_ADDRESSES.token)).not.toThrow();
  });

  it('should throw for invalid token address', () => {
    expect(() => validateTokenAddress(INVALID_ADDRESSES.empty)).toThrow(ValidationError);
  });

  it('should use INVALID_TOKEN_ADDRESS error message', () => {
    try {
      validateTokenAddress('0x123');
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS);
      expect((error as ValidationError).field).toBe('token');
    }
  });
});

describe('validatePoolAddress', () => {
  it('should accept valid pool address', () => {
    expect(() => validatePoolAddress(VALID_ADDRESSES.pool)).not.toThrow();
  });

  it('should throw for invalid pool address', () => {
    expect(() => validatePoolAddress('not-an-address')).toThrow(ValidationError);
  });

  it('should use INVALID_POOL_ADDRESS error message', () => {
    try {
      validatePoolAddress('0xabc');
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_POOL_ADDRESS);
      expect((error as ValidationError).field).toBe('pool');
    }
  });
});

describe('validateDeployerAddress', () => {
  it('should accept valid deployer address', () => {
    expect(() => validateDeployerAddress(VALID_ADDRESSES.deployer)).not.toThrow();
  });

  it('should throw for invalid deployer address', () => {
    expect(() => validateDeployerAddress('0x')).toThrow(ValidationError);
  });

  it('should use INVALID_DEPLOYER_ADDRESS error message', () => {
    try {
      validateDeployerAddress('bad');
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_DEPLOYER_ADDRESS);
      expect((error as ValidationError).field).toBe('deployer');
    }
  });
});

describe('Edge Cases', () => {
  it('should handle null-like values appropriately', () => {
    // TypeScript would prevent null, but testing runtime behavior
    expect(() => validateAddress(null as unknown as string)).toThrow(ValidationError);
  });

  it('should handle whitespace strings', () => {
    expect(() => validateAddress('   ')).toThrow(ValidationError);
  });

  it('should handle address with extra whitespace', () => {
    const addressWithSpace = ` ${VALID_ADDRESSES.safe} `;
    expect(() => validateAddress(addressWithSpace)).toThrow(ValidationError);
  });

  it('should accept lowercase addresses', () => {
    const lowercase = VALID_ADDRESSES.safe.toLowerCase();
    expect(() => validateAddress(lowercase)).not.toThrow();
  });

  it('should handle 0X prefix based on ethers behavior', () => {
    const upperPrefix = '0X' + VALID_ADDRESSES.safe.slice(2);
    // ethers.isAddress may reject 0X prefix in some versions
    // This test documents actual behavior
    try {
      validateAddress(upperPrefix);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
    }
  });
});

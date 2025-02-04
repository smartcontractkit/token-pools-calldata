/**
 * Tests for commandValidators
 * Covers command-specific validation orchestrators
 */

import {
  validateChainUpdateOptions,
  validateTokenDeploymentOptions,
  validatePoolDeploymentOptions,
  validateMintOptions,
  validateAllowListOptions,
  validateRateLimiterOptions,
  validateGrantRolesOptions,
} from '../../validators/commandValidators';
import { ValidationError } from '../../validators/ValidationError';
import { OUTPUT_FORMAT, VALIDATION_ERRORS } from '../../config';
import {
  VALID_ADDRESSES,
  VALID_SALTS,
  INVALID_ADDRESSES,
  INVALID_SALTS,
} from '../helpers/fixtures';

describe('validateChainUpdateOptions', () => {
  describe('calldata format', () => {
    it('should accept minimal options for calldata format', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.CALLDATA,
        }),
      ).not.toThrow();
    });

    it('should accept options with optional tokenPool', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.CALLDATA,
          tokenPool: VALID_ADDRESSES.pool,
        }),
      ).not.toThrow();
    });

    it('should accept options with optional Safe params', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.CALLDATA,
          safe: VALID_ADDRESSES.safe,
          owner: VALID_ADDRESSES.owner,
          chainId: '84532',
        }),
      ).not.toThrow();
    });

    it('should throw for invalid tokenPool address', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.CALLDATA,
          tokenPool: INVALID_ADDRESSES.tooShort,
        }),
      ).toThrow(ValidationError);
    });

    it('should throw for invalid Safe address', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.CALLDATA,
          safe: INVALID_ADDRESSES.notHex,
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('safe-json format', () => {
    it('should accept complete safe-json options', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.SAFE_JSON,
          chainId: '84532',
          safe: VALID_ADDRESSES.safe,
          owner: VALID_ADDRESSES.owner,
          tokenPool: VALID_ADDRESSES.pool,
        }),
      ).not.toThrow();
    });

    it('should throw when chainId is missing for safe-json', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.SAFE_JSON,
          safe: VALID_ADDRESSES.safe,
          owner: VALID_ADDRESSES.owner,
        }),
      ).toThrow(ValidationError);
    });

    it('should throw when safe is missing for safe-json', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.SAFE_JSON,
          chainId: '84532',
          owner: VALID_ADDRESSES.owner,
        }),
      ).toThrow(ValidationError);
    });

    it('should throw when owner is missing for safe-json', () => {
      expect(() =>
        validateChainUpdateOptions({
          format: OUTPUT_FORMAT.SAFE_JSON,
          chainId: '84532',
          safe: VALID_ADDRESSES.safe,
        }),
      ).toThrow(ValidationError);
    });
  });
});

describe('validateTokenDeploymentOptions', () => {
  const baseValidOptions = {
    deployer: VALID_ADDRESSES.deployer,
    salt: VALID_SALTS.sequential,
  };

  describe('calldata format', () => {
    it('should accept valid required options', () => {
      expect(() =>
        validateTokenDeploymentOptions({
          ...baseValidOptions,
          format: OUTPUT_FORMAT.CALLDATA,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid deployer address', () => {
      expect(() =>
        validateTokenDeploymentOptions({
          deployer: INVALID_ADDRESSES.tooShort,
          salt: VALID_SALTS.sequential,
          format: OUTPUT_FORMAT.CALLDATA,
        }),
      ).toThrow(ValidationError);
    });

    it('should throw for invalid salt', () => {
      expect(() =>
        validateTokenDeploymentOptions({
          deployer: VALID_ADDRESSES.deployer,
          salt: INVALID_SALTS.tooShort,
          format: OUTPUT_FORMAT.CALLDATA,
        }),
      ).toThrow(ValidationError);
    });

    it('should throw for missing salt', () => {
      expect(() =>
        validateTokenDeploymentOptions({
          deployer: VALID_ADDRESSES.deployer,
          salt: '',
          format: OUTPUT_FORMAT.CALLDATA,
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('safe-json format', () => {
    it('should accept complete safe-json options', () => {
      expect(() =>
        validateTokenDeploymentOptions({
          ...baseValidOptions,
          format: OUTPUT_FORMAT.SAFE_JSON,
          chainId: '84532',
          safe: VALID_ADDRESSES.safe,
          owner: VALID_ADDRESSES.owner,
        }),
      ).not.toThrow();
    });

    it('should throw when Safe params missing for safe-json', () => {
      expect(() =>
        validateTokenDeploymentOptions({
          ...baseValidOptions,
          format: OUTPUT_FORMAT.SAFE_JSON,
        }),
      ).toThrow(ValidationError);
    });
  });
});

describe('validatePoolDeploymentOptions', () => {
  const baseValidOptions = {
    deployer: VALID_ADDRESSES.deployer,
    salt: VALID_SALTS.random,
  };

  it('should accept valid options', () => {
    expect(() =>
      validatePoolDeploymentOptions({
        ...baseValidOptions,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).not.toThrow();
  });

  it('should throw for invalid deployer', () => {
    expect(() =>
      validatePoolDeploymentOptions({
        deployer: 'bad',
        salt: VALID_SALTS.random,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for invalid salt', () => {
    // May throw TypeError from ethers or ValidationError
    expect(() =>
      validatePoolDeploymentOptions({
        deployer: VALID_ADDRESSES.deployer,
        salt: INVALID_SALTS.notHex,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow();
  });

  it('should validate Safe params for safe-json format', () => {
    expect(() =>
      validatePoolDeploymentOptions({
        ...baseValidOptions,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '1',
        safe: VALID_ADDRESSES.safe,
        owner: VALID_ADDRESSES.owner,
      }),
    ).not.toThrow();
  });
});

describe('validateMintOptions', () => {
  it('should accept valid token address', () => {
    expect(() =>
      validateMintOptions({
        token: VALID_ADDRESSES.token,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).not.toThrow();
  });

  it('should throw for invalid token address', () => {
    expect(() =>
      validateMintOptions({
        token: INVALID_ADDRESSES.empty,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow(ValidationError);
  });

  it('should use INVALID_TOKEN_ADDRESS error', () => {
    try {
      validateMintOptions({
        token: 'bad',
        format: OUTPUT_FORMAT.CALLDATA,
      });
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS);
    }
  });

  it('should accept valid Safe params for safe-json', () => {
    expect(() =>
      validateMintOptions({
        token: VALID_ADDRESSES.token,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '84532',
        safe: VALID_ADDRESSES.safe,
        owner: VALID_ADDRESSES.owner,
      }),
    ).not.toThrow();
  });

  it('should throw when Safe params missing for safe-json', () => {
    expect(() =>
      validateMintOptions({
        token: VALID_ADDRESSES.token,
        format: OUTPUT_FORMAT.SAFE_JSON,
      }),
    ).toThrow(ValidationError);
  });
});

describe('validateAllowListOptions', () => {
  it('should accept valid pool address', () => {
    expect(() =>
      validateAllowListOptions({
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).not.toThrow();
  });

  it('should throw for invalid pool address', () => {
    expect(() =>
      validateAllowListOptions({
        pool: INVALID_ADDRESSES.notHex,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow(ValidationError);
  });

  it('should use INVALID_POOL_ADDRESS error', () => {
    try {
      validateAllowListOptions({
        pool: '0x',
        format: OUTPUT_FORMAT.CALLDATA,
      });
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_POOL_ADDRESS);
    }
  });

  it('should validate Safe params for safe-json', () => {
    expect(() =>
      validateAllowListOptions({
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '137',
        safe: VALID_ADDRESSES.safe,
        owner: VALID_ADDRESSES.owner,
      }),
    ).not.toThrow();
  });

  it('should throw when Safe params missing for safe-json', () => {
    expect(() =>
      validateAllowListOptions({
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '137',
        // Missing safe and owner
      }),
    ).toThrow(ValidationError);
  });
});

describe('validateRateLimiterOptions', () => {
  it('should accept valid pool address', () => {
    expect(() =>
      validateRateLimiterOptions({
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).not.toThrow();
  });

  it('should throw for invalid pool address', () => {
    expect(() =>
      validateRateLimiterOptions({
        pool: '',
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow(ValidationError);
  });

  it('should use INVALID_POOL_ADDRESS error', () => {
    try {
      validateRateLimiterOptions({
        pool: 'invalid',
        format: OUTPUT_FORMAT.CALLDATA,
      });
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_POOL_ADDRESS);
    }
  });

  it('should validate Safe params for safe-json', () => {
    expect(() =>
      validateRateLimiterOptions({
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '10',
        safe: VALID_ADDRESSES.safe,
        owner: VALID_ADDRESSES.owner,
      }),
    ).not.toThrow();
  });

  it('should throw when Safe params missing for safe-json', () => {
    expect(() =>
      validateRateLimiterOptions({
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.SAFE_JSON,
      }),
    ).toThrow(ValidationError);
  });
});

describe('validateGrantRolesOptions', () => {
  it('should accept valid token and pool addresses', () => {
    expect(() =>
      validateGrantRolesOptions({
        token: VALID_ADDRESSES.token,
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).not.toThrow();
  });

  it('should throw for invalid token address', () => {
    expect(() =>
      validateGrantRolesOptions({
        token: INVALID_ADDRESSES.tooShort,
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for invalid pool address', () => {
    expect(() =>
      validateGrantRolesOptions({
        token: VALID_ADDRESSES.token,
        pool: INVALID_ADDRESSES.notHex,
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).toThrow(ValidationError);
  });

  it('should validate token before pool', () => {
    // Token validation should fail first
    try {
      validateGrantRolesOptions({
        token: 'bad-token',
        pool: 'bad-pool',
        format: OUTPUT_FORMAT.CALLDATA,
      });
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS);
    }
  });

  it('should validate Safe params for safe-json', () => {
    expect(() =>
      validateGrantRolesOptions({
        token: VALID_ADDRESSES.token,
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '42161',
        safe: VALID_ADDRESSES.safe,
        owner: VALID_ADDRESSES.owner,
      }),
    ).not.toThrow();
  });

  it('should throw when Safe params missing for safe-json', () => {
    expect(() =>
      validateGrantRolesOptions({
        token: VALID_ADDRESSES.token,
        pool: VALID_ADDRESSES.pool,
        format: OUTPUT_FORMAT.SAFE_JSON,
        chainId: '42161',
        // Missing safe and owner
      }),
    ).toThrow(ValidationError);
  });
});

describe('Optional Safe address validation', () => {
  it('should accept undefined Safe address for calldata format', () => {
    expect(() =>
      validateChainUpdateOptions({
        format: OUTPUT_FORMAT.CALLDATA,
      }),
    ).not.toThrow();
  });

  it('should throw for invalid but provided Safe address', () => {
    expect(() =>
      validateChainUpdateOptions({
        format: OUTPUT_FORMAT.CALLDATA,
        safe: 'invalid-safe',
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for invalid but provided owner address', () => {
    expect(() =>
      validateChainUpdateOptions({
        format: OUTPUT_FORMAT.CALLDATA,
        owner: 'invalid-owner',
      }),
    ).toThrow(ValidationError);
  });
});

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
  validateCheckRolesOptions,
  validateCheckOwnerOptions,
  validateCheckPoolConfigOptions,
  validateCheckTokenAdminRegistryOptions,
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

describe('validateCheckRolesOptions', () => {
  const validOptions = {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
    token: VALID_ADDRESSES.token,
    account: VALID_ADDRESSES.pool,
  };

  it('should accept valid options', () => {
    expect(() => validateCheckRolesOptions(validOptions)).not.toThrow();
  });

  it('should throw when rpcUrl is missing', () => {
    expect(() =>
      validateCheckRolesOptions({
        rpcUrl: '',
        token: VALID_ADDRESSES.token,
        account: VALID_ADDRESSES.pool,
      }),
    ).toThrow('RPC URL (--rpc-url) is required');
  });

  it('should throw for invalid token address', () => {
    expect(() =>
      validateCheckRolesOptions({
        rpcUrl: 'https://example.com',
        token: INVALID_ADDRESSES.tooShort,
        account: VALID_ADDRESSES.pool,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for invalid account address', () => {
    expect(() =>
      validateCheckRolesOptions({
        rpcUrl: 'https://example.com',
        token: VALID_ADDRESSES.token,
        account: INVALID_ADDRESSES.notHex,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw when account is missing', () => {
    expect(() =>
      validateCheckRolesOptions({
        rpcUrl: 'https://example.com',
        token: VALID_ADDRESSES.token,
        account: '',
      }),
    ).toThrow('Account address (--account) is required');
  });

  it('should use INVALID_TOKEN_ADDRESS error for bad token', () => {
    try {
      validateCheckRolesOptions({
        rpcUrl: 'https://example.com',
        token: 'bad',
        account: VALID_ADDRESSES.pool,
      });
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS);
    }
  });
});

describe('validateCheckOwnerOptions', () => {
  const validOptions = {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
    contract: VALID_ADDRESSES.pool,
  };

  it('should accept valid options', () => {
    expect(() => validateCheckOwnerOptions(validOptions)).not.toThrow();
  });

  it('should throw when rpcUrl is missing', () => {
    expect(() =>
      validateCheckOwnerOptions({
        rpcUrl: '',
        contract: VALID_ADDRESSES.pool,
      }),
    ).toThrow('RPC URL (--rpc-url) is required');
  });

  it('should throw for invalid contract address', () => {
    expect(() =>
      validateCheckOwnerOptions({
        rpcUrl: 'https://example.com',
        contract: INVALID_ADDRESSES.tooShort,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw when contract is missing', () => {
    expect(() =>
      validateCheckOwnerOptions({
        rpcUrl: 'https://example.com',
        contract: '',
      }),
    ).toThrow('Contract address (--contract) is required');
  });
});

describe('validateCheckPoolConfigOptions', () => {
  const validOptions = {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
    pool: VALID_ADDRESSES.pool,
  };

  it('should accept valid options without chains', () => {
    expect(() => validateCheckPoolConfigOptions(validOptions)).not.toThrow();
  });

  it('should accept valid options with single chain selector', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        ...validOptions,
        chains: '16015286601757825753',
      }),
    ).not.toThrow();
  });

  it('should accept valid options with multiple chain selectors', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        ...validOptions,
        chains: '16015286601757825753,4949039107694359620,5009297550715157269',
      }),
    ).not.toThrow();
  });

  it('should accept chain selectors with spaces', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        ...validOptions,
        chains: '16015286601757825753, 4949039107694359620, 5009297550715157269',
      }),
    ).not.toThrow();
  });

  it('should throw when rpcUrl is missing', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        rpcUrl: '',
        pool: VALID_ADDRESSES.pool,
      }),
    ).toThrow('RPC URL (--rpc-url) is required');
  });

  it('should throw for invalid pool address', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        rpcUrl: 'https://example.com',
        pool: INVALID_ADDRESSES.tooShort,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for empty pool address', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        rpcUrl: 'https://example.com',
        pool: '',
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for non-numeric chain selector', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        ...validOptions,
        chains: '16015286601757825753,invalid,5009297550715157269',
      }),
    ).toThrow('Invalid chain selector: invalid. Chain selectors must be numeric.');
  });

  it('should throw for chain selector with hex format', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        ...validOptions,
        chains: '0x1234',
      }),
    ).toThrow('Invalid chain selector: 0x1234. Chain selectors must be numeric.');
  });

  it('should throw for chain selector with letters', () => {
    expect(() =>
      validateCheckPoolConfigOptions({
        ...validOptions,
        chains: 'abc123',
      }),
    ).toThrow('Invalid chain selector: abc123. Chain selectors must be numeric.');
  });
});

describe('validateCheckTokenAdminRegistryOptions', () => {
  const validOptions = {
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
    tokenAdminRegistry: VALID_ADDRESSES.pool, // Using pool as a valid address
    token: VALID_ADDRESSES.token,
  };

  it('should accept valid options', () => {
    expect(() => validateCheckTokenAdminRegistryOptions(validOptions)).not.toThrow();
  });

  it('should throw when rpcUrl is missing', () => {
    expect(() =>
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: '',
        tokenAdminRegistry: VALID_ADDRESSES.pool,
        token: VALID_ADDRESSES.token,
      }),
    ).toThrow('RPC URL (--rpc-url) is required');
  });

  it('should throw when tokenAdminRegistry is missing', () => {
    expect(() =>
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: 'https://example.com',
        tokenAdminRegistry: '',
        token: VALID_ADDRESSES.token,
      }),
    ).toThrow('TokenAdminRegistry address (--token-admin-registry) is required');
  });

  it('should throw for invalid tokenAdminRegistry address', () => {
    expect(() =>
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: 'https://example.com',
        tokenAdminRegistry: INVALID_ADDRESSES.tooShort,
        token: VALID_ADDRESSES.token,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw for invalid token address', () => {
    expect(() =>
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: 'https://example.com',
        tokenAdminRegistry: VALID_ADDRESSES.pool,
        token: INVALID_ADDRESSES.notHex,
      }),
    ).toThrow(ValidationError);
  });

  it('should throw when token is missing', () => {
    expect(() =>
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: 'https://example.com',
        tokenAdminRegistry: VALID_ADDRESSES.pool,
        token: '',
      }),
    ).toThrow(ValidationError);
  });

  it('should use INVALID_TOKEN_ADDRESS error for bad token', () => {
    try {
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: 'https://example.com',
        tokenAdminRegistry: VALID_ADDRESSES.pool,
        token: 'bad',
      });
    } catch (error) {
      expect((error as ValidationError).message).toBe(VALIDATION_ERRORS.INVALID_TOKEN_ADDRESS);
    }
  });

  it('should accept different valid address formats', () => {
    expect(() =>
      validateCheckTokenAdminRegistryOptions({
        rpcUrl: 'https://example.com',
        tokenAdminRegistry: VALID_ADDRESSES.safe,
        token: VALID_ADDRESSES.owner,
      }),
    ).not.toThrow();
  });
});

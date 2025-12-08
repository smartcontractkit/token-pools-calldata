/**
 * Tests for type guards
 * Covers runtime type checking for all type predicates
 */

import {
  isObject,
  parseJSON,
  isTokenDeploymentParams,
  isPoolDeploymentParams,
  isMintParams,
  isAllowListUpdatesInput,
  isSetChainRateLimiterConfigInput,
  isRoleManagementParams,
} from '../../types/typeGuards';

describe('isObject', () => {
  it('should return true for plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ foo: 'bar' })).toBe(true);
    expect(isObject({ nested: { obj: true } })).toBe(true);
  });

  it('should return false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(isObject([])).toBe(false);
    expect(isObject([1, 2, 3])).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isObject('string')).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });

  it('should return false for functions', () => {
    expect(isObject(() => {})).toBe(false);
    expect(isObject(function () {})).toBe(false);
  });
});

describe('parseJSON', () => {
  it('should parse valid JSON and validate type', () => {
    const json = '{"name":"test","symbol":"TST","decimals":18}';
    const result = parseJSON(json, isTokenDeploymentParams);
    expect(result).toEqual({ name: 'test', symbol: 'TST', decimals: 18 });
  });

  it('should throw error for invalid JSON structure', () => {
    const json = '{"invalid":"structure"}';
    expect(() => parseJSON(json, isTokenDeploymentParams)).toThrow('Invalid JSON structure');
  });

  it('should throw error for malformed JSON', () => {
    const json = 'not valid json';
    expect(() => parseJSON(json, isTokenDeploymentParams)).toThrow();
  });

  it('should work with different validators', () => {
    const json = '{"receiver":"0x123","amount":"100"}';
    const result = parseJSON(json, isMintParams);
    expect(result).toEqual({ receiver: '0x123', amount: '100' });
  });
});

describe('isTokenDeploymentParams', () => {
  it('should return true for valid TokenDeploymentParams', () => {
    const valid = {
      name: 'Test Token',
      symbol: 'TST',
      decimals: 18,
      maxSupply: '1000000',
      preMint: '0',
      remoteTokenPools: [],
    };
    expect(isTokenDeploymentParams(valid)).toBe(true);
  });

  it('should return true for minimal valid params', () => {
    const valid = {
      name: 'Test',
      symbol: 'T',
      decimals: 6,
    };
    expect(isTokenDeploymentParams(valid)).toBe(true);
  });

  it('should return false for missing name', () => {
    const invalid = {
      symbol: 'TST',
      decimals: 18,
    };
    expect(isTokenDeploymentParams(invalid)).toBe(false);
  });

  it('should return false for missing symbol', () => {
    const invalid = {
      name: 'Test',
      decimals: 18,
    };
    expect(isTokenDeploymentParams(invalid)).toBe(false);
  });

  it('should return false for missing decimals', () => {
    const invalid = {
      name: 'Test',
      symbol: 'TST',
    };
    expect(isTokenDeploymentParams(invalid)).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(isTokenDeploymentParams({ name: 123, symbol: 'TST', decimals: 18 })).toBe(false);
    expect(isTokenDeploymentParams({ name: 'Test', symbol: 123, decimals: 18 })).toBe(false);
    expect(isTokenDeploymentParams({ name: 'Test', symbol: 'TST', decimals: '18' })).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isTokenDeploymentParams(null)).toBe(false);
    expect(isTokenDeploymentParams('string')).toBe(false);
    expect(isTokenDeploymentParams([])).toBe(false);
  });
});

describe('isPoolDeploymentParams', () => {
  it('should return true for valid PoolDeploymentParams', () => {
    const valid = {
      token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      decimals: 18,
      poolType: 'BurnMintTokenPool',
      remoteTokenPools: [],
    };
    expect(isPoolDeploymentParams(valid)).toBe(true);
  });

  it('should return true for minimal valid params', () => {
    const valid = {
      token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
      poolType: 'LockReleaseTokenPool',
    };
    expect(isPoolDeploymentParams(valid)).toBe(true);
  });

  it('should return false for missing token', () => {
    const invalid = {
      poolType: 'BurnMintTokenPool',
    };
    expect(isPoolDeploymentParams(invalid)).toBe(false);
  });

  it('should return false for missing poolType', () => {
    const invalid = {
      token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
    };
    expect(isPoolDeploymentParams(invalid)).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(isPoolDeploymentParams({ token: 123, poolType: 'BurnMintTokenPool' })).toBe(false);
    expect(isPoolDeploymentParams({ token: '0x123', poolType: 123 })).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isPoolDeploymentParams(null)).toBe(false);
    expect(isPoolDeploymentParams([])).toBe(false);
  });
});

describe('isMintParams', () => {
  it('should return true for valid MintParams', () => {
    const valid = {
      receiver: '0x1234567890123456789012345678901234567890',
      amount: '1000000000000000000',
    };
    expect(isMintParams(valid)).toBe(true);
  });

  it('should return false for missing receiver', () => {
    const invalid = {
      amount: '1000',
    };
    expect(isMintParams(invalid)).toBe(false);
  });

  it('should return false for missing amount', () => {
    const invalid = {
      receiver: '0x123',
    };
    expect(isMintParams(invalid)).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(isMintParams({ receiver: 123, amount: '1000' })).toBe(false);
    expect(isMintParams({ receiver: '0x123', amount: 1000 })).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isMintParams(null)).toBe(false);
    expect(isMintParams('string')).toBe(false);
  });
});

describe('isAllowListUpdatesInput', () => {
  it('should return true for valid input with both arrays', () => {
    const valid = {
      adds: ['0x123', '0x456'],
      removes: ['0x789'],
    };
    expect(isAllowListUpdatesInput(valid)).toBe(true);
  });

  it('should return true for empty arrays', () => {
    const valid = {
      adds: [],
      removes: [],
    };
    expect(isAllowListUpdatesInput(valid)).toBe(true);
  });

  it('should return true when adds is undefined', () => {
    const valid = {
      removes: ['0x123'],
    };
    expect(isAllowListUpdatesInput(valid)).toBe(true);
  });

  it('should return true when removes is undefined', () => {
    const valid = {
      adds: ['0x123'],
    };
    expect(isAllowListUpdatesInput(valid)).toBe(true);
  });

  it('should return true when both are undefined', () => {
    const valid = {};
    expect(isAllowListUpdatesInput(valid)).toBe(true);
  });

  it('should return false when adds is not an array', () => {
    const invalid = {
      adds: 'not-array',
      removes: [],
    };
    expect(isAllowListUpdatesInput(invalid)).toBe(false);
  });

  it('should return false when removes is not an array', () => {
    const invalid = {
      adds: [],
      removes: 'not-array',
    };
    expect(isAllowListUpdatesInput(invalid)).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isAllowListUpdatesInput(null)).toBe(false);
    expect(isAllowListUpdatesInput([])).toBe(false);
  });
});

describe('isSetChainRateLimiterConfigInput', () => {
  it('should return true for valid input', () => {
    const valid = {
      remoteChainSelector: '16015286601757825753',
      outboundConfig: { isEnabled: true, capacity: '1000', rate: '100' },
      inboundConfig: { isEnabled: false, capacity: '0', rate: '0' },
    };
    expect(isSetChainRateLimiterConfigInput(valid)).toBe(true);
  });

  it('should return false for missing remoteChainSelector', () => {
    const invalid = {
      outboundConfig: { isEnabled: true },
      inboundConfig: { isEnabled: false },
    };
    expect(isSetChainRateLimiterConfigInput(invalid)).toBe(false);
  });

  it('should return false for missing outboundConfig', () => {
    const invalid = {
      remoteChainSelector: '123',
      inboundConfig: { isEnabled: false },
    };
    expect(isSetChainRateLimiterConfigInput(invalid)).toBe(false);
  });

  it('should return false for missing inboundConfig', () => {
    const invalid = {
      remoteChainSelector: '123',
      outboundConfig: { isEnabled: true },
    };
    expect(isSetChainRateLimiterConfigInput(invalid)).toBe(false);
  });

  it('should return false when outboundConfig is not an object', () => {
    const invalid = {
      remoteChainSelector: '123',
      outboundConfig: 'not-object',
      inboundConfig: {},
    };
    expect(isSetChainRateLimiterConfigInput(invalid)).toBe(false);
  });

  it('should return false when inboundConfig is not an object', () => {
    const invalid = {
      remoteChainSelector: '123',
      outboundConfig: {},
      inboundConfig: 'not-object',
    };
    expect(isSetChainRateLimiterConfigInput(invalid)).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(
      isSetChainRateLimiterConfigInput({
        remoteChainSelector: 123,
        outboundConfig: {},
        inboundConfig: {},
      }),
    ).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isSetChainRateLimiterConfigInput(null)).toBe(false);
    expect(isSetChainRateLimiterConfigInput([])).toBe(false);
  });
});

describe('isRoleManagementParams', () => {
  it('should return true for valid RoleManagementParams', () => {
    const valid = {
      pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      roleType: 'both',
      action: 'grant',
    };
    expect(isRoleManagementParams(valid)).toBe(true);
  });

  it('should return true for minimal valid params', () => {
    const valid = {
      pool: '0x123',
      roleType: 'mint',
    };
    expect(isRoleManagementParams(valid)).toBe(true);
  });

  it('should return false for missing pool', () => {
    const invalid = {
      roleType: 'mint',
    };
    expect(isRoleManagementParams(invalid)).toBe(false);
  });

  it('should return false for missing roleType', () => {
    const invalid = {
      pool: '0x123',
    };
    expect(isRoleManagementParams(invalid)).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(isRoleManagementParams({ pool: 123, roleType: 'mint' })).toBe(false);
    expect(isRoleManagementParams({ pool: '0x123', roleType: 123 })).toBe(false);
  });

  it('should return false for non-objects', () => {
    expect(isRoleManagementParams(null)).toBe(false);
    expect(isRoleManagementParams('string')).toBe(false);
  });
});

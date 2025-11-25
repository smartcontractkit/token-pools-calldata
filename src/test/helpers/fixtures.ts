/**
 * Shared test fixtures
 * Common test data used across multiple test files
 */

import { ChainType, ChainUpdateInput } from '../../types/chainUpdate';
import { RateLimiterConfig } from '../../types/poolDeployment';

/**
 * Valid Ethereum addresses for testing
 */
export const VALID_ADDRESSES = {
  deployer: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
  safe: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
  pool: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  token: '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05',
  receiver: '0x1234567890123456789012345678901234567890',
  owner: '0x0000000000000000000000000000000000000000',
} as const;

/**
 * Valid Solana addresses for testing SVM chains
 */
export const VALID_SOLANA_ADDRESSES = {
  pool: '11111111111111111111111111111112',
  token: 'So11111111111111111111111111111111111111112',
  tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
} as const;

/**
 * Invalid addresses for negative testing
 */
export const INVALID_ADDRESSES = {
  tooShort: '0x12abc1234def',
  notHex: 'not-an-address',
  invalidSolana: 'invalid-solana-address',
  empty: '',
} as const;

/**
 * Valid salt values (32 bytes)
 */
export const VALID_SALTS = {
  zero: '0x0000000000000000000000000000000000000000000000000000000000000000',
  sequential: '0x0000000000000000000000000000000000000000000000000000000123456789',
  random: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
} as const;

/**
 * Invalid salt values for negative testing
 */
export const INVALID_SALTS = {
  tooShort: '0x123456',
  tooLong: '0x' + '1'.repeat(66),
  notHex: '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  missing0x: '0000000000000000000000000000000000000000000000000000000000000000',
} as const;

/**
 * Valid chain selectors
 */
export const VALID_CHAIN_SELECTORS = {
  ethereum: '5009297550715157269',
  baseMainnet: '15971525489660198786',
  baseSepolia: '10344971235874465080',
  arbitrumMainnet: '4949039107694359620',
  sepolia: '12532609583862916517',
} as const;

/**
 * Valid rate limiter configuration
 */
export const VALID_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  isEnabled: true,
  capacity: '1000000',
  rate: '100000',
} as const;

/**
 * Disabled rate limiter configuration
 */
export const DISABLED_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  isEnabled: false,
  capacity: '0',
  rate: '0',
} as const;

/**
 * Base chain update input for EVM chains
 */
export const BASE_EVM_CHAIN_UPDATE: Partial<ChainUpdateInput> = {
  remoteChainSelector: VALID_CHAIN_SELECTORS.sepolia,
  remotePoolAddresses: [VALID_ADDRESSES.pool],
  remoteTokenAddress: VALID_ADDRESSES.token,
  outboundRateLimiterConfig: VALID_RATE_LIMITER_CONFIG,
  inboundRateLimiterConfig: VALID_RATE_LIMITER_CONFIG,
  remoteChainType: ChainType.EVM,
} as const;

/**
 * Base chain update input for SVM chains
 */
export const BASE_SVM_CHAIN_UPDATE: Partial<ChainUpdateInput> = {
  remoteChainSelector: '1234567890123456789',
  remotePoolAddresses: [VALID_SOLANA_ADDRESSES.pool],
  remoteTokenAddress: VALID_SOLANA_ADDRESSES.token,
  outboundRateLimiterConfig: VALID_RATE_LIMITER_CONFIG,
  inboundRateLimiterConfig: VALID_RATE_LIMITER_CONFIG,
  remoteChainType: ChainType.SVM,
} as const;

/**
 * Token deployment parameters for testing
 */
export const VALID_TOKEN_PARAMS = {
  name: 'Test Token',
  symbol: 'TEST',
  decimals: 18,
  maxSupply: '1000000000000000000000000',
  preMint: '0',
  burnerAddress: VALID_ADDRESSES.owner,
  poolType: 'BurnMintTokenPool' as const,
} as const;

/**
 * Pool deployment parameters for testing
 */
export const VALID_POOL_PARAMS = {
  token: VALID_ADDRESSES.token,
  decimals: 18,
  poolType: 'BurnMintTokenPool' as const,
} as const;

/**
 * Mint parameters for testing
 */
export const VALID_MINT_PARAMS = {
  receiver: VALID_ADDRESSES.receiver,
  amount: '1000000000000000000000',
} as const;

/**
 * Role management parameters for testing
 */
export const VALID_ROLE_PARAMS = {
  pool: VALID_ADDRESSES.pool,
  roleType: 'both' as const,
  action: 'grant' as const,
} as const;

import { z } from 'zod';
import { ethers } from 'ethers';

// Pool type discriminator (matches contract's PoolType enum)
export const poolTypeSchema = z.enum(['BurnMintTokenPool', 'LockReleaseTokenPool']);

// Schema for rate limiter configuration
export const rateLimiterConfigSchema = z.object({
  isEnabled: z.boolean(),
  capacity: z.string(), // BigNumber as string
  rate: z.string(), // BigNumber as string
});

// Schema for remote chain configuration
export const remoteChainConfigSchema = z.object({
  remotePoolFactory: z.string(),
  remoteRouter: z.string(),
  remoteRMNProxy: z.string(),
  remoteTokenDecimals: z.number(),
});

// Schema for remote token pool information (user input)
export const remoteTokenPoolInfoSchema = z.object({
  remoteChainSelector: z.string(), // BigNumber as string
  remotePoolAddress: z.string(),
  remotePoolInitCode: z.string(),
  remoteChainConfig: remoteChainConfigSchema,
  poolType: poolTypeSchema,
  remoteTokenAddress: z.string(),
  remoteTokenInitCode: z.string(),
  rateLimiterConfig: rateLimiterConfigSchema,
});

// Schema for pool deployment parameters (matches contract function parameters)
export const poolDeploymentParamsSchema = z.object({
  token: z.string().refine((address: string): boolean => ethers.isAddress(address), {
    message: 'Invalid Ethereum address format for token',
  }),
  decimals: z.number(),
  remoteTokenPools: z.array(remoteTokenPoolInfoSchema).optional().default([]),
  poolType: poolTypeSchema,
});

export type PoolType = z.infer<typeof poolTypeSchema>;
export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;
export type RemoteChainConfig = z.infer<typeof remoteChainConfigSchema>;
export type RemoteTokenPoolInfo = z.infer<typeof remoteTokenPoolInfoSchema>;
export type PoolDeploymentParams = z.infer<typeof poolDeploymentParamsSchema>;

// Contract-specific types (with numeric pool type)
export type ContractRemoteTokenPoolInfo = Omit<RemoteTokenPoolInfo, 'poolType'> & {
  poolType: number;
};

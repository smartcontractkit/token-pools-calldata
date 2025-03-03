import { z } from 'zod';

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

// Schema for remote token pool information
export const remoteTokenPoolInfoSchema = z.object({
  remoteChainSelector: z.string(), // BigNumber as string
  remotePoolAddress: z.string(),
  remotePoolInitCode: z.string(),
  remoteChainConfig: remoteChainConfigSchema,
  poolType: z.number(),
  remoteTokenAddress: z.string(),
  remoteTokenInitCode: z.string(),
  rateLimiterConfig: rateLimiterConfigSchema,
});

// Schema for BurnMintERC20 constructor parameters
export const tokenDeploymentParamsSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  maxSupply: z.string(), // BigNumber as string
  preMint: z.string(), // BigNumber as string
  remoteTokenPools: z.array(remoteTokenPoolInfoSchema).optional().default([]),
});

export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;
export type RemoteChainConfig = z.infer<typeof remoteChainConfigSchema>;
export type RemoteTokenPoolInfo = z.infer<typeof remoteTokenPoolInfoSchema>;
export type TokenDeploymentParams = z.infer<typeof tokenDeploymentParamsSchema>;

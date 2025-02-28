import { z } from 'zod';

// Pool type discriminator
export const poolTypeSchema = z.enum(['BurnMintTokenPool', 'LockReleaseTokenPool']);

// Common pool parameters
const basePoolParamsSchema = z.object({
  token: z.string(),
  decimals: z.number(),
  allowlist: z.array(z.string()),
  owner: z.string(),
  ccipRouter: z.string(),
});

// BurnMintTokenPool specific parameters
export const burnMintTokenPoolParamsSchema = basePoolParamsSchema;

// LockReleaseTokenPool specific parameters
export const lockReleaseTokenPoolParamsSchema = basePoolParamsSchema.extend({
  armProxy: z.string(),
  acceptLiquidity: z.boolean().optional().default(true),
});

// Combined pool deployment parameters
export const poolDeploymentParamsSchema = z.object({
  poolType: poolTypeSchema,
  poolParams: z.union([burnMintTokenPoolParamsSchema, lockReleaseTokenPoolParamsSchema]),
});

export type PoolType = z.infer<typeof poolTypeSchema>;
export type BurnMintTokenPoolParams = z.infer<typeof burnMintTokenPoolParamsSchema>;
export type LockReleaseTokenPoolParams = z.infer<typeof lockReleaseTokenPoolParamsSchema>;
export type PoolDeploymentParams = z.infer<typeof poolDeploymentParamsSchema>;

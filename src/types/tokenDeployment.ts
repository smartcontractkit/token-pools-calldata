import { z } from 'zod';

// Schema for BurnMintERC20 constructor parameters
export const tokenDeploymentParamsSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  maxSupply: z.string(), // BigNumber as string
  preMint: z.string(), // BigNumber as string
});

export type TokenDeploymentParams = z.infer<typeof tokenDeploymentParamsSchema>;

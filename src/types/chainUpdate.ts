import { z } from 'zod';

// Schema for rate limiter configuration
export const rateLimiterConfigSchema = z.object({
  isEnabled: z.boolean(),
  capacity: z.string(), // BigNumber as string
  rate: z.string(), // BigNumber as string
});

// Schema for a single chain update
export const chainUpdateSchema = z.object({
  remoteChainSelector: z.string(), // BigNumber as string
  remotePoolAddresses: z.array(z.string()), // Array of addresses
  remoteTokenAddress: z.string(), // Address
  outboundRateLimiterConfig: rateLimiterConfigSchema,
  inboundRateLimiterConfig: rateLimiterConfigSchema,
});

// Schema for the entire chain updates input
export const chainUpdatesInputSchema = z.tuple([
  z.array(z.string()), // Chain selectors to remove
  z.array(chainUpdateSchema), // Chain updates to add
]);

export type RateLimiterConfig = z.infer<typeof rateLimiterConfigSchema>;
export type ChainUpdateInput = z.infer<typeof chainUpdateSchema>;
export type ChainUpdatesInput = z.infer<typeof chainUpdatesInputSchema>;

// Safe Transaction Builder types
export interface SafeChainUpdateMetadata {
  chainId: string;
  safeAddress: string;
  ownerAddress: string;
  tokenPoolAddress: string;
}

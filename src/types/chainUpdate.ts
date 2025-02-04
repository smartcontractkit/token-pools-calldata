import { z } from 'zod';
import { ethers } from 'ethers';

// Helper function to validate Ethereum address
const validateAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

// Zod schema for rate limiter configuration
const rateLimiterConfigSchema = z
  .object({
    isEnabled: z.boolean(),
    capacity: z
      .string()
      .or(z.number())
      .transform((val) => BigInt(val)),
    rate: z
      .string()
      .or(z.number())
      .transform((val) => BigInt(val)),
  })
  .refine(
    (data) => {
      return data.isEnabled ? data.rate > BigInt(0) && data.capacity > BigInt(0) : true;
    },
    {
      message: 'Rate and capacity must be greater than 0 when rate limiter is enabled',
    },
  );

// Zod schema for chain update
const chainUpdateSchema = z.object({
  remoteChainSelector: z
    .string()
    .or(z.number())
    .transform((val) => BigInt(val)),
  remotePoolAddresses: z.array(
    z.string().refine(validateAddress, 'Invalid Ethereum address format'),
  ),
  remoteTokenAddress: z.string().refine(validateAddress, 'Invalid Ethereum address format'),
  outboundRateLimiterConfig: rateLimiterConfigSchema,
  inboundRateLimiterConfig: rateLimiterConfigSchema,
});

// Schema for the entire input structure
export const chainUpdatesInputSchema = z.tuple([
  z.array(
    z
      .string()
      .or(z.number())
      .transform((val) => BigInt(val)),
  ), // chain selectors to remove
  z.array(chainUpdateSchema), // chains to add
]);

// Export types for use in other files
export type ChainUpdateInput = z.infer<typeof chainUpdateSchema>;
export type ChainUpdatesInput = z.infer<typeof chainUpdatesInputSchema>;

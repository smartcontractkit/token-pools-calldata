/**
 * @fileoverview Rate limiter configuration transaction generator for token pools.
 *
 * This module generates transactions for configuring per-chain rate limiters on token
 * pool contracts. Rate limiters control the maximum rate and capacity of token transfers
 * to/from specific remote chains, providing protection against exploits and ensuring
 * controlled cross-chain token flow.
 *
 * @module generators/rateLimiterConfig
 */

import { ethers } from 'ethers';
import { setChainRateLimiterConfigSchema } from '../types/rateLimiter';
import { SafeTransactionDataBase, SafeOperationType } from '../types/safe';
import { DEFAULTS } from '../config';
import { RateLimiterConfigError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Generator interface for token pool rate limiter configuration transactions.
 *
 * Generates transactions for configuring rate limiters on token pool contracts for
 * specific remote chains. Each chain connection has independent inbound and outbound
 * rate limiters that control token transfer rates and capacities.
 *
 * @remarks
 * The generator validates input parameters, encodes the `setChainRateLimiterConfig`
 * function call with chain selector and rate limiter configurations, and returns
 * transaction data ready for execution.
 *
 * @public
 */
export interface RateLimiterConfigGenerator {
  /**
   * Generates a rate limiter configuration transaction for a specific chain.
   *
   * @param inputJson - JSON string containing chain selector and rate limiter configurations
   * @param tokenPoolAddress - Address of the TokenPool contract
   *
   * @returns Transaction data containing target address, encoded function call, and operation type
   *
   * @throws {RateLimiterConfigError} When validation fails or transaction generation fails
   *
   * @see {@link setChainRateLimiterConfigSchema} for input JSON schema
   * @see {@link SafeTransactionDataBase} for return type structure
   */
  generate(inputJson: string, tokenPoolAddress: string): Promise<SafeTransactionDataBase>;
}

/**
 * Creates a rate limiter configuration transaction generator.
 *
 * Factory function that creates a generator for configuring per-chain rate limiters on
 * token pools. Rate limiters implement a token bucket algorithm to control transfer rates
 * and capacities, providing security and risk management for cross-chain token transfers.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPool)
 *
 * @returns Generator instance implementing {@link RateLimiterConfigGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates token pool address format
 * 2. Validates input JSON against Zod schema (chain selector, configs)
 * 3. Encodes TokenPool `setChainRateLimiterConfig` function call
 * 4. Returns transaction data ready for execution
 *
 * Rate Limiter Concepts:
 * - **Capacity**: Maximum token amount that can accumulate in the bucket (string, in token wei)
 * - **Rate**: Token refill rate per second (string, in token wei per second)
 * - **Inbound**: Limits tokens coming into this chain from the remote chain
 * - **Outbound**: Limits tokens going out of this chain to the remote chain
 * - **Enabled**: Boolean flag to enable/disable the rate limiter
 *
 * Token Bucket Algorithm:
 * - Bucket starts at capacity
 * - Each transfer consumes tokens from the bucket
 * - Bucket refills at the specified rate per second
 * - Transfers fail if bucket doesn't have enough tokens
 * - Prevents burst transfers beyond capacity
 *
 * Common Configurations:
 * - **Conservative**: Low rate, low capacity (high security, low throughput)
 * - **Moderate**: Balanced rate and capacity (typical production)
 * - **Permissive**: High rate, high capacity (testing, high-volume use cases)
 * - **Disabled**: isEnabled=false (no rate limiting, maximum risk)
 *
 * @example
 * ```typescript
 * const generator = createRateLimiterConfigGenerator(logger, interfaceProvider);
 *
 * // Configure moderate rate limiting for Ethereum Sepolia
 * const inputJson = JSON.stringify({
 *   remoteChainSelector: "16015286601757825753", // Ethereum Sepolia
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",  // 1000 tokens max bucket
 *     rate: "100000000000000000"           // 0.1 tokens per second refill
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",  // 1000 tokens max bucket
 *     rate: "100000000000000000"           // 0.1 tokens per second refill
 *   }
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   "0x779877A7B0D9E8603169DdbD7836e478b4624789" // Pool address
 * );
 *
 * console.log(transaction.to);     // Pool contract address
 * console.log(transaction.data);   // Encoded setChainRateLimiterConfig call
 * console.log(transaction.value);  // "0" (no ETH sent)
 * console.log(transaction.operation); // SafeOperationType.Call
 *
 * // Execute via Safe multisig
 * ```
 *
 * @example
 * ```typescript
 * // Disable rate limiting for a chain (maximum risk)
 * const inputJson = JSON.stringify({
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: {
 *     isEnabled: false,
 *     capacity: "0",
 *     rate: "0"
 *   },
 *   inboundConfig: {
 *     isEnabled: false,
 *     capacity: "0",
 *     rate: "0"
 *   }
 * });
 *
 * const transaction = await generator.generate(inputJson, poolAddress);
 * // No rate limiting - all transfers allowed (use with caution)
 * ```
 *
 * @example
 * ```typescript
 * // Conservative configuration for high-security chain
 * const inputJson = JSON.stringify({
 *   remoteChainSelector: "10344971235874465080", // Base Sepolia
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "100000000000000000000",   // 100 tokens max
 *     rate: "10000000000000000"            // 0.01 tokens/sec (slow refill)
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "100000000000000000000",   // 100 tokens max
 *     rate: "10000000000000000"            // 0.01 tokens/sec (slow refill)
 *   }
 * });
 *
 * const transaction = await generator.generate(inputJson, poolAddress);
 * ```
 *
 * @example
 * ```typescript
 * // Asymmetric configuration: strict outbound, lenient inbound
 * const inputJson = JSON.stringify({
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "500000000000000000000",    // 500 tokens max outbound
 *     rate: "50000000000000000"             // 0.05 tokens/sec outbound
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "5000000000000000000000",   // 5000 tokens max inbound
 *     rate: "500000000000000000"            // 0.5 tokens/sec inbound
 *   }
 * });
 *
 * const transaction = await generator.generate(inputJson, poolAddress);
 * // Allows more tokens to come in than go out
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Configure rate limiting after chain addition
 * // Step 1: Add new chain configuration
 * const chainUpdateGen = createChainUpdateGenerator(logger, interfaceProvider);
 * const chainUpdateTx = await chainUpdateGen.generate(chainUpdateJson);
 * chainUpdateTx.to = poolAddress;
 * // Execute chain update...
 *
 * // Step 2: Configure rate limiters for the new chain
 * const rateLimiterGen = createRateLimiterConfigGenerator(logger, interfaceProvider);
 * const rateLimiterTx = await rateLimiterGen.generate(
 *   JSON.stringify({
 *     remoteChainSelector: "16015286601757825753",
 *     outboundConfig: { isEnabled: true, capacity: "1000000", rate: "100000" },
 *     inboundConfig: { isEnabled: true, capacity: "1000000", rate: "100000" }
 *   }),
 *   poolAddress
 * );
 * // Execute rate limiter config...
 *
 * // Step 3: Cross-chain transfers now rate-limited
 * ```
 *
 * @throws {RateLimiterConfigError} When token pool address is invalid
 * @throws {RateLimiterConfigError} When input JSON validation fails
 * @throws {RateLimiterConfigError} When chain selector is invalid
 * @throws {RateLimiterConfigError} When capacity or rate values are invalid (negative, non-numeric)
 * @throws {RateLimiterConfigError} When transaction encoding fails
 *
 * @see {@link RateLimiterConfigGenerator} for interface definition
 * @see {@link setChainRateLimiterConfigSchema} for input validation schema
 *
 * @public
 */
export function createRateLimiterConfigGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): RateLimiterConfigGenerator {
  return {
    async generate(inputJson: string, tokenPoolAddress: string): Promise<SafeTransactionDataBase> {
      if (!ethers.isAddress(tokenPoolAddress)) {
        throw new RateLimiterConfigError('Invalid token pool address');
      }

      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => setChainRateLimiterConfigSchema.parseAsync(JSON.parse(inputJson)),
        RateLimiterConfigError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated rate limiter configuration input', {
        remoteChainSelector: parsedInput.remoteChainSelector,
        outboundConfig: parsedInput.outboundConfig,
        inboundConfig: parsedInput.inboundConfig,
      });

      try {
        const poolInterface = interfaceProvider.getTokenPoolInterface();

        const data = poolInterface.encodeFunctionData('setChainRateLimiterConfig', [
          parsedInput.remoteChainSelector,
          parsedInput.outboundConfig,
          parsedInput.inboundConfig,
        ]);

        logger.info('Successfully generated rate limiter configuration transaction', {
          tokenPoolAddress,
          remoteChainSelector: parsedInput.remoteChainSelector,
          outboundConfig: parsedInput.outboundConfig,
          inboundConfig: parsedInput.inboundConfig,
        });

        return {
          to: tokenPoolAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };
      } catch (error) {
        logError(error, 'generate rate limiter configuration transaction', {
          tokenPoolAddress,
        });
        throw error instanceof Error
          ? new RateLimiterConfigError(
              'Failed to generate rate limiter configuration transaction',
              undefined,
              error,
            )
          : error;
      }
    },
  };
}

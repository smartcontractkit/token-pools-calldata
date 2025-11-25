/**
 * @fileoverview Safe Transaction Builder JSON formatter for rate limiter configuration transactions.
 *
 * This module formats rate limiter configuration transaction data into Safe Transaction Builder
 * JSON format. Handles per-chain rate limiter updates for TokenPool contracts, providing
 * user-friendly summaries of outbound and inbound rate limiter settings.
 *
 * @module formatters/rateLimiterFormatter
 */

import { SetChainRateLimiterConfigInput, SafeRateLimiterMetadata } from '../types/rateLimiter';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for rate limiter configuration transactions to Safe JSON format.
 *
 * Converts raw rate limiter configuration transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, rate limiter settings (capacity, rate,
 * enabled status), and descriptive metadata for UI display.
 *
 * @remarks
 * The formatter extracts the `setChainRateLimiterConfig` method fragment from the TokenPool
 * interface and builds a complete Safe JSON structure with human-readable descriptions
 * showing the enabled/disabled status for both outbound and inbound rate limiters.
 *
 * @public
 */
export interface RateLimiterFormatter {
  /**
   * Formats a rate limiter configuration transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Raw transaction data from the generator
   * @param input - Rate limiter configuration input (chain selector, outbound/inbound configs)
   * @param metadata - Safe metadata including token pool address (chain ID, Safe address, owner)
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildSafeTransactionJson} for JSON builder utility
   */
  format(
    transaction: SafeTransactionDataBase,
    input: SetChainRateLimiterConfigInput,
    metadata: SafeRateLimiterMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a rate limiter configuration transaction formatter.
 *
 * Factory function that creates a formatter for converting rate limiter configuration
 * transactions into Safe Transaction Builder JSON format. Handles per-chain rate limiter
 * updates with token bucket algorithm parameters (capacity, rate, enabled status).
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPool)
 *
 * @returns Formatter instance implementing {@link RateLimiterFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts the `setChainRateLimiterConfig` method fragment from TokenPool interface
 * 2. Builds descriptive transaction name ("Update Chain Rate Limiter Configuration")
 * 3. Creates human-readable description showing:
 *    - Target chain selector
 *    - Outbound rate limiter status (enabled/disabled)
 *    - Inbound rate limiter status (enabled/disabled)
 * 4. Includes contract method signature with input types (chain selector, configs)
 * 5. Formats complete Safe JSON with metadata (chain ID, Safe address, owner, pool address)
 * 6. Returns JSON ready for Safe Transaction Builder import
 *
 * Rate Limiter Purpose:
 * - Controls maximum rate and capacity of token transfers to/from specific chains
 * - Implements token bucket algorithm for rate control
 * - Provides protection against exploits and ensures controlled token flow
 * - Independent outbound and inbound rate limiters per chain
 *
 * Configuration Parameters:
 * - **isEnabled**: Boolean flag to enable/disable the rate limiter
 * - **capacity**: Maximum token amount in bucket (string, in token wei)
 * - **rate**: Token refill rate per second (string, in token wei/sec)
 * - Separate configs for outbound (tokens leaving) and inbound (tokens arriving)
 *
 * Common Use Cases:
 * - Enable rate limiting after chain configuration
 * - Adjust limits based on security requirements
 * - Disable rate limiting for high-throughput scenarios
 * - Implement asymmetric limits (different in/out)
 *
 * @example
 * ```typescript
 * const formatter = createRateLimiterFormatter(interfaceProvider);
 *
 * // Format moderate rate limiter configuration
 * const transaction = await generator.generate(inputJson, poolAddress);
 * const input: SetChainRateLimiterConfigInput = {
 *   remoteChainSelector: "16015286601757825753", // Ethereum Sepolia
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",  // 1000 tokens
 *     rate: "100000000000000000"           // 0.1 tokens/sec
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",  // 1000 tokens
 *     rate: "100000000000000000"           // 0.1 tokens/sec
 *   }
 * };
 * const metadata: SafeRateLimiterMetadata = {
 *   chainId: "84532",                // Base Sepolia
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   tokenPoolAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 * };
 *
 * const safeJson = formatter.format(transaction, input, metadata);
 *
 * // Save to file for Safe Transaction Builder
 * fs.writeFileSync('rate-limiter-config.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.meta.name);          // "Update Chain Rate Limiter Configuration"
 * console.log(safeJson.meta.description);   // "Update rate limiter config for chain 16015286601757825753: outbound enabled, inbound enabled"
 * console.log(safeJson.transactions[0].to); // Pool address
 * console.log(safeJson.transactions[0].contractMethod.name); // "setChainRateLimiterConfig"
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Add chain and configure rate limiter
 * const chainUpdateGen = createChainUpdateGenerator(logger, interfaceProvider);
 * const rateLimiterGen = createRateLimiterConfigGenerator(logger, interfaceProvider);
 * const rateLimiterFormatter = createRateLimiterFormatter(interfaceProvider);
 *
 * // Step 1: Add new chain configuration
 * const chainUpdateTx = await chainUpdateGen.generate(
 *   JSON.stringify([
 *     [],  // No chains to remove
 *     [{   // Add Ethereum Sepolia
 *       remoteChainSelector: "16015286601757825753",
 *       remoteChainType: "evm",
 *       remotePoolAddresses: ["0x1234567890123456789012345678901234567890"],
 *       remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *       outboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *       inboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" }
 *     }]
 *   ])
 * );
 * chainUpdateTx.to = poolAddress;
 * // Execute chain update...
 *
 * // Step 2: Configure rate limiters for the new chain
 * const rateLimiterTx = await rateLimiterGen.generate(
 *   JSON.stringify({
 *     remoteChainSelector: "16015286601757825753",
 *     outboundConfig: {
 *       isEnabled: true,
 *       capacity: "1000000000000000000000",
 *       rate: "100000000000000000"
 *     },
 *     inboundConfig: {
 *       isEnabled: true,
 *       capacity: "1000000000000000000000",
 *       rate: "100000000000000000"
 *     }
 *   }),
 *   poolAddress
 * );
 *
 * // Step 3: Format for Safe
 * const safeJson = rateLimiterFormatter.format(rateLimiterTx, {
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",
 *     rate: "100000000000000000"
 *   },
 *   inboundConfig: {
 *     isEnabled: true,
 *     capacity: "1000000000000000000000",
 *     rate: "100000000000000000"
 *   }
 * }, {
 *   chainId: "84532",
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenPoolAddress: poolAddress
 * });
 *
 * // Step 4: Export and execute
 * fs.writeFileSync('rate-limiter-setup.json', JSON.stringify(safeJson, null, 2));
 * // Cross-chain transfers now rate-limited
 * ```
 *
 * @example
 * ```typescript
 * // Format conservative configuration (high security, low throughput)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     remoteChainSelector: "10344971235874465080", // Base Sepolia
 *     outboundConfig: {
 *       isEnabled: true,
 *       capacity: "100000000000000000000",   // 100 tokens max
 *       rate: "10000000000000000"            // 0.01 tokens/sec (slow refill)
 *     },
 *     inboundConfig: {
 *       isEnabled: true,
 *       capacity: "100000000000000000000",   // 100 tokens max
 *       rate: "10000000000000000"            // 0.01 tokens/sec (slow refill)
 *     }
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   remoteChainSelector: "10344971235874465080",
 *   outboundConfig: { isEnabled: true, capacity: "100000000000000000000", rate: "10000000000000000" },
 *   inboundConfig: { isEnabled: true, capacity: "100000000000000000000", rate: "10000000000000000" }
 * }, metadata);
 *
 * // Description: "Update rate limiter config for chain 10344971235874465080: outbound enabled, inbound enabled"
 * ```
 *
 * @example
 * ```typescript
 * // Format asymmetric configuration (strict outbound, lenient inbound)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     remoteChainSelector: "16015286601757825753",
 *     outboundConfig: {
 *       isEnabled: true,
 *       capacity: "500000000000000000000",    // 500 tokens max outbound
 *       rate: "50000000000000000"             // 0.05 tokens/sec outbound
 *     },
 *     inboundConfig: {
 *       isEnabled: true,
 *       capacity: "5000000000000000000000",   // 5000 tokens max inbound
 *       rate: "500000000000000000"            // 0.5 tokens/sec inbound
 *     }
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: { isEnabled: true, capacity: "500000000000000000000", rate: "50000000000000000" },
 *   inboundConfig: { isEnabled: true, capacity: "5000000000000000000000", rate: "500000000000000000" }
 * }, metadata);
 *
 * // Allows more tokens to come in than go out (useful for certain token flows)
 * ```
 *
 * @example
 * ```typescript
 * // Disable rate limiting (maximum risk, maximum throughput)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     remoteChainSelector: "16015286601757825753",
 *     outboundConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *     inboundConfig: { isEnabled: false, capacity: "0", rate: "0" }
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *   inboundConfig: { isEnabled: false, capacity: "0", rate: "0" }
 * }, metadata);
 *
 * // Description: "Update rate limiter config for chain 16015286601757825753: outbound disabled, inbound disabled"
 * // No rate limiting - all transfers allowed (use with caution)
 * ```
 *
 * @example
 * ```typescript
 * // Mixed configuration: outbound enabled, inbound disabled
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     remoteChainSelector: "16015286601757825753",
 *     outboundConfig: {
 *       isEnabled: true,
 *       capacity: "1000000000000000000000",
 *       rate: "100000000000000000"
 *     },
 *     inboundConfig: { isEnabled: false, capacity: "0", rate: "0" }
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   remoteChainSelector: "16015286601757825753",
 *   outboundConfig: { isEnabled: true, capacity: "1000000000000000000000", rate: "100000000000000000" },
 *   inboundConfig: { isEnabled: false, capacity: "0", rate: "0" }
 * }, metadata);
 *
 * // Description: "Update rate limiter config for chain 16015286601757825753: outbound enabled, inbound disabled"
 * // Only limit tokens going out, not coming in
 * ```
 *
 * @see {@link RateLimiterFormatter} for interface definition
 * @see {@link buildSafeTransactionJson} for JSON builder implementation
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 * @see {@link SafeRateLimiterMetadata} for metadata structure including token pool address
 *
 * @public
 */
export function createRateLimiterFormatter(
  interfaceProvider: IInterfaceProvider,
): RateLimiterFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      input: SetChainRateLimiterConfigInput,
      metadata: SafeRateLimiterMetadata,
    ): SafeTransactionBuilderJSON {
      const description = `Update rate limiter config for chain ${input.remoteChainSelector}: outbound ${input.outboundConfig.isEnabled ? 'enabled' : 'disabled'}, inbound ${input.inboundConfig.isEnabled ? 'enabled' : 'disabled'}`;

      return buildSafeTransactionJson({
        transaction,
        metadata,
        name: 'Update Chain Rate Limiter Configuration',
        description,
        contractInterface: interfaceProvider.getTokenPoolInterface(),
        functionName: 'setChainRateLimiterConfig',
      });
    },
  };
}

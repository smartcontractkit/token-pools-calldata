/**
 * @fileoverview Safe Transaction Builder JSON formatter for chain update transactions.
 *
 * This module formats cross-chain configuration update transaction data into Safe
 * Transaction Builder JSON format. Handles adding and removing remote chain configurations
 * with multi-chain address encoding support (EVM, SVM).
 *
 * @module formatters/chainUpdateFormatter
 */

import { SafeChainUpdateMetadata } from '../types/chainUpdate';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for chain update transactions to Safe JSON format.
 *
 * Converts raw chain update transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, chain configuration details,
 * and descriptive metadata for UI display.
 *
 * @remarks
 * The formatter extracts the `applyChainUpdates` method fragment from the TokenPool
 * interface and builds a complete Safe JSON structure. It also sets the target address
 * to the token pool address since the generator leaves it empty.
 *
 * @public
 */
export interface ChainUpdateFormatter {
  /**
   * Formats a chain update transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Raw transaction data from the generator (with empty 'to' field)
   * @param metadata - Safe chain update metadata including token pool address
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildSafeTransactionJson} for JSON builder utility
   */
  format(
    transaction: SafeTransactionDataBase,
    metadata: SafeChainUpdateMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a chain update transaction formatter.
 *
 * Factory function that creates a formatter for converting cross-chain configuration
 * update transactions into Safe Transaction Builder JSON format. Handles the complete
 * chain update workflow including adding and removing chains.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPool)
 *
 * @returns Formatter instance implementing {@link ChainUpdateFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts the `applyChainUpdates` method fragment from TokenPool interface
 * 2. Sets the transaction target address to the token pool address from metadata
 * 3. Builds descriptive transaction name and description for chain updates
 * 4. Includes contract method signature with input/output types
 * 5. Formats complete Safe JSON with metadata (chain ID, Safe address, owner, pool address)
 * 6. Returns JSON ready for Safe Transaction Builder import
 *
 * Chain Update Operations:
 * - **Add Chains**: Configure new remote chains with pool addresses, token addresses, and rate limiters
 * - **Remove Chains**: Remove existing chain configurations by chain selector
 * - **Atomic**: All additions and removals processed in a single transaction
 *
 * Target Address Handling:
 * - Generator leaves `transaction.to` empty (since pool address varies)
 * - Formatter fills in the pool address from metadata before building Safe JSON
 * - This allows the same generated transaction to be used with different pools
 *
 * @example
 * ```typescript
 * const formatter = createChainUpdateFormatter(interfaceProvider);
 *
 * // Format chain update transaction for Safe
 * const transaction = await generator.generate(inputJson);
 * // Note: transaction.to is empty, filled by formatter
 *
 * const metadata: SafeChainUpdateMetadata = {
 *   chainId: "84532",                                     // Base Sepolia
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   tokenPoolAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 * };
 *
 * const safeJson = formatter.format(transaction, metadata);
 *
 * // Save to file for Safe Transaction Builder
 * fs.writeFileSync('chain-update.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.meta.name);                      // "Token Pool Chain Updates"
 * console.log(safeJson.meta.description);               // "Apply chain updates to the Token Pool contract"
 * console.log(safeJson.transactions[0].to);             // Pool address (filled by formatter)
 * console.log(safeJson.transactions[0].contractMethod.name); // "applyChainUpdates"
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Generate and format chain update
 * const generator = createChainUpdateGenerator(logger, interfaceProvider);
 * const formatter = createChainUpdateFormatter(interfaceProvider);
 *
 * // Step 1: Generate chain update transaction (add Ethereum Sepolia)
 * const inputJson = JSON.stringify([
 *   [],  // No chains to remove
 *   [{   // Add Ethereum Sepolia
 *     remoteChainSelector: "16015286601757825753",
 *     remoteChainType: "evm",
 *     remotePoolAddresses: ["0x1234567890123456789012345678901234567890"],
 *     remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *     outboundRateLimiterConfig: {
 *       isEnabled: true,
 *       capacity: "1000000000000000000000",
 *       rate: "100000000000000000"
 *     },
 *     inboundRateLimiterConfig: {
 *       isEnabled: true,
 *       capacity: "1000000000000000000000",
 *       rate: "100000000000000000"
 *     }
 *   }]
 * ]);
 *
 * const transaction = await generator.generate(inputJson);
 *
 * // Step 2: Format for Safe
 * const safeJson = formatter.format(transaction, {
 *   chainId: "84532",                   // Base Sepolia
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenPoolAddress: poolAddress       // Pool address filled here
 * });
 *
 * // Step 3: Export and import into Safe UI
 * fs.writeFileSync('chain-update.json', JSON.stringify(safeJson, null, 2));
 * // Import this file in Safe Transaction Builder web UI
 * ```
 *
 * @example
 * ```typescript
 * // Format transaction that removes and adds chains
 * const inputJson = JSON.stringify([
 *   ["16015286601757825753"],  // Remove Ethereum Sepolia
 *   [{                         // Add Base Sepolia
 *     remoteChainSelector: "10344971235874465080",
 *     remoteChainType: "evm",
 *     remotePoolAddresses: ["0x5555555555555555555555555555555555555555"],
 *     remoteTokenAddress: "0x6666666666666666666666666666666666666666",
 *     outboundRateLimiterConfig: { isEnabled: true, capacity: "500000", rate: "50000" },
 *     inboundRateLimiterConfig: { isEnabled: true, capacity: "500000", rate: "50000" }
 *   }]
 * ]);
 *
 * const transaction = await generator.generate(inputJson);
 * const safeJson = formatter.format(transaction, metadata);
 * // Description shows "Apply chain updates" (both add and remove)
 * ```
 *
 * @see {@link ChainUpdateFormatter} for interface definition
 * @see {@link buildSafeTransactionJson} for JSON builder implementation
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 * @see {@link SafeChainUpdateMetadata} for metadata structure including token pool address
 *
 * @public
 */
export function createChainUpdateFormatter(
  interfaceProvider: IInterfaceProvider,
): ChainUpdateFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      metadata: SafeChainUpdateMetadata,
    ): SafeTransactionBuilderJSON {
      return buildSafeTransactionJson({
        transaction: {
          ...transaction,
          to: metadata.tokenPoolAddress,
        },
        metadata,
        name: 'Token Pool Chain Updates',
        description: 'Apply chain updates to the Token Pool contract',
        contractInterface: interfaceProvider.getTokenPoolInterface(),
        functionName: 'applyChainUpdates',
      });
    },
  };
}

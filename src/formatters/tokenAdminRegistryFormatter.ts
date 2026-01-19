/**
 * @fileoverview Safe Transaction Builder JSON formatter for TokenAdminRegistry transactions.
 *
 * This module formats TokenAdminRegistry transaction data into Safe Transaction Builder
 * JSON format. Handles all three methods for TokenAdminRegistry operations.
 *
 * @module formatters/tokenAdminRegistryFormatter
 */

import {
  TokenAdminRegistryInput,
  SafeTokenAdminRegistryMetadata,
} from '../types/tokenAdminRegistry';
import { TokenAdminRegistryTransactionResult } from '../generators/tokenAdminRegistry';
import { SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Human-readable descriptions for each TokenAdminRegistry method.
 *
 * @internal
 */
const METHOD_DESCRIPTIONS: Record<string, string> = {
  'set-pool': 'setPool() function',
  'transfer-admin': 'transferAdminRole() function',
  'accept-admin': 'acceptAdminRole() function',
};

/**
 * Human-readable action descriptions for each method.
 *
 * @internal
 */
const METHOD_ACTIONS: Record<string, string> = {
  'set-pool': 'Set pool',
  'transfer-admin': 'Transfer admin role',
  'accept-admin': 'Accept admin role',
};

/**
 * Formatter interface for TokenAdminRegistry transactions to Safe JSON format.
 *
 * Converts raw TokenAdminRegistry transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures and descriptive metadata.
 *
 * @public
 */
export interface TokenAdminRegistryFormatter {
  /**
   * Formats TokenAdminRegistry transaction to Safe Transaction Builder JSON.
   *
   * @param result - Transaction result from generator
   * @param params - TokenAdminRegistry parameters
   * @param metadata - Safe metadata including registry address
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   */
  format(
    result: TokenAdminRegistryTransactionResult,
    params: TokenAdminRegistryInput,
    metadata: SafeTokenAdminRegistryMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a TokenAdminRegistry transaction formatter.
 *
 * Factory function that creates a formatter for converting TokenAdminRegistry
 * transactions into Safe Transaction Builder JSON format.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces
 *
 * @returns Formatter instance implementing {@link TokenAdminRegistryFormatter} interface
 *
 * @example
 * ```typescript
 * const formatter = createTokenAdminRegistryFormatter(interfaceProvider);
 *
 * const result = await generator.generate(inputJson);
 * const params: TokenAdminRegistryInput = {
 *   registryAddress: "0x1234...",
 *   tokenAddress: "0x5678...",
 *   method: "set-pool",
 *   poolAddress: "0xabcd..."
 * };
 * const metadata: SafeTokenAdminRegistryMetadata = {
 *   chainId: "84532",
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   registryAddress: "0x1234..."
 * };
 *
 * const safeJson = formatter.format(result, params, metadata);
 * fs.writeFileSync('set-pool.json', JSON.stringify(safeJson, null, 2));
 * ```
 *
 * @public
 */
export function createTokenAdminRegistryFormatter(
  interfaceProvider: IInterfaceProvider,
): TokenAdminRegistryFormatter {
  return {
    format(
      result: TokenAdminRegistryTransactionResult,
      params: TokenAdminRegistryInput,
      metadata: SafeTokenAdminRegistryMetadata,
    ): SafeTransactionBuilderJSON {
      const methodDescription = METHOD_DESCRIPTIONS[params.method] || params.method;
      const action = METHOD_ACTIONS[params.method] || params.method;
      const description = `${action} for token ${params.tokenAddress} using ${methodDescription}`;

      return buildSafeTransactionJson({
        transaction: result.transaction,
        metadata,
        name: `TokenAdminRegistry: ${action}`,
        description,
        contractInterface: interfaceProvider.getTokenAdminRegistryInterface(),
        functionName: result.functionName,
      });
    },
  };
}

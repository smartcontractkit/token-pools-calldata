/**
 * @fileoverview Safe Transaction Builder JSON formatter for token deployment transactions.
 *
 * This module formats token deployment transaction data into Safe Transaction Builder
 * JSON format, enabling import into the Safe web UI or CLI. Extracts method signatures
 * and formats transaction metadata for user-friendly display.
 *
 * @module formatters/tokenDeploymentFormatter
 */

import { TokenDeploymentParams } from '../types/tokenDeployment';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON, SafeMetadata } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for token deployment transactions to Safe JSON format.
 *
 * Converts raw token deployment transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, input types, and descriptive
 * metadata for UI display.
 *
 * @remarks
 * The formatter extracts the `deployTokenAndTokenPool` method fragment from the
 * TokenPoolFactory interface and builds a complete Safe JSON structure with
 * human-readable transaction descriptions.
 *
 * @public
 */
export interface TokenDeploymentFormatter {
  /**
   * Formats a token deployment transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Raw transaction data from the generator
   * @param params - Token deployment parameters (name, symbol, decimals, etc.)
   * @param metadata - Safe metadata (chain ID, Safe address, owner)
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildSafeTransactionJson} for JSON builder utility
   */
  format(
    transaction: SafeTransactionDataBase,
    params: TokenDeploymentParams,
    metadata: SafeMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a token deployment transaction formatter.
 *
 * Factory function that creates a formatter for converting token deployment transactions
 * into Safe Transaction Builder JSON format. The output can be directly imported into
 * the Safe web UI for execution.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPoolFactory)
 *
 * @returns Formatter instance implementing {@link TokenDeploymentFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts the `deployTokenAndTokenPool` method fragment from factory interface
 * 2. Builds descriptive transaction name and description using token parameters
 * 3. Includes contract method signature with input/output types
 * 4. Formats complete Safe JSON with metadata (chain ID, Safe address, owner)
 * 5. Returns JSON ready for Safe Transaction Builder import
 *
 * Safe Transaction Builder Format:
 * - **version**: Safe TX Builder format version (currently "1.0")
 * - **chainId**: Target blockchain chain ID
 * - **meta**: Transaction metadata (name, description, creator info)
 * - **transactions**: Array of transaction objects with method details
 *
 * Output Usage:
 * - Save JSON to file
 * - Import into Safe web UI via Transaction Builder
 * - Review transaction details in user-friendly format
 * - Execute via Safe multisig workflow
 *
 * @example
 * ```typescript
 * const formatter = createTokenDeploymentFormatter(interfaceProvider);
 *
 * // Format generator output for Safe
 * const transaction = await generator.generate(inputJson, factoryAddress, salt, safeAddress);
 * const params: TokenDeploymentParams = {
 *   name: "MyToken",
 *   symbol: "MTK",
 *   decimals: 18,
 *   maxSupply: "1000000000000000000000000",
 *   preMint: "100000000000000000000",
 *   remoteTokenPools: []
 * };
 * const metadata: SafeMetadata = {
 *   chainId: "84532",           // Base Sepolia
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner"
 * };
 *
 * const safeJson = formatter.format(transaction, params, metadata);
 *
 * // Save to file for Safe Transaction Builder
 * fs.writeFileSync('token-deployment.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.version);                    // "1.0"
 * console.log(safeJson.chainId);                    // "84532"
 * console.log(safeJson.meta.name);                  // "Token and Pool Factory Deployment - MyToken"
 * console.log(safeJson.transactions[0].to);         // Factory address
 * console.log(safeJson.transactions[0].contractMethod.name); // "deployTokenAndTokenPool"
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Generate and format for Safe
 * const generator = createTokenDeploymentGenerator(logger, interfaceProvider, addressComputer);
 * const formatter = createTokenDeploymentFormatter(interfaceProvider);
 *
 * // Step 1: Generate transaction
 * const inputJson = JSON.stringify({
 *   name: "CrossChainToken",
 *   symbol: "CCT",
 *   decimals: 18,
 *   maxSupply: "1000000000000000000000000",
 *   preMint: "0",
 *   remoteTokenPools: []
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   factoryAddress,
 *   salt,
 *   safeAddress
 * );
 *
 * // Step 2: Format for Safe
 * const params = JSON.parse(inputJson);
 * const safeJson = formatter.format(transaction, params, {
 *   chainId: "11155111",        // Ethereum Sepolia
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress
 * });
 *
 * // Step 3: Export and import into Safe UI
 * fs.writeFileSync('deployment.json', JSON.stringify(safeJson, null, 2));
 * // Import this file in Safe Transaction Builder web UI
 * ```
 *
 * @see {@link TokenDeploymentFormatter} for interface definition
 * @see {@link buildSafeTransactionJson} for JSON builder implementation
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 *
 * @public
 */
export function createTokenDeploymentFormatter(
  interfaceProvider: IInterfaceProvider,
): TokenDeploymentFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      params: TokenDeploymentParams,
      metadata: SafeMetadata,
    ): SafeTransactionBuilderJSON {
      return buildSafeTransactionJson({
        transaction,
        metadata,
        name: `Token and Pool Factory Deployment - ${params.name}`,
        description: `Deploy ${params.name} (${params.symbol}) token and associated pool using factory`,
        contractInterface: interfaceProvider.getTokenPoolFactoryInterface(),
        functionName: 'deployTokenAndTokenPool',
      });
    },
  };
}

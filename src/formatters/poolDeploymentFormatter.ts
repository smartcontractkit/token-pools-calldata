/**
 * @fileoverview Safe Transaction Builder JSON formatter for pool deployment transactions.
 *
 * This module formats pool deployment transaction data into Safe Transaction Builder
 * JSON format for existing tokens. Supports both BurnMintTokenPool and LockReleaseTokenPool
 * deployment formatting with descriptive metadata.
 *
 * @module formatters/poolDeploymentFormatter
 */

import { PoolDeploymentParams } from '../types/poolDeployment';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON, SafeMetadata } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for pool deployment transactions to Safe JSON format.
 *
 * Converts raw pool deployment transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, pool type information, and
 * descriptive metadata for UI display.
 *
 * @remarks
 * The formatter extracts the `deployTokenPoolWithExistingToken` method fragment from
 * the TokenPoolFactory interface and builds a complete Safe JSON structure with
 * human-readable pool type descriptions.
 *
 * @public
 */
export interface PoolDeploymentFormatter {
  /**
   * Formats a pool deployment transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Raw transaction data from the generator
   * @param params - Pool deployment parameters (token, decimals, pool type, etc.)
   * @param metadata - Safe metadata (chain ID, Safe address, owner)
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildSafeTransactionJson} for JSON builder utility
   */
  format(
    transaction: SafeTransactionDataBase,
    params: PoolDeploymentParams,
    metadata: SafeMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a pool deployment transaction formatter.
 *
 * Factory function that creates a formatter for converting pool deployment transactions
 * into Safe Transaction Builder JSON format. Handles both BurnMintTokenPool and
 * LockReleaseTokenPool deployments with appropriate descriptions.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPoolFactory)
 *
 * @returns Formatter instance implementing {@link PoolDeploymentFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts the `deployTokenPoolWithExistingToken` method fragment from factory interface
 * 2. Builds descriptive transaction name and description using pool type and token address
 * 3. Includes contract method signature with input/output types
 * 4. Formats complete Safe JSON with metadata (chain ID, Safe address, owner)
 * 5. Returns JSON ready for Safe Transaction Builder import
 *
 * Pool Type Descriptions:
 * - **BurnMintTokenPool**: For tokens with mint/burn capabilities (cross-chain mint/burn)
 * - **LockReleaseTokenPool**: For tokens without mint/burn (lock-and-release mechanism)
 *
 * @example
 * ```typescript
 * const formatter = createPoolDeploymentFormatter(interfaceProvider);
 *
 * // Format BurnMintTokenPool deployment for Safe
 * const transaction = await generator.generate(inputJson, factoryAddress, salt);
 * const params: PoolDeploymentParams = {
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   decimals: 18,
 *   poolType: "BurnMintTokenPool",
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
 * fs.writeFileSync('pool-deployment.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.meta.name);                  // "Pool Factory Deployment - BurnMintTokenPool"
 * console.log(safeJson.meta.description);           // "Deploy BurnMintTokenPool for token at 0x779..."
 * console.log(safeJson.transactions[0].contractMethod.name); // "deployTokenPoolWithExistingToken"
 * ```
 *
 * @example
 * ```typescript
 * // Format LockReleaseTokenPool deployment
 * const transaction = await generator.generate(inputJson, factoryAddress, salt);
 * const params: PoolDeploymentParams = {
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   decimals: 6,  // USDC decimals
 *   poolType: "LockReleaseTokenPool",
 *   remoteTokenPools: []
 * };
 *
 * const safeJson = formatter.format(transaction, params, metadata);
 * // Description: "Deploy LockReleaseTokenPool for token at 0x779..."
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Generate and format for Safe
 * const generator = createPoolDeploymentGenerator(logger, interfaceProvider);
 * const formatter = createPoolDeploymentFormatter(interfaceProvider);
 *
 * // Step 1: Generate pool deployment transaction
 * const inputJson = JSON.stringify({
 *   token: "0xExistingTokenAddress",
 *   decimals: 18,
 *   poolType: "BurnMintTokenPool",
 *   remoteTokenPools: [{
 *     remoteChainSelector: "16015286601757825753",
 *     remotePoolAddress: "0xRemotePoolAddress",
 *     remoteTokenAddress: "0xRemoteTokenAddress",
 *     poolType: "BurnMintTokenPool"
 *   }]
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   factoryAddress,
 *   salt
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
 * fs.writeFileSync('pool-deployment.json', JSON.stringify(safeJson, null, 2));
 * // Import this file in Safe Transaction Builder web UI
 * ```
 *
 * @see {@link PoolDeploymentFormatter} for interface definition
 * @see {@link buildSafeTransactionJson} for JSON builder implementation
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 *
 * @public
 */
export function createPoolDeploymentFormatter(
  interfaceProvider: IInterfaceProvider,
): PoolDeploymentFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      params: PoolDeploymentParams,
      metadata: SafeMetadata,
    ): SafeTransactionBuilderJSON {
      return buildSafeTransactionJson({
        transaction,
        metadata,
        name: `Pool Factory Deployment - ${params.poolType}`,
        description: `Deploy ${params.poolType} for token at ${params.token} using factory`,
        contractInterface: interfaceProvider.getTokenPoolFactoryInterface(),
        functionName: 'deployTokenPoolWithExistingToken',
      });
    },
  };
}

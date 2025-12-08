/**
 * @fileoverview Safe Transaction Builder JSON formatter for allow list update transactions.
 *
 * This module formats allow list management transaction data into Safe Transaction Builder
 * JSON format. Handles atomic addition and removal of addresses from the TokenPool allow list,
 * providing user-friendly summaries of the changes being applied.
 *
 * @module formatters/allowListFormatter
 */

import { AllowListUpdatesInput, SafeAllowListMetadata } from '../types/allowList';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for allow list update transactions to Safe JSON format.
 *
 * Converts raw allow list update transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, addresses to add/remove, and
 * descriptive metadata for UI display.
 *
 * @remarks
 * The formatter extracts the `applyAllowListUpdates` method fragment from the TokenPool
 * interface and builds a complete Safe JSON structure with human-readable descriptions
 * summarizing the number of addresses being added and removed.
 *
 * @public
 */
export interface AllowListFormatter {
  /**
   * Formats an allow list update transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Raw transaction data from the generator
   * @param input - Allow list update input (addresses to remove and add)
   * @param metadata - Safe metadata including token pool address (chain ID, Safe address, owner)
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildSafeTransactionJson} for JSON builder utility
   */
  format(
    transaction: SafeTransactionDataBase,
    input: AllowListUpdatesInput,
    metadata: SafeAllowListMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates an allow list update transaction formatter.
 *
 * Factory function that creates a formatter for converting allow list management
 * transactions into Safe Transaction Builder JSON format. Handles atomic addition
 * and removal of addresses from the TokenPool's access control allow list.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPool)
 *
 * @returns Formatter instance implementing {@link AllowListFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts the `applyAllowListUpdates` method fragment from TokenPool interface
 * 2. Builds descriptive transaction name ("Update Token Pool Allow List")
 * 3. Creates human-readable description summarizing the changes:
 *    - "remove N address(es), add M address(es)" (both operations)
 *    - "remove N address(es)" (remove only)
 *    - "add N address(es)" (add only)
 *    - "no changes" (empty arrays)
 * 4. Includes contract method signature with input types
 * 5. Formats complete Safe JSON with metadata (chain ID, Safe address, owner, pool address)
 * 6. Returns JSON ready for Safe Transaction Builder import
 *
 * Allow List Purpose:
 * - Controls which addresses can initiate cross-chain token transfers through the pool
 * - Provides additional security layer beyond ownership/role controls
 * - Useful for restricting pool access to specific integrations or contracts
 * - Empty allow list = unrestricted access (all addresses allowed)
 *
 * Operation Behavior:
 * - **Atomic**: All additions and removals processed in single transaction
 * - **Order**: Removals processed before additions
 * - **Idempotent**: Safe to remove non-existent or add existing addresses
 *
 * @example
 * ```typescript
 * const formatter = createAllowListFormatter(interfaceProvider);
 *
 * // Format allow list update (add 2 addresses, remove 1)
 * const transaction = await generator.generate(inputJson, poolAddress);
 * const input: AllowListUpdatesInput = {
 *   removes: ["0xOldAddress"],
 *   adds: [
 *     "0xNewIntegration1",
 *     "0xNewIntegration2"
 *   ]
 * };
 * const metadata: SafeAllowListMetadata = {
 *   chainId: "84532",                // Base Sepolia
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   tokenPoolAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 * };
 *
 * const safeJson = formatter.format(transaction, input, metadata);
 *
 * // Save to file for Safe Transaction Builder
 * fs.writeFileSync('allow-list-update.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.meta.name);          // "Update Token Pool Allow List"
 * console.log(safeJson.meta.description);   // "Update allow list for token pool: remove 1 address, add 2 addresses"
 * console.log(safeJson.transactions[0].to); // Pool address
 * console.log(safeJson.transactions[0].contractMethod.name); // "applyAllowListUpdates"
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Deploy pool and configure allow list
 * const poolGen = createPoolDeploymentGenerator(logger, interfaceProvider);
 * const allowListGen = createAllowListUpdatesGenerator(logger, interfaceProvider);
 * const allowListFormatter = createAllowListFormatter(interfaceProvider);
 *
 * // Step 1: Deploy pool
 * const poolTx = await poolGen.generate(
 *   JSON.stringify({
 *     token: "0xTokenAddress",
 *     decimals: 18,
 *     poolType: "BurnMintTokenPool",
 *     remoteTokenPools: []
 *   }),
 *   factoryAddress,
 *   salt
 * );
 * // Execute deployment and get pool address...
 *
 * // Step 2: Set initial allow list (add only)
 * const allowListTx = await allowListGen.generate(
 *   JSON.stringify({
 *     removes: [],
 *     adds: [
 *       "0xTrustedIntegration1",
 *       "0xTrustedIntegration2"
 *     ]
 *   }),
 *   deployedPoolAddress
 * );
 *
 * // Step 3: Format for Safe
 * const safeJson = allowListFormatter.format(allowListTx, {
 *   removes: [],
 *   adds: [
 *     "0xTrustedIntegration1",
 *     "0xTrustedIntegration2"
 *   ]
 * }, {
 *   chainId: "84532",
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenPoolAddress: deployedPoolAddress
 * });
 *
 * // Description: "Update allow list for token pool: add 2 addresses"
 * fs.writeFileSync('allow-list-setup.json', JSON.stringify(safeJson, null, 2));
 * ```
 *
 * @example
 * ```typescript
 * // Format remove-only operation (deprecate old integrations)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     removes: [
 *       "0xDeprecatedContract1",
 *       "0xDeprecatedContract2",
 *       "0xDeprecatedContract3"
 *     ],
 *     adds: []
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   removes: [
 *     "0xDeprecatedContract1",
 *     "0xDeprecatedContract2",
 *     "0xDeprecatedContract3"
 *   ],
 *   adds: []
 * }, metadata);
 *
 * // Description: "Update allow list for token pool: remove 3 addresses"
 * ```
 *
 * @example
 * ```typescript
 * // Format add-only operation (whitelist new integration)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     removes: [],
 *     adds: ["0xNewDeFiProtocol"]
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   removes: [],
 *   adds: ["0xNewDeFiProtocol"]
 * }, metadata);
 *
 * // Description: "Update allow list for token pool: add 1 address"
 * ```
 *
 * @example
 * ```typescript
 * // Format atomic update (swap old for new integrations)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     removes: ["0xOldIntegrationV1", "0xOldIntegrationV2"],
 *     adds: ["0xNewIntegrationV3", "0xNewIntegrationV4", "0xNewIntegrationV5"]
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   removes: ["0xOldIntegrationV1", "0xOldIntegrationV2"],
 *   adds: ["0xNewIntegrationV3", "0xNewIntegrationV4", "0xNewIntegrationV5"]
 * }, metadata);
 *
 * // Description: "Update allow list for token pool: remove 2 addresses, add 3 addresses"
 * // Atomic: old addresses removed, new addresses added in single transaction
 * ```
 *
 * @example
 * ```typescript
 * // Disable allow list by removing all addresses (assume we know current list)
 * const currentAllowList = ["0xAddr1", "0xAddr2", "0xAddr3"];
 *
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     removes: currentAllowList,
 *     adds: []
 *   }),
 *   poolAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   removes: currentAllowList,
 *   adds: []
 * }, metadata);
 *
 * // Description: "Update allow list for token pool: remove 3 addresses"
 * // Result: Empty allow list = unrestricted access
 * ```
 *
 * @see {@link AllowListFormatter} for interface definition
 * @see {@link buildSafeTransactionJson} for JSON builder implementation
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 * @see {@link SafeAllowListMetadata} for metadata structure including token pool address
 *
 * @public
 */
export function createAllowListFormatter(
  interfaceProvider: IInterfaceProvider,
): AllowListFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      input: AllowListUpdatesInput,
      metadata: SafeAllowListMetadata,
    ): SafeTransactionBuilderJSON {
      const removesCount = input.removes.length;
      const addsCount = input.adds.length;

      let description = 'Update allow list for token pool: ';
      if (removesCount > 0 && addsCount > 0) {
        description += `remove ${removesCount} address${removesCount > 1 ? 'es' : ''}, add ${addsCount} address${addsCount > 1 ? 'es' : ''}`;
      } else if (removesCount > 0) {
        description += `remove ${removesCount} address${removesCount > 1 ? 'es' : ''}`;
      } else if (addsCount > 0) {
        description += `add ${addsCount} address${addsCount > 1 ? 'es' : ''}`;
      } else {
        description += 'no changes';
      }

      return buildSafeTransactionJson({
        transaction,
        metadata,
        name: 'Update Token Pool Allow List',
        description,
        contractInterface: interfaceProvider.getTokenPoolInterface(),
        functionName: 'applyAllowListUpdates',
      });
    },
  };
}

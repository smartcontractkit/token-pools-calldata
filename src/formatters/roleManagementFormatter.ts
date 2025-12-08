/**
 * @fileoverview Safe Transaction Builder JSON formatter for role management transactions.
 *
 * This module formats role management transaction data into Safe Transaction Builder
 * JSON format. Handles granting and revoking MINTER_ROLE and BURNER_ROLE on BurnMintERC20
 * tokens, supporting single and multi-transaction operations with descriptive metadata.
 *
 * @module formatters/roleManagementFormatter
 */

import { RoleManagementParams, SafeRoleManagementMetadata } from '../types/tokenMint';
import { RoleManagementTransactionResult } from '../generators/roleManagement';
import { SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildMultiSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for role management transactions to Safe JSON format.
 *
 * Converts raw role management transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, role grant/revoke operations,
 * and descriptive metadata for UI display.
 *
 * @remarks
 * The formatter extracts role management method fragments from the BurnMintERC20
 * interface and builds a complete Safe JSON structure. Supports both single-transaction
 * operations (grant mint, grant burn, revoke mint, revoke burn) and multi-transaction
 * operations (revoke both = 2 separate transactions).
 *
 * @public
 */
export interface RoleManagementFormatter {
  /**
   * Formats role management transaction(s) to Safe Transaction Builder JSON.
   *
   * @param result - Transaction result from generator (may contain 1 or 2 transactions)
   * @param params - Role management parameters (action, roleType, pool address)
   * @param metadata - Safe metadata including token address (chain ID, Safe address, owner)
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildMultiSafeTransactionJson} for multi-transaction JSON builder utility
   */
  format(
    result: RoleManagementTransactionResult,
    params: RoleManagementParams,
    metadata: SafeRoleManagementMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a role management transaction formatter.
 *
 * Factory function that creates a formatter for converting role management transactions
 * into Safe Transaction Builder JSON format. Handles both grant and revoke operations
 * for MINTER_ROLE and BURNER_ROLE on BurnMintERC20 tokens.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (BurnMintERC20)
 *
 * @returns Formatter instance implementing {@link RoleManagementFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts role management method fragments from BurnMintERC20 interface
 * 2. Builds descriptive transaction name based on action (Grant/Revoke)
 * 3. Creates human-readable description showing role type and target pool
 * 4. Includes contract method signature(s) with input types
 * 5. Formats complete Safe JSON with metadata (chain ID, Safe address, owner, token address)
 * 6. Supports multiple transactions in single JSON (for revoke both)
 * 7. Returns JSON ready for Safe Transaction Builder import
 *
 * Transaction Count by Operation:
 * - **Grant mint**: 1 transaction (grantMintAndBurn with isMinter=true, isBurner=false)
 * - **Grant burn**: 1 transaction (grantMintAndBurn with isMinter=false, isBurner=true)
 * - **Grant both**: 1 transaction (grantMintAndBurn with both true)
 * - **Revoke mint**: 1 transaction (revokeMintRole)
 * - **Revoke burn**: 1 transaction (revokeBurnRole)
 * - **Revoke both**: 2 transactions (revokeMintRole + revokeBurnRole)
 *
 * Role Requirements:
 * - Caller must have DEFAULT_ADMIN_ROLE on the token contract
 * - Safe contract typically has admin role after token deployment
 * - Pools must have mint/burn roles before cross-chain transfers work
 *
 * Common Workflow:
 * - Deploy token and pool via TokenPoolFactory
 * - Grant both mint and burn roles to the pool
 * - Pool can now mint/burn tokens during cross-chain transfers
 *
 * @example
 * ```typescript
 * const formatter = createRoleManagementFormatter(interfaceProvider);
 *
 * // Format role grant for pool (most common use case)
 * const result = await generator.generate(inputJson, tokenAddress);
 * const params: RoleManagementParams = {
 *   action: "grant",
 *   roleType: "both",
 *   pool: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 * };
 * const metadata: SafeRoleManagementMetadata = {
 *   chainId: "84532",                // Base Sepolia
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   tokenAddress: "0xTokenAddress"
 * };
 *
 * const safeJson = formatter.format(result, params, metadata);
 *
 * // Save to file for Safe Transaction Builder
 * fs.writeFileSync('grant-roles.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.meta.name);          // "Grant Token Pool Roles"
 * console.log(safeJson.meta.description);   // "Grant mint and burn roles to pool 0x779..."
 * console.log(safeJson.transactions.length); // 1 (single transaction for grant both)
 * console.log(safeJson.transactions[0].contractMethod.name); // "grantMintAndBurn"
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Deploy pool and grant roles
 * const poolGen = createPoolDeploymentGenerator(logger, interfaceProvider);
 * const roleGen = createRoleManagementGenerator(logger, interfaceProvider);
 * const roleFormatter = createRoleManagementFormatter(interfaceProvider);
 *
 * // Step 1: Deploy pool for existing token
 * const poolTx = await poolGen.generate(
 *   JSON.stringify({
 *     token: "0xExistingTokenAddress",
 *     decimals: 18,
 *     poolType: "BurnMintTokenPool",
 *     remoteTokenPools: []
 *   }),
 *   factoryAddress,
 *   salt
 * );
 * // Execute deployment and get pool address...
 *
 * // Step 2: Grant both mint and burn roles to pool
 * const roleResult = await roleGen.generate(
 *   JSON.stringify({
 *     action: "grant",
 *     roleType: "both",
 *     pool: deployedPoolAddress
 *   }),
 *   tokenAddress
 * );
 *
 * // Step 3: Format for Safe
 * const safeJson = roleFormatter.format(roleResult, {
 *   action: "grant",
 *   roleType: "both",
 *   pool: deployedPoolAddress
 * }, {
 *   chainId: "84532",
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenAddress: tokenAddress
 * });
 *
 * // Step 4: Export and execute via Safe UI
 * fs.writeFileSync('grant-roles.json', JSON.stringify(safeJson, null, 2));
 * // Pool can now mint/burn during cross-chain transfers
 * ```
 *
 * @example
 * ```typescript
 * // Grant only mint role (uncommon, but supported)
 * const result = await generator.generate(
 *   JSON.stringify({
 *     action: "grant",
 *     roleType: "mint",
 *     pool: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 *   }),
 *   tokenAddress
 * );
 *
 * const safeJson = formatter.format(result, {
 *   action: "grant",
 *   roleType: "mint",
 *   pool: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 * }, metadata);
 *
 * // Description: "Grant mint role to pool 0x779..."
 * // Transactions: 1 (grantMintAndBurn with isMinter=true, isBurner=false)
 * ```
 *
 * @example
 * ```typescript
 * // Revoke both roles (generates 2 transactions)
 * const result = await generator.generate(
 *   JSON.stringify({
 *     action: "revoke",
 *     roleType: "both",
 *     pool: "0xDeprecatedPool"
 *   }),
 *   tokenAddress
 * );
 *
 * const safeJson = formatter.format(result, {
 *   action: "revoke",
 *   roleType: "both",
 *   pool: "0xDeprecatedPool"
 * }, metadata);
 *
 * // Description: "Revoke mint and burn roles from pool 0xDep..."
 * // Transactions: 2 (revokeMintRole + revokeBurnRole)
 * console.log(safeJson.transactions.length);              // 2
 * console.log(safeJson.transactions[0].contractMethod.name); // "revokeMintRole"
 * console.log(safeJson.transactions[1].contractMethod.name); // "revokeBurnRole"
 * ```
 *
 * @example
 * ```typescript
 * // Revoke single role (1 transaction)
 * const result = await generator.generate(
 *   JSON.stringify({
 *     action: "revoke",
 *     roleType: "burn",
 *     pool: "0xPoolAddress"
 *   }),
 *   tokenAddress
 * );
 *
 * const safeJson = formatter.format(result, {
 *   action: "revoke",
 *   roleType: "burn",
 *   pool: "0xPoolAddress"
 * }, metadata);
 *
 * // Description: "Revoke burn role from pool 0xPool..."
 * // Transactions: 1 (revokeBurnRole)
 * ```
 *
 * @see {@link RoleManagementFormatter} for interface definition
 * @see {@link buildMultiSafeTransactionJson} for multi-transaction JSON builder
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 * @see {@link SafeRoleManagementMetadata} for metadata structure including token address
 *
 * @public
 */
export function createRoleManagementFormatter(
  interfaceProvider: IInterfaceProvider,
): RoleManagementFormatter {
  return {
    format(
      result: RoleManagementTransactionResult,
      params: RoleManagementParams,
      metadata: SafeRoleManagementMetadata,
    ): SafeTransactionBuilderJSON {
      // Build description
      const action = params.action === 'grant' ? 'Grant' : 'Revoke';
      let roleDescription: string;
      if (params.roleType === 'mint') {
        roleDescription = 'mint role';
      } else if (params.roleType === 'burn') {
        roleDescription = 'burn role';
      } else {
        roleDescription = 'mint and burn roles';
      }

      const description = `${action} ${roleDescription} ${params.action === 'grant' ? 'to' : 'from'} pool ${params.pool}`;

      return buildMultiSafeTransactionJson({
        transactions: result.transactions,
        metadata,
        name: `${action} Token Pool Roles`,
        description,
        contractInterface: interfaceProvider.getFactoryBurnMintERC20Interface(),
        functionNames: result.functionNames,
      });
    },
  };
}

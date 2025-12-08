/**
 * @fileoverview Safe Transaction Builder JSON formatter for token minting transactions.
 *
 * This module formats token minting transaction data into Safe Transaction Builder
 * JSON format. Handles BurnMintERC20 token minting with receiver address and amount
 * validation, providing user-friendly metadata for Safe UI display.
 *
 * @module formatters/mintFormatter
 */

import { MintParams, SafeMintMetadata } from '../types/tokenMint';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Formatter interface for token minting transactions to Safe JSON format.
 *
 * Converts raw token minting transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures, mint parameters (receiver
 * and amount), and descriptive metadata for UI display.
 *
 * @remarks
 * The formatter extracts the `mint` method fragment from the BurnMintERC20 interface
 * and builds a complete Safe JSON structure with human-readable descriptions including
 * the mint amount and receiver address.
 *
 * @public
 */
export interface MintFormatter {
  /**
   * Formats a token minting transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Raw transaction data from the generator
   * @param params - Mint parameters (receiver address, amount)
   * @param metadata - Safe metadata including token address (chain ID, Safe address, owner)
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   *
   * @see {@link SafeTransactionBuilderJSON} for output format structure
   * @see {@link buildSafeTransactionJson} for JSON builder utility
   */
  format(
    transaction: SafeTransactionDataBase,
    params: MintParams,
    metadata: SafeMintMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a token minting transaction formatter.
 *
 * Factory function that creates a formatter for converting token minting transactions
 * into Safe Transaction Builder JSON format. Works with BurnMintERC20 tokens that have
 * the MINTER_ROLE permission system.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces (BurnMintERC20)
 *
 * @returns Formatter instance implementing {@link MintFormatter} interface
 *
 * @remarks
 * The formatter:
 * 1. Extracts the `mint` method fragment from BurnMintERC20 interface
 * 2. Builds descriptive transaction name ("Mint Tokens")
 * 3. Creates human-readable description showing amount and receiver
 * 4. Includes contract method signature with input types
 * 5. Formats complete Safe JSON with metadata (chain ID, Safe address, owner, token address)
 * 6. Returns JSON ready for Safe Transaction Builder import
 *
 * Minting Requirements:
 * - **MINTER_ROLE**: The caller (Safe contract) must have MINTER_ROLE on the token
 * - **Amount Format**: String representation in token wei (smallest unit)
 * - **Recipient Validation**: Must be a valid Ethereum address
 *
 * Workflow Integration:
 * - Used after deploying token and granting MINTER_ROLE to Safe
 * - Can be used to mint initial supply or additional tokens
 * - Often used for testing cross-chain transfers after pool deployment
 *
 * @example
 * ```typescript
 * const formatter = createMintFormatter(interfaceProvider);
 *
 * // Format mint transaction for Safe (1000 tokens with 18 decimals)
 * const transaction = await generator.generate(inputJson, tokenAddress);
 * const params: MintParams = {
 *   receiver: "0x1234567890123456789012345678901234567890",
 *   amount: "1000000000000000000000"  // 1000 tokens (18 decimals)
 * };
 * const metadata: SafeMintMetadata = {
 *   chainId: "84532",                // Base Sepolia
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   tokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
 * };
 *
 * const safeJson = formatter.format(transaction, params, metadata);
 *
 * // Save to file for Safe Transaction Builder
 * fs.writeFileSync('mint.json', JSON.stringify(safeJson, null, 2));
 *
 * // JSON structure includes:
 * console.log(safeJson.meta.name);                  // "Mint Tokens"
 * console.log(safeJson.meta.description);           // "Mint 1000000000000000000000 tokens to 0x1234..."
 * console.log(safeJson.transactions[0].to);         // Token address
 * console.log(safeJson.transactions[0].contractMethod.name); // "mint"
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Deploy token, grant role, mint
 * const tokenGen = createTokenDeploymentGenerator(logger, interfaceProvider, addressComputer);
 * const roleGen = createRoleManagementGenerator(logger, interfaceProvider);
 * const mintGen = createTokenMintGenerator(logger, interfaceProvider);
 * const mintFormatter = createMintFormatter(interfaceProvider);
 *
 * // Step 1: Deploy token and pool
 * const deployTx = await tokenGen.generate(
 *   JSON.stringify({
 *     name: "MyToken",
 *     symbol: "MTK",
 *     decimals: 18,
 *     maxSupply: "1000000000000000000000000",
 *     preMint: "0",
 *     remoteTokenPools: []
 *   }),
 *   factoryAddress,
 *   salt,
 *   safeAddress
 * );
 * // Execute deployment and get token address...
 *
 * // Step 2: Grant MINTER_ROLE to Safe
 * const roleGrantTx = await roleGen.generate(
 *   JSON.stringify({
 *     operation: "grant",
 *     roleType: "mint",
 *     poolOrAddress: safeAddress  // Grant to Safe itself
 *   }),
 *   tokenAddress
 * );
 * // Execute role grant...
 *
 * // Step 3: Mint tokens
 * const mintTx = await mintGen.generate(
 *   JSON.stringify({
 *     receiver: "0xRecipient",
 *     amount: "1000000000000000000000"
 *   }),
 *   tokenAddress
 * );
 *
 * // Step 4: Format for Safe
 * const safeJson = mintFormatter.format(mintTx, {
 *   receiver: "0xRecipient",
 *   amount: "1000000000000000000000"
 * }, {
 *   chainId: "84532",
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenAddress: tokenAddress
 * });
 *
 * // Step 5: Export and execute via Safe UI
 * fs.writeFileSync('mint.json', JSON.stringify(safeJson, null, 2));
 * ```
 *
 * @example
 * ```typescript
 * // Format small amount mint (USDC with 6 decimals)
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     receiver: "0x1234567890123456789012345678901234567890",
 *     amount: "1000000"  // 1 USDC (6 decimals)
 *   }),
 *   usdcTokenAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   receiver: "0x1234567890123456789012345678901234567890",
 *   amount: "1000000"
 * }, {
 *   chainId: "11155111",  // Ethereum Sepolia
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenAddress: usdcTokenAddress
 * });
 * // Description: "Mint 1000000 tokens to 0x1234..."
 * ```
 *
 * @example
 * ```typescript
 * // Mint to pool address for testing cross-chain transfers
 * const poolAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
 *
 * const transaction = await generator.generate(
 *   JSON.stringify({
 *     receiver: poolAddress,
 *     amount: "10000000000000000000"  // 10 tokens for testing
 *   }),
 *   tokenAddress
 * );
 *
 * const safeJson = formatter.format(transaction, {
 *   receiver: poolAddress,
 *   amount: "10000000000000000000"
 * }, {
 *   chainId: "84532",
 *   safeAddress: safeAddress,
 *   ownerAddress: ownerAddress,
 *   tokenAddress: tokenAddress
 * });
 * // Pool now has tokens available for cross-chain transfers
 * ```
 *
 * @see {@link MintFormatter} for interface definition
 * @see {@link buildSafeTransactionJson} for JSON builder implementation
 * @see {@link SafeTransactionBuilderJSON} for complete output format specification
 * @see {@link SafeMintMetadata} for metadata structure including token address
 *
 * @public
 */
export function createMintFormatter(interfaceProvider: IInterfaceProvider): MintFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      params: MintParams,
      metadata: SafeMintMetadata,
    ): SafeTransactionBuilderJSON {
      return buildSafeTransactionJson({
        transaction,
        metadata,
        name: 'Mint Tokens',
        description: `Mint ${params.amount} tokens to ${params.receiver}`,
        contractInterface: interfaceProvider.getFactoryBurnMintERC20Interface(),
        functionName: 'mint',
      });
    },
  };
}

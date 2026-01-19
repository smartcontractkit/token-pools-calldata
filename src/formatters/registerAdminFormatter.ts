/**
 * @fileoverview Safe Transaction Builder JSON formatter for register admin transactions.
 *
 * This module formats register admin transaction data into Safe Transaction Builder
 * JSON format. Handles all three registration methods for CCIP admin registration.
 *
 * @module formatters/registerAdminFormatter
 */

import { RegisterAdminInput, SafeRegisterAdminMetadata } from '../types/registerAdmin';
import { RegisterAdminTransactionResult } from '../generators/registerAdmin';
import { SafeTransactionBuilderJSON } from '../types/safe';
import { IInterfaceProvider } from '../interfaces';
import { buildSafeTransactionJson } from '../utils/safeJsonBuilder';

/**
 * Human-readable descriptions for each registration method.
 *
 * @internal
 */
const METHOD_DESCRIPTIONS: Record<string, string> = {
  'get-ccip-admin': 'getCCIPAdmin() function',
  owner: 'owner() function (Ownable pattern)',
  'access-control': 'DEFAULT_ADMIN_ROLE (AccessControl pattern)',
};

/**
 * Formatter interface for register admin transactions to Safe JSON format.
 *
 * Converts raw register admin transaction data into the Safe Transaction Builder
 * JSON format, including contract method signatures and descriptive metadata.
 *
 * @public
 */
export interface RegisterAdminFormatter {
  /**
   * Formats register admin transaction to Safe Transaction Builder JSON.
   *
   * @param result - Transaction result from generator
   * @param params - Register admin parameters (module, token, method)
   * @param metadata - Safe metadata including module address
   *
   * @returns Complete Safe Transaction Builder JSON ready for export
   */
  format(
    result: RegisterAdminTransactionResult,
    params: RegisterAdminInput,
    metadata: SafeRegisterAdminMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates a register admin transaction formatter.
 *
 * Factory function that creates a formatter for converting register admin
 * transactions into Safe Transaction Builder JSON format.
 *
 * @param interfaceProvider - Provider for contract ABI interfaces
 *
 * @returns Formatter instance implementing {@link RegisterAdminFormatter} interface
 *
 * @example
 * ```typescript
 * const formatter = createRegisterAdminFormatter(interfaceProvider);
 *
 * const result = await generator.generate(inputJson);
 * const params: RegisterAdminInput = {
 *   moduleAddress: "0x1234...",
 *   tokenAddress: "0x5678...",
 *   method: "owner"
 * };
 * const metadata: SafeRegisterAdminMetadata = {
 *   chainId: "84532",
 *   safeAddress: "0xYourSafe",
 *   ownerAddress: "0xYourOwner",
 *   moduleAddress: "0x1234..."
 * };
 *
 * const safeJson = formatter.format(result, params, metadata);
 * fs.writeFileSync('register-admin.json', JSON.stringify(safeJson, null, 2));
 * ```
 *
 * @public
 */
export function createRegisterAdminFormatter(
  interfaceProvider: IInterfaceProvider,
): RegisterAdminFormatter {
  return {
    format(
      result: RegisterAdminTransactionResult,
      params: RegisterAdminInput,
      metadata: SafeRegisterAdminMetadata,
    ): SafeTransactionBuilderJSON {
      const methodDescription = METHOD_DESCRIPTIONS[params.method] || params.method;
      const description = `Register as CCIP admin for token ${params.tokenAddress} using ${methodDescription}`;

      return buildSafeTransactionJson({
        transaction: result.transaction,
        metadata,
        name: 'Register CCIP Admin',
        description,
        contractInterface: interfaceProvider.getRegistryModuleOwnerCustomInterface(),
        functionName: result.functionName,
      });
    },
  };
}

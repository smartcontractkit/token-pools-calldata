/**
 * @fileoverview Safe Transaction Builder JSON formatter for accept ownership transactions.
 *
 * This module formats accept ownership transaction data into Safe Transaction Builder
 * JSON format. Used for contracts with two-step ownership transfer pattern.
 *
 * @module formatters/acceptOwnershipFormatter
 */

import {
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SafeMetadata,
  SAFE_TX_BUILDER_VERSION,
} from '../types/safe';
import { DEFAULTS } from '../config';

/**
 * Metadata for accept ownership Safe transaction formatting.
 *
 * @public
 */
export interface SafeAcceptOwnershipMetadata extends SafeMetadata {
  /** Address of the contract to accept ownership of */
  contractAddress: string;
}

/**
 * Formatter interface for accept ownership transactions to Safe JSON format.
 *
 * Converts raw accept ownership transaction data into the Safe Transaction Builder
 * JSON format, including contract method signature and descriptive metadata.
 *
 * @public
 */
export interface AcceptOwnershipFormatter {
  /**
   * Formats accept ownership transaction to Safe Transaction Builder JSON.
   *
   * @param transaction - Transaction data from generator
   * @param metadata - Safe metadata including contract address
   * @returns Complete Safe Transaction Builder JSON ready for export
   */
  format(
    transaction: SafeTransactionDataBase,
    metadata: SafeAcceptOwnershipMetadata,
  ): SafeTransactionBuilderJSON;
}

/**
 * Creates an accept ownership transaction formatter.
 *
 * Factory function that creates a formatter for converting accept ownership
 * transactions into Safe Transaction Builder JSON format.
 *
 * @returns Formatter instance implementing {@link AcceptOwnershipFormatter} interface
 *
 * @example
 * ```typescript
 * const formatter = createAcceptOwnershipFormatter();
 * const safeJson = formatter.format(transaction, {
 *   chainId: "84532",
 *   safeAddress: "0xSafe...",
 *   ownerAddress: "0xOwner...",
 *   contractAddress: "0xPool..."
 * });
 * ```
 *
 * @public
 */
export function createAcceptOwnershipFormatter(): AcceptOwnershipFormatter {
  return {
    format(
      transaction: SafeTransactionDataBase,
      metadata: SafeAcceptOwnershipMetadata,
    ): SafeTransactionBuilderJSON {
      // acceptOwnership() has no inputs - build the JSON directly
      // since we don't need an interface for a parameterless function
      return {
        version: DEFAULTS.SAFE_TX_VERSION,
        chainId: metadata.chainId,
        createdAt: Date.now(),
        meta: {
          name: `Accept Ownership - ${metadata.contractAddress.slice(0, 10)}...`,
          description: `Accept ownership of contract ${metadata.contractAddress}`,
          txBuilderVersion: SAFE_TX_BUILDER_VERSION,
          createdFromSafeAddress: metadata.safeAddress,
          createdFromOwnerAddress: metadata.ownerAddress,
        },
        transactions: [
          {
            to: transaction.to,
            value: transaction.value,
            data: transaction.data,
            operation: transaction.operation,
            contractMethod: {
              inputs: [],
              name: 'acceptOwnership',
              payable: false,
            },
            contractInputsValues: null,
          },
        ],
      };
    },
  };
}

/**
 * @fileoverview Safe Transaction Builder JSON construction utilities.
 *
 * This module provides builder functions for creating Safe Transaction Builder JSON
 * files that can be imported into the Safe Transaction Builder UI. These utilities
 * standardize Safe JSON creation across all generator types.
 *
 * Safe Transaction Builder JSON is a structured format that includes:
 * - Transaction metadata (chain ID, Safe address, owner, version)
 * - Transaction data (to, value, data, operation)
 * - Contract method signatures with input types
 * - Human-readable names and descriptions
 *
 * The builders extract method fragments from ethers.js Interface objects to ensure
 * accurate type information for the Safe UI.
 *
 * @module utils/safeJsonBuilder
 * @see {@link https://help.safe.global/en/articles/40841-transaction-builder} Safe Transaction Builder docs
 */

import { ethers } from 'ethers';
import {
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SafeMetadata,
  SAFE_TX_BUILDER_VERSION,
} from '../types/safe';
import { DEFAULTS } from '../config';

/**
 * Options for building Safe Transaction Builder JSON for a single transaction.
 *
 * @remarks
 * All fields are required to construct a valid Safe JSON file. The contract interface
 * and function name are used to extract accurate method signature information for
 * the Safe UI.
 *
 * @example
 * ```typescript
 * const options: SafeJsonBuilderOptions = {
 *   transaction: {
 *     to: '0x1234...',
 *     value: '0',
 *     data: '0xabcd...',
 *     operation: SafeOperationType.Call
 *   },
 *   metadata: {
 *     chainId: '84532',
 *     safeAddress: '0x5419...',
 *     ownerAddress: '0x0000...'
 *   },
 *   name: 'Deploy BurnMintERC20 Token',
 *   description: 'Deploy LINK token with 18 decimals',
 *   contractInterface: new ethers.Interface(FactoryABI),
 *   functionName: 'deployToken'
 * };
 * ```
 *
 * @public
 */
export interface SafeJsonBuilderOptions {
  /** Transaction data (to, value, data, operation) */
  transaction: SafeTransactionDataBase;

  /** Safe metadata (chain ID, Safe address, owner address) */
  metadata: SafeMetadata;

  /** Human-readable transaction name (shown in Safe UI) */
  name: string;

  /** Detailed transaction description (shown in Safe UI) */
  description: string;

  /** Contract interface for extracting method fragment */
  contractInterface: ethers.Interface;

  /** Function name to extract from the interface */
  functionName: string;
}

/**
 * Options for building Safe Transaction Builder JSON with multiple transactions.
 *
 * @remarks
 * Used for batched operations that require multiple transactions in a single Safe
 * JSON file (e.g., granting both mint and burn roles, deploying token and pool).
 *
 * The number of transactions must match the number of function names. Each transaction
 * is paired with its corresponding function name by array index.
 *
 * @example
 * ```typescript
 * const options: MultiSafeJsonBuilderOptions = {
 *   transactions: [
 *     { to: '0xToken', value: '0', data: '0x1111...', operation: 0 },
 *     { to: '0xToken', value: '0', data: '0x2222...', operation: 0 }
 *   ],
 *   metadata: {
 *     chainId: '84532',
 *     safeAddress: '0x5419...',
 *     ownerAddress: '0x0000...'
 *   },
 *   name: 'Grant Mint and Burn Roles',
 *   description: 'Grant both roles to TokenPool',
 *   contractInterface: new ethers.Interface(BurnMintERC20ABI),
 *   functionNames: ['grantMintRole', 'grantBurnRole']
 * };
 * ```
 *
 * @public
 */
export interface MultiSafeJsonBuilderOptions {
  /** Array of transaction data (must match functionNames length) */
  transactions: SafeTransactionDataBase[];

  /** Safe metadata (chain ID, Safe address, owner address) */
  metadata: SafeMetadata;

  /** Human-readable transaction batch name (shown in Safe UI) */
  name: string;

  /** Detailed batch description (shown in Safe UI) */
  description: string;

  /** Contract interface for extracting method fragments */
  contractInterface: ethers.Interface;

  /** Function names corresponding to each transaction (must match transactions length) */
  functionNames: string[];
}

/**
 * Builds Safe Transaction Builder JSON for a single transaction.
 *
 * Constructs a complete Safe Transaction Builder JSON file from transaction data,
 * metadata, and contract interface information. Extracts method signature from the
 * contract interface to provide accurate type information for the Safe UI.
 *
 * @param options - Builder options with transaction, metadata, and interface
 * @returns Complete Safe Transaction Builder JSON structure
 * @throws {Error} If function name not found in contract interface
 *
 * @remarks
 * Construction Steps:
 * 1. Extract method fragment from contract interface using function name
 * 2. Build transaction object with contractMethod signature
 * 3. Wrap in Safe JSON structure with metadata and version info
 *
 * Version Information:
 * - Uses DEFAULTS.SAFE_TX_VERSION for Safe JSON version
 * - Uses SAFE_TX_BUILDER_VERSION for Transaction Builder UI version
 * - Sets createdAt to current timestamp
 *
 * Method Fragment Extraction:
 * - Gets function from ethers.Interface by name
 * - Maps input parameters to Safe's input format (name, type, internalType)
 * - Includes payable flag for the method
 *
 * @example
 * ```typescript
 * const factoryInterface = new ethers.Interface(TokenPoolFactoryABI);
 * const transaction = {
 *   to: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 *   value: '0',
 *   data: '0x1234...',
 *   operation: SafeOperationType.Call
 * };
 *
 * const safeJson = buildSafeTransactionJson({
 *   transaction,
 *   metadata: {
 *     chainId: '84532',
 *     safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
 *     ownerAddress: '0x0000000000000000000000000000000000000000'
 *   },
 *   name: 'Deploy BurnMintERC20 Token',
 *   description: 'Deploy LINK token contract via TokenPoolFactory',
 *   contractInterface: factoryInterface,
 *   functionName: 'deployToken'
 * });
 *
 * // Output: SafeTransactionBuilderJSON with single transaction
 * // Can be imported into Safe Transaction Builder UI
 * ```
 *
 * @example
 * ```typescript
 * // Error case - invalid function name
 * try {
 *   buildSafeTransactionJson({
 *     transaction: { ... },
 *     metadata: { ... },
 *     name: 'Test',
 *     description: 'Test',
 *     contractInterface: factoryInterface,
 *     functionName: 'nonExistentFunction'
 *   });
 * } catch (error) {
 *   // Error: Function nonExistentFunction not found in contract interface
 * }
 * ```
 *
 * @see {@link buildMultiSafeTransactionJson} for multi-transaction batches
 * @public
 */
export function buildSafeTransactionJson(
  options: SafeJsonBuilderOptions,
): SafeTransactionBuilderJSON {
  const { transaction, metadata, name, description, contractInterface, functionName } = options;

  const methodFragment = contractInterface.getFunction(functionName);
  if (!methodFragment) {
    throw new Error(`Function ${functionName} not found in contract interface`);
  }

  return {
    version: DEFAULTS.SAFE_TX_VERSION,
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name,
      description,
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
          inputs: methodFragment.inputs.map((input) => ({
            name: input.name,
            type: input.type,
            internalType: input.type,
          })),
          name: methodFragment.name,
          payable: methodFragment.payable,
        },
        contractInputsValues: null,
      },
    ],
  };
}

/**
 * Builds Safe Transaction Builder JSON for multiple transactions in a batch.
 *
 * Constructs a complete Safe Transaction Builder JSON file containing multiple
 * transactions. Each transaction is paired with its corresponding function name
 * to extract accurate method signatures from the contract interface.
 *
 * @param options - Builder options with transaction array, metadata, and interface
 * @returns Complete Safe Transaction Builder JSON structure with multiple transactions
 * @throws {Error} If transaction count doesn't match function name count
 * @throws {Error} If any function name not found in contract interface
 *
 * @remarks
 * Use Cases:
 * - Granting multiple roles (mint + burn) to a pool
 * - Deploying token and pool in a single batch
 * - Configuring multiple cross-chain connections
 * - Any operation requiring atomic execution of multiple transactions
 *
 * Validation:
 * - Validates transaction count matches function name count
 * - Validates all function names exist in contract interface
 * - Each transaction paired with corresponding function by index
 *
 * Construction Steps:
 * 1. Validate array lengths match
 * 2. For each transaction:
 *    - Extract method fragment using function name at same index
 *    - Build transaction object with contractMethod signature
 * 3. Wrap all transactions in Safe JSON structure
 *
 * @example
 * ```typescript
 * const tokenInterface = new ethers.Interface(BurnMintERC20ABI);
 * const transactions = [
 *   {
 *     to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
 *     value: '0',
 *     data: '0x1111...',  // grantMintRole calldata
 *     operation: SafeOperationType.Call
 *   },
 *   {
 *     to: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
 *     value: '0',
 *     data: '0x2222...',  // grantBurnRole calldata
 *     operation: SafeOperationType.Call
 *   }
 * ];
 *
 * const safeJson = buildMultiSafeTransactionJson({
 *   transactions,
 *   metadata: {
 *     chainId: '84532',
 *     safeAddress: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
 *     ownerAddress: '0x0000000000000000000000000000000000000000'
 *   },
 *   name: 'Grant Mint and Burn Roles to Pool',
 *   description: 'Grant both mint and burn roles to TokenPool for cross-chain transfers',
 *   contractInterface: tokenInterface,
 *   functionNames: ['grantMintRole', 'grantBurnRole']
 * });
 *
 * // Output: SafeTransactionBuilderJSON with 2 transactions
 * // Both transactions executed atomically when Safe owners approve
 * ```
 *
 * @example
 * ```typescript
 * // Error case - mismatched array lengths
 * try {
 *   buildMultiSafeTransactionJson({
 *     transactions: [tx1, tx2, tx3],
 *     metadata: { ... },
 *     name: 'Test',
 *     description: 'Test',
 *     contractInterface: iface,
 *     functionNames: ['func1', 'func2']  // Only 2 names for 3 transactions
 *   });
 * } catch (error) {
 *   // Error: Mismatch between transactions (3) and functionNames (2)
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Error case - invalid function name at index 1
 * try {
 *   buildMultiSafeTransactionJson({
 *     transactions: [tx1, tx2],
 *     metadata: { ... },
 *     name: 'Test',
 *     description: 'Test',
 *     contractInterface: iface,
 *     functionNames: ['validFunc', 'invalidFunc']
 *   });
 * } catch (error) {
 *   // Error: Function invalidFunc not found in contract interface at index 1
 * }
 * ```
 *
 * @see {@link buildSafeTransactionJson} for single transaction
 * @public
 */
export function buildMultiSafeTransactionJson(
  options: MultiSafeJsonBuilderOptions,
): SafeTransactionBuilderJSON {
  const { transactions, metadata, name, description, contractInterface, functionNames } = options;

  if (transactions.length !== functionNames.length) {
    throw new Error(
      `Mismatch between transactions (${transactions.length}) and functionNames (${functionNames.length})`,
    );
  }

  const safeTransactions = transactions.map((tx, index) => {
    const functionName = functionNames[index];
    if (!functionName) {
      throw new Error(`Function name not found for transaction at index ${index}`);
    }

    const methodFragment = contractInterface.getFunction(functionName);
    if (!methodFragment) {
      throw new Error(`Function ${functionName} not found in contract interface at index ${index}`);
    }

    return {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation,
      contractMethod: {
        inputs: methodFragment.inputs.map((input) => ({
          name: input.name,
          type: input.type,
          internalType: input.type,
        })),
        name: methodFragment.name,
        payable: methodFragment.payable,
      },
      contractInputsValues: null,
    };
  });

  return {
    version: DEFAULTS.SAFE_TX_VERSION,
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name,
      description,
      txBuilderVersion: SAFE_TX_BUILDER_VERSION,
      createdFromSafeAddress: metadata.safeAddress,
      createdFromOwnerAddress: metadata.ownerAddress,
    },
    transactions: safeTransactions,
  };
}

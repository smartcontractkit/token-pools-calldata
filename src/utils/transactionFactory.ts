/**
 * @fileoverview Transaction factory utilities for creating Safe transaction objects.
 *
 * This module provides factory functions for constructing SafeTransactionDataBase
 * objects with standardized defaults and consistent structure. Handles function
 * encoding via ethers.js Interface and transaction creation.
 *
 * Transaction objects created here are used by:
 * - Generator functions to produce transaction data
 * - Output writers to format calldata and Safe JSON
 * - Safe Transaction Builder JSON construction
 *
 * All transactions default to:
 * - value: '0' (no ETH transfer)
 * - operation: SafeOperationType.Call (standard call, not delegatecall)
 *
 * @module utils/transactionFactory
 */

import { ethers } from 'ethers';
import { SafeTransactionDataBase, SafeOperationType } from '../types/safe';
import { DEFAULTS } from '../config';

/**
 * Options for creating a Safe transaction data object.
 *
 * @remarks
 * Required fields: `to` and `data`
 * Optional fields: `value` (defaults to '0'), `operation` (defaults to Call)
 *
 * @example
 * ```typescript
 * const options: TransactionOptions = {
 *   to: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 *   data: '0x1234567890abcdef...',
 *   value: '0',
 *   operation: SafeOperationType.Call
 * };
 * ```
 *
 * @public
 */
export interface TransactionOptions {
  /** Target contract address (20-byte Ethereum address) */
  to: string;

  /** Encoded function data (hex string starting with 0x) */
  data: string;

  /** Transaction value in wei (defaults to '0' for no ETH transfer) */
  value?: string;

  /** Operation type (defaults to Call for standard contract calls) */
  operation?: SafeOperationType;
}

/**
 * Creates a standardized Safe transaction data object.
 *
 * Factory function for constructing SafeTransactionDataBase objects with
 * consistent defaults. Used as the foundational builder for all transaction
 * creation in the codebase.
 *
 * @param options - Transaction creation options (to, data, value, operation)
 * @returns Complete SafeTransactionDataBase object with defaults applied
 *
 * @remarks
 * Default Values:
 * - `value`: '0' (no ETH transfer) from DEFAULTS.TRANSACTION_VALUE
 * - `operation`: SafeOperationType.Call (standard call, not delegatecall)
 *
 * Use Cases:
 * - When you already have encoded function data
 * - For custom transactions not using standard function calls
 * - As a building block for higher-level factory functions
 *
 * @example
 * ```typescript
 * import { createTransaction } from './transactionFactory';
 * import { SafeOperationType } from '../types/safe';
 *
 * // Create transaction with encoded data
 * const transaction = createTransaction({
 *   to: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 *   data: '0x1234567890abcdef...'
 * });
 *
 * console.log(transaction);
 * // {
 * //   to: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 * //   value: '0',
 * //   data: '0x1234567890abcdef...',
 * //   operation: 0  // SafeOperationType.Call
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // Create transaction with custom value and operation
 * const transaction = createTransaction({
 *   to: '0x1234567890123456789012345678901234567890',
 *   data: '0xabcd...',
 *   value: '1000000000000000000',  // 1 ETH in wei
 *   operation: SafeOperationType.DelegateCall
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Common pattern in generators
 * const factoryInterface = new ethers.Interface(FactoryABI);
 * const encodedData = factoryInterface.encodeFunctionData('deployToken', args);
 *
 * const transaction = createTransaction({
 *   to: factoryAddress,
 *   data: encodedData
 * });
 * ```
 *
 * @see {@link createFunctionCallTransaction} for automatic encoding
 * @public
 */
export function createTransaction(options: TransactionOptions): SafeTransactionDataBase {
  const {
    to,
    data,
    value = DEFAULTS.TRANSACTION_VALUE,
    operation = SafeOperationType.Call,
  } = options;

  return {
    to,
    value,
    data,
    operation,
  };
}

/**
 * Encodes function call data using ethers.js contract interface.
 *
 * Thin wrapper around ethers.Interface.encodeFunctionData for consistent
 * function encoding across the codebase. Encodes function name and arguments
 * into hex-encoded calldata.
 *
 * @param contractInterface - The ethers.js Interface for the contract
 * @param functionName - The function name to encode (e.g., 'deployToken')
 * @param args - Array of arguments matching function signature
 * @returns Hex-encoded function calldata (0x-prefixed)
 *
 * @remarks
 * Encoding Process:
 * 1. Looks up function in interface by name
 * 2. ABI-encodes function selector (first 4 bytes of keccak256(signature))
 * 3. ABI-encodes arguments according to function signature
 * 4. Concatenates selector + encoded args
 * 5. Returns hex string
 *
 * Error Handling:
 * - Throws if function name not found in interface
 * - Throws if argument count/types don't match signature
 * - ethers.js provides detailed error messages
 *
 * @example
 * ```typescript
 * import { ethers } from 'ethers';
 * import { encodeFunctionData } from './transactionFactory';
 *
 * const factoryInterface = new ethers.Interface([
 *   'function deployToken(bytes32 salt, address owner) returns (address)'
 * ]);
 *
 * const calldata = encodeFunctionData(
 *   factoryInterface,
 *   'deployToken',
 *   [
 *     '0x0000000000000000000000000000000000000000000000000000000123456789',
 *     '0x779877A7B0D9E8603169DdbD7836e478b4624789'
 *   ]
 * );
 *
 * console.log(calldata);
 * // 0x1234abcd...  (function selector + encoded args)
 * ```
 *
 * @example
 * ```typescript
 * // With complex argument types
 * const tokenInterface = new ethers.Interface(BurnMintERC20ABI);
 *
 * const mintCalldata = encodeFunctionData(
 *   tokenInterface,
 *   'mint',
 *   [
 *     '0x1234567890123456789012345678901234567890',  // receiver
 *     '1000000000000000000000'  // amount (1000 tokens with 18 decimals)
 *   ]
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Error case - wrong function name
 * try {
 *   encodeFunctionData(factoryInterface, 'nonExistent', []);
 * } catch (error) {
 *   // ethers.js error: no matching function
 * }
 * ```
 *
 * @see {@link createFunctionCallTransaction} for combined encoding + transaction creation
 * @public
 */
export function encodeFunctionData(
  contractInterface: ethers.Interface,
  functionName: string,
  args: unknown[],
): string {
  return contractInterface.encodeFunctionData(functionName, args);
}

/**
 * Creates a transaction with automatically encoded function call data.
 *
 * High-level factory function that combines function encoding and transaction
 * creation into a single step. Most convenient method for creating transactions
 * from function calls.
 *
 * @param to - Target contract address
 * @param contractInterface - The ethers.js Interface for the contract
 * @param functionName - The function name to call (e.g., 'deployToken')
 * @param args - Array of arguments matching function signature
 * @param options - Optional transaction options (value, operation)
 * @returns Complete SafeTransactionDataBase object with encoded function call
 *
 * @remarks
 * Convenience Function:
 * - Combines encodeFunctionData() + createTransaction() in one call
 * - Most commonly used factory function in generator code
 * - Reduces boilerplate and potential errors
 *
 * Process:
 * 1. Encode function call using interface
 * 2. Create transaction with encoded data
 * 3. Apply defaults (value='0', operation=Call)
 * 4. Merge optional overrides (value, operation)
 *
 * @example
 * ```typescript
 * import { ethers } from 'ethers';
 * import { createFunctionCallTransaction } from './transactionFactory';
 *
 * const factoryInterface = new ethers.Interface(TokenPoolFactoryABI);
 * const factoryAddress = '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e';
 *
 * // Create transaction for deployToken call
 * const transaction = createFunctionCallTransaction(
 *   factoryAddress,
 *   factoryInterface,
 *   'deployToken',
 *   [
 *     '0x0000000000000000000000000000000000000000000000000000000123456789',  // salt
 *     tokenParams,  // TokenDeployParams struct
 *     poolParams    // PoolDeployParams struct
 *   ]
 * );
 *
 * console.log(transaction);
 * // {
 * //   to: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 * //   value: '0',
 * //   data: '0x1234abcd...',  // encoded deployToken call
 * //   operation: 0
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // With custom transaction options
 * const tokenInterface = new ethers.Interface(BurnMintERC20ABI);
 * const tokenAddress = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
 *
 * const mintTransaction = createFunctionCallTransaction(
 *   tokenAddress,
 *   tokenInterface,
 *   'mint',
 *   [
 *     '0x1234567890123456789012345678901234567890',  // receiver
 *     '1000000000000000000000'  // amount
 *   ],
 *   {
 *     // Optional overrides
 *     value: '0',  // No ETH transfer (default)
 *     operation: SafeOperationType.Call  // Standard call (default)
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Common pattern in generators
 * export async function generateTokenDeployment(params: TokenDeploymentInput) {
 *   const factoryInterface = new ethers.Interface(TokenPoolFactoryABI);
 *
 *   const transaction = createFunctionCallTransaction(
 *     params.deployer,
 *     factoryInterface,
 *     'deployToken',
 *     [params.salt, tokenParams, poolParams]
 *   );
 *
 *   return { transaction, safeJson: null };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Error case - wrong arguments
 * try {
 *   createFunctionCallTransaction(
 *     factoryAddress,
 *     factoryInterface,
 *     'deployToken',
 *     ['wrong', 'args']  // Doesn't match function signature
 *   );
 * } catch (error) {
 *   // ethers.js error: argument type mismatch
 * }
 * ```
 *
 * @see {@link createTransaction} for manual encoding
 * @see {@link encodeFunctionData} for encoding only
 * @public
 */
export function createFunctionCallTransaction(
  to: string,
  contractInterface: ethers.Interface,
  functionName: string,
  args: unknown[],
  options?: Omit<TransactionOptions, 'to' | 'data'>,
): SafeTransactionDataBase {
  const data = encodeFunctionData(contractInterface, functionName, args);

  return createTransaction({
    to,
    data,
    ...options,
  });
}

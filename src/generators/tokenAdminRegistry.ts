/**
 * @fileoverview TokenAdminRegistry transaction generator.
 *
 * This module generates transactions for interacting with the TokenAdminRegistry
 * contract. Supports three methods:
 *
 * - `set-pool`: Set the pool for a token via setPool(localToken, pool)
 * - `transfer-admin`: Transfer admin role via transferAdminRole(localToken, newAdmin)
 * - `accept-admin`: Accept admin role via acceptAdminRole(localToken)
 *
 * @module generators/tokenAdminRegistry
 */

import {
  tokenAdminRegistryInputSchema,
  TokenAdminRegistryMethod,
  TOKEN_ADMIN_REGISTRY_METHOD,
  TokenAdminRegistryInput,
} from '../types/tokenAdminRegistry';
import { SafeOperationType, SafeTransactionDataBase } from '../types/safe';
import { DEFAULTS } from '../config';
import { TokenAdminRegistryError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Mapping of TokenAdminRegistry methods to contract function names.
 *
 * @internal
 */
const FUNCTION_NAMES = {
  [TOKEN_ADMIN_REGISTRY_METHOD.SET_POOL]: 'setPool',
  [TOKEN_ADMIN_REGISTRY_METHOD.TRANSFER_ADMIN]: 'transferAdminRole',
  [TOKEN_ADMIN_REGISTRY_METHOD.ACCEPT_ADMIN]: 'acceptAdminRole',
} as const;

/**
 * Type representing valid TokenAdminRegistry function names.
 *
 * @public
 */
export type TokenAdminRegistryFunctionName = (typeof FUNCTION_NAMES)[keyof typeof FUNCTION_NAMES];

/**
 * Result type for TokenAdminRegistry transaction generation.
 *
 * @public
 */
export interface TokenAdminRegistryTransactionResult {
  /**
   * Transaction data ready for execution.
   */
  transaction: SafeTransactionDataBase;

  /**
   * Contract function name used for the operation.
   */
  functionName: TokenAdminRegistryFunctionName;
}

/**
 * Generator interface for TokenAdminRegistry transactions.
 *
 * Generates transactions for TokenAdminRegistry contract operations.
 *
 * @public
 */
export interface TokenAdminRegistryGenerator {
  /**
   * Generates a TokenAdminRegistry transaction.
   *
   * @param inputJson - JSON string containing operation parameters
   *
   * @returns Result containing transaction data and function name
   *
   * @throws {TokenAdminRegistryError} When validation fails or transaction generation fails
   */
  generate(inputJson: string): Promise<TokenAdminRegistryTransactionResult>;
}

/**
 * Creates a TokenAdminRegistry transaction generator.
 *
 * Factory function that creates a generator for interacting with the TokenAdminRegistry
 * contract. Supports three methods:
 *
 * - **set-pool**: Sets the pool for a token
 * - **transfer-admin**: Initiates admin role transfer to a new address
 * - **accept-admin**: Accepts the admin role for a token
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces
 *
 * @returns Generator instance implementing {@link TokenAdminRegistryGenerator} interface
 *
 * @example
 * ```typescript
 * const generator = createTokenAdminRegistryGenerator(logger, interfaceProvider);
 *
 * // Set pool for a token
 * const inputJson = JSON.stringify({
 *   registryAddress: "0x1234567890123456789012345678901234567890",
 *   tokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   method: "set-pool",
 *   poolAddress: "0xabcdef1234567890123456789012345678901234"
 * });
 *
 * const result = await generator.generate(inputJson);
 *
 * console.log(result.functionName); // 'setPool'
 * console.log(result.transaction.to); // Registry address
 * console.log(result.transaction.data); // Encoded function call
 * ```
 *
 * @public
 */
export function createTokenAdminRegistryGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): TokenAdminRegistryGenerator {
  return {
    async generate(inputJson: string): Promise<TokenAdminRegistryTransactionResult> {
      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => tokenAdminRegistryInputSchema.parseAsync(JSON.parse(inputJson)),
        TokenAdminRegistryError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated TokenAdminRegistry input', {
        registryAddress: parsedInput.registryAddress,
        tokenAddress: parsedInput.tokenAddress,
        method: parsedInput.method,
      });

      try {
        const registryInterface = interfaceProvider.getTokenAdminRegistryInterface();

        // Get the function name based on method
        const functionName = FUNCTION_NAMES[parsedInput.method as TokenAdminRegistryMethod];

        // Encode the function call based on method
        let data: string;
        switch (parsedInput.method) {
          case TOKEN_ADMIN_REGISTRY_METHOD.SET_POOL:
            data = registryInterface.encodeFunctionData(functionName, [
              parsedInput.tokenAddress,
              (parsedInput as TokenAdminRegistryInput & { poolAddress: string }).poolAddress,
            ]);
            break;

          case TOKEN_ADMIN_REGISTRY_METHOD.TRANSFER_ADMIN:
            data = registryInterface.encodeFunctionData(functionName, [
              parsedInput.tokenAddress,
              (parsedInput as TokenAdminRegistryInput & { newAdminAddress: string })
                .newAdminAddress,
            ]);
            break;

          case TOKEN_ADMIN_REGISTRY_METHOD.ACCEPT_ADMIN:
            data = registryInterface.encodeFunctionData(functionName, [parsedInput.tokenAddress]);
            break;
        }

        const transaction: SafeTransactionDataBase = {
          to: parsedInput.registryAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };

        logger.info('Successfully generated TokenAdminRegistry transaction', {
          registryAddress: parsedInput.registryAddress,
          tokenAddress: parsedInput.tokenAddress,
          method: parsedInput.method,
          functionName,
        });

        return { transaction, functionName };
      } catch (error) {
        logError(error, 'generate TokenAdminRegistry transaction', {
          registryAddress: parsedInput.registryAddress,
          tokenAddress: parsedInput.tokenAddress,
          method: parsedInput.method,
        });
        throw error instanceof Error
          ? new TokenAdminRegistryError(
              'Failed to generate TokenAdminRegistry transaction',
              undefined,
              error,
            )
          : error;
      }
    },
  };
}

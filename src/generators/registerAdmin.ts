/**
 * @fileoverview Register admin transaction generator for RegistryModuleOwnerCustom contract.
 *
 * This module generates transactions for registering as the CCIP admin for a token
 * via the RegistryModuleOwnerCustom contract. Supports three registration methods
 * based on token's admin discovery mechanism.
 *
 * @module generators/registerAdmin
 */

import {
  registerAdminInputSchema,
  RegistrationMethod,
  REGISTRATION_METHOD,
} from '../types/registerAdmin';
import { SafeOperationType, SafeTransactionDataBase } from '../types/safe';
import { DEFAULTS } from '../config';
import { RegisterAdminError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Mapping of registration methods to RegistryModuleOwnerCustom contract function names.
 *
 * @internal
 */
const REGISTRATION_FUNCTION_NAMES = {
  [REGISTRATION_METHOD.GET_CCIP_ADMIN]: 'registerAdminViaGetCCIPAdmin',
  [REGISTRATION_METHOD.OWNER]: 'registerAdminViaOwner',
  [REGISTRATION_METHOD.ACCESS_CONTROL]: 'registerAccessControlDefaultAdmin',
} as const;

/**
 * Type representing valid RegistryModuleOwnerCustom registration function names.
 *
 * @public
 */
export type RegistrationFunctionName =
  (typeof REGISTRATION_FUNCTION_NAMES)[keyof typeof REGISTRATION_FUNCTION_NAMES];

/**
 * Result type for register admin transaction generation.
 *
 * @public
 */
export interface RegisterAdminTransactionResult {
  /**
   * Transaction data ready for execution.
   */
  transaction: SafeTransactionDataBase;

  /**
   * Contract function name used for the registration.
   */
  functionName: RegistrationFunctionName;
}

/**
 * Generator interface for register admin transactions.
 *
 * Generates transactions for registering as CCIP admin for a token via the
 * RegistryModuleOwnerCustom contract.
 *
 * @public
 */
export interface RegisterAdminGenerator {
  /**
   * Generates a register admin transaction.
   *
   * @param inputJson - JSON string containing registration parameters
   *
   * @returns Result containing transaction data and function name
   *
   * @throws {RegisterAdminError} When validation fails or transaction generation fails
   */
  generate(inputJson: string): Promise<RegisterAdminTransactionResult>;
}

/**
 * Creates a register admin transaction generator.
 *
 * Factory function that creates a generator for registering as CCIP admin for a token
 * via the RegistryModuleOwnerCustom contract. Supports three registration methods:
 *
 * - **get-ccip-admin**: Uses token's `getCCIPAdmin()` function
 * - **owner**: Uses token's `owner()` function (standard Ownable pattern)
 * - **access-control**: Uses token's `DEFAULT_ADMIN_ROLE` holder
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces
 *
 * @returns Generator instance implementing {@link RegisterAdminGenerator} interface
 *
 * @example
 * ```typescript
 * const generator = createRegisterAdminGenerator(logger, interfaceProvider);
 *
 * // Register using owner() method
 * const inputJson = JSON.stringify({
 *   moduleAddress: "0x1234567890123456789012345678901234567890",
 *   tokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   method: "owner"
 * });
 *
 * const result = await generator.generate(inputJson);
 *
 * console.log(result.functionName); // 'registerAdminViaOwner'
 * console.log(result.transaction.to); // Module address
 * console.log(result.transaction.data); // Encoded function call
 * ```
 *
 * @public
 */
export function createRegisterAdminGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): RegisterAdminGenerator {
  return {
    async generate(inputJson: string): Promise<RegisterAdminTransactionResult> {
      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => registerAdminInputSchema.parseAsync(JSON.parse(inputJson)),
        RegisterAdminError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated register admin input', {
        moduleAddress: parsedInput.moduleAddress,
        tokenAddress: parsedInput.tokenAddress,
        method: parsedInput.method,
      });

      try {
        const moduleInterface = interfaceProvider.getRegistryModuleOwnerCustomInterface();

        // Get the function name based on registration method
        const functionName = REGISTRATION_FUNCTION_NAMES[parsedInput.method as RegistrationMethod];

        // Encode the function call
        const data = moduleInterface.encodeFunctionData(functionName, [parsedInput.tokenAddress]);

        const transaction: SafeTransactionDataBase = {
          to: parsedInput.moduleAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };

        logger.info('Successfully generated register admin transaction', {
          moduleAddress: parsedInput.moduleAddress,
          tokenAddress: parsedInput.tokenAddress,
          method: parsedInput.method,
          functionName,
        });

        return { transaction, functionName };
      } catch (error) {
        logError(error, 'generate register admin transaction', {
          moduleAddress: parsedInput.moduleAddress,
          tokenAddress: parsedInput.tokenAddress,
        });
        throw error instanceof Error
          ? new RegisterAdminError(
              'Failed to generate register admin transaction',
              undefined,
              error,
            )
          : error;
      }
    },
  };
}

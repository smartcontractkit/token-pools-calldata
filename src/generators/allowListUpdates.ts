/**
 * @fileoverview Allow list management transaction generator for token pools.
 *
 * This module generates transactions for managing the allow list of token pool contracts,
 * enabling control over which addresses are permitted to interact with the pool for
 * cross-chain token transfers. Supports both adding and removing addresses atomically.
 *
 * @module generators/allowListUpdates
 */

import { ethers } from 'ethers';
import { allowListUpdatesSchema } from '../types/allowList';
import { SafeTransactionDataBase, SafeOperationType } from '../types/safe';
import { DEFAULTS } from '../config';
import { AllowListUpdatesError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Generator interface for token pool allow list update transactions.
 *
 * Generates transactions for updating the allow list on token pool contracts.
 * The allow list controls which addresses are permitted to initiate cross-chain
 * token transfers through the pool.
 *
 * @remarks
 * The generator validates input parameters, encodes the `applyAllowListUpdates`
 * function call with addresses to add and remove, and returns transaction data
 * ready for execution.
 *
 * @public
 */
export interface AllowListUpdatesGenerator {
  /**
   * Generates an allow list update transaction for a token pool.
   *
   * @param inputJson - JSON string containing addresses to add and remove from allow list
   * @param tokenPoolAddress - Address of the TokenPool contract
   *
   * @returns Transaction data containing target address, encoded function call, and operation type
   *
   * @throws {AllowListUpdatesError} When validation fails or transaction generation fails
   *
   * @see {@link allowListUpdatesSchema} for input JSON schema
   * @see {@link SafeTransactionDataBase} for return type structure
   */
  generate(inputJson: string, tokenPoolAddress: string): Promise<SafeTransactionDataBase>;
}

/**
 * Creates an allow list management transaction generator.
 *
 * Factory function that creates a generator for updating token pool allow lists.
 * The allow list is an access control mechanism that restricts which addresses
 * can initiate cross-chain token transfers through the pool.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPool)
 *
 * @returns Generator instance implementing {@link AllowListUpdatesGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates token pool address format
 * 2. Validates input JSON against Zod schema (removes array, adds array)
 * 3. Encodes TokenPool `applyAllowListUpdates` function call
 * 4. Returns transaction data ready for execution
 *
 * Allow List Purpose:
 * - Controls which addresses can call pool functions that initiate transfers
 * - Provides an additional security layer beyond ownership/role controls
 * - Useful for restricting pool access to specific integrations or contracts
 * - Can be disabled by setting allow list to empty (allows all addresses)
 *
 * Operation Behavior:
 * - **Atomic**: All additions and removals are processed in a single transaction
 * - **Order**: Removals are processed before additions
 * - **Idempotent**: Removing a non-existent address or adding an existing address is safe
 * - **Empty Arrays**: Either array can be empty (remove-only, add-only, or both operations)
 *
 * @example
 * ```typescript
 * const generator = createAllowListUpdatesGenerator(logger, interfaceProvider);
 *
 * // Add addresses to allow list (no removals)
 * const inputJson = JSON.stringify({
 *   removes: [],
 *   adds: [
 *     "0x1234567890123456789012345678901234567890",
 *     "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *   ]
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   "0x779877A7B0D9E8603169DdbD7836e478b4624789" // Pool address
 * );
 *
 * console.log(transaction.to);     // Pool contract address
 * console.log(transaction.data);   // Encoded applyAllowListUpdates call
 * console.log(transaction.value);  // "0" (no ETH sent)
 * console.log(transaction.operation); // SafeOperationType.Call
 *
 * // Execute via Safe multisig
 * ```
 *
 * @example
 * ```typescript
 * // Remove addresses from allow list (no additions)
 * const inputJson = JSON.stringify({
 *   removes: [
 *     "0xOldAddress1",
 *     "0xOldAddress2"
 *   ],
 *   adds: []
 * });
 *
 * const transaction = await generator.generate(inputJson, poolAddress);
 * ```
 *
 * @example
 * ```typescript
 * // Atomic update: remove old addresses and add new ones
 * const inputJson = JSON.stringify({
 *   removes: [
 *     "0xDeprecatedIntegration"
 *   ],
 *   adds: [
 *     "0xNewIntegrationV2",
 *     "0xAnotherAuthorizedContract"
 *   ]
 * });
 *
 * const transaction = await generator.generate(inputJson, poolAddress);
 * // Removals processed first, then additions (atomic)
 * ```
 *
 * @example
 * ```typescript
 * // Disable allow list by clearing all addresses
 * // Step 1: Get current allow list addresses from contract
 * const currentAllowList = ["0xAddr1", "0xAddr2", "0xAddr3"];
 *
 * // Step 2: Remove all addresses to disable allow list
 * const inputJson = JSON.stringify({
 *   removes: currentAllowList,
 *   adds: []
 * });
 *
 * const transaction = await generator.generate(inputJson, poolAddress);
 * // Empty allow list = unrestricted access (all addresses allowed)
 * ```
 *
 * @example
 * ```typescript
 * // Common workflow: Configure pool with allow list
 * // Step 1: Deploy pool
 * const poolGenerator = createPoolDeploymentGenerator(logger, interfaceProvider);
 * const poolTx = await poolGenerator.generate(poolInputJson, factoryAddress, salt);
 * // Execute and get deployed pool address...
 *
 * // Step 2: Set initial allow list
 * const allowListGenerator = createAllowListUpdatesGenerator(logger, interfaceProvider);
 * const allowListTx = await allowListGenerator.generate(
 *   JSON.stringify({
 *     removes: [],
 *     adds: [
 *       "0xTrustedIntegration1",
 *       "0xTrustedIntegration2"
 *     ]
 *   }),
 *   deployedPoolAddress
 * );
 * // Execute allow list transaction...
 *
 * // Step 3: Only allowed addresses can now use the pool
 * ```
 *
 * @throws {AllowListUpdatesError} When token pool address is invalid
 * @throws {AllowListUpdatesError} When input JSON validation fails
 * @throws {AllowListUpdatesError} When addresses in removes/adds arrays are invalid
 * @throws {AllowListUpdatesError} When transaction encoding fails
 *
 * @see {@link AllowListUpdatesGenerator} for interface definition
 * @see {@link allowListUpdatesSchema} for input validation schema
 *
 * @public
 */
export function createAllowListUpdatesGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): AllowListUpdatesGenerator {
  return {
    async generate(inputJson: string, tokenPoolAddress: string): Promise<SafeTransactionDataBase> {
      if (!ethers.isAddress(tokenPoolAddress)) {
        throw new AllowListUpdatesError('Invalid token pool address');
      }

      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => allowListUpdatesSchema.parseAsync(JSON.parse(inputJson)),
        AllowListUpdatesError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated allow list updates input', {
        removes: parsedInput.removes,
        adds: parsedInput.adds,
      });

      try {
        const poolInterface = interfaceProvider.getTokenPoolInterface();

        const data = poolInterface.encodeFunctionData('applyAllowListUpdates', [
          parsedInput.removes,
          parsedInput.adds,
        ]);

        logger.info('Successfully generated allow list updates transaction', {
          tokenPoolAddress,
          removes: parsedInput.removes,
          adds: parsedInput.adds,
        });

        return {
          to: tokenPoolAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };
      } catch (error) {
        logError(error, 'generate allow list updates transaction', { tokenPoolAddress });
        throw error instanceof Error
          ? new AllowListUpdatesError(
              'Failed to generate allow list updates transaction',
              undefined,
              error,
            )
          : error;
      }
    },
  };
}

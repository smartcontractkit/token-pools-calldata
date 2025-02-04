/**
 * @fileoverview Accept ownership transaction generator for contracts with two-step ownership.
 *
 * This module generates transactions for accepting ownership of contracts that use the
 * two-step ownership transfer pattern (transferOwnership + acceptOwnership). This pattern
 * is used by Chainlink contracts including BurnMintERC20 tokens and TokenPool contracts.
 *
 * Two-Step Ownership Pattern:
 * 1. Current owner calls `transferOwnership(newOwner)` - sets `pendingOwner`
 * 2. New owner calls `acceptOwnership()` - becomes the actual `owner`
 *
 * @module generators/acceptOwnership
 */

import { ethers } from 'ethers';

import { SafeOperationType, SafeTransactionDataBase } from '../types/safe';
import { DEFAULTS } from '../config';
import { AcceptOwnershipError } from '../errors';
import { executeAsync } from '../errors/AsyncErrorHandler';
import { ILogger } from '../interfaces';

/**
 * Generator interface for accept ownership transactions.
 *
 * Generates transactions for the `acceptOwnership()` function call. This function
 * has no parameters - it simply transfers ownership from the current owner to
 * the caller (who must be the `pendingOwner`).
 *
 * @remarks
 * Use Cases:
 * - After TokenPoolFactory deployment, Safe is set as pendingOwner on token and pool
 * - Safe must accept ownership before calling owner-only functions like `applyChainUpdates`
 * - Any contract using Chainlink's two-step ownership pattern
 *
 * @example
 * ```typescript
 * const generator = createAcceptOwnershipGenerator(logger);
 * const tx = generator.generate("0xPoolAddress...");
 * // tx.data = "0x79ba5097" (acceptOwnership function selector)
 * ```
 *
 * @public
 */
export interface AcceptOwnershipGenerator {
  /**
   * Generates accept ownership transaction data.
   *
   * @param contractAddress - Address of the contract to accept ownership of
   * @returns Promise resolving to transaction data for Safe execution
   */
  generate(contractAddress: string): Promise<SafeTransactionDataBase>;
}

/**
 * Creates an accept ownership transaction generator.
 *
 * Factory function that creates a generator for `acceptOwnership()` transactions.
 * The generated transactions can be used with any contract that implements the
 * two-step ownership transfer pattern.
 *
 * @param logger - Logger instance for operation logging
 * @returns Accept ownership generator instance
 *
 * @remarks
 * The `acceptOwnership()` function:
 * - Has no parameters
 * - Must be called by the `pendingOwner` address
 * - Transfers ownership from current owner to caller
 * - Clears the `pendingOwner` field
 *
 * Function Signature:
 * ```solidity
 * function acceptOwnership() external
 * ```
 *
 * Function Selector: `0x79ba5097`
 *
 * @example
 * ```typescript
 * const logger = createLogger();
 * const generator = createAcceptOwnershipGenerator(logger);
 *
 * // Generate for a token
 * const tokenTx = generator.generate("0xTokenAddress...");
 *
 * // Generate for a pool
 * const poolTx = generator.generate("0xPoolAddress...");
 * ```
 *
 * @public
 */
export function createAcceptOwnershipGenerator(logger: ILogger): AcceptOwnershipGenerator {
  return {
    async generate(contractAddress: string): Promise<SafeTransactionDataBase> {
      // Validate address format using executeAsync for consistency with other generators
      await executeAsync(
        () => {
          if (!ethers.isAddress(contractAddress)) {
            throw new AcceptOwnershipError('Invalid contract address format', {
              contractAddress,
            });
          }
          return Promise.resolve();
        },
        AcceptOwnershipError,
        'Address validation failed',
        { contractAddress },
      );

      logger.info('Generating accept ownership transaction', {
        contractAddress,
      });

      // acceptOwnership() has no parameters - just encode the function selector
      const iface = new ethers.Interface(['function acceptOwnership()']);
      const data = iface.encodeFunctionData('acceptOwnership', []);

      logger.info('Successfully generated accept ownership transaction', {
        contractAddress,
        functionSelector: data.slice(0, 10),
      });

      return {
        to: contractAddress,
        value: DEFAULTS.TRANSACTION_VALUE,
        data,
        operation: SafeOperationType.Call,
      };
    },
  };
}

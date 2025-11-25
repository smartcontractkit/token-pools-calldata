/**
 * @fileoverview Token minting transaction generator for BurnMintERC20 tokens.
 *
 * This module generates transactions for minting tokens to specified receivers.
 * Requires the caller to have the MINTER_ROLE on the BurnMintERC20 token contract.
 *
 * @module generators/tokenMint
 */

import { ethers } from 'ethers';
import { mintParamsSchema } from '../types/tokenMint';
import { SafeOperationType, SafeTransactionDataBase } from '../types/safe';
import { DEFAULTS } from '../config';
import { TokenMintError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Generator interface for token minting transactions.
 *
 * Generates transactions for minting BurnMintERC20 tokens to specified receivers.
 * The caller (Safe multisig or EOA) must have the MINTER_ROLE granted on the token
 * contract for the transaction to succeed.
 *
 * @remarks
 * The generator validates input parameters, encodes the mint function call with
 * receiver and amount, and returns transaction data ready for execution.
 *
 * @public
 */
export interface TokenMintGenerator {
  /**
   * Generates a token minting transaction.
   *
   * @param inputJson - JSON string containing mint parameters (receiver address and amount)
   * @param tokenAddress - Address of the BurnMintERC20 token contract
   *
   * @returns Transaction data containing target address, encoded mint call, and operation type
   *
   * @throws {TokenMintError} When validation fails or transaction generation fails
   *
   * @see {@link mintParamsSchema} for input JSON schema
   * @see {@link SafeTransactionDataBase} for return type structure
   */
  generate(inputJson: string, tokenAddress: string): Promise<SafeTransactionDataBase>;
}

/**
 * Creates a token minting transaction generator.
 *
 * Factory function that creates a generator for minting BurnMintERC20 tokens. The minting
 * operation requires the caller to have been granted the MINTER_ROLE on the token contract,
 * typically done via the role management generator.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (BurnMintERC20)
 *
 * @returns Generator instance implementing {@link TokenMintGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates token address format
 * 2. Validates input JSON against Zod schema (receiver address, amount)
 * 3. Encodes BurnMintERC20 `mint` function call
 * 4. Returns transaction data ready for execution
 *
 * Minter Role Requirement:
 * - The transaction will **fail** if the caller doesn't have MINTER_ROLE
 * - Use the role management generator to grant MINTER_ROLE before minting
 * - For token pools using BurnMintTokenPool, grant MINTER_ROLE to the pool contract
 *
 * Amount Format:
 * - Amount is specified as a string to avoid JavaScript number precision issues
 * - Represents token amount in smallest unit (e.g., wei for 18 decimal tokens)
 * - Example: "1000000000000000000" = 1 token with 18 decimals
 *
 * @example
 * ```typescript
 * const generator = createTokenMintGenerator(logger, interfaceProvider);
 *
 * // Mint 1000 tokens (with 18 decimals) to receiver
 * const inputJson = JSON.stringify({
 *   receiver: "0x1234567890123456789012345678901234567890",
 *   amount: "1000000000000000000000" // 1000 * 10^18
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   "0x779877A7B0D9E8603169DdbD7836e478b4624789" // token address
 * );
 *
 * console.log(transaction.to);     // Token contract address
 * console.log(transaction.data);   // Encoded mint(receiver, amount) call
 * console.log(transaction.value);  // "0" (no ETH sent)
 * console.log(transaction.operation); // SafeOperationType.Call
 *
 * // Execute via Safe multisig (which must have MINTER_ROLE)
 * ```
 *
 * @example
 * ```typescript
 * // Mint small amount for testing
 * const inputJson = JSON.stringify({
 *   receiver: "0xRecipientAddress",
 *   amount: "100000000" // 0.0000001 tokens (with 18 decimals)
 * });
 *
 * const transaction = await generator.generate(inputJson, tokenAddress);
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Grant role, then mint
 * // Step 1: Grant MINTER_ROLE to Safe
 * const roleGenerator = createRoleManagementGenerator(logger, interfaceProvider);
 * const grantRoleTx = await roleGenerator.generate(
 *   JSON.stringify({
 *     grantee: "0xSafeAddress",
 *     roleType: "mint",
 *     action: "grant"
 *   }),
 *   tokenAddress
 * );
 * // Execute grantRoleTx...
 *
 * // Step 2: Now Safe can mint tokens
 * const mintGenerator = createTokenMintGenerator(logger, interfaceProvider);
 * const mintTx = await mintGenerator.generate(
 *   JSON.stringify({
 *     receiver: "0xRecipient",
 *     amount: "1000000000000000000"
 *   }),
 *   tokenAddress
 * );
 * // Execute mintTx via Safe
 * ```
 *
 * @throws {TokenMintError} When token address is invalid
 * @throws {TokenMintError} When input JSON validation fails
 * @throws {TokenMintError} When receiver address is invalid
 * @throws {TokenMintError} When amount is invalid (negative, non-numeric)
 * @throws {TokenMintError} When transaction encoding fails
 *
 * @see {@link TokenMintGenerator} for interface definition
 * @see {@link mintParamsSchema} for input validation schema
 * @see {@link createRoleManagementGenerator} for granting MINTER_ROLE
 *
 * @public
 */
export function createTokenMintGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): TokenMintGenerator {
  return {
    async generate(inputJson: string, tokenAddress: string): Promise<SafeTransactionDataBase> {
      if (!ethers.isAddress(tokenAddress)) {
        throw new TokenMintError('Invalid token address');
      }

      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => mintParamsSchema.parseAsync(JSON.parse(inputJson)),
        TokenMintError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated mint input', {
        receiver: parsedInput.receiver,
        amount: parsedInput.amount,
      });

      try {
        // Get the token interface
        const tokenInterface = interfaceProvider.getFactoryBurnMintERC20Interface();

        // Encode the function call to mint
        const data = tokenInterface.encodeFunctionData('mint', [
          parsedInput.receiver,
          parsedInput.amount,
        ]);

        logger.info('Successfully generated mint transaction', {
          tokenAddress,
          receiver: parsedInput.receiver,
          amount: parsedInput.amount,
        });

        return {
          to: tokenAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };
      } catch (error) {
        logError(error, 'generate mint transaction', { tokenAddress });
        throw error instanceof Error
          ? new TokenMintError('Failed to generate mint transaction', undefined, error)
          : error;
      }
    },
  };
}

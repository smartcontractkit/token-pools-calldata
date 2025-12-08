/**
 * @fileoverview Role management transaction generator for BurnMintERC20 tokens.
 *
 * This module generates transactions for granting and revoking MINTER_ROLE and BURNER_ROLE
 * on BurnMintERC20 token contracts. Essential for configuring token pool permissions and
 * enabling cross-chain token transfers with BurnMintTokenPool contracts.
 *
 * @module generators/roleManagement
 */

import { ethers } from 'ethers';
import { roleManagementParamsSchema } from '../types/tokenMint';
import { SafeOperationType, SafeTransactionDataBase } from '../types/safe';
import { DEFAULTS } from '../config';
import { RoleManagementError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Mapping of role operations to BurnMintERC20 contract function names.
 *
 * This constant maps role management operations to their corresponding contract functions,
 * enabling type-safe function name resolution during transaction generation.
 *
 * @remarks
 * Grant operations:
 * - `grantMintRole`: Grants MINTER_ROLE to an address
 * - `grantBurnRole`: Grants BURNER_ROLE to an address
 * - `grantMintAndBurnRoles`: Grants both roles in a single transaction (gas efficient)
 *
 * Revoke operations:
 * - `revokeMintRole`: Revokes MINTER_ROLE from an address
 * - `revokeBurnRole`: Revokes BURNER_ROLE from an address
 * - Note: No combined revoke function exists; must call both separately for "both"
 *
 * @internal
 */
const ROLE_FUNCTION_NAMES = {
  grantMint: 'grantMintRole',
  grantBurn: 'grantBurnRole',
  grantBoth: 'grantMintAndBurnRoles',
  revokeMint: 'revokeMintRole',
  revokeBurn: 'revokeBurnRole',
} as const;

/**
 * Type representing valid BurnMintERC20 role management function names.
 *
 * Derived from {@link ROLE_FUNCTION_NAMES} to ensure type safety and consistency
 * between the mapping and actual contract function calls.
 *
 * @public
 */
export type RoleFunctionName = (typeof ROLE_FUNCTION_NAMES)[keyof typeof ROLE_FUNCTION_NAMES];

/**
 * Result type for role management transaction generation.
 *
 * Role management operations can generate either a single transaction (for grant operations
 * and single-role revokes) or multiple transactions (for revoking both roles, which requires
 * separate function calls).
 *
 * @remarks
 * Transaction Count by Operation:
 * - Grant mint: 1 transaction
 * - Grant burn: 1 transaction
 * - Grant both: 1 transaction (uses combined function)
 * - Revoke mint: 1 transaction
 * - Revoke burn: 1 transaction
 * - Revoke both: 2 transactions (no combined function exists)
 *
 * @public
 */
export interface RoleManagementTransactionResult {
  /**
   * Array of transaction data objects ready for execution.
   *
   * Contains 1 transaction for single operations, or 2 transactions when revoking both roles.
   */
  transactions: SafeTransactionDataBase[];

  /**
   * Array of contract function names corresponding to each transaction.
   *
   * Useful for logging, UI display, and transaction verification.
   */
  functionNames: RoleFunctionName[];
}

/**
 * Generator interface for token role management transactions.
 *
 * Generates transactions for granting and revoking MINTER_ROLE and BURNER_ROLE on
 * BurnMintERC20 token contracts. Essential for configuring permissions before token
 * minting/burning and enabling cross-chain transfers with BurnMintTokenPool.
 *
 * @remarks
 * Role management is required for:
 * - Granting MINTER_ROLE to Safe multisig for manual token minting
 * - Granting both roles to BurnMintTokenPool for cross-chain transfers
 * - Revoking roles when decommissioning pools or changing permissions
 *
 * @public
 */
export interface RoleManagementGenerator {
  /**
   * Generates role management transaction(s) for a BurnMintERC20 token.
   *
   * @param inputJson - JSON string containing role management parameters
   * @param tokenAddress - Address of the BurnMintERC20 token contract
   *
   * @returns Result containing one or more transactions and their function names
   *
   * @throws {RoleManagementError} When validation fails or transaction generation fails
   *
   * @see {@link roleManagementParamsSchema} for input JSON schema
   * @see {@link RoleManagementTransactionResult} for return type structure
   */
  generate(inputJson: string, tokenAddress: string): Promise<RoleManagementTransactionResult>;
}

/**
 * Creates a role management transaction generator.
 *
 * Factory function that creates a generator for granting and revoking MINTER_ROLE and
 * BURNER_ROLE on BurnMintERC20 token contracts. Supports granting/revoking individual
 * roles or both roles simultaneously.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (BurnMintERC20)
 *
 * @returns Generator instance implementing {@link RoleManagementGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates token address format
 * 2. Validates input JSON against Zod schema (pool/grantee, roleType, action)
 * 3. Selects appropriate contract function(s) based on action and role type
 * 4. Encodes function call(s) with pool/grantee address
 * 5. Returns transaction data ready for execution
 *
 * Role Types:
 * - **mint**: MINTER_ROLE only (allows minting tokens)
 * - **burn**: BURNER_ROLE only (allows burning tokens)
 * - **both**: Both MINTER_ROLE and BURNER_ROLE (most common for pools)
 *
 * Actions:
 * - **grant**: Add role(s) to an address
 *   - "both" uses single `grantMintAndBurnRoles` call (gas efficient)
 * - **revoke**: Remove role(s) from an address
 *   - "both" requires two separate calls (no combined function)
 *
 * Common Use Cases:
 * 1. **Grant both roles to pool**: Required for BurnMintTokenPool to function
 * 2. **Grant mint to Safe**: Allows Safe to mint tokens manually
 * 3. **Revoke roles from old pool**: When migrating to a new pool contract
 *
 * @example
 * ```typescript
 * const generator = createRoleManagementGenerator(logger, interfaceProvider);
 *
 * // Grant both mint and burn roles to a BurnMintTokenPool (most common)
 * const inputJson = JSON.stringify({
 *   pool: "0x1234567890123456789012345678901234567890", // Pool address
 *   roleType: "both",
 *   action: "grant"
 * });
 *
 * const result = await generator.generate(
 *   inputJson,
 *   "0x779877A7B0D9E8603169DdbD7836e478b4624789" // Token address
 * );
 *
 * console.log(result.transactions.length);  // 1 (uses combined function)
 * console.log(result.functionNames);        // ['grantMintAndBurnRoles']
 * console.log(result.transactions[0].to);   // Token contract address
 * console.log(result.transactions[0].data); // Encoded function call
 *
 * // Execute transaction(s) via Safe multisig
 * ```
 *
 * @example
 * ```typescript
 * // Grant only MINTER_ROLE to Safe multisig
 * const inputJson = JSON.stringify({
 *   pool: "0xSafeAddress",
 *   roleType: "mint",
 *   action: "grant"
 * });
 *
 * const result = await generator.generate(inputJson, tokenAddress);
 * console.log(result.transactions.length);  // 1
 * console.log(result.functionNames);        // ['grantMintRole']
 * ```
 *
 * @example
 * ```typescript
 * // Revoke both roles from an address (generates 2 transactions)
 * const inputJson = JSON.stringify({
 *   pool: "0xOldPoolAddress",
 *   roleType: "both",
 *   action: "revoke"
 * });
 *
 * const result = await generator.generate(inputJson, tokenAddress);
 * console.log(result.transactions.length);  // 2 (separate calls required)
 * console.log(result.functionNames);        // ['revokeMintRole', 'revokeBurnRole']
 *
 * // Both transactions must be executed (can be batched in Safe)
 * ```
 *
 * @example
 * ```typescript
 * // Complete workflow: Deploy pool, grant roles, verify
 * // Step 1: Deploy BurnMintTokenPool
 * const poolGenerator = createPoolDeploymentGenerator(logger, interfaceProvider);
 * const poolDeployTx = await poolGenerator.generate(poolInputJson, factoryAddress, salt);
 * // Execute and get deployed pool address...
 *
 * // Step 2: Grant both roles to the pool
 * const roleGenerator = createRoleManagementGenerator(logger, interfaceProvider);
 * const grantRoleResult = await roleGenerator.generate(
 *   JSON.stringify({
 *     pool: deployedPoolAddress,
 *     roleType: "both",
 *     action: "grant"
 *   }),
 *   tokenAddress
 * );
 * // Execute grant transaction...
 *
 * // Step 3: Pool can now mint and burn tokens for cross-chain transfers
 * ```
 *
 * @throws {RoleManagementError} When token address is invalid
 * @throws {RoleManagementError} When input JSON validation fails
 * @throws {RoleManagementError} When pool/grantee address is invalid
 * @throws {RoleManagementError} When roleType is invalid (must be 'mint', 'burn', or 'both')
 * @throws {RoleManagementError} When action is invalid (must be 'grant' or 'revoke')
 * @throws {RoleManagementError} When transaction encoding fails
 *
 * @see {@link RoleManagementGenerator} for interface definition
 * @see {@link roleManagementParamsSchema} for input validation schema
 * @see {@link RoleManagementTransactionResult} for return type structure
 * @see {@link ROLE_FUNCTION_NAMES} for function name mapping
 *
 * @public
 */
export function createRoleManagementGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): RoleManagementGenerator {
  return {
    async generate(
      inputJson: string,
      tokenAddress: string,
    ): Promise<RoleManagementTransactionResult> {
      if (!ethers.isAddress(tokenAddress)) {
        throw new RoleManagementError('Invalid token address');
      }

      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => roleManagementParamsSchema.parseAsync(JSON.parse(inputJson)),
        RoleManagementError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated role management input', {
        pool: parsedInput.pool,
        roleType: parsedInput.roleType,
        action: parsedInput.action,
      });

      try {
        const tokenInterface = interfaceProvider.getFactoryBurnMintERC20Interface();
        const transactions: SafeTransactionDataBase[] = [];
        const functionNames: RoleFunctionName[] = [];

        // Determine which functions to call based on action and role type
        if (parsedInput.action === 'grant') {
          // Grant operations: can use combined function for 'both'
          let data: string;
          let functionName: RoleFunctionName;

          switch (parsedInput.roleType) {
            case 'mint':
              functionName = ROLE_FUNCTION_NAMES.grantMint;
              data = tokenInterface.encodeFunctionData(functionName, [parsedInput.pool]);
              break;
            case 'burn':
              functionName = ROLE_FUNCTION_NAMES.grantBurn;
              data = tokenInterface.encodeFunctionData(functionName, [parsedInput.pool]);
              break;
            case 'both':
            default:
              functionName = ROLE_FUNCTION_NAMES.grantBoth;
              data = tokenInterface.encodeFunctionData(functionName, [parsedInput.pool]);
              break;
          }

          transactions.push({
            to: tokenAddress,
            value: DEFAULTS.TRANSACTION_VALUE,
            data,
            operation: SafeOperationType.Call,
          });
          functionNames.push(functionName);
        } else {
          // Revoke operations: must call separate functions for 'both'
          if (parsedInput.roleType === 'mint' || parsedInput.roleType === 'both') {
            const functionName = ROLE_FUNCTION_NAMES.revokeMint;
            const data = tokenInterface.encodeFunctionData(functionName, [parsedInput.pool]);
            transactions.push({
              to: tokenAddress,
              value: DEFAULTS.TRANSACTION_VALUE,
              data,
              operation: SafeOperationType.Call,
            });
            functionNames.push(functionName);
          }

          if (parsedInput.roleType === 'burn' || parsedInput.roleType === 'both') {
            const functionName = ROLE_FUNCTION_NAMES.revokeBurn;
            const data = tokenInterface.encodeFunctionData(functionName, [parsedInput.pool]);
            transactions.push({
              to: tokenAddress,
              value: DEFAULTS.TRANSACTION_VALUE,
              data,
              operation: SafeOperationType.Call,
            });
            functionNames.push(functionName);
          }
        }

        logger.info('Successfully generated role management transaction(s)', {
          tokenAddress,
          pool: parsedInput.pool,
          roleType: parsedInput.roleType,
          action: parsedInput.action,
          functionNames,
          transactionCount: transactions.length,
        });

        return { transactions, functionNames };
      } catch (error) {
        logError(error, 'generate role management transaction', { tokenAddress });
        throw error instanceof Error
          ? new RoleManagementError(
              'Failed to generate role management transaction',
              undefined,
              error,
            )
          : error;
      }
    },
  };
}

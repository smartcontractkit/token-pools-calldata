/**
 * @fileoverview Token pool deployment transaction generator for existing tokens.
 *
 * This module generates transactions for deploying TokenPool contracts (either BurnMintTokenPool
 * or LockReleaseTokenPool) for existing token contracts via the TokenPoolFactory using CREATE2
 * for deterministic addresses. Supports cross-chain configuration with remote pool setups.
 *
 * @module generators/poolDeployment
 */

import { ethers } from 'ethers';
import { BYTECODES, DEFAULTS } from '../config';
import {
  poolDeploymentParamsSchema,
  ContractRemoteTokenPoolInfo,
  RemoteTokenPoolInfo,
} from '../types/poolDeployment';
import { SafeTransactionDataBase, SafeOperationType } from '../types/safe';
import { poolTypeToNumber } from '../utils/poolTypeConverter';
import { PoolDeploymentError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Generator interface for token pool deployment transactions.
 *
 * Generates transactions that deploy TokenPool contracts for existing token contracts
 * through the TokenPoolFactory. Supports both BurnMintTokenPool (for mintable/burnable tokens)
 * and LockReleaseTokenPool (for lock-and-release mechanisms) pool types.
 *
 * @remarks
 * The generator validates input parameters, selects the appropriate pool bytecode based on
 * pool type, converts pool type enums to contract-compatible numbers, and generates the
 * factory deployment transaction with optional remote chain configurations.
 *
 * @public
 */
export interface PoolDeploymentGenerator {
  /**
   * Generates a token pool deployment transaction for an existing token.
   *
   * @param inputJson - JSON string containing pool deployment parameters
   * @param factoryAddress - Address of the TokenPoolFactory contract
   * @param salt - 32-byte salt for CREATE2 deterministic deployment (hex string with 0x prefix)
   *
   * @returns Transaction data containing target address, encoded function call, and operation type
   *
   * @throws {PoolDeploymentError} When validation fails or transaction generation fails
   *
   * @see {@link poolDeploymentParamsSchema} for input JSON schema
   * @see {@link SafeTransactionDataBase} for return type structure
   */
  generate(
    inputJson: string,
    factoryAddress: string,
    salt: string,
  ): Promise<SafeTransactionDataBase>;
}

/**
 * Creates a token pool deployment generator.
 *
 * Factory function that creates a generator for deploying TokenPool contracts for existing
 * tokens via the TokenPoolFactory. Supports two pool types: BurnMintTokenPool for tokens
 * that can be minted and burned, and LockReleaseTokenPool for tokens that use a lock-and-release
 * mechanism for cross-chain transfers.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPoolFactory)
 *
 * @returns Generator instance implementing {@link PoolDeploymentGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates input JSON against Zod schema
 * 2. Validates factory address
 * 3. Converts pool type string to numeric enum (BurnMintTokenPool=0, LockReleaseTokenPool=1)
 * 4. Selects appropriate pool bytecode based on pool type
 * 5. Processes remote token pool configurations (if provided)
 * 6. Encodes factory `deployTokenPoolWithExistingToken` function call
 * 7. Returns transaction data ready for execution
 *
 * Pool Type Selection:
 * - **BurnMintTokenPool**: For tokens with mint/burn capabilities. Tokens are burned on the
 *   source chain and minted on the destination chain during cross-chain transfers.
 * - **LockReleaseTokenPool**: For tokens without mint/burn. Tokens are locked on one chain
 *   and equivalent amounts are released on another chain.
 *
 * @example
 * ```typescript
 * const generator = createPoolDeploymentGenerator(
 *   logger,
 *   interfaceProvider
 * );
 *
 * // Deploy BurnMintTokenPool for an existing token
 * const inputJson = JSON.stringify({
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   decimals: 18,
 *   poolType: "BurnMintTokenPool",
 *   remoteTokenPools: [
 *     {
 *       remoteChainSelector: "16015286601757825753",
 *       remotePoolAddress: "0x1234567890123456789012345678901234567890",
 *       remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *       poolType: "BurnMintTokenPool"
 *     }
 *   ]
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   "0x17d8a409fe2cef2d3808bcb61f14abeffc28876e", // factory
 *   "0x0000000000000000000000000000000000000000000000000000000123456789"  // salt
 * );
 *
 * console.log(transaction.to);     // Factory address
 * console.log(transaction.data);   // Encoded deployTokenPoolWithExistingToken call
 * console.log(transaction.value);  // "0" (no ETH sent)
 * console.log(transaction.operation); // SafeOperationType.Call
 * ```
 *
 * @example
 * ```typescript
 * // Deploy LockReleaseTokenPool for an existing token
 * const inputJson = JSON.stringify({
 *   token: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
 *   decimals: 18,
 *   poolType: "LockReleaseTokenPool",
 *   remoteTokenPools: []
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   "0x17d8a409fe2cef2d3808bcb61f14abeffc28876e",
 *   "0x0000000000000000000000000000000000000000000000000000000123456789"
 * );
 * ```
 *
 * @throws {PoolDeploymentError} When factory address is invalid
 * @throws {PoolDeploymentError} When salt is missing or invalid
 * @throws {PoolDeploymentError} When input JSON validation fails
 * @throws {PoolDeploymentError} When transaction encoding fails
 *
 * @see {@link PoolDeploymentGenerator} for interface definition
 * @see {@link poolDeploymentParamsSchema} for input validation schema
 * @see {@link poolTypeToNumber} for pool type conversion
 * @see {@link BYTECODES} for pool contract bytecodes
 *
 * @public
 */
export function createPoolDeploymentGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): PoolDeploymentGenerator {
  return {
    async generate(
      inputJson: string,
      factoryAddress: string,
      salt: string,
    ): Promise<SafeTransactionDataBase> {
      if (!ethers.isAddress(factoryAddress)) {
        throw new PoolDeploymentError('Invalid factory address');
      }

      if (!salt) {
        throw new PoolDeploymentError('Salt is required for deployment');
      }

      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => poolDeploymentParamsSchema.parseAsync(JSON.parse(inputJson)),
        PoolDeploymentError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated pool deployment input', {
        poolType: parsedInput.poolType,
        token: parsedInput.token,
      });

      try {
        // Get the factory interface
        const factoryInterface = interfaceProvider.getTokenPoolFactoryInterface();

        // Convert pool type enum to contract value
        const poolTypeValue = poolTypeToNumber(parsedInput.poolType);

        // Convert remote token pools' pool types to contract values
        const remoteTokenPools: ContractRemoteTokenPoolInfo[] = parsedInput.remoteTokenPools.map(
          (pool: RemoteTokenPoolInfo) => ({
            ...pool,
            poolType: poolTypeToNumber(pool.poolType),
          }),
        );

        // Get the appropriate pool bytecode
        const poolBytecode =
          parsedInput.poolType === 'BurnMintTokenPool'
            ? BYTECODES.BURN_MINT_TOKEN_POOL
            : BYTECODES.LOCK_RELEASE_TOKEN_POOL;

        // Encode the function call to deployTokenPoolWithExistingToken
        const data = factoryInterface.encodeFunctionData('deployTokenPoolWithExistingToken', [
          parsedInput.token,
          parsedInput.decimals,
          remoteTokenPools,
          poolBytecode,
          salt,
          poolTypeValue,
        ]);

        logger.info('Successfully generated pool deployment transaction');

        return {
          to: factoryAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };
      } catch (error) {
        logError(error, 'generate pool deployment transaction', {
          factoryAddress,
          salt,
        });
        throw error instanceof Error
          ? new PoolDeploymentError('Failed to generate deployment transaction', undefined, error)
          : error;
      }
    },
  };
}

/**
 * @fileoverview Token and pool deployment transaction generator.
 *
 * This module generates transactions for deploying both a BurnMintERC20 token and its
 * associated TokenPool contract via the TokenPoolFactory using CREATE2 for deterministic
 * addresses. Supports cross-chain configuration with remote token pools.
 *
 * @module generators/tokenDeployment
 */

import { ethers } from 'ethers';
import { BYTECODES, DEFAULTS } from '../config';
import { tokenDeploymentParamsSchema } from '../types/tokenDeployment';
import { SafeOperationType, SafeTransactionDataBase } from '../types/safe';
import { TokenDeploymentError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider, IAddressComputer } from '../interfaces';

/**
 * Generator interface for token and pool deployment transactions.
 *
 * Generates transactions that deploy both a BurnMintERC20 token and its associated
 * BurnMintTokenPool contract through the TokenPoolFactory contract using CREATE2
 * for deterministic address computation.
 *
 * @remarks
 * The generator validates input parameters, encodes token constructor arguments,
 * computes CREATE2 deterministic addresses, and generates the factory deployment
 * transaction. The resulting transaction can be executed via Safe multisig or
 * directly submitted to the blockchain.
 *
 * @public
 */
export interface TokenDeploymentGenerator {
  /**
   * Generates a token and pool deployment transaction.
   *
   * @param inputJson - JSON string containing token deployment parameters
   * @param factoryAddress - Address of the TokenPoolFactory contract
   * @param salt - 32-byte salt for CREATE2 deterministic deployment (hex string with 0x prefix)
   * @param safeAddress - Address of the Safe multisig (becomes token owner and admin)
   *
   * @returns Transaction data containing target address, encoded function call, and operation type
   *
   * @throws {TokenDeploymentError} When validation fails or transaction generation fails
   *
   * @see {@link tokenDeploymentParamsSchema} for input JSON schema
   * @see {@link SafeTransactionDataBase} for return type structure
   */
  generate(
    inputJson: string,
    factoryAddress: string,
    salt: string,
    safeAddress: string,
  ): Promise<SafeTransactionDataBase>;
}

/**
 * Creates a token and pool deployment generator.
 *
 * Factory function that creates a generator for deploying both BurnMintERC20 tokens
 * and their associated TokenPool contracts via the TokenPoolFactory. Uses CREATE2
 * for deterministic address computation, allowing the token and pool addresses to be
 * known before deployment.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPoolFactory, BurnMintERC20)
 * @param addressComputer - Computes CREATE2 deterministic addresses based on factory, init code, and salt
 *
 * @returns Generator instance implementing {@link TokenDeploymentGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates input JSON against Zod schema
 * 2. Validates factory and Safe addresses
 * 3. Encodes token constructor parameters (name, symbol, decimals, max supply, pre-mint, owner)
 * 4. Combines token bytecode with constructor args to create init code
 * 5. Computes CREATE2 token address for reference
 * 6. Encodes factory `deployTokenAndTokenPool` function call
 * 7. Returns transaction data ready for execution
 *
 * The factory contract will:
 * - Deploy the token contract using CREATE2
 * - Deploy the pool contract using CREATE2
 * - Set up initial cross-chain configurations if provided
 * - Transfer ownership to the Safe address
 *
 * @example
 * ```typescript
 * const generator = createTokenDeploymentGenerator(
 *   logger,
 *   interfaceProvider,
 *   addressComputer
 * );
 *
 * const inputJson = JSON.stringify({
 *   name: "MyToken",
 *   symbol: "MTK",
 *   decimals: 18,
 *   maxSupply: "1000000000000000000000000",
 *   preMint: "100000000000000000000",
 *   remoteTokenPools: []
 * });
 *
 * const transaction = await generator.generate(
 *   inputJson,
 *   "0x17d8a409fe2cef2d3808bcb61f14abeffc28876e", // factory
 *   "0x0000000000000000000000000000000000000000000000000000000123456789", // salt
 *   "0x5419c6d83473d1c653e7b51e8568fafedce94f01"  // safe
 * );
 *
 * console.log(transaction.to);     // Factory address
 * console.log(transaction.data);   // Encoded deployTokenAndTokenPool call
 * console.log(transaction.value);  // "0" (no ETH sent)
 * console.log(transaction.operation); // SafeOperationType.Call
 * ```
 *
 * @throws {TokenDeploymentError} When factory address is invalid
 * @throws {TokenDeploymentError} When Safe address is invalid
 * @throws {TokenDeploymentError} When salt is missing or invalid
 * @throws {TokenDeploymentError} When input JSON validation fails
 * @throws {TokenDeploymentError} When transaction encoding fails
 *
 * @see {@link TokenDeploymentGenerator} for interface definition
 * @see {@link tokenDeploymentParamsSchema} for input validation schema
 * @see {@link IAddressComputer.computeCreate2Address} for address computation
 * @see {@link BYTECODES} for contract bytecodes
 *
 * @public
 */
export function createTokenDeploymentGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
  addressComputer: IAddressComputer,
): TokenDeploymentGenerator {
  return {
    async generate(
      inputJson: string,
      factoryAddress: string,
      salt: string,
      safeAddress: string,
    ): Promise<SafeTransactionDataBase> {
      if (!ethers.isAddress(factoryAddress)) {
        throw new TokenDeploymentError('Invalid factory address');
      }

      if (!ethers.isAddress(safeAddress)) {
        throw new TokenDeploymentError('Invalid Safe address');
      }

      if (!salt) {
        throw new TokenDeploymentError('Salt is required for deployment');
      }

      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => tokenDeploymentParamsSchema.parseAsync(JSON.parse(inputJson)),
        TokenDeploymentError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated token deployment input', {
        name: parsedInput.name,
        symbol: parsedInput.symbol,
      });

      try {
        const remoteTokenPools = parsedInput.remoteTokenPools;

        // Get the token interface
        const tokenInterface = interfaceProvider.getFactoryBurnMintERC20Interface();

        // Encode token constructor parameters
        const constructorArgs = tokenInterface.encodeDeploy([
          parsedInput.name,
          parsedInput.symbol,
          parsedInput.decimals,
          parsedInput.maxSupply,
          parsedInput.preMint,
          safeAddress,
        ]);

        // Combine bytecode and constructor args
        const tokenInitCode = ethers.solidityPacked(
          ['bytes', 'bytes'],
          [BYTECODES.FACTORY_BURN_MINT_ERC20, constructorArgs],
        );

        // Get the factory interface
        const factoryInterface = interfaceProvider.getTokenPoolFactoryInterface();

        // Get the pool bytecode
        const tokenPoolInitCode = BYTECODES.BURN_MINT_TOKEN_POOL;

        // Compute deterministic addresses
        const tokenAddress = addressComputer.computeCreate2Address(
          factoryAddress,
          tokenInitCode,
          salt,
          safeAddress,
        );

        logger.info('Computed Token deterministic addresses', {
          tokenAddress,
          salt,
        });

        // Encode the function call
        const data = factoryInterface.encodeFunctionData('deployTokenAndTokenPool', [
          remoteTokenPools,
          parsedInput.decimals,
          tokenInitCode,
          tokenPoolInitCode,
          salt,
        ]);

        logger.info('Successfully generated token and pool deployment transaction');

        return {
          to: factoryAddress,
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };
      } catch (error) {
        logError(error, 'generate deployment transaction', {
          factoryAddress,
          salt,
          safeAddress,
        });
        throw error instanceof Error
          ? new TokenDeploymentError('Failed to generate deployment transaction', undefined, error)
          : error;
      }
    },
  };
}

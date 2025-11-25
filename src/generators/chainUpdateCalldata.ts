/**
 * @fileoverview Cross-chain configuration transaction generator for token pools.
 *
 * This module generates transactions for updating token pool cross-chain configurations,
 * including adding and removing remote chains. Supports multi-chain address encoding for
 * EVM (Ethereum Virtual Machine), SVM (Solana Virtual Machine), and MVM (Move Virtual Machine,
 * not yet implemented).
 *
 * @module generators/chainUpdateCalldata
 */

import { ethers } from 'ethers';
import { TokenPool } from '../typechain';
import { PublicKey } from '@solana/web3.js';
import { ChainType, ChainUpdateInput, chainUpdatesInputSchema } from '../types/chainUpdate';
import { SafeTransactionDataBase, SafeOperationType } from '../types/safe';
import { DEFAULTS } from '../config';
import { ChainUpdateError } from '../errors';
import { executeAsync, logError } from '../errors/AsyncErrorHandler';
import { ILogger, IInterfaceProvider } from '../interfaces';

/**
 * Encoder interface for different blockchain address formats.
 *
 * Different blockchain architectures use different address formats that must be
 * properly encoded for EVM contract calls:
 * - EVM chains: 20-byte addresses (e.g., `0x779877A7B0D9E8603169DdbD7836e478b4624789`)
 * - SVM chains: 32-byte Solana public keys in base58 format (e.g., `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
 *
 * @internal
 */
type ChainEncoder = {
  /**
   * Encodes an array of pool addresses for the specific chain type.
   *
   * @param coder - Ethers ABI coder instance
   * @param addresses - Array of addresses in chain-specific format
   * @returns Array of ABI-encoded address strings
   */
  encodeAddresses: (coder: ethers.AbiCoder, addresses: string[]) => string[];

  /**
   * Encodes a token address for the specific chain type.
   *
   * @param coder - Ethers ABI coder instance
   * @param address - Token address in chain-specific format
   * @returns ABI-encoded address string
   */
  encodeToken: (coder: ethers.AbiCoder, address: string) => string;
};

/**
 * Chain-specific address encoders for supported blockchain types.
 *
 * Each encoder handles the address format conversion for its respective chain type:
 * - **EVM**: Direct encoding of 20-byte Ethereum addresses as `address` type
 * - **SVM**: Conversion of base58 Solana public keys to 32-byte `bytes32` type
 *
 * @remarks
 * MVM (Move Virtual Machine) support is planned but not yet implemented.
 *
 * @internal
 */
const chainEncoders: Record<ChainType.EVM | ChainType.SVM, ChainEncoder> = {
  [ChainType.EVM]: {
    encodeAddresses: (coder, addresses) =>
      addresses.map((addr) => coder.encode(['address'], [addr])),
    encodeToken: (coder, address) => coder.encode(['address'], [address]),
  },
  [ChainType.SVM]: {
    encodeAddresses: (coder, addresses) =>
      addresses.map((addr) => {
        const pubkey = new PublicKey(addr);
        return coder.encode(['bytes32'], [pubkey.toBuffer()]);
      }),
    encodeToken: (coder, address) => {
      const tokenPubkey = new PublicKey(address);
      return coder.encode(['bytes32'], [tokenPubkey.toBuffer()]);
    },
  },
};

/**
 * Converts a validated chain update input to contract-ready format with proper address encoding.
 *
 * This function handles multi-chain address encoding, converting chain-specific address formats
 * (EVM 20-byte addresses, SVM 32-byte Solana public keys) into the ABI-encoded format required
 * by the TokenPool contract.
 *
 * @param chainUpdate - Validated chain update configuration including remote chain details
 *
 * @returns Contract-ready chain update struct with encoded addresses
 *
 * @throws {ChainUpdateError} When an unsupported chain type is provided
 * @throws {ChainUpdateError} When MVM chain type is specified (not yet implemented)
 * @throws {ChainUpdateError} When address encoding fails
 *
 * @remarks
 * Supported Chain Types:
 * - **EVM (Ethereum Virtual Machine)**: Encodes 20-byte addresses directly as `address` type
 * - **SVM (Solana Virtual Machine)**: Converts base58 public keys to 32-byte `bytes32` type
 * - **MVM (Move Virtual Machine)**: Planned but not yet implemented
 *
 * Address Encoding Process:
 * 1. Validates chain type is supported (EVM or SVM)
 * 2. Selects appropriate encoder for the chain type
 * 3. Encodes pool addresses array
 * 4. Encodes token address
 * 5. Returns struct with encoded addresses and rate limiter configs
 *
 * @example
 * ```typescript
 * // EVM chain configuration
 * const evmChainUpdate: ChainUpdateInput = {
 *   remoteChainSelector: "16015286601757825753",
 *   remoteChainType: ChainType.EVM,
 *   remotePoolAddresses: ["0x1234567890123456789012345678901234567890"],
 *   remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *   outboundRateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "1000000",
 *     rate: "100000"
 *   },
 *   inboundRateLimiterConfig: {
 *     isEnabled: true,
 *     capacity: "1000000",
 *     rate: "100000"
 *   }
 * };
 *
 * const contractFormat = convertToContractFormat(evmChainUpdate);
 * // Result has ABI-encoded address fields
 * ```
 *
 * @example
 * ```typescript
 * // SVM (Solana) chain configuration
 * const svmChainUpdate: ChainUpdateInput = {
 *   remoteChainSelector: "13204309965474693391",
 *   remoteChainType: ChainType.SVM,
 *   remotePoolAddresses: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
 *   remoteTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *   outboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" },
 *   inboundRateLimiterConfig: { isEnabled: false, capacity: "0", rate: "0" }
 * };
 *
 * const contractFormat = convertToContractFormat(svmChainUpdate);
 * // Solana public keys converted to bytes32
 * ```
 *
 * @see {@link ChainUpdateInput} for input structure
 * @see {@link TokenPool.ChainUpdateStruct} for return type
 * @see {@link chainEncoders} for chain-specific encoding logic
 *
 * @public
 */
export function convertToContractFormat(
  chainUpdate: ChainUpdateInput,
): TokenPool.ChainUpdateStruct {
  const abiCoder = new ethers.AbiCoder();

  if (!Object.values(ChainType).includes(chainUpdate.remoteChainType)) {
    throw new ChainUpdateError(
      `convertToContractFormat(): Invalid ChainType provided: '${chainUpdate.remoteChainType}'.`,
    );
  }

  if (chainUpdate.remoteChainType === ChainType.MVM) {
    throw new ChainUpdateError(
      'convertToContractFormat(): Move Virtual Machine Address validation not implemented.',
    );
  }

  // Type guard: After MVM check, remoteChainType must be EVM or SVM
  const supportedChainType: ChainType.EVM | ChainType.SVM = chainUpdate.remoteChainType;

  try {
    const encoder = chainEncoders[supportedChainType];
    const encodedRemotePoolAddresses = encoder.encodeAddresses(
      abiCoder,
      chainUpdate.remotePoolAddresses,
    );
    const encodedRemoteTokenAddress = encoder.encodeToken(abiCoder, chainUpdate.remoteTokenAddress);

    return {
      remoteChainSelector: chainUpdate.remoteChainSelector,
      remotePoolAddresses: encodedRemotePoolAddresses,
      remoteTokenAddress: encodedRemoteTokenAddress,
      outboundRateLimiterConfig: chainUpdate.outboundRateLimiterConfig,
      inboundRateLimiterConfig: chainUpdate.inboundRateLimiterConfig,
    };
  } catch (error) {
    logError(error, `convert ${chainUpdate.remoteChainType} chain update to contract format`, {
      chainUpdate,
    });
    throw error instanceof Error
      ? new ChainUpdateError(
          `Failed to convert remote ${chainUpdate.remoteChainType} chain update to contract format`,
          { chainUpdate },
          error,
        )
      : error;
  }
}

/**
 * Generator interface for token pool cross-chain configuration transactions.
 *
 * Generates transactions for updating token pool cross-chain configurations,
 * supporting both adding new remote chains and removing existing ones. Handles
 * multi-chain address encoding (EVM, SVM) and rate limiter configurations.
 *
 * @remarks
 * The generator processes arrays of chain selectors to remove and chain configurations
 * to add, encoding them into a single `applyChainUpdates` transaction. This allows
 * atomic updates of multiple chain configurations in one transaction.
 *
 * @public
 */
export interface ChainUpdateGenerator {
  /**
   * Generates a chain configuration update transaction.
   *
   * @param inputJson - JSON string containing arrays of chains to remove and add
   *
   * @returns Transaction data with encoded `applyChainUpdates` call (target address left empty for caller)
   *
   * @throws {ChainUpdateError} When validation fails or transaction generation fails
   *
   * @see {@link chainUpdatesInputSchema} for input JSON schema
   * @see {@link SafeTransactionDataBase} for return type structure
   */
  generate(inputJson: string): Promise<SafeTransactionDataBase>;
}

/**
 * Creates a cross-chain configuration update generator.
 *
 * Factory function that creates a generator for updating token pool cross-chain configurations.
 * Supports adding new remote chains (with full configuration) and removing existing chains
 * (by chain selector). Handles multi-chain address encoding for EVM and SVM chains.
 *
 * @param logger - Logger instance for operation logging and debugging
 * @param interfaceProvider - Provider for contract ABI interfaces (TokenPool)
 *
 * @returns Generator instance implementing {@link ChainUpdateGenerator} interface
 *
 * @remarks
 * The generator follows this process:
 * 1. Validates input JSON against Zod schema (tuple of [chainSelectorsToRemove, chainsToAdd])
 * 2. Converts chain configurations to contract format using appropriate encoders
 * 3. Encodes TokenPool `applyChainUpdates` function call
 * 4. Returns transaction data (target address must be set by caller to pool address)
 *
 * Input Structure:
 * - **First array**: Chain selectors (uint64 as strings) of chains to remove
 * - **Second array**: Full chain configurations to add with:
 *   - Remote chain selector
 *   - Chain type (EVM, SVM, or MVM)
 *   - Remote pool addresses
 *   - Remote token address
 *   - Inbound and outbound rate limiter configs
 *
 * Multi-Chain Support:
 * - **EVM Chains**: Standard 20-byte Ethereum addresses (e.g., Ethereum, Polygon, Arbitrum, Base)
 * - **SVM Chains**: Solana 32-byte public keys in base58 format
 * - **MVM Chains**: Not yet implemented (will throw error)
 *
 * @example
 * ```typescript
 * const generator = createChainUpdateGenerator(logger, interfaceProvider);
 *
 * // Add Ethereum Sepolia configuration (no removals)
 * const inputJson = JSON.stringify([
 *   [], // No chains to remove
 *   [  // Chains to add
 *     {
 *       remoteChainSelector: "16015286601757825753", // Ethereum Sepolia
 *       remoteChainType: "evm",
 *       remotePoolAddresses: ["0x1234567890123456789012345678901234567890"],
 *       remoteTokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
 *       outboundRateLimiterConfig: {
 *         isEnabled: true,
 *         capacity: "1000000000000000000000",
 *         rate: "100000000000000000"
 *       },
 *       inboundRateLimiterConfig: {
 *         isEnabled: true,
 *         capacity: "1000000000000000000000",
 *         rate: "100000000000000000"
 *       }
 *     }
 *   ]
 * ]);
 *
 * const transaction = await generator.generate(inputJson);
 * // Must set transaction.to = poolAddress before execution
 * transaction.to = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
 * ```
 *
 * @example
 * ```typescript
 * // Add Solana devnet configuration (SVM chain)
 * const inputJson = JSON.stringify([
 *   [],
 *   [{
 *     remoteChainSelector: "13204309965474693391", // Solana devnet
 *     remoteChainType: "svm",
 *     remotePoolAddresses: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"],
 *     remoteTokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *     outboundRateLimiterConfig: {
 *       isEnabled: false,
 *       capacity: "0",
 *       rate: "0"
 *     },
 *     inboundRateLimiterConfig: {
 *       isEnabled: false,
 *       capacity: "0",
 *       rate: "0"
 *     }
 *   }]
 * ]);
 *
 * const transaction = await generator.generate(inputJson);
 * transaction.to = poolAddress;
 * ```
 *
 * @example
 * ```typescript
 * // Remove old chain and add new configuration
 * const inputJson = JSON.stringify([
 *   ["16015286601757825753"], // Remove Ethereum Sepolia
 *   [{
 *     remoteChainSelector: "10344971235874465080", // Base Sepolia
 *     remoteChainType: "evm",
 *     remotePoolAddresses: ["0x5555555555555555555555555555555555555555"],
 *     remoteTokenAddress: "0x6666666666666666666666666666666666666666",
 *     outboundRateLimiterConfig: { isEnabled: true, capacity: "500000", rate: "50000" },
 *     inboundRateLimiterConfig: { isEnabled: true, capacity: "500000", rate: "50000" }
 *   }]
 * ]);
 *
 * const transaction = await generator.generate(inputJson);
 * transaction.to = poolAddress;
 * // This will atomically remove one chain and add another
 * ```
 *
 * @throws {ChainUpdateError} When input JSON validation fails
 * @throws {ChainUpdateError} When chain type is unsupported (MVM)
 * @throws {ChainUpdateError} When address encoding fails
 * @throws {ChainUpdateError} When transaction encoding fails
 *
 * @see {@link ChainUpdateGenerator} for interface definition
 * @see {@link chainUpdatesInputSchema} for input validation schema
 * @see {@link convertToContractFormat} for address encoding logic
 * @see {@link ChainType} for supported chain types
 *
 * @public
 */
export function createChainUpdateGenerator(
  logger: ILogger,
  interfaceProvider: IInterfaceProvider,
): ChainUpdateGenerator {
  return {
    async generate(inputJson: string): Promise<SafeTransactionDataBase> {
      // Parse and validate input
      const parsedInput = await executeAsync(
        async () => chainUpdatesInputSchema.parseAsync(JSON.parse(inputJson)),
        ChainUpdateError,
        'Invalid input format',
        { inputJson },
      );

      logger.info('Successfully validated chain updates input', {
        chainsToRemoveCount: parsedInput[0].length,
        chainsToAddCount: parsedInput[1].length,
      });

      try {
        // Convert the validated input to contract format
        const [chainSelectorsToRemove, chainsToAdd] = parsedInput;

        // Create the contract interface and encode the function call
        const poolInterface = interfaceProvider.getTokenPoolInterface();
        const data = poolInterface.encodeFunctionData('applyChainUpdates', [
          chainSelectorsToRemove,
          chainsToAdd.map(convertToContractFormat),
        ]);

        logger.info('Successfully generated chain update transaction');

        return {
          to: '', // To be filled by the caller
          value: DEFAULTS.TRANSACTION_VALUE,
          data,
          operation: SafeOperationType.Call,
        };
      } catch (error) {
        logError(error, 'generate chain update transaction');
        throw error instanceof Error
          ? new ChainUpdateError('Failed to generate transaction', undefined, error)
          : error;
      }
    },
  };
}

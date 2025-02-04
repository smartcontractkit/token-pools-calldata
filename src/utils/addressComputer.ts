/**
 * @fileoverview CREATE2 deterministic address computation for factory deployments.
 *
 * This module implements CREATE2 address computation matching TokenPoolFactory's
 * salt modification behavior. Computes deterministic addresses for contracts
 * deployed via CREATE2 opcode with sender-specific salt hashing.
 *
 * Key Features:
 * - CREATE2 deterministic address computation
 * - TokenPoolFactory salt modification: keccak256(abi.encodePacked(salt, msg.sender))
 * - Address validation with ethers.js
 * - Structured logging of computation details
 * - Dependency injection via factory pattern
 *
 * Salt Modification Behavior:
 * TokenPoolFactory modifies the salt before CREATE2 deployment by hashing it
 * with msg.sender. This allows different deployers to use the same salt while
 * getting different deterministic addresses.
 *
 * @example
 * ```typescript
 * import { createAddressComputer, computeModifiedSalt } from './utils/addressComputer';
 *
 * // Compute modified salt
 * const modifiedSalt = computeModifiedSalt(
 *   '0x0000000000000000000000000000000000000000000000000000000123456789',
 *   '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e'
 * );
 *
 * // Create address computer with logger
 * const addressComputer = createAddressComputer(logger);
 * const predictedAddress = addressComputer.computeCreate2Address(
 *   factoryAddress,
 *   bytecode,
 *   originalSalt,
 *   senderAddress
 * );
 * ```
 *
 * @module utils/addressComputer
 * @see {@link https://eips.ethereum.org/EIPS/eip-1014} EIP-1014: CREATE2 Opcode
 */

import { ethers } from 'ethers';
import { ILogger, IAddressComputer } from '../interfaces';

/**
 * Computes modified salt by hashing original salt with sender address.
 *
 * Matches TokenPoolFactory's salt modification behavior:
 * `keccak256(abi.encodePacked(salt, msg.sender))`. This ensures different
 * senders using the same salt get different deterministic addresses.
 *
 * @param salt - Original CREATE2 salt (32 bytes, hex string with 0x prefix)
 * @param sender - Ethereum address of the transaction sender
 * @returns Modified salt as bytes32 hex string
 * @throws {Error} If sender address is invalid
 *
 * @remarks
 * Salt Modification Formula:
 * ```
 * modifiedSalt = keccak256(solidityPacked(['bytes32', 'address'], [salt, sender]))
 * ```
 *
 * This matches Solidity's:
 * ```solidity
 * bytes32 modifiedSalt = keccak256(abi.encodePacked(salt, msg.sender));
 * ```
 *
 * Why Modify Salt?
 * - Allows multiple deployers to use the same salt safely
 * - Each sender gets a unique deterministic address
 * - Prevents address collisions across different deployers
 *
 * Input Validation:
 * - Sender must be valid Ethereum address (20 bytes)
 * - Salt should be 32 bytes (66 chars: 0x + 64 hex)
 * - Validated via ethers.isAddress()
 *
 * @example
 * ```typescript
 * const salt = '0x0000000000000000000000000000000000000000000000000000000123456789';
 * const sender = '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e';
 *
 * const modifiedSalt = computeModifiedSalt(salt, sender);
 * // Returns: keccak256 hash of packed salt and sender
 * ```
 *
 * @example
 * ```typescript
 * // Different senders, same salt -> different modified salts
 * const salt = '0x1234...';
 * const sender1 = '0xaaaa...';
 * const sender2 = '0xbbbb...';
 *
 * const modified1 = computeModifiedSalt(salt, sender1);
 * const modified2 = computeModifiedSalt(salt, sender2);
 * // modified1 !== modified2
 * ```
 *
 * @public
 */
export function computeModifiedSalt(salt: string, sender: string): string {
  if (!ethers.isAddress(sender)) {
    throw new Error('Invalid sender address');
  }
  return ethers.keccak256(ethers.solidityPacked(['bytes32', 'address'], [salt, sender]));
}

/**
 * Creates an address computer instance with logging capabilities.
 *
 * Factory function that creates an IAddressComputer implementation for computing
 * CREATE2 deterministic addresses. Uses dependency injection pattern for logger.
 *
 * @param logger - Logger instance for structured logging of address computations
 * @returns Address computer implementing IAddressComputer interface
 *
 * @remarks
 * Factory Pattern Benefits:
 * - Dependency injection for logger
 * - Testable via mock logger injection
 * - Encapsulates CREATE2 computation logic
 * - Single responsibility (address computation only)
 *
 * CREATE2 Address Computation:
 * ```
 * address = keccak256(0xff ++ deployer ++ modifiedSalt ++ keccak256(initCode))[12:]
 * ```
 *
 * Where:
 * - `deployer`: Factory contract address
 * - `modifiedSalt`: keccak256(abi.encodePacked(salt, sender))
 * - `initCode`: Contract bytecode (constructor + args)
 *
 * Logged Information:
 * - Deployer address (factory)
 * - Original salt (user-provided)
 * - Modified salt (after sender hash)
 * - Sender address
 * - Init code hash (bytecode hash)
 * - Predicted address (final result)
 *
 * @example
 * ```typescript
 * import { createLogger } from './utils/logger';
 * import { createAddressComputer } from './utils/addressComputer';
 *
 * const logger = createLogger();
 * const addressComputer = createAddressComputer(logger);
 *
 * // Compute token address
 * const tokenAddress = addressComputer.computeCreate2Address(
 *   '0x779877A7B0D9E8603169DdbD7836e478b4624789', // factory
 *   tokenBytecode,
 *   '0x0000000000000000000000000000000000000000000000000000000123456789',
 *   '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e' // sender
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Dependency injection in generator
 * const generator = createTokenDeploymentGenerator(
 *   logger,
 *   interfaceProvider,
 *   createAddressComputer(logger) // Inject address computer
 * );
 * ```
 *
 * @see {@link IAddressComputer} for interface definition
 * @public
 */
export function createAddressComputer(logger: ILogger): IAddressComputer {
  return {
    /**
     * Computes CREATE2 deterministic address for factory-deployed contract.
     *
     * Implements CREATE2 address computation matching TokenPoolFactory behavior,
     * including salt modification. Validates all inputs and logs computation details.
     *
     * @param deployer - Factory contract address (CREATE2 deployer)
     * @param bytecode - Contract bytecode (init code including constructor)
     * @param salt - Original CREATE2 salt (32 bytes)
     * @param sender - Transaction sender address (for salt modification)
     * @returns Deterministic contract address
     * @throws {Error} If deployer or sender address is invalid
     *
     * @remarks
     * Computation Steps:
     * 1. Validate deployer and sender addresses
     * 2. Compute modified salt: keccak256(abi.encodePacked(salt, sender))
     * 3. Compute init code hash: keccak256(bytecode)
     * 4. Compute CREATE2 address: ethers.getCreate2Address(deployer, modifiedSalt, initCodeHash)
     * 5. Log computation details
     *
     * The predicted address can be used to:
     * - Reference contracts before deployment
     * - Configure cross-chain settings pre-deployment
     * - Verify deployment success
     *
     * @example
     * ```typescript
     * const predictedAddress = addressComputer.computeCreate2Address(
     *   '0x779877A7B0D9E8603169DdbD7836e478b4624789', // TokenPoolFactory
     *   BYTECODES.FactoryBurnMintERC20,
     *   '0x0000000000000000000000000000000000000000000000000000000123456789',
     *   '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e' // Safe address
     * );
     * ```
     */
    computeCreate2Address(
      deployer: string,
      bytecode: string,
      salt: string,
      sender: string,
    ): string {
      // Validate inputs
      if (!ethers.isAddress(deployer)) {
        throw new Error('Invalid deployer address');
      }

      if (!ethers.isAddress(sender)) {
        throw new Error('Invalid sender address');
      }

      // Modify the salt as done in the TokenPoolFactory
      const modifiedSalt = computeModifiedSalt(salt, sender);

      // Compute the init code hash
      const initCodeHash = ethers.keccak256(bytecode);

      // Use ethers.getCreate2Address to compute the deterministic address
      const predictedAddress = ethers.getCreate2Address(deployer, modifiedSalt, initCodeHash);

      logger.info('Computed CREATE2 address', {
        deployer,
        originalSalt: salt,
        modifiedSalt,
        sender,
        initCodeHash,
        predictedAddress,
      });

      return predictedAddress;
    },
  };
}

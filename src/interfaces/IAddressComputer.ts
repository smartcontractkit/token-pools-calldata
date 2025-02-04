/**
 * @fileoverview Address computer interface for CREATE2 address prediction.
 *
 * Defines the contract for computing deterministic contract addresses using the
 * CREATE2 opcode. Used by token deployment generator to predict deployed addresses
 * before transactions are executed.
 *
 * @module interfaces/IAddressComputer
 */

/**
 * Interface for computing CREATE2 deterministic contract addresses.
 *
 * Provides deterministic address computation for contracts deployed via CREATE2,
 * accounting for the TokenPoolFactory's salt modification strategy where the salt
 * is hashed with msg.sender before deployment.
 *
 * @remarks
 * CREATE2 Address Computation:
 * 1. Factory modifies salt: `modifiedSalt = keccak256(abi.encodePacked(salt, msg.sender))`
 * 2. Compute address: `keccak256(0xff ++ deployer ++ modifiedSalt ++ keccak256(initCode))`
 *
 * This allows different senders to use the same salt value and deploy to different
 * addresses, enabling multi-tenancy without salt collision.
 *
 * @example
 * ```typescript
 * const addressComputer = createAddressComputer(logger);
 *
 * // Compute token address before deployment
 * const predictedTokenAddress = addressComputer.computeCreate2Address(
 *   factoryAddress,
 *   tokenBytecode,
 *   salt,
 *   safeAddress  // msg.sender
 * );
 *
 * // Generate deployment transaction
 * const transaction = await generator.generate(
 *   inputJson,
 *   factoryAddress,
 *   salt,
 *   safeAddress
 * );
 *
 * // After execution, token will be at predictedTokenAddress
 * ```
 *
 * @see {@link createAddressComputer} for production implementation
 *
 * @public
 */
export interface IAddressComputer {
  /**
   * Computes the CREATE2 address for a contract deployment.
   *
   * Calculates the deterministic address where a contract will be deployed using
   * CREATE2, accounting for the TokenPoolFactory's salt modification (hashing with
   * msg.sender).
   *
   * @param deployer - Address of the deployer contract (TokenPoolFactory)
   * @param bytecode - Complete contract bytecode including constructor arguments
   * @param salt - Original 32-byte salt value (before factory modification)
   * @param sender - Address of the transaction sender (msg.sender, typically Safe)
   *
   * @returns The computed CREATE2 address where the contract will be deployed
   *
   * @remarks
   * Algorithm:
   * 1. Compute modified salt: `keccak256(abi.encodePacked(salt, sender))`
   * 2. Compute init code hash: `keccak256(bytecode)`
   * 3. Compute address: `keccak256(0xff ++ deployer ++ modifiedSalt ++ initCodeHash)`
   * 4. Take last 20 bytes and format as Ethereum address
   *
   * Used by token deployment generator to compute both token and pool addresses
   * before deployment transactions are executed.
   *
   * @example
   * ```typescript
   * // Compute token address for deployment
   * const tokenAddress = addressComputer.computeCreate2Address(
   *   "0x17d8a409fe2cef2d3808bcb61f14abeffc28876e",  // Factory
   *   tokenBytecode,                                   // Full bytecode
   *   "0x0000000000000000000000000000000000000000000000000000000123456789",
   *   "0x5419c6d83473d1c653e7b51e8568fafedce94f01"   // Safe address
   * );
   * // Returns: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
   * ```
   *
   * @example
   * ```typescript
   * // Same salt, different sender = different address
   * const address1 = addressComputer.computeCreate2Address(
   *   factoryAddress, bytecode, salt, "0xSender1"
   * );
   * const address2 = addressComputer.computeCreate2Address(
   *   factoryAddress, bytecode, salt, "0xSender2"
   * );
   * // address1 !== address2 (different senders, different addresses)
   * ```
   */
  computeCreate2Address(deployer: string, bytecode: string, salt: string, sender: string): string;
}

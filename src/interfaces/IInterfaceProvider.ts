/**
 * @fileoverview Interface provider contract for accessing contract ABIs.
 *
 * Defines the interface for accessing ethers.js contract interfaces from TypeChain
 * factories. Implementations typically include caching to avoid repeated ABI parsing.
 *
 * @module interfaces/IInterfaceProvider
 */
import { ethers } from 'ethers';

/**
 * Interface provider for accessing contract ABI interfaces.
 *
 * Provides access to ethers.js Interface instances for all contracts used in the
 * application. Used by generators for encoding function calls and by formatters
 * for extracting method fragments.
 *
 * @remarks
 * Implementations should cache interface instances to avoid repeatedly parsing
 * ABIs from TypeChain factories. See InterfaceProvider service for the production
 * implementation with caching.
 *
 * Contract Interfaces:
 * - **TokenPool**: Chain updates, allow list, rate limiter operations
 * - **TokenPoolFactory**: Token and pool deployment operations
 * - **FactoryBurnMintERC20**: Token minting and role management operations
 *
 * @example
 * ```typescript
 * // Usage in generator
 * function createChainUpdateGenerator(
 *   logger: ILogger,
 *   interfaceProvider: IInterfaceProvider
 * ): ChainUpdateGenerator {
 *   return {
 *     async generate(inputJson: string) {
 *       const poolInterface = interfaceProvider.getTokenPoolInterface();
 *       const data = poolInterface.encodeFunctionData('applyChainUpdates', [...]);
 *       return { to: '', value: '0', data, operation: SafeOperationType.Call };
 *     }
 *   };
 * }
 * ```
 *
 * @see {@link createInterfaceProvider} for production implementation
 *
 * @public
 */
export interface IInterfaceProvider {
  /**
   * Gets the TokenPool contract interface.
   *
   * @returns ethers.Interface for TokenPool contract
   *
   * @remarks
   * Used by generators for:
   * - applyChainUpdates (chain update generator)
   * - applyAllowListUpdates (allow list generator)
   * - setChainRateLimiterConfig (rate limiter generator)
   */
  getTokenPoolInterface(): ethers.Interface;

  /**
   * Gets the TokenPoolFactory contract interface.
   *
   * @returns ethers.Interface for TokenPoolFactory contract
   *
   * @remarks
   * Used by generators for:
   * - deployTokenAndTokenPool (token deployment generator)
   * - deployTokenPoolWithExistingToken (pool deployment generator)
   */
  getTokenPoolFactoryInterface(): ethers.Interface;

  /**
   * Gets the FactoryBurnMintERC20 contract interface.
   *
   * @returns ethers.Interface for FactoryBurnMintERC20 contract
   *
   * @remarks
   * Used by generators for:
   * - mint (token mint generator)
   * - grantMintAndBurn, revokeMintRole, revokeBurnRole (role management generator)
   */
  getFactoryBurnMintERC20Interface(): ethers.Interface;

  /**
   * Gets the RegistryModuleOwnerCustom contract interface.
   *
   * @returns ethers.Interface for RegistryModuleOwnerCustom contract
   *
   * @remarks
   * Used by generators for:
   * - registerAdminViaGetCCIPAdmin (register admin generator)
   * - registerAdminViaOwner (register admin generator)
   * - registerAccessControlDefaultAdmin (register admin generator)
   */
  getRegistryModuleOwnerCustomInterface(): ethers.Interface;

  /**
   * Gets the TokenAdminRegistry contract interface.
   *
   * @returns ethers.Interface for TokenAdminRegistry contract
   *
   * @remarks
   * Used by generators for:
   * - setPool (token admin registry generator)
   * - transferAdminRole (token admin registry generator)
   * - acceptAdminRole (token admin registry generator)
   */
  getTokenAdminRegistryInterface(): ethers.Interface;
}

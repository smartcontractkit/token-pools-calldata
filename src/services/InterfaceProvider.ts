/**
 * @fileoverview Interface provider service for cached contract ABI access.
 *
 * This module provides a caching layer for ethers.js contract interfaces, avoiding
 * the overhead of repeatedly parsing ABIs from TypeChain-generated factories. All
 * generators and formatters use this service to access contract method fragments
 * for function encoding and Safe JSON generation.
 *
 * @module services/InterfaceProvider
 */

import { ethers } from 'ethers';
import {
  TokenPool__factory,
  TokenPoolFactory__factory,
  FactoryBurnMintERC20__factory,
  RegistryModuleOwnerCustom__factory,
  TokenAdminRegistry__factory,
} from '../typechain';
import { IInterfaceProvider } from '../interfaces';

/**
 * Creates an interface provider with caching for contract ABIs.
 *
 * Factory function that returns an IInterfaceProvider implementation with internal
 * caching. Each contract interface is created once on first access and reused for
 * all subsequent calls, improving performance when encoding multiple transactions.
 *
 * @returns IInterfaceProvider instance with cached interface access
 *
 * @remarks
 * The provider implements lazy initialization with caching:
 * - First call to getXInterface(): Creates and caches the interface
 * - Subsequent calls: Returns cached interface instantly
 *
 * Cached Interfaces:
 * - **TokenPool**: For chain updates, allow list, rate limiter operations
 * - **TokenPoolFactory**: For token and pool deployment operations
 * - **FactoryBurnMintERC20**: For minting and role management operations
 *
 * Benefits:
 * - Avoids repeated ABI parsing overhead
 * - Consistent interface instances across all generators
 * - Memory efficient (one instance per interface type)
 * - Simplifies generator and formatter implementations
 *
 * The provider is used by all generators for encoding function calls and by
 * all formatters for extracting method fragments for Safe JSON.
 *
 * @example
 * ```typescript
 * const provider = createInterfaceProvider();
 *
 * // First call parses ABI and caches
 * const tokenPoolInterface = provider.getTokenPoolInterface();
 * const data = tokenPoolInterface.encodeFunctionData('applyChainUpdates', [...]);
 *
 * // Second call returns cached instance (fast)
 * const sameInterface = provider.getTokenPoolInterface();
 * const data2 = sameInterface.encodeFunctionData('setChainRateLimiterConfig', [...]);
 * ```
 *
 * @example
 * ```typescript
 * // Usage in generator
 * function createChainUpdateGenerator(
 *   logger: ILogger,
 *   interfaceProvider: IInterfaceProvider  // Injected provider
 * ): ChainUpdateGenerator {
 *   return {
 *     async generate(inputJson: string) {
 *       const poolInterface = interfaceProvider.getTokenPoolInterface();
 *       const data = poolInterface.encodeFunctionData('applyChainUpdates', [
 *         parsedInput.removes,
 *         parsedInput.adds
 *       ]);
 *       return { to: '', value: '0', data, operation: SafeOperationType.Call };
 *     }
 *   };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Usage in formatter
 * function createMintFormatter(
 *   interfaceProvider: IInterfaceProvider  // Injected provider
 * ): MintFormatter {
 *   return {
 *     format(transaction, params, metadata) {
 *       const contractInterface = interfaceProvider.getFactoryBurnMintERC20Interface();
 *       const methodFragment = contractInterface.getFunction('mint');
 *       // Use methodFragment for Safe JSON generation...
 *     }
 *   };
 * }
 * ```
 *
 * @see {@link IInterfaceProvider} for interface definition
 * @see {@link TokenPool__factory} for TokenPool TypeChain factory
 * @see {@link TokenPoolFactory__factory} for TokenPoolFactory TypeChain factory
 * @see {@link FactoryBurnMintERC20__factory} for FactoryBurnMintERC20 TypeChain factory
 *
 * @public
 */
export function createInterfaceProvider(): IInterfaceProvider {
  const cache = new Map<string, ethers.Interface>();

  return {
    getTokenPoolInterface(): ethers.Interface {
      if (!cache.has('tokenPool')) {
        cache.set('tokenPool', TokenPool__factory.createInterface());
      }
      return cache.get('tokenPool')!;
    },

    getTokenPoolFactoryInterface(): ethers.Interface {
      if (!cache.has('tokenPoolFactory')) {
        cache.set('tokenPoolFactory', TokenPoolFactory__factory.createInterface());
      }
      return cache.get('tokenPoolFactory')!;
    },

    getFactoryBurnMintERC20Interface(): ethers.Interface {
      if (!cache.has('factoryBurnMintERC20')) {
        cache.set('factoryBurnMintERC20', FactoryBurnMintERC20__factory.createInterface());
      }
      return cache.get('factoryBurnMintERC20')!;
    },

    getRegistryModuleOwnerCustomInterface(): ethers.Interface {
      if (!cache.has('registryModuleOwnerCustom')) {
        cache.set(
          'registryModuleOwnerCustom',
          RegistryModuleOwnerCustom__factory.createInterface(),
        );
      }
      return cache.get('registryModuleOwnerCustom')!;
    },

    getTokenAdminRegistryInterface(): ethers.Interface {
      if (!cache.has('tokenAdminRegistry')) {
        cache.set('tokenAdminRegistry', TokenAdminRegistry__factory.createInterface());
      }
      return cache.get('tokenAdminRegistry')!;
    },
  };
}

/**
 * @fileoverview Dependency injection container for application services.
 *
 * This module implements a centralized service container that creates, wires, and manages
 * all application dependencies including loggers, generators, formatters, and services.
 * Provides singleton pattern for global access and testability support.
 *
 * @module services/ServiceContainer
 */

import { ILogger, IInterfaceProvider, IAddressComputer } from '../interfaces';
import { createLogger } from '../utils/logger';
import { createInterfaceProvider } from './InterfaceProvider';
import { createAddressComputer } from '../utils/addressComputer';

// Generator factories
import {
  createChainUpdateGenerator,
  ChainUpdateGenerator,
} from '../generators/chainUpdateCalldata';
import {
  createTokenDeploymentGenerator,
  TokenDeploymentGenerator,
} from '../generators/tokenDeployment';
import {
  createPoolDeploymentGenerator,
  PoolDeploymentGenerator,
} from '../generators/poolDeployment';
import { createTokenMintGenerator, TokenMintGenerator } from '../generators/tokenMint';
import {
  createRoleManagementGenerator,
  RoleManagementGenerator,
} from '../generators/roleManagement';
import {
  createAllowListUpdatesGenerator,
  AllowListUpdatesGenerator,
} from '../generators/allowListUpdates';
import {
  createRateLimiterConfigGenerator,
  RateLimiterConfigGenerator,
} from '../generators/rateLimiterConfig';
import {
  createAcceptOwnershipGenerator,
  AcceptOwnershipGenerator,
} from '../generators/acceptOwnership';

// Formatter factories
import {
  createChainUpdateFormatter,
  ChainUpdateFormatter,
} from '../formatters/chainUpdateFormatter';
import {
  createTokenDeploymentFormatter,
  TokenDeploymentFormatter,
} from '../formatters/tokenDeploymentFormatter';
import {
  createPoolDeploymentFormatter,
  PoolDeploymentFormatter,
} from '../formatters/poolDeploymentFormatter';
import { createMintFormatter, MintFormatter } from '../formatters/mintFormatter';
import {
  createRoleManagementFormatter,
  RoleManagementFormatter,
} from '../formatters/roleManagementFormatter';
import { createAllowListFormatter, AllowListFormatter } from '../formatters/allowListFormatter';
import {
  createRateLimiterFormatter,
  RateLimiterFormatter,
} from '../formatters/rateLimiterFormatter';
import {
  createAcceptOwnershipFormatter,
  AcceptOwnershipFormatter,
} from '../formatters/acceptOwnershipFormatter';

// Services
import {
  createTransactionService,
  TransactionService,
  TransactionServiceDependencies,
} from './TransactionService';

/**
 * Service container interface holding all application services and dependencies.
 *
 * Central registry providing access to all generators, formatters, and services
 * needed by the application. Implements dependency injection pattern for testability
 * and modularity.
 *
 * @remarks
 * The container is organized into four tiers:
 * 1. **Core Dependencies**: Logger, interface provider, address computer
 * 2. **Generators**: Raw transaction data generators (7 types)
 * 3. **Formatters**: Safe JSON formatters (7 types)
 * 4. **Services**: High-level services (TransactionService)
 *
 * Benefits:
 * - Single source of truth for all dependencies
 * - Consistent initialization order
 * - Easy mocking for tests
 * - Singleton access via getServiceContainer()
 *
 * @public
 */
export interface ServiceContainer {
  // Core dependencies
  logger: ILogger;
  interfaceProvider: IInterfaceProvider;
  addressComputer: IAddressComputer;

  // Generators
  chainUpdateGenerator: ChainUpdateGenerator;
  tokenDeploymentGenerator: TokenDeploymentGenerator;
  poolDeploymentGenerator: PoolDeploymentGenerator;
  tokenMintGenerator: TokenMintGenerator;
  roleManagementGenerator: RoleManagementGenerator;
  allowListUpdatesGenerator: AllowListUpdatesGenerator;
  rateLimiterConfigGenerator: RateLimiterConfigGenerator;
  acceptOwnershipGenerator: AcceptOwnershipGenerator;

  // Formatters
  chainUpdateFormatter: ChainUpdateFormatter;
  tokenDeploymentFormatter: TokenDeploymentFormatter;
  poolDeploymentFormatter: PoolDeploymentFormatter;
  mintFormatter: MintFormatter;
  roleManagementFormatter: RoleManagementFormatter;
  allowListFormatter: AllowListFormatter;
  rateLimiterFormatter: RateLimiterFormatter;
  acceptOwnershipFormatter: AcceptOwnershipFormatter;

  // Services
  transactionService: TransactionService;
}

/**
 * Creates a fully configured service container with all dependencies wired.
 *
 * Factory function that instantiates and connects all application components
 * in the correct dependency order: core utilities → generators → formatters → services.
 *
 * @returns Fully configured ServiceContainer with all dependencies initialized
 *
 * @remarks
 * Initialization follows a 4-step dependency graph:
 * 1. Core dependencies (logger, interface provider, address computer)
 * 2. Generators (depend on logger, interface provider, address computer)
 * 3. Formatters (depend on interface provider)
 * 4. Services (depend on generators and formatters)
 *
 * This function is called by getServiceContainer() to create the singleton instance.
 * Can also be used directly for testing with custom dependencies.
 *
 * @example
 * ```typescript
 * // Normal usage (via singleton)
 * const container = getServiceContainer();
 * const { transactionService } = container;
 *
 * // Testing usage (fresh instance)
 * const testContainer = createServiceContainer();
 * // Manipulate for testing...
 * ```
 *
 * @see {@link getServiceContainer} for singleton access
 * @see {@link ServiceContainer} for container interface
 *
 * @public
 */
export function createServiceContainer(): ServiceContainer {
  // Step 1: Create core dependencies
  const logger = createLogger();
  const interfaceProvider = createInterfaceProvider();
  const addressComputer = createAddressComputer(logger);

  // Step 2: Create generators
  const chainUpdateGenerator = createChainUpdateGenerator(logger, interfaceProvider);
  const tokenDeploymentGenerator = createTokenDeploymentGenerator(
    logger,
    interfaceProvider,
    addressComputer,
  );
  const poolDeploymentGenerator = createPoolDeploymentGenerator(logger, interfaceProvider);
  const tokenMintGenerator = createTokenMintGenerator(logger, interfaceProvider);
  const roleManagementGenerator = createRoleManagementGenerator(logger, interfaceProvider);
  const allowListUpdatesGenerator = createAllowListUpdatesGenerator(logger, interfaceProvider);
  const rateLimiterConfigGenerator = createRateLimiterConfigGenerator(logger, interfaceProvider);
  const acceptOwnershipGenerator = createAcceptOwnershipGenerator(logger);

  // Step 3: Create formatters
  const chainUpdateFormatter = createChainUpdateFormatter(interfaceProvider);
  const tokenDeploymentFormatter = createTokenDeploymentFormatter(interfaceProvider);
  const poolDeploymentFormatter = createPoolDeploymentFormatter(interfaceProvider);
  const mintFormatter = createMintFormatter(interfaceProvider);
  const roleManagementFormatter = createRoleManagementFormatter(interfaceProvider);
  const allowListFormatter = createAllowListFormatter(interfaceProvider);
  const rateLimiterFormatter = createRateLimiterFormatter(interfaceProvider);
  const acceptOwnershipFormatter = createAcceptOwnershipFormatter();

  // Step 4: Create TransactionService with all dependencies
  const transactionServiceDeps: TransactionServiceDependencies = {
    chainUpdateGenerator,
    tokenDeploymentGenerator,
    poolDeploymentGenerator,
    tokenMintGenerator,
    roleManagementGenerator,
    allowListUpdatesGenerator,
    rateLimiterConfigGenerator,
    acceptOwnershipGenerator,
    chainUpdateFormatter,
    tokenDeploymentFormatter,
    poolDeploymentFormatter,
    mintFormatter,
    roleManagementFormatter,
    allowListFormatter,
    rateLimiterFormatter,
    acceptOwnershipFormatter,
  };
  const transactionService = createTransactionService(transactionServiceDeps);

  // Return the complete container
  return {
    // Core dependencies
    logger,
    interfaceProvider,
    addressComputer,

    // Generators
    chainUpdateGenerator,
    tokenDeploymentGenerator,
    poolDeploymentGenerator,
    tokenMintGenerator,
    roleManagementGenerator,
    allowListUpdatesGenerator,
    rateLimiterConfigGenerator,
    acceptOwnershipGenerator,

    // Formatters
    chainUpdateFormatter,
    tokenDeploymentFormatter,
    poolDeploymentFormatter,
    mintFormatter,
    roleManagementFormatter,
    allowListFormatter,
    rateLimiterFormatter,
    acceptOwnershipFormatter,

    // Services
    transactionService,
  };
}

/**
 * Singleton container instance
 * Created lazily on first access
 */
let containerInstance: ServiceContainer | null = null;

/**
 * Gets the singleton service container instance.
 *
 * Returns the global service container, creating it on first access. Subsequent
 * calls return the cached instance, ensuring all parts of the application share
 * the same dependencies.
 *
 * @returns The singleton ServiceContainer instance
 *
 * @remarks
 * Implements lazy initialization:
 * - First call: Creates and caches the container
 * - Subsequent calls: Returns cached instance
 *
 * This is the recommended way to access services in production code.
 * For testing, use resetServiceContainer() to clear the singleton.
 *
 * @example
 * ```typescript
 * // CLI usage
 * const container = getServiceContainer();
 * const result = await container.transactionService.generateTokenDeployment(
 *   inputJson,
 *   factoryAddress,
 *   salt,
 *   safeAddress,
 *   metadata
 * );
 * ```
 *
 * @see {@link createServiceContainer} for container factory
 * @see {@link resetServiceContainer} for testing reset
 *
 * @public
 */
export function getServiceContainer(): ServiceContainer {
  if (!containerInstance) {
    containerInstance = createServiceContainer();
  }
  return containerInstance;
}

/**
 * Resets the singleton service container (for testing).
 *
 * Clears the cached container instance, forcing the next call to
 * getServiceContainer() to create a fresh instance. Should only be
 * used in test teardown.
 *
 * @remarks
 * This function is intended for test isolation to ensure each test
 * gets a fresh container without shared state from previous tests.
 *
 * @example
 * ```typescript
 * // Test teardown
 * afterEach(() => {
 *   resetServiceContainer();
 * });
 * ```
 *
 * @internal
 */
export function resetServiceContainer(): void {
  containerInstance = null;
}

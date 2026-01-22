/**
 * @fileoverview Transaction service for coordinating transaction generation and formatting.
 *
 * This module provides a unified service interface that coordinates all transaction generators
 * and formatters in the system. It acts as a facade pattern, simplifying transaction generation
 * by automatically handling both raw transaction data generation and optional Safe Transaction
 * Builder JSON formatting in a single method call.
 *
 * @module services/TransactionService
 */

import { ChainUpdateGenerator } from '../generators/chainUpdateCalldata';
import { TokenDeploymentGenerator } from '../generators/tokenDeployment';
import { PoolDeploymentGenerator } from '../generators/poolDeployment';
import { TokenMintGenerator } from '../generators/tokenMint';
import { RoleManagementGenerator } from '../generators/roleManagement';
import { AllowListUpdatesGenerator } from '../generators/allowListUpdates';
import { RateLimiterConfigGenerator } from '../generators/rateLimiterConfig';
import { AcceptOwnershipGenerator } from '../generators/acceptOwnership';
import { RegisterAdminGenerator } from '../generators/registerAdmin';
import { TokenAdminRegistryGenerator } from '../generators/tokenAdminRegistry';
import { ChainUpdateFormatter } from '../formatters/chainUpdateFormatter';
import { TokenDeploymentFormatter } from '../formatters/tokenDeploymentFormatter';
import { PoolDeploymentFormatter } from '../formatters/poolDeploymentFormatter';
import { MintFormatter } from '../formatters/mintFormatter';
import { RoleManagementFormatter } from '../formatters/roleManagementFormatter';
import { AllowListFormatter } from '../formatters/allowListFormatter';
import { RateLimiterFormatter } from '../formatters/rateLimiterFormatter';
import {
  AcceptOwnershipFormatter,
  SafeAcceptOwnershipMetadata,
} from '../formatters/acceptOwnershipFormatter';
import { RegisterAdminFormatter } from '../formatters/registerAdminFormatter';
import { TokenAdminRegistryFormatter } from '../formatters/tokenAdminRegistryFormatter';
import { SafeTransactionDataBase, SafeTransactionBuilderJSON, SafeMetadata } from '../types/safe';
import { SafeChainUpdateMetadata } from '../types/chainUpdate';
import { SafeMintMetadata, SafeRoleManagementMetadata } from '../types/tokenMint';
import { SafeAllowListMetadata } from '../types/allowList';
import { SafeRateLimiterMetadata } from '../types/rateLimiter';
import { SafeRegisterAdminMetadata } from '../types/registerAdmin';
import { SafeTokenAdminRegistryMetadata } from '../types/tokenAdminRegistry';
import {
  parseJSON,
  isTokenDeploymentParams,
  isPoolDeploymentParams,
  isMintParams,
  isRoleManagementParams,
  isAllowListUpdatesInput,
  isSetChainRateLimiterConfigInput,
  isRegisterAdminInput,
  isTokenAdminRegistryInput,
} from '../types/typeGuards';

/**
 * Dependencies required for TransactionService instantiation.
 *
 * Contains all generator and formatter instances needed by the service.
 * This dependency injection pattern enables testability and modularity.
 *
 * @remarks
 * The service requires:
 * - 7 generator instances (for different transaction types)
 * - 7 corresponding formatter instances (for Safe JSON formatting)
 *
 * Generators and formatters are injected rather than created internally to:
 * - Enable easy testing with mocks
 * - Allow custom implementations
 * - Maintain single responsibility (service doesn't manage dependencies)
 * - Support different configuration strategies
 *
 * @public
 */
export interface TransactionServiceDependencies {
  // Generators
  chainUpdateGenerator: ChainUpdateGenerator;
  tokenDeploymentGenerator: TokenDeploymentGenerator;
  poolDeploymentGenerator: PoolDeploymentGenerator;
  tokenMintGenerator: TokenMintGenerator;
  roleManagementGenerator: RoleManagementGenerator;
  allowListUpdatesGenerator: AllowListUpdatesGenerator;
  rateLimiterConfigGenerator: RateLimiterConfigGenerator;
  acceptOwnershipGenerator: AcceptOwnershipGenerator;
  registerAdminGenerator: RegisterAdminGenerator;
  tokenAdminRegistryGenerator: TokenAdminRegistryGenerator;
  // Formatters
  chainUpdateFormatter: ChainUpdateFormatter;
  tokenDeploymentFormatter: TokenDeploymentFormatter;
  poolDeploymentFormatter: PoolDeploymentFormatter;
  mintFormatter: MintFormatter;
  roleManagementFormatter: RoleManagementFormatter;
  allowListFormatter: AllowListFormatter;
  rateLimiterFormatter: RateLimiterFormatter;
  acceptOwnershipFormatter: AcceptOwnershipFormatter;
  registerAdminFormatter: RegisterAdminFormatter;
  tokenAdminRegistryFormatter: TokenAdminRegistryFormatter;
}

/**
 * Transaction service for coordinating transaction generation and Safe JSON formatting.
 *
 * Provides a unified interface for generating all types of token pool transactions.
 * Each method generates raw transaction data and optionally formats it into Safe
 * Transaction Builder JSON format based on whether metadata is provided.
 *
 * @remarks
 * The service implements a facade pattern that simplifies transaction generation by:
 * 1. Accepting input parameters and optional Safe metadata
 * 2. Calling the appropriate generator to create raw transaction data
 * 3. Optionally calling the corresponding formatter to create Safe JSON
 * 4. Returning both raw transaction and Safe JSON (if metadata provided)
 *
 * Transaction Types Supported:
 * - **Chain Updates**: Add/remove cross-chain configurations
 * - **Token Deployment**: Deploy token and pool via factory
 * - **Pool Deployment**: Deploy pool only for existing token
 * - **Token Minting**: Mint tokens (requires MINTER_ROLE)
 * - **Role Management**: Grant/revoke mint and burn roles
 * - **Allow List**: Add/remove addresses from access control
 * - **Rate Limiter**: Configure per-chain transfer rate limits
 *
 * Usage Pattern:
 * - Provide metadata parameter → get both raw transaction and Safe JSON
 * - Omit metadata parameter → get only raw transaction data
 *
 * Benefits:
 * - Single method call for generation + formatting
 * - Consistent API across all transaction types
 * - Automatic type validation via type guards
 * - Simplified CLI and programmatic usage
 *
 * @example
 * ```typescript
 * // Create service with all dependencies
 * const service = createTransactionService({
 *   chainUpdateGenerator,
 *   tokenDeploymentGenerator,
 *   poolDeploymentGenerator,
 *   tokenMintGenerator,
 *   roleManagementGenerator,
 *   allowListUpdatesGenerator,
 *   rateLimiterConfigGenerator,
 *   chainUpdateFormatter,
 *   tokenDeploymentFormatter,
 *   poolDeploymentFormatter,
 *   mintFormatter,
 *   roleManagementFormatter,
 *   allowListFormatter,
 *   rateLimiterFormatter
 * });
 *
 * // Generate token deployment with Safe JSON
 * const { transaction, safeJson } = await service.generateTokenDeployment(
 *   inputJson,
 *   factoryAddress,
 *   salt,
 *   safeAddress,
 *   {
 *     chainId: "84532",
 *     safeAddress: "0xYourSafe",
 *     ownerAddress: "0xYourOwner"
 *   }
 * );
 *
 * // Use raw transaction for direct execution
 * console.log(transaction.to);    // Factory address
 * console.log(transaction.data);  // Encoded function call
 *
 * // Use Safe JSON for multisig execution
 * if (safeJson) {
 *   fs.writeFileSync('deployment.json', JSON.stringify(safeJson, null, 2));
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Generate without Safe JSON (direct execution)
 * const { transaction } = await service.generateMint(
 *   JSON.stringify({ receiver: "0xRecipient", amount: "1000" }),
 *   tokenAddress
 *   // No metadata = no Safe JSON generated
 * );
 *
 * // Execute directly with ethers.js
 * const tx = await wallet.sendTransaction({
 *   to: transaction.to,
 *   data: transaction.data,
 *   value: transaction.value
 * });
 * ```
 *
 * @public
 */
export class TransactionService {
  constructor(private deps: TransactionServiceDependencies) {}

  /**
   * Generates chain update transaction with optional Safe JSON formatting.
   *
   * Creates a transaction for adding or removing remote chain configurations on a TokenPool.
   * Supports both EVM and SVM chain addresses with proper encoding.
   *
   * @param inputJson - JSON string containing chain updates (removes and adds arrays)
   * @param tokenPoolAddress - Address of the TokenPool contract to update
   * @param metadata - Optional Safe metadata (if provided, Safe JSON will be generated)
   *
   * @returns Object containing raw transaction and optional Safe JSON
   *
   * @remarks
   * The generator produces a transaction without a `to` field. This method sets `transaction.to`
   * to `tokenPoolAddress` before returning, ensuring the transaction is ready to use with any
   * output format (calldata, json, or safe-json).
   *
   * @example
   * ```typescript
   * // Generate with Safe JSON
   * const { transaction, safeJson } = await service.generateChainUpdate(
   *   JSON.stringify([
   *     [],  // No chains to remove
   *     [{   // Add Ethereum Sepolia
   *       remoteChainSelector: "16015286601757825753",
   *       remoteChainType: "evm",
   *       remotePoolAddresses: ["0x1234..."],
   *       remoteTokenAddress: "0xabcd...",
   *       outboundRateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" },
   *       inboundRateLimiterConfig: { isEnabled: true, capacity: "1000", rate: "100" }
   *     }]
   *   ]),
   *   "0x779877A7B0D9E8603169DdbD7836e478b4624789",
   *   {
   *     chainId: "84532",
   *     safeAddress: "0xYourSafe",
   *     ownerAddress: "0xYourOwner"
   *   }
   * );
   * ```
   *
   * @see {@link ChainUpdateGenerator} for raw transaction generation
   * @see {@link ChainUpdateFormatter} for Safe JSON formatting
   */
  async generateChainUpdate(
    inputJson: string,
    tokenPoolAddress: string,
    metadata?: SafeChainUpdateMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.chainUpdateGenerator.generate(inputJson);

    // Always set the target address on the transaction (generator leaves it empty)
    transaction.to = tokenPoolAddress;

    const safeJson = metadata
      ? this.deps.chainUpdateFormatter.format(transaction, { ...metadata, tokenPoolAddress })
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generate token and pool deployment transaction and optional Safe JSON
   */
  async generateTokenDeployment(
    inputJson: string,
    factoryAddress: string,
    salt: string,
    safeAddress: string,
    metadata?: SafeMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.tokenDeploymentGenerator.generate(
      inputJson,
      factoryAddress,
      salt,
      safeAddress,
    );
    const safeJson = metadata
      ? this.deps.tokenDeploymentFormatter.format(
          transaction,
          parseJSON(inputJson, isTokenDeploymentParams),
          metadata,
        )
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generate pool deployment transaction and optional Safe JSON
   */
  async generatePoolDeployment(
    inputJson: string,
    factoryAddress: string,
    salt: string,
    metadata?: SafeMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.poolDeploymentGenerator.generate(
      inputJson,
      factoryAddress,
      salt,
    );
    const safeJson = metadata
      ? this.deps.poolDeploymentFormatter.format(
          transaction,
          parseJSON(inputJson, isPoolDeploymentParams),
          metadata,
        )
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generate mint transaction and optional Safe JSON
   */
  async generateMint(
    inputJson: string,
    tokenAddress: string,
    metadata?: SafeMintMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.tokenMintGenerator.generate(inputJson, tokenAddress);
    const safeJson = metadata
      ? this.deps.mintFormatter.format(transaction, parseJSON(inputJson, isMintParams), metadata)
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generate role management transaction(s) and optional Safe JSON
   */
  async generateRoleManagement(
    inputJson: string,
    tokenAddress: string,
    metadata?: SafeRoleManagementMetadata,
  ): Promise<{
    transactions: SafeTransactionDataBase[];
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const result = await this.deps.roleManagementGenerator.generate(inputJson, tokenAddress);
    const safeJson = metadata
      ? this.deps.roleManagementFormatter.format(
          result,
          parseJSON(inputJson, isRoleManagementParams),
          metadata,
        )
      : null;

    return { transactions: result.transactions, safeJson };
  }

  /**
   * Generate allow list updates transaction and optional Safe JSON
   */
  async generateAllowListUpdates(
    inputJson: string,
    tokenPoolAddress: string,
    metadata?: SafeAllowListMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.allowListUpdatesGenerator.generate(
      inputJson,
      tokenPoolAddress,
    );
    const safeJson = metadata
      ? this.deps.allowListFormatter.format(
          transaction,
          parseJSON(inputJson, isAllowListUpdatesInput),
          metadata,
        )
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generate rate limiter config transaction and optional Safe JSON
   */
  async generateRateLimiterConfig(
    inputJson: string,
    tokenPoolAddress: string,
    metadata?: SafeRateLimiterMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.rateLimiterConfigGenerator.generate(
      inputJson,
      tokenPoolAddress,
    );
    const safeJson = metadata
      ? this.deps.rateLimiterFormatter.format(
          transaction,
          parseJSON(inputJson, isSetChainRateLimiterConfigInput),
          metadata,
        )
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generates accept ownership transaction with optional Safe JSON formatting.
   *
   * Creates a transaction for accepting ownership of a contract using the
   * two-step ownership transfer pattern. Works with any Chainlink contract
   * that implements this pattern (tokens, pools, etc.).
   *
   * @param contractAddress - Address of the contract to accept ownership of
   * @param metadata - Optional Safe metadata (if provided, Safe JSON will be generated)
   *
   * @returns Object containing raw transaction and optional Safe JSON
   *
   * @remarks
   * Two-step ownership pattern:
   * 1. Current owner calls `transferOwnership(newOwner)` - sets `pendingOwner`
   * 2. New owner calls `acceptOwnership()` - becomes the actual `owner`
   *
   * Common use case: After TokenPoolFactory deployment, Safe is set as pendingOwner
   * on both token and pool. Safe must accept ownership before calling owner-only
   * functions like `applyChainUpdates`.
   *
   * @example
   * ```typescript
   * // Accept ownership of a pool
   * const { transaction, safeJson } = await service.generateAcceptOwnership(
   *   "0xPoolAddress...",
   *   {
   *     chainId: "84532",
   *     safeAddress: "0xYourSafe",
   *     ownerAddress: "0xYourOwner",
   *     contractAddress: "0xPoolAddress..."
   *   }
   * );
   * ```
   *
   * @see {@link AcceptOwnershipGenerator} for raw transaction generation
   * @see {@link AcceptOwnershipFormatter} for Safe JSON formatting
   */
  async generateAcceptOwnership(
    contractAddress: string,
    metadata?: SafeAcceptOwnershipMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const transaction = await this.deps.acceptOwnershipGenerator.generate(contractAddress);

    const safeJson = metadata
      ? this.deps.acceptOwnershipFormatter.format(transaction, metadata)
      : null;

    return { transaction, safeJson };
  }

  /**
   * Generates register admin transaction with optional Safe JSON formatting.
   *
   * Creates a transaction for registering as the CCIP admin for a token via the
   * RegistryModuleOwnerCustom contract. Supports three registration methods.
   *
   * @param inputJson - JSON string containing register admin parameters
   * @param metadata - Optional Safe metadata (if provided, Safe JSON will be generated)
   *
   * @returns Object containing raw transaction and optional Safe JSON
   *
   * @remarks
   * Registration Methods:
   * - `get-ccip-admin`: Uses token's getCCIPAdmin() function
   * - `owner`: Uses token's owner() function (standard Ownable pattern)
   * - `access-control`: Uses token's DEFAULT_ADMIN_ROLE holder
   *
   * @example
   * ```typescript
   * const { transaction, safeJson } = await service.generateRegisterAdmin(
   *   JSON.stringify({
   *     moduleAddress: "0x1234...",
   *     tokenAddress: "0x5678...",
   *     method: "owner"
   *   }),
   *   {
   *     chainId: "84532",
   *     safeAddress: "0xYourSafe",
   *     ownerAddress: "0xYourOwner",
   *     moduleAddress: "0x1234..."
   *   }
   * );
   * ```
   *
   * @see {@link RegisterAdminGenerator} for raw transaction generation
   * @see {@link RegisterAdminFormatter} for Safe JSON formatting
   */
  async generateRegisterAdmin(
    inputJson: string,
    metadata?: SafeRegisterAdminMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const result = await this.deps.registerAdminGenerator.generate(inputJson);

    const safeJson = metadata
      ? this.deps.registerAdminFormatter.format(
          result,
          parseJSON(inputJson, isRegisterAdminInput),
          metadata,
        )
      : null;

    return { transaction: result.transaction, safeJson };
  }

  /**
   * Generates TokenAdminRegistry transaction with optional Safe JSON formatting.
   *
   * Creates a transaction for interacting with the TokenAdminRegistry contract.
   * Supports three methods: set-pool, transfer-admin, and accept-admin.
   *
   * @param inputJson - JSON string containing TokenAdminRegistry parameters
   * @param metadata - Optional Safe metadata (if provided, Safe JSON will be generated)
   *
   * @returns Object containing raw transaction and optional Safe JSON
   *
   * @remarks
   * Methods:
   * - `set-pool`: Sets the pool for a token via setPool(localToken, pool)
   * - `transfer-admin`: Transfers admin role via transferAdminRole(localToken, newAdmin)
   * - `accept-admin`: Accepts admin role via acceptAdminRole(localToken)
   *
   * @example
   * ```typescript
   * const { transaction, safeJson } = await service.generateTokenAdminRegistry(
   *   JSON.stringify({
   *     registryAddress: "0x1234...",
   *     tokenAddress: "0x5678...",
   *     method: "set-pool",
   *     poolAddress: "0xabcd..."
   *   }),
   *   {
   *     chainId: "84532",
   *     safeAddress: "0xYourSafe",
   *     ownerAddress: "0xYourOwner",
   *     registryAddress: "0x1234..."
   *   }
   * );
   * ```
   *
   * @see {@link TokenAdminRegistryGenerator} for raw transaction generation
   * @see {@link TokenAdminRegistryFormatter} for Safe JSON formatting
   */
  async generateTokenAdminRegistry(
    inputJson: string,
    metadata?: SafeTokenAdminRegistryMetadata,
  ): Promise<{
    transaction: SafeTransactionDataBase;
    safeJson: SafeTransactionBuilderJSON | null;
  }> {
    const result = await this.deps.tokenAdminRegistryGenerator.generate(inputJson);

    const safeJson = metadata
      ? this.deps.tokenAdminRegistryFormatter.format(
          result,
          parseJSON(inputJson, isTokenAdminRegistryInput),
          metadata,
        )
      : null;

    return { transaction: result.transaction, safeJson };
  }
}

/**
 * Creates a TransactionService instance with all required dependencies.
 *
 * Factory function that constructs a TransactionService with the complete set of
 * generators and formatters needed for all transaction types.
 *
 * @param deps - All required generator and formatter instances
 *
 * @returns Configured TransactionService instance ready for use
 *
 * @remarks
 * This factory is typically used in conjunction with the ServiceContainer
 * which manages creation and wiring of all dependencies.
 *
 * @example
 * ```typescript
 * // Manual service creation (testing, custom setups)
 * const service = createTransactionService({
 *   chainUpdateGenerator: createChainUpdateGenerator(logger, interfaceProvider),
 *   tokenDeploymentGenerator: createTokenDeploymentGenerator(logger, interfaceProvider, addressComputer),
 *   poolDeploymentGenerator: createPoolDeploymentGenerator(logger, interfaceProvider),
 *   tokenMintGenerator: createTokenMintGenerator(logger, interfaceProvider),
 *   roleManagementGenerator: createRoleManagementGenerator(logger, interfaceProvider),
 *   allowListUpdatesGenerator: createAllowListUpdatesGenerator(logger, interfaceProvider),
 *   rateLimiterConfigGenerator: createRateLimiterConfigGenerator(logger, interfaceProvider),
 *   chainUpdateFormatter: createChainUpdateFormatter(interfaceProvider),
 *   tokenDeploymentFormatter: createTokenDeploymentFormatter(interfaceProvider),
 *   poolDeploymentFormatter: createPoolDeploymentFormatter(interfaceProvider),
 *   mintFormatter: createMintFormatter(interfaceProvider),
 *   roleManagementFormatter: createRoleManagementFormatter(interfaceProvider),
 *   allowListFormatter: createAllowListFormatter(interfaceProvider),
 *   rateLimiterFormatter: createRateLimiterFormatter(interfaceProvider)
 * });
 * ```
 *
 * @see {@link TransactionService} for service implementation
 * @see {@link TransactionServiceDependencies} for required dependencies
 *
 * @public
 */
export function createTransactionService(deps: TransactionServiceDependencies): TransactionService {
  return new TransactionService(deps);
}

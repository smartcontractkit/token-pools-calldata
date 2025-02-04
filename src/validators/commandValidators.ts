/**
 * @fileoverview Command-specific validation orchestrators for CLI commands.
 *
 * This module provides validation functions for each CLI command type, orchestrating
 * multiple validators (address, salt, format) to ensure all command parameters are
 * valid before processing.
 *
 * Each command validator follows a consistent pattern:
 * 1. Validate optional Safe parameters (if provided)
 * 2. Validate required command-specific parameters
 * 3. Validate Safe JSON format parameters (if format is safe-json)
 *
 * @module validators/commandValidators
 */

import { OUTPUT_FORMAT } from '../config';
import {
  validateOptionalAddress,
  validateTokenAddress,
  validatePoolAddress,
  validateDeployerAddress,
} from './addressValidator';
import { validateSalt } from './saltValidator';
import { validateSafeJsonParams } from './formatValidator';

/**
 * Base options interface shared across all commands.
 *
 * @remarks
 * These parameters are optional for calldata format but required for safe-json format.
 *
 * @internal
 */
interface BaseOptions {
  /** Safe multisig contract address (optional for calldata, required for safe-json) */
  safe?: string;

  /** Safe owner address (optional for calldata, required for safe-json) */
  owner?: string;

  /** Chain ID (optional for calldata, required for safe-json) */
  chainId?: string;

  /** Output format: 'calldata' or 'safe-json' */
  format?: string;
}

/**
 * Chain update command options.
 *
 * @internal
 */
interface ChainUpdateOptions extends BaseOptions {
  /** TokenPool address (required for safe-json, optional for calldata) */
  tokenPool?: string;
}

/**
 * Deployment command options (token and pool deployment).
 *
 * @internal
 */
interface DeploymentOptions extends BaseOptions {
  /** TokenPoolFactory address (required) */
  deployer: string;

  /** 32-byte salt for CREATE2 deployment (required) */
  salt: string;
}

/**
 * Mint command options.
 *
 * @internal
 */
interface MintOptions extends BaseOptions {
  /** Token contract address (required) */
  token: string;
}

/**
 * Pool operation command options (allow list, rate limiter).
 *
 * @internal
 */
interface PoolOperationOptions extends BaseOptions {
  /** TokenPool contract address (required) */
  pool: string;
}

/**
 * Grant roles command options.
 *
 * @internal
 */
interface GrantRolesOptions extends BaseOptions {
  /** Token contract address (required) */
  token: string;

  /** Pool contract address (required) */
  pool: string;
}

/**
 * Validates Safe JSON format parameters if format is safe-json.
 *
 * Internal helper that checks if the output format is safe-json and validates
 * the required Safe JSON parameters.
 *
 * @param options - Command options with format field
 * @throws {ValidationError} If format is safe-json and required parameters are missing
 *
 * @internal
 */
function validateSafeJsonFormat(options: BaseOptions): void {
  if (options.format === OUTPUT_FORMAT.SAFE_JSON) {
    validateSafeJsonParams(options.chainId, options.safe, options.owner);
  }
}

/**
 * Validates optional Safe and owner addresses.
 *
 * Internal helper that validates Safe and owner addresses if they are provided.
 * Does not throw if addresses are undefined.
 *
 * @param options - Command options with safe and owner fields
 * @throws {ValidationError} If addresses are provided but invalid
 *
 * @internal
 */
function validateOptionalSafeParams(options: BaseOptions): void {
  validateOptionalAddress(options.safe, 'Safe address');
  validateOptionalAddress(options.owner, 'owner address');
}

/**
 * Validates chain update command options.
 *
 * Validates all parameters for the `generate-chain-update` CLI command.
 *
 * @param options - Chain update command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation Steps:
 * 1. Validate optional Safe and owner addresses (if provided)
 * 2. Validate optional TokenPool address (if provided)
 * 3. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid calldata format
 * validateChainUpdateOptions({
 *   format: 'calldata',
 *   tokenPool: '0x1234567890123456789012345678901234567890'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Valid safe-json format
 * validateChainUpdateOptions({
 *   format: 'safe-json',
 *   chainId: '84532',
 *   safe: '0x5419c6d83473d1c653e7b51e8568fafedce94f01',
 *   owner: '0x0000000000000000000000000000000000000000',
 *   tokenPool: '0x1234567890123456789012345678901234567890'
 * });
 * ```
 *
 * @public
 */
export function validateChainUpdateOptions(options: ChainUpdateOptions): void {
  validateOptionalSafeParams(options);
  validateOptionalAddress(options.tokenPool, 'token pool address');
  validateSafeJsonFormat(options);
}

/**
 * Validates token deployment command options.
 *
 * Validates all parameters for the `generate-token-deployment` CLI command.
 *
 * @param options - Token deployment command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation Steps:
 * 1. Validate optional Safe and owner addresses (if provided)
 * 2. Validate required deployer address format
 * 3. Validate required salt value (must be 32 bytes)
 * 4. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid token deployment
 * validateTokenDeploymentOptions({
 *   deployer: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 *   salt: '0x0000000000000000000000000000000000000000000000000000000123456789',
 *   format: 'safe-json',
 *   chainId: '84532',
 *   safe: '0xSafe',
 *   owner: '0xOwner'
 * });
 * ```
 *
 * @public
 */
export function validateTokenDeploymentOptions(options: DeploymentOptions): void {
  validateOptionalSafeParams(options);
  validateDeployerAddress(options.deployer);
  validateSalt(options.salt);
  validateSafeJsonFormat(options);
}

/**
 * Validates pool deployment command options.
 *
 * Validates all parameters for the `generate-pool-deployment` CLI command.
 *
 * @param options - Pool deployment command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation is identical to token deployment (same parameters required).
 *
 * Validation Steps:
 * 1. Validate optional Safe and owner addresses (if provided)
 * 2. Validate required deployer address format
 * 3. Validate required salt value (must be 32 bytes)
 * 4. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid pool deployment
 * validatePoolDeploymentOptions({
 *   deployer: '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e',
 *   salt: '0x0000000000000000000000000000000000000000000000000000000123456789',
 *   format: 'calldata'
 * });
 * ```
 *
 * @public
 */
export function validatePoolDeploymentOptions(options: DeploymentOptions): void {
  validateOptionalSafeParams(options);
  validateDeployerAddress(options.deployer);
  validateSalt(options.salt);
  validateSafeJsonFormat(options);
}

/**
 * Validates mint command options.
 *
 * Validates all parameters for the `generate-mint` CLI command.
 *
 * @param options - Mint command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation Steps:
 * 1. Validate required token address format
 * 2. Validate optional Safe and owner addresses (if provided)
 * 3. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid mint command
 * validateMintOptions({
 *   token: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
 *   format: 'safe-json',
 *   chainId: '84532',
 *   safe: '0xSafe',
 *   owner: '0xOwner'
 * });
 * ```
 *
 * @public
 */
export function validateMintOptions(options: MintOptions): void {
  validateTokenAddress(options.token);
  validateOptionalSafeParams(options);
  validateSafeJsonFormat(options);
}

/**
 * Validates allow list updates command options.
 *
 * Validates all parameters for the allow list update CLI command.
 *
 * @param options - Allow list command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation Steps:
 * 1. Validate required pool address format
 * 2. Validate optional Safe and owner addresses (if provided)
 * 3. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid allow list update
 * validateAllowListOptions({
 *   pool: '0x1234567890123456789012345678901234567890',
 *   format: 'calldata'
 * });
 * ```
 *
 * @public
 */
export function validateAllowListOptions(options: PoolOperationOptions): void {
  validatePoolAddress(options.pool);
  validateOptionalSafeParams(options);
  validateSafeJsonFormat(options);
}

/**
 * Validates rate limiter configuration command options.
 *
 * Validates all parameters for the rate limiter configuration CLI command.
 *
 * @param options - Rate limiter command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation Steps:
 * 1. Validate required pool address format
 * 2. Validate optional Safe and owner addresses (if provided)
 * 3. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid rate limiter configuration
 * validateRateLimiterOptions({
 *   pool: '0x1234567890123456789012345678901234567890',
 *   format: 'safe-json',
 *   chainId: '84532',
 *   safe: '0xSafe',
 *   owner: '0xOwner'
 * });
 * ```
 *
 * @public
 */
export function validateRateLimiterOptions(options: PoolOperationOptions): void {
  validatePoolAddress(options.pool);
  validateOptionalSafeParams(options);
  validateSafeJsonFormat(options);
}

/**
 * Validates grant roles command options.
 *
 * Validates all parameters for the `generate-grant-roles` CLI command.
 *
 * @param options - Grant roles command options
 * @throws {ValidationError} If any validation fails
 *
 * @remarks
 * Validation Steps:
 * 1. Validate required token address format
 * 2. Validate required pool address format
 * 3. Validate optional Safe and owner addresses (if provided)
 * 4. If format is safe-json: Validate chainId, safe, owner are all provided
 *
 * @example
 * ```typescript
 * // Valid grant roles command
 * validateGrantRolesOptions({
 *   token: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
 *   pool: '0x1234567890123456789012345678901234567890',
 *   format: 'safe-json',
 *   chainId: '84532',
 *   safe: '0xSafe',
 *   owner: '0xOwner'
 * });
 * ```
 *
 * @public
 */
export function validateGrantRolesOptions(options: GrantRolesOptions): void {
  validateTokenAddress(options.token);
  validatePoolAddress(options.pool);
  validateOptionalSafeParams(options);
  validateSafeJsonFormat(options);
}

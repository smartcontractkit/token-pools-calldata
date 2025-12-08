/**
 * @fileoverview Type guards for runtime type checking and safe type narrowing.
 *
 * This module provides TypeScript type predicates (type guards) for validating unknown
 * values at runtime. These guards enable safe type narrowing without resorting to
 * unsafe type assertions (`as` casts).
 *
 * Type guards complement Zod schema validation by providing lightweight runtime checks
 * before full validation, improving error messages and developer experience.
 *
 * @remarks
 * Type Guard Pattern:
 * - Type guards return `value is T` to enable TypeScript type narrowing
 * - They perform basic structural validation, not exhaustive validation
 * - Use Zod schemas for full validation after initial type guard check
 *
 * @module types/typeGuards
 */

import { TokenDeploymentParams } from './tokenDeployment';
import { PoolDeploymentParams } from './poolDeployment';
import { MintParams, RoleManagementParams } from './tokenMint';
import { AllowListUpdatesInput } from './allowList';
import { SetChainRateLimiterConfigInput } from './rateLimiter';

/**
 * Type guard for plain JavaScript objects.
 *
 * Checks if a value is a plain object (not null, not array, not function).
 * This is a foundational guard used by other type predicates.
 *
 * @param value - Value to check
 * @returns True if value is a plain object
 *
 * @remarks
 * Excludes:
 * - `null` (typeof null === 'object' in JavaScript)
 * - Arrays (Array.isArray returns true)
 * - Functions (not checked, but unlikely)
 *
 * @example
 * ```typescript
 * const value: unknown = getUserInput();
 *
 * if (isObject(value)) {
 *   // TypeScript knows value is Record<string, unknown>
 *   console.log(value.someProperty);
 * }
 * ```
 *
 * @example
 * ```typescript
 * isObject({ foo: 'bar' });     // true
 * isObject(null);                // false
 * isObject([1, 2, 3]);           // false
 * isObject('string');            // false
 * ```
 *
 * @public
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Safely parses JSON with type validation using a type guard.
 *
 * Combines JSON parsing with runtime type checking to ensure the parsed
 * value matches the expected type before returning it.
 *
 * @typeParam T - Expected type of parsed JSON
 * @param json - JSON string to parse
 * @param validator - Type guard function to validate parsed value
 * @returns Validated parsed value of type T
 * @throws {SyntaxError} If JSON is malformed
 * @throws {Error} If parsed value fails type validation
 *
 * @remarks
 * This function is useful when:
 * - Reading JSON from files or user input
 * - Need to validate structure before full Zod validation
 * - Want better error messages for structural issues
 *
 * @example
 * ```typescript
 * // Safe JSON parsing with type guard
 * const json = '{"name": "MyToken", "symbol": "MTK", "decimals": 18}';
 * const params = parseJSON(json, isTokenDeploymentParams);
 * // TypeScript knows params is TokenDeploymentParams
 * console.log(params.name); // "MyToken"
 * ```
 *
 * @example
 * ```typescript
 * // Error handling
 * try {
 *   const json = '{"invalid": "structure"}';
 *   const params = parseJSON(json, isTokenDeploymentParams);
 * } catch (error) {
 *   console.error('Invalid JSON structure'); // Caught here
 * }
 * ```
 *
 * @public
 */
export function parseJSON<T>(json: string, validator: (value: unknown) => value is T): T {
  const parsed: unknown = JSON.parse(json);
  if (!validator(parsed)) {
    throw new Error('Invalid JSON structure');
  }
  return parsed;
}

/**
 * Type predicate for TokenDeploymentParams.
 *
 * Performs basic structural validation of token deployment parameters.
 * Checks for presence of required fields without full validation.
 *
 * @param value - Value to check
 * @returns True if value has TokenDeploymentParams structure
 *
 * @remarks
 * This is a lightweight check for basic structure. Full validation including:
 * - Address format validation
 * - Decimal range checking
 * - Remote pool configuration validation
 *
 * Should be done using `tokenDeploymentParamsSchema.parse()` from Zod.
 *
 * @example
 * ```typescript
 * const input: unknown = JSON.parse(fileContents);
 *
 * if (isTokenDeploymentParams(input)) {
 *   // TypeScript knows input is TokenDeploymentParams
 *   // Now do full validation with Zod
 *   const validated = tokenDeploymentParamsSchema.parse(input);
 * }
 * ```
 *
 * @see {@link tokenDeploymentParamsSchema} for full validation
 *
 * @public
 */
export function isTokenDeploymentParams(value: unknown): value is TokenDeploymentParams {
  if (!isObject(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.symbol === 'string' &&
    typeof value.decimals === 'number'
  );
}

/**
 * Type predicate for PoolDeploymentParams.
 *
 * Performs basic structural validation of pool deployment parameters.
 *
 * @param value - Value to check
 * @returns True if value has PoolDeploymentParams structure
 *
 * @remarks
 * Checks for presence of `token` and `poolType` fields. Full validation
 * should be done using `poolDeploymentParamsSchema.parse()`.
 *
 * @example
 * ```typescript
 * const input: unknown = JSON.parse(fileContents);
 *
 * if (isPoolDeploymentParams(input)) {
 *   // TypeScript knows input is PoolDeploymentParams
 *   const validated = poolDeploymentParamsSchema.parse(input);
 * }
 * ```
 *
 * @see {@link poolDeploymentParamsSchema} for full validation
 *
 * @public
 */
export function isPoolDeploymentParams(value: unknown): value is PoolDeploymentParams {
  if (!isObject(value)) return false;
  return typeof value.token === 'string' && typeof value.poolType === 'string';
}

/**
 * Type predicate for MintParams.
 *
 * Performs basic structural validation of token mint parameters.
 *
 * @param value - Value to check
 * @returns True if value has MintParams structure
 *
 * @remarks
 * Checks for presence of `receiver` and `amount` fields. Full validation
 * including address format should be done using `mintParamsSchema.parse()`.
 *
 * @example
 * ```typescript
 * const input: unknown = JSON.parse(fileContents);
 *
 * if (isMintParams(input)) {
 *   // TypeScript knows input is MintParams
 *   const validated = mintParamsSchema.parse(input);
 * }
 * ```
 *
 * @see {@link mintParamsSchema} for full validation
 *
 * @public
 */
export function isMintParams(value: unknown): value is MintParams {
  if (!isObject(value)) return false;
  return typeof value.receiver === 'string' && typeof value.amount === 'string';
}

/**
 * Type predicate for AllowListUpdatesInput.
 *
 * Performs basic structural validation of allow list update parameters.
 *
 * @param value - Value to check
 * @returns True if value has AllowListUpdatesInput structure
 *
 * @remarks
 * Checks for presence of optional `removes` and `adds` arrays. Full validation
 * including address format checking should be done using `allowListUpdatesSchema.parse()`.
 *
 * @example
 * ```typescript
 * const input: unknown = JSON.parse(fileContents);
 *
 * if (isAllowListUpdatesInput(input)) {
 *   // TypeScript knows input is AllowListUpdatesInput
 *   const validated = allowListUpdatesSchema.parse(input);
 * }
 * ```
 *
 * @see {@link allowListUpdatesSchema} for full validation
 *
 * @public
 */
export function isAllowListUpdatesInput(value: unknown): value is AllowListUpdatesInput {
  if (!isObject(value)) return false;
  const removes = value.removes;
  const adds = value.adds;
  return (
    (Array.isArray(removes) || removes === undefined) && (Array.isArray(adds) || adds === undefined)
  );
}

/**
 * Type predicate for SetChainRateLimiterConfigInput.
 *
 * Performs basic structural validation of rate limiter configuration parameters.
 *
 * @param value - Value to check
 * @returns True if value has SetChainRateLimiterConfigInput structure
 *
 * @remarks
 * Checks for presence of `remoteChainSelector`, `outboundConfig`, and `inboundConfig`.
 * Full validation should be done using `setChainRateLimiterConfigSchema.parse()`.
 *
 * @example
 * ```typescript
 * const input: unknown = JSON.parse(fileContents);
 *
 * if (isSetChainRateLimiterConfigInput(input)) {
 *   // TypeScript knows input is SetChainRateLimiterConfigInput
 *   const validated = setChainRateLimiterConfigSchema.parse(input);
 * }
 * ```
 *
 * @see {@link setChainRateLimiterConfigSchema} for full validation
 *
 * @public
 */
export function isSetChainRateLimiterConfigInput(
  value: unknown,
): value is SetChainRateLimiterConfigInput {
  if (!isObject(value)) return false;
  return (
    typeof value.remoteChainSelector === 'string' &&
    isObject(value.outboundConfig) &&
    isObject(value.inboundConfig)
  );
}

/**
 * Type predicate for RoleManagementParams.
 *
 * Performs basic structural validation of role management parameters.
 *
 * @param value - Value to check
 * @returns True if value has RoleManagementParams structure
 *
 * @remarks
 * Checks for presence of `pool` and `roleType` fields. Full validation
 * including address format and enum values should be done using
 * `roleManagementParamsSchema.parse()`.
 *
 * @example
 * ```typescript
 * const input: unknown = JSON.parse(fileContents);
 *
 * if (isRoleManagementParams(input)) {
 *   // TypeScript knows input is RoleManagementParams
 *   const validated = roleManagementParamsSchema.parse(input);
 * }
 * ```
 *
 * @see {@link roleManagementParamsSchema} for full validation
 *
 * @public
 */
export function isRoleManagementParams(value: unknown): value is RoleManagementParams {
  if (!isObject(value)) return false;
  return typeof value.pool === 'string' && typeof value.roleType === 'string';
}

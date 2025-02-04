/**
 * @fileoverview Commander.js command handler utilities.
 *
 * This module provides type-safe wrapper functions for Commander.js command
 * handlers. Eliminates the need for unsafe type assertions while maintaining
 * full TypeScript type safety for CLI command options.
 *
 * Key Features:
 * - Generic type-safe command action wrapper
 * - No runtime overhead (identity function)
 * - Removes need for 'as' type assertions
 * - Maintains Commander.js action signature compatibility
 *
 * @module cli/commandHelpers
 * @see {@link https://github.com/tj/commander.js} Commander.js documentation
 */

/**
 * Creates a type-safe wrapper for Commander.js command action handlers.
 *
 * Identity function that preserves the handler as-is while providing TypeScript
 * with explicit type information. Eliminates the need for unsafe `as` type
 * assertions when defining command actions.
 *
 * @param handler - The async command handler function
 * @returns The same handler function with explicit typing
 *
 * @remarks
 * Purpose:
 * - Provides explicit typing for Commander.js action handlers
 * - Avoids TypeScript errors about implicit 'any' types
 * - No runtime overhead (identity function)
 * - Better IDE autocomplete and type checking
 *
 * Commander.js Integration:
 * - Works with `.action()` method of Command
 * - Handler receives parsed options object
 * - Options type must match command's option definitions
 *
 * Type Safety:
 * - Generic `TOptions` type parameter inferred from handler
 * - Ensures options parameter matches expected interface
 * - Catches type mismatches at compile time
 *
 * @example
 * ```typescript
 * import { createCommandAction } from './commandHelpers';
 * import { Command } from 'commander';
 *
 * interface DeployOptions {
 *   deployer: string;
 *   salt: string;
 *   format?: string;
 * }
 *
 * async function handleDeploy(options: DeployOptions): Promise<void> {
 *   console.log(`Deploying with ${options.deployer}`);
 *   // ... deployment logic
 * }
 *
 * const program = new Command();
 * program
 *   .command('deploy')
 *   .requiredOption('-d, --deployer <address>', 'Deployer address')
 *   .requiredOption('--salt <bytes32>', 'Salt for CREATE2')
 *   .option('-f, --format <type>', 'Output format')
 *   .action(createCommandAction(handleDeploy));
 *   // ^^ Properly typed without 'as' assertion
 * ```
 *
 * @example
 * ```typescript
 * // Without createCommandAction (requires type assertion)
 * program
 *   .command('deploy')
 *   .action(handleDeploy as (options: DeployOptions) => Promise<void>);
 *   //      ^^ Unsafe type assertion
 *
 * // With createCommandAction (type-safe)
 * program
 *   .command('deploy')
 *   .action(createCommandAction(handleDeploy));
 *   //      ^^ No assertion needed, fully type-safe
 * ```
 *
 * @example
 * ```typescript
 * // Type mismatch caught at compile time
 * interface WrongOptions {
 *   foo: string;
 * }
 *
 * async function handler(options: DeployOptions): Promise<void> {
 *   // ...
 * }
 *
 * // TypeScript error: Type mismatch
 * const action = createCommandAction<WrongOptions>(handler);
 * //                                              ^^ Error: Types don't match
 * ```
 *
 * @typeParam TOptions - Type of the options object passed to the handler
 * @public
 */
export function createCommandAction<TOptions>(
  handler: (options: TOptions) => Promise<void>,
): (options: TOptions) => Promise<void> {
  return handler;
}

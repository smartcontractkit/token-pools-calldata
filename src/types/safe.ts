/**
 * @fileoverview Type definitions for Gnosis Safe Transaction Builder JSON format.
 *
 * This module defines the type structures for generating Safe Transaction Builder JSON
 * files. These JSON files can be imported into the Safe Transaction Builder UI to create
 * multisig transactions for TokenPool operations.
 *
 * Safe Transaction Builder is a web interface for creating, signing, and executing
 * multisig transactions on Gnosis Safe contracts. This module ensures compatibility
 * with the Transaction Builder's JSON import format.
 *
 * @see {@link https://help.safe.global/en/articles/40841-transaction-builder} Safe Transaction Builder Documentation
 *
 * @module types/safe
 */

/**
 * Safe Transaction Builder version string.
 *
 * Specifies the version of the Safe Transaction Builder JSON format. This version
 * must match the format expected by the Safe Transaction Builder UI.
 *
 * @remarks
 * Version 1.18.0 is compatible with Safe Transaction Builder as of 2024.
 * Update this constant if the Safe Transaction Builder format changes.
 *
 * @example
 * ```typescript
 * const safeJson: SafeTransactionBuilderJSON = {
 *   version: SAFE_TX_BUILDER_VERSION,  // "1.18.0"
 *   chainId: "1",
 *   // ...
 * };
 * ```
 *
 * @public
 */
export const SAFE_TX_BUILDER_VERSION = '1.18.0';

/**
 * Safe operation type enumeration.
 *
 * Defines the execution mode for Safe transactions. Determines how the Safe contract
 * executes the transaction.
 *
 * @remarks
 * Operation Types:
 * - **Call (0)**: Standard external call (most common)
 *   - Executes transaction as a normal external call
 *   - Used for token transfers, contract interactions, etc.
 *   - Preserves msg.sender as the Safe contract address
 *
 * - **DelegateCall (1)**: Delegate call (advanced use cases)
 *   - Executes transaction in the context of the Safe contract
 *   - Target contract's code runs with Safe's storage
 *   - Used for upgrades, library calls, etc.
 *   - ⚠️ **Security Risk**: Target can modify Safe storage
 *
 * For TokenPool operations, always use `SafeOperationType.Call`.
 *
 * @example
 * ```typescript
 * // Standard transaction (recommended)
 * const standardTx: SafeTransactionDataBase = {
 *   to: "0x1234567890123456789012345678901234567890",
 *   value: "0",
 *   data: "0x...",
 *   operation: SafeOperationType.Call  // Use Call for normal operations
 * };
 * ```
 *
 * @example
 * ```typescript
 * // DelegateCall (advanced, use with caution)
 * const delegateTx: SafeTransactionDataBase = {
 *   to: "0xLibraryAddress",
 *   value: "0",
 *   data: "0x...",
 *   operation: SafeOperationType.DelegateCall  // Advanced use only
 * };
 * ```
 *
 * @public
 */
export enum SafeOperationType {
  /** Standard external call (recommended for TokenPool operations) */
  Call = 0,
  /** Delegate call (advanced use cases, modifies Safe storage) */
  DelegateCall = 1,
}

/**
 * Base Safe transaction data structure.
 *
 * Defines the core transaction parameters required for any Safe transaction.
 * This is the minimal set of fields needed to execute a transaction via a Safe contract.
 *
 * @remarks
 * Field Descriptions:
 * - **to**: Destination address (contract or EOA)
 * - **value**: ETH amount to send (wei as string, usually "0" for contract calls)
 * - **data**: ABI-encoded function call data
 * - **operation**: Execution mode (Call or DelegateCall)
 *
 * This interface is extended by SafeTransactionBuilderTransaction to add metadata
 * fields required by the Transaction Builder UI.
 *
 * @example
 * ```typescript
 * // Token pool chain update transaction
 * const txData: SafeTransactionDataBase = {
 *   to: "0x1234567890123456789012345678901234567890",  // TokenPool address
 *   value: "0",                                        // No ETH sent
 *   data: "0x8dc97c2f...",                            // applyChainUpdates calldata
 *   operation: SafeOperationType.Call
 * };
 * ```
 *
 * @example
 * ```typescript
 * // ETH transfer transaction
 * const ethTransfer: SafeTransactionDataBase = {
 *   to: "0xReceiver",
 *   value: "1000000000000000000",  // 1 ETH in wei
 *   data: "0x",                    // Empty data for ETH transfer
 *   operation: SafeOperationType.Call
 * };
 * ```
 *
 * @see {@link SafeTransactionBuilderTransaction} for full Transaction Builder format
 *
 * @public
 */
export interface SafeTransactionDataBase {
  /** Destination contract or account address */
  to: string;

  /** ETH amount to send in wei (string to avoid precision issues) */
  value: string;

  /** ABI-encoded function call data (hex string starting with 0x) */
  data: string;

  /** Transaction execution mode (Call or DelegateCall) */
  operation: SafeOperationType;
}

/**
 * Safe Transaction Builder method metadata.
 *
 * Describes the contract method being called in a Safe transaction, including
 * the method signature and input parameter definitions. Used by the Transaction
 * Builder UI to display human-readable transaction information.
 *
 * @remarks
 * This structure mirrors the ABI format for function definitions:
 * - **inputs**: Array of parameter definitions (name, type, internalType)
 * - **name**: Function name (e.g., "applyChainUpdates")
 * - **payable**: Whether the function accepts ETH (false for TokenPool operations)
 *
 * The Transaction Builder uses this metadata to:
 * 1. Display the method name and parameters in the UI
 * 2. Validate the encoded data matches the signature
 * 3. Show parameter values in a readable format
 *
 * @example
 * ```typescript
 * // applyChainUpdates method metadata
 * const method: SafeTransactionBuilderMethod = {
 *   inputs: [
 *     {
 *       name: "chainsToRemove",
 *       type: "uint64[]",
 *       internalType: "uint64[]"
 *     },
 *     {
 *       name: "chainsToAdd",
 *       type: "tuple[]",
 *       internalType: "struct TokenPool.ChainUpdate[]"
 *     }
 *   ],
 *   name: "applyChainUpdates",
 *   payable: false
 * };
 * ```
 *
 * @example
 * ```typescript
 * // mint method metadata
 * const mintMethod: SafeTransactionBuilderMethod = {
 *   inputs: [
 *     {
 *       name: "to",
 *       type: "address",
 *       internalType: "address"
 *     },
 *     {
 *       name: "amount",
 *       type: "uint256",
 *       internalType: "uint256"
 *     }
 *   ],
 *   name: "mint",
 *   payable: false
 * };
 * ```
 *
 * @see {@link SafeTransactionBuilderTransaction} for usage in transactions
 *
 * @public
 */
export interface SafeTransactionBuilderMethod {
  /** Array of input parameter definitions matching ABI format */
  inputs: Array<{
    /** Parameter name (e.g., "chainsToRemove") */
    name: string;
    /** Solidity type (e.g., "uint64[]", "address") */
    type: string;
    /** Internal Solidity type with struct names (e.g., "struct TokenPool.ChainUpdate[]") */
    internalType: string;
  }>;

  /** Function name (e.g., "applyChainUpdates") */
  name: string;

  /** Whether the function accepts ETH (false for TokenPool operations) */
  payable: boolean;
}

/**
 * Safe Transaction Builder transaction structure.
 *
 * Complete transaction format for Safe Transaction Builder JSON files. Extends
 * the base transaction data with method metadata and decoded parameter values.
 *
 * @remarks
 * This is the primary transaction format used in SafeTransactionBuilderJSON.
 * Each transaction includes:
 * 1. Base transaction data (to, value, data, operation)
 * 2. Method signature metadata (contractMethod)
 * 3. Decoded parameter values (contractInputsValues)
 *
 * The Transaction Builder UI uses these fields to:
 * - Display transaction details in a human-readable format
 * - Validate the transaction data matches the method signature
 * - Allow users to review parameter values before signing
 *
 * The contractInputsValues field can be null if parameter decoding is not needed
 * or if the transaction data is manually constructed.
 *
 * @example
 * ```typescript
 * // Chain update transaction with full metadata
 * const transaction: SafeTransactionBuilderTransaction = {
 *   to: "0x1234567890123456789012345678901234567890",
 *   value: "0",
 *   data: "0x8dc97c2f...",
 *   operation: SafeOperationType.Call,
 *   contractMethod: {
 *     inputs: [
 *       { name: "chainsToRemove", type: "uint64[]", internalType: "uint64[]" },
 *       { name: "chainsToAdd", type: "tuple[]", internalType: "struct TokenPool.ChainUpdate[]" }
 *     ],
 *     name: "applyChainUpdates",
 *     payable: false
 *   },
 *   contractInputsValues: {
 *     chainsToRemove: [],
 *     chainsToAdd: [
 *       {
 *         remoteChainSelector: "16015286601757825753",
 *         remotePoolAddresses: ["0xPool"],
 *         // ...
 *       }
 *     ]
 *   }
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Simple transaction without decoded values
 * const simpleTx: SafeTransactionBuilderTransaction = {
 *   to: "0xToken",
 *   value: "0",
 *   data: "0x40c10f19...",
 *   operation: SafeOperationType.Call,
 *   contractMethod: {
 *     inputs: [
 *       { name: "to", type: "address", internalType: "address" },
 *       { name: "amount", type: "uint256", internalType: "uint256" }
 *     ],
 *     name: "mint",
 *     payable: false
 *   },
 *   contractInputsValues: null  // No decoded values provided
 * };
 * ```
 *
 * @see {@link SafeTransactionBuilderJSON} for complete JSON structure
 *
 * @public
 */
export interface SafeTransactionBuilderTransaction extends SafeTransactionDataBase {
  /** Method signature and parameter metadata */
  contractMethod: SafeTransactionBuilderMethod;

  /** Decoded parameter values (null if not decoded) */
  contractInputsValues: Record<string, unknown> | null;
}

/**
 * Safe Transaction Builder metadata.
 *
 * Provides descriptive metadata about a batch of Safe transactions, including
 * the batch name, description, creator information, and builder version.
 *
 * @remarks
 * This metadata is displayed in the Safe Transaction Builder UI when the JSON
 * file is imported, helping users understand the purpose and origin of the
 * transaction batch.
 *
 * Field Purposes:
 * - **name**: Short title for the transaction batch (e.g., "Deploy Token and Pool")
 * - **description**: Detailed explanation of what the transactions do
 * - **txBuilderVersion**: Safe Transaction Builder version (use SAFE_TX_BUILDER_VERSION)
 * - **createdFromSafeAddress**: The Safe contract address
 * - **createdFromOwnerAddress**: The Safe owner who created the transactions
 *
 * @example
 * ```typescript
 * const meta: SafeTransactionBuilderMeta = {
 *   name: "Deploy Cross-Chain Token",
 *   description: "Deploy BurnMintERC20 token with TokenPool and configure Base Sepolia connection",
 *   txBuilderVersion: "1.18.0",
 *   createdFromSafeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   createdFromOwnerAddress: "0x0000000000000000000000000000000000000000"
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Chain update metadata
 * const chainUpdateMeta: SafeTransactionBuilderMeta = {
 *   name: "Add Ethereum Sepolia Chain",
 *   description: "Configure TokenPool to support cross-chain transfers to/from Ethereum Sepolia",
 *   txBuilderVersion: SAFE_TX_BUILDER_VERSION,
 *   createdFromSafeAddress: "0xYourSafe",
 *   createdFromOwnerAddress: "0xYourOwner"
 * };
 * ```
 *
 * @see {@link SafeTransactionBuilderJSON} for usage in complete JSON structure
 *
 * @public
 */
export interface SafeTransactionBuilderMeta {
  /** Short title for the transaction batch */
  name: string;

  /** Detailed description of what the transactions do */
  description: string;

  /** Safe Transaction Builder version (use SAFE_TX_BUILDER_VERSION constant) */
  txBuilderVersion: string;

  /** Address of the Safe contract */
  createdFromSafeAddress: string;

  /** Address of the Safe owner who created the transactions */
  createdFromOwnerAddress: string;
}

/**
 * Safe Transaction Builder complete JSON structure.
 *
 * Root structure for Safe Transaction Builder JSON files. This format can be
 * imported into the Safe Transaction Builder UI to create multisig transactions.
 *
 * @remarks
 * JSON Structure:
 * - **version**: Format version (use SAFE_TX_BUILDER_VERSION)
 * - **chainId**: Chain ID where transactions will be executed
 * - **createdAt**: Unix timestamp (milliseconds) when JSON was created
 * - **meta**: Metadata describing the transaction batch
 * - **transactions**: Array of transactions to execute
 *
 * Workflow:
 * 1. Generate SafeTransactionBuilderJSON using formatters
 * 2. Write JSON to file (e.g., `output/token-deployment.json`)
 * 3. Import file into Safe Transaction Builder UI
 * 4. Review transactions in UI
 * 5. Sign and execute via Safe multisig
 *
 * @example
 * ```typescript
 * // Complete Safe JSON for token deployment
 * const safeJson: SafeTransactionBuilderJSON = {
 *   version: "1.18.0",
 *   chainId: "84532",  // Base Sepolia
 *   createdAt: Date.now(),
 *   meta: {
 *     name: "Deploy Token and Pool",
 *     description: "Deploy BurnMintERC20 token with cross-chain pool",
 *     txBuilderVersion: "1.18.0",
 *     createdFromSafeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *     createdFromOwnerAddress: "0x0000000000000000000000000000000000000000"
 *   },
 *   transactions: [
 *     {
 *       to: "0x17d8a409fe2cef2d3808bcb61f14abeffc28876e",  // TokenPoolFactory
 *       value: "0",
 *       data: "0x...",
 *       operation: SafeOperationType.Call,
 *       contractMethod: {
 *         inputs: [...],
 *         name: "deployTokenAndTokenPool",
 *         payable: false
 *       },
 *       contractInputsValues: null
 *     }
 *   ]
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Multi-transaction batch (grant roles after deployment)
 * const batchJson: SafeTransactionBuilderJSON = {
 *   version: "1.18.0",
 *   chainId: "84532",
 *   createdAt: Date.now(),
 *   meta: {
 *     name: "Grant Pool Roles",
 *     description: "Grant mint and burn roles to TokenPool",
 *     txBuilderVersion: "1.18.0",
 *     createdFromSafeAddress: "0xYourSafe",
 *     createdFromOwnerAddress: "0xYourOwner"
 *   },
 *   transactions: [
 *     {
 *       to: "0xTokenAddress",
 *       value: "0",
 *       data: "0x...",  // grantMintAndBurn
 *       operation: SafeOperationType.Call,
 *       contractMethod: { ... },
 *       contractInputsValues: null
 *     },
 *     {
 *       to: "0xPoolAddress",
 *       value: "0",
 *       data: "0x...",  // applyChainUpdates
 *       operation: SafeOperationType.Call,
 *       contractMethod: { ... },
 *       contractInputsValues: null
 *     }
 *   ]
 * };
 * ```
 *
 * @see {@link SAFE_TX_BUILDER_VERSION} for format version
 * @see {@link SafeTransactionBuilderTransaction} for transaction structure
 * @see {@link SafeTransactionBuilderMeta} for metadata structure
 *
 * @public
 */
export interface SafeTransactionBuilderJSON {
  /** Safe Transaction Builder format version */
  version: string;

  /** Chain ID where transactions will be executed */
  chainId: string;

  /** Unix timestamp (milliseconds) when JSON was created */
  createdAt: number;

  /** Transaction batch metadata (name, description, creator info) */
  meta: SafeTransactionBuilderMeta;

  /** Array of transactions to execute via Safe */
  transactions: SafeTransactionBuilderTransaction[];
}

/**
 * Safe metadata for transaction generation.
 *
 * Minimal metadata required to generate Safe transactions. This is the input
 * format used by generators and formatters to create SafeTransactionBuilderJSON.
 *
 * @remarks
 * This is a simplified metadata structure containing only the essential fields
 * needed during transaction generation. Formatters expand this into the full
 * SafeTransactionBuilderMeta and SafeTransactionBuilderJSON structures.
 *
 * @example
 * ```typescript
 * // Metadata passed to formatters
 * const metadata: SafeMetadata = {
 *   chainId: "84532",                                       // Base Sepolia
 *   safeAddress: "0x5419c6d83473d1c653e7b51e8568fafedce94f01",
 *   ownerAddress: "0x0000000000000000000000000000000000000000"
 * };
 *
 * // Formatter expands this into full SafeTransactionBuilderJSON
 * const formatted = await formatter.formatAsSafeJson(
 *   transaction,
 *   metadata
 * );
 * ```
 *
 * @example
 * ```typescript
 * // CLI passes metadata from command-line flags
 * function handleGenerateCommand(
 *   safeAddress: string,
 *   ownerAddress: string,
 *   chainId: string
 * ) {
 *   const metadata: SafeMetadata = {
 *     chainId,
 *     safeAddress,
 *     ownerAddress
 *   };
 *
 *   const safeJson = await formatter.formatAsSafeJson(tx, metadata);
 *   await outputWriter.writeOutput(safeJson, 'safe-json', outputPath);
 * }
 * ```
 *
 * @see {@link SafeTransactionBuilderMeta} for full metadata structure
 * @see {@link SafeTransactionBuilderJSON} for complete JSON format
 *
 * @public
 */
export interface SafeMetadata {
  /** Chain ID where transaction will be executed */
  chainId: string;

  /** Address of the Safe multisig contract */
  safeAddress: string;

  /** Address of the Safe owner executing the transaction */
  ownerAddress: string;
}

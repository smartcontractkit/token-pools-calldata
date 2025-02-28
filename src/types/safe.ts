/**
 * Base Safe transaction data structure
 */
export interface SafeTransactionDataBase {
  to: string;
  value: string;
  data: string;
  operation: number; // 0 for Call, 1 for DelegateCall
}

/**
 * Safe Transaction Builder method interface
 */
export interface SafeTransactionBuilderMethod {
  inputs: Array<{
    name: string;
    type: string;
    internalType: string;
  }>;
  name: string;
  payable: boolean;
}

/**
 * Safe Transaction Builder transaction interface
 */
export interface SafeTransactionBuilderTransaction extends SafeTransactionDataBase {
  contractMethod: SafeTransactionBuilderMethod;
  contractInputsValues: Record<string, unknown> | null;
}

/**
 * Safe Transaction Builder metadata interface
 */
export interface SafeTransactionBuilderMeta {
  name: string;
  description: string;
  txBuilderVersion: string;
  createdFromSafeAddress: string;
  createdFromOwnerAddress: string;
}

/**
 * Safe Transaction Builder JSON interface
 */
export interface SafeTransactionBuilderJSON {
  version: string;
  chainId: string;
  createdAt: number;
  meta: SafeTransactionBuilderMeta;
  transactions: SafeTransactionBuilderTransaction[];
}

/**
 * Safe metadata for transaction generation
 */
export interface SafeMetadata {
  chainId: string;
  safeAddress: string;
  ownerAddress: string;
}

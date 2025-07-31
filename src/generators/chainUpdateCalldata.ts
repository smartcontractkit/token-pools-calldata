import { ethers } from 'ethers';
import { TokenPool__factory, TokenPool } from '../typechain';
import { PublicKey } from '@solana/web3.js';
import {
  ChainType,
  ChainUpdateInput,
  ChainUpdatesInput,
  chainUpdatesInputSchema,
  SafeChainUpdateMetadata,
} from '../types/chainUpdate';
import {
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SAFE_TX_BUILDER_VERSION,
  SafeOperationType,
} from '../types/safe';
import logger from '../utils/logger';

export class ChainUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainUpdateError';
  }
}

/**
 * Converts a validated chain update input to the contract-ready format. Supports EVM as source chain, and select non EVM remote chains.
 */
export function convertToContractFormat(
  chainUpdate: ChainUpdateInput,
): TokenPool.ChainUpdateStruct {
  const abiCoder = new ethers.AbiCoder();

  if (![ChainType.MVM, ChainType.EVM, ChainType.SVM].includes(chainUpdate.remoteChainType)) {
    throw `convertToContractFormat(): Invalid ChainType provided: '${chainUpdate.remoteChainType}'.`;
  }

  if (chainUpdate.remoteChainType === ChainType.MVM) {
    throw ' convertToContractFormat(): Move Virtual Machine Address validation not implemented.'; // TODO @dev
  }

  let remotePoolAddresses: string[] = [];
  let remoteTokenAddress: string = '';
  try {
    if (chainUpdate.remoteChainType === ChainType.EVM) {
      remotePoolAddresses = chainUpdate.remotePoolAddresses.map((address) =>
        abiCoder.encode(['address'], [address]),
      );
      remoteTokenAddress = abiCoder.encode(['address'], [chainUpdate.remoteTokenAddress]);
    }

    if (chainUpdate.remoteChainType === ChainType.SVM) {
      // Validate and encode Solana addresses as bytes32
      remotePoolAddresses = chainUpdate.remotePoolAddresses.map((address) => {
        const pubkey = new PublicKey(address);
        return abiCoder.encode(['bytes32'], ['0x' + pubkey.toBuffer().toString('hex')]);
      });

      const tokenPubkey = new PublicKey(chainUpdate.remoteTokenAddress);
      remoteTokenAddress = abiCoder.encode(
        ['bytes32'],
        ['0x' + tokenPubkey.toBuffer().toString('hex')],
      );
    }

    return {
      remoteChainSelector: chainUpdate.remoteChainSelector,
      remotePoolAddresses,
      remoteTokenAddress,
      outboundRateLimiterConfig: {
        isEnabled: chainUpdate.outboundRateLimiterConfig.isEnabled,
        capacity: chainUpdate.outboundRateLimiterConfig.capacity,
        rate: chainUpdate.outboundRateLimiterConfig.rate,
      },
      inboundRateLimiterConfig: {
        isEnabled: chainUpdate.inboundRateLimiterConfig.isEnabled,
        capacity: chainUpdate.inboundRateLimiterConfig.capacity,
        rate: chainUpdate.inboundRateLimiterConfig.rate,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error converting chain update to contract format', {
        error,
        chainUpdate,
      });
      throw new ChainUpdateError(
        `Failed to convert chain update to contract format: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Generates a transaction for applying chain updates
 * @param inputJson - The input JSON string containing chain updates.  Supports EVM as source chain, and select non EVM remote chains.
 * @returns The Safe transaction data
 */
export async function generateChainUpdateTransaction(
  inputJson: string,
): Promise<SafeTransactionDataBase> {
  let parsedInput: ChainUpdatesInput;

  try {
    // Parse and validate the input JSON
    parsedInput = await chainUpdatesInputSchema.parseAsync(JSON.parse(inputJson));

    logger.info('Successfully validated chain updates input', {
      chainsToRemoveCount: parsedInput[0].length,
      chainsToAddCount: parsedInput[1].length,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to parse or validate input JSON', { error, inputJson });
      throw new ChainUpdateError(`Invalid input format: ${error.message}`);
    }
    throw error;
  }

  try {
    // Convert the validated input to contract format
    const [chainSelectorsToRemove, chainsToAdd] = parsedInput;

    // Create the contract interface and encode the function call
    const poolInterface = TokenPool__factory.createInterface();
    const data = poolInterface.encodeFunctionData('applyChainUpdates', [
      chainSelectorsToRemove,
      chainsToAdd.map(convertToContractFormat),
    ]);

    logger.info('Successfully generated chain update transaction');

    return {
      to: '', // To be filled by the caller
      value: '0',
      data,
      operation: SafeOperationType.Call,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate transaction', { error });
      throw new ChainUpdateError(`Failed to generate transaction: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Creates a Safe Transaction Builder JSON for the chain updates
 * @param transaction - The Safe transaction data
 * @param metadata - The Safe metadata
 * @returns The Safe Transaction Builder JSON
 */
export function createChainUpdateJSON(
  transaction: SafeTransactionDataBase,
  metadata: SafeChainUpdateMetadata,
): SafeTransactionBuilderJSON {
  const poolInterface = TokenPool__factory.createInterface();
  const methodFragment = poolInterface.getFunction('applyChainUpdates');

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: 'Token Pool Chain Updates',
      description: 'Apply chain updates to the Token Pool contract',
      txBuilderVersion: SAFE_TX_BUILDER_VERSION,
      createdFromSafeAddress: metadata.safeAddress,
      createdFromOwnerAddress: metadata.ownerAddress,
    },
    transactions: [
      {
        to: metadata.tokenPoolAddress,
        value: transaction.value,
        data: transaction.data,
        operation: transaction.operation,
        contractMethod: {
          inputs: methodFragment.inputs.map((input) => ({
            name: input.name,
            type: input.type,
            internalType: input.type,
          })),
          name: methodFragment.name,
          payable: methodFragment.payable,
        },
        contractInputsValues: null,
      },
    ],
  };
}

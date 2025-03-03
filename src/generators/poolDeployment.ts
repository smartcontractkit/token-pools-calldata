import { ethers } from 'ethers';
import { BYTECODES } from '../constants/bytecodes';
import {
  PoolDeploymentParams,
  poolDeploymentParamsSchema,
  ContractRemoteTokenPoolInfo,
  RemoteTokenPoolInfo,
} from '../types/poolDeployment';
import {
  SafeMetadata,
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SAFE_TX_BUILDER_VERSION,
  SafeOperationType,
} from '../types/safe';
import { TokenPoolFactory__factory } from '../typechain';
import { poolTypeToNumber } from '../utils/poolTypeConverter';
import logger from '../utils/logger';

export class PoolDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PoolDeploymentError';
  }
}

/**
 * Generates a deployment transaction for pool only using TokenPoolFactory
 * @param inputJson - The input JSON string containing deployment parameters
 * @param factoryAddress - The address of the TokenPoolFactory contract
 * @param salt - The salt to use for create2 deployment (required)
 * @returns The Safe transaction data
 */
export async function generatePoolDeploymentTransaction(
  inputJson: string,
  factoryAddress: string,
  salt: string,
): Promise<SafeTransactionDataBase> {
  if (!ethers.isAddress(factoryAddress)) {
    throw new PoolDeploymentError('Invalid factory address');
  }

  if (!salt) {
    throw new PoolDeploymentError('Salt is required for deployment');
  }

  let parsedInput: PoolDeploymentParams;

  try {
    // Parse and validate the input JSON
    const rawInput = JSON.parse(inputJson) as unknown;
    parsedInput = await poolDeploymentParamsSchema.parseAsync(rawInput);
    logger.info('Successfully validated pool deployment input', {
      poolType: parsedInput.poolType,
      token: parsedInput.token,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to parse or validate input JSON', { error, inputJson });
      throw new PoolDeploymentError(`Invalid input format: ${error.message}`);
    }
    throw error;
  }

  try {
    // Get the factory interface
    const factoryInterface = TokenPoolFactory__factory.createInterface();

    // Convert pool type enum to contract value
    const poolTypeValue = poolTypeToNumber(parsedInput.poolType);

    // Convert remote token pools' pool types to contract values
    const remoteTokenPools: ContractRemoteTokenPoolInfo[] = parsedInput.remoteTokenPools.map(
      (pool: RemoteTokenPoolInfo) => ({
        ...pool,
        poolType: poolTypeToNumber(pool.poolType),
      }),
    );

    // Get the appropriate pool bytecode
    const poolBytecode =
      parsedInput.poolType === 'BurnMintTokenPool'
        ? BYTECODES.BURN_MINT_TOKEN_POOL
        : BYTECODES.LOCK_RELEASE_TOKEN_POOL;

    // Encode the function call to deployTokenPoolWithExistingToken
    const data = factoryInterface.encodeFunctionData('deployTokenPoolWithExistingToken', [
      parsedInput.token,
      parsedInput.decimals,
      remoteTokenPools,
      poolBytecode,
      salt,
      poolTypeValue,
    ]);

    logger.info('Successfully generated pool deployment transaction');

    return {
      to: factoryAddress,
      value: '0',
      data,
      operation: SafeOperationType.Call,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate deployment transaction', { error });
      throw new PoolDeploymentError(`Failed to generate deployment transaction: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Creates a Safe Transaction Builder JSON for the pool deployment
 * @param transaction - The Safe transaction data
 * @param params - The pool deployment parameters
 * @param metadata - The Safe metadata
 * @returns The Safe Transaction Builder JSON
 */
export function createPoolDeploymentJSON(
  transaction: SafeTransactionDataBase,
  params: PoolDeploymentParams,
  metadata: SafeMetadata,
): SafeTransactionBuilderJSON {
  // Get the factory interface
  const factoryInterface = TokenPoolFactory__factory.createInterface();

  // Get the deployTokenPoolWithExistingToken function fragment
  const methodFragment = factoryInterface.getFunction('deployTokenPoolWithExistingToken');

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: `Pool Factory Deployment - ${params.poolType}`,
      description: `Deploy ${params.poolType} for token at ${params.token} using factory`,
      txBuilderVersion: SAFE_TX_BUILDER_VERSION,
      createdFromSafeAddress: metadata.safeAddress,
      createdFromOwnerAddress: metadata.ownerAddress,
    },
    transactions: [
      {
        to: transaction.to,
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

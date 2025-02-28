import { ethers } from 'ethers';
import { BYTECODES } from '../constants/bytecodes';
import { PoolDeploymentParams, poolDeploymentParamsSchema } from '../types/poolDeployment';
import { SafeMetadata, SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import logger from '../utils/logger';

export class PoolDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PoolDeploymentError';
  }
}

/**
 * Generates the deployment transaction for a token pool
 * @param inputJson - The input JSON string containing deployment parameters
 * @returns The Safe transaction data
 */
export async function generatePoolDeploymentTransaction(
  inputJson: string,
): Promise<SafeTransactionDataBase> {
  let parsedInput: PoolDeploymentParams;

  try {
    // Parse and validate the input JSON
    const rawInput = JSON.parse(inputJson) as unknown;
    parsedInput = await poolDeploymentParamsSchema.parseAsync(rawInput);

    logger.info('Successfully validated pool deployment input', {
      poolType: parsedInput.poolType,
      token: parsedInput.poolParams.token,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to parse or validate input JSON', { error, inputJson });
      throw new PoolDeploymentError(`Invalid input format: ${error.message}`);
    }
    throw error;
  }

  try {
    const { poolType, poolParams } = parsedInput;

    // Prepare constructor parameters based on pool type
    let constructorTypes: string[];
    let constructorValues: unknown[];
    let bytecode: string;

    if (poolType === 'BurnMintTokenPool') {
      constructorTypes = [
        'address', // token
        'uint8', // decimals
        'address[]', // allowlist
        'address', // owner
        'address', // ccipRouter
      ];
      constructorValues = [
        poolParams.token,
        poolParams.decimals,
        poolParams.allowlist,
        poolParams.owner,
        poolParams.ccipRouter,
      ];
      bytecode = BYTECODES.BURN_MINT_TOKEN_POOL;
    } else {
      // LockReleaseTokenPool
      constructorTypes = [
        'address', // token
        'uint8', // decimals
        'address[]', // allowlist
        'address', // owner
        'bool', // acceptLiquidity
        'address', // ccipRouter
      ];
      constructorValues = [
        poolParams.token,
        poolParams.decimals,
        poolParams.allowlist,
        poolParams.owner,
        true, // acceptLiquidity is always true for LockReleaseTokenPool
        poolParams.ccipRouter,
      ];
      bytecode = BYTECODES.LOCK_RELEASE_TOKEN_POOL;
    }

    // Encode constructor parameters using ABI encoding
    const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
      constructorTypes,
      constructorValues,
    );

    // Combine bytecode and constructor args using solidityPacked
    const deploymentBytecode = ethers.solidityPacked(
      ['bytes', 'bytes'],
      [bytecode, constructorArgs],
    );

    // Create Safe transaction
    const safeTransaction: SafeTransactionDataBase = {
      to: ethers.ZeroAddress, // Contract deployment
      value: '0',
      data: deploymentBytecode,
      operation: 0, // Call
    };

    logger.info('Successfully generated pool deployment transaction', {
      poolType,
      bytecodeLength: deploymentBytecode.length,
    });

    return safeTransaction;
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
  // Define constructor inputs based on pool type
  const constructorInputs =
    params.poolType === 'BurnMintTokenPool'
      ? [
          { name: 'token', type: 'address', internalType: 'contract IBurnMintERC20' },
          { name: 'decimals', type: 'uint8', internalType: 'uint8' },
          { name: 'allowlist', type: 'address[]', internalType: 'address[]' },
          { name: 'owner', type: 'address', internalType: 'address' },
          { name: 'ccipRouter', type: 'address', internalType: 'address' },
        ]
      : [
          { name: 'token', type: 'address', internalType: 'contract IERC20' },
          { name: 'decimals', type: 'uint8', internalType: 'uint8' },
          { name: 'allowlist', type: 'address[]', internalType: 'address[]' },
          { name: 'owner', type: 'address', internalType: 'address' },
          { name: 'acceptLiquidity', type: 'bool', internalType: 'bool' },
          { name: 'ccipRouter', type: 'address', internalType: 'address' },
        ];

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: `${params.poolType} Deployment`,
      description: `Deploy ${params.poolType} for token at ${params.poolParams.token}`,
      txBuilderVersion: '1.18.0',
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
          inputs: constructorInputs,
          name: 'constructor',
          payable: false,
        },
        contractInputsValues: {
          token: params.poolParams.token,
          decimals: params.poolParams.decimals.toString(),
          allowlist: JSON.stringify(params.poolParams.allowlist),
          owner: params.poolParams.owner,
          ...(params.poolType === 'LockReleaseTokenPool' && { acceptLiquidity: 'true' }),
          ccipRouter: params.poolParams.ccipRouter,
        },
      },
    ],
  };
}

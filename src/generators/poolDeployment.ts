import { ethers } from 'ethers';
import { BYTECODES } from '../constants/bytecodes';
import {
  PoolDeploymentParams,
  poolDeploymentParamsSchema,
  LockReleaseTokenPoolParams,
} from '../types/poolDeployment';
import {
  SafeMetadata,
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SafeOperationType,
  SAFE_TX_BUILDER_VERSION,
} from '../types/safe';
import logger from '../utils/logger';
import { BurnMintTokenPool__factory, LockReleaseTokenPool__factory } from '../typechain';
import { ZodError } from 'zod';
import { computeCreate2Address } from '../utils/addressComputer';

export class PoolDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PoolDeploymentError';
  }
}

/**
 * Generates a deployment transaction for a token pool
 * @param inputJson - The input JSON string containing deployment parameters
 * @param deployerAddress - The address of the CreateCall contract
 * @param useCreate2 - Whether to use create2 for deterministic addresses
 * @param salt - The salt to use for create2 (required if useCreate2 is true)
 * @param safeAddress - The address of the Safe that will deploy the contract (required if useCreate2 is true)
 * @returns The Safe transaction data
 */
export async function generatePoolDeploymentTransaction(
  inputJson: string,
  deployerAddress: string,
  useCreate2 = false,
  salt?: string,
  safeAddress?: string,
): Promise<SafeTransactionDataBase> {
  if (!ethers.isAddress(deployerAddress)) {
    throw new PoolDeploymentError('Invalid deployer address');
  }

  // Validate create2 requirements upfront
  if (useCreate2) {
    if (!salt) {
      throw new PoolDeploymentError('Salt is required for create2 deployment');
    }
    if (!safeAddress) {
      throw new PoolDeploymentError('Safe address is required for create2 deployment');
    }
    if (!ethers.isAddress(safeAddress)) {
      throw new PoolDeploymentError('Invalid safe address');
    }
  }

  let parsedInput: PoolDeploymentParams;

  try {
    parsedInput = await poolDeploymentParamsSchema.parseAsync(JSON.parse(inputJson));
    logger.info('Successfully validated pool deployment input', {
      poolType: parsedInput.poolType,
      token: parsedInput.poolParams.token,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Failed to validate input JSON', {
        error: error.errors,
        inputJson,
      });
      throw new PoolDeploymentError(`Invalid input format: ${error.message}`);
    }
    if (error instanceof SyntaxError) {
      logger.error('Failed to parse JSON', {
        error: error.message,
        inputJson,
      });
      throw new PoolDeploymentError(`Invalid JSON: ${error.message}`);
    }
    throw error; // Re-throw unexpected errors
  }

  try {
    const { poolType, poolParams } = parsedInput;

    // Get the appropriate factory and parameters based on pool type
    const [factory, bytecode, constructorParams] =
      poolType === 'BurnMintTokenPool'
        ? [
            BurnMintTokenPool__factory,
            BYTECODES.BURN_MINT_TOKEN_POOL,
            [
              poolParams.token,
              poolParams.decimals,
              poolParams.allowlist,
              poolParams.owner,
              poolParams.ccipRouter,
            ],
          ]
        : [
            LockReleaseTokenPool__factory,
            BYTECODES.LOCK_RELEASE_TOKEN_POOL,
            [
              poolParams.token,
              poolParams.decimals,
              poolParams.allowlist,
              poolParams.owner,
              (poolParams as LockReleaseTokenPoolParams).acceptLiquidity,
              poolParams.ccipRouter,
            ],
          ];

    // Encode constructor parameters using the factory
    const constructorArgs = factory.createInterface().encodeDeploy(constructorParams);

    // Combine bytecode and constructor args using solidityPacked
    const deploymentData = ethers.solidityPacked(['bytes', 'bytes'], [bytecode, constructorArgs]);

    // For create2, compute and log the expected contract address
    if (useCreate2) {
      // We can safely use salt and safeAddress here as we validated them upfront
      // TypeScript doesn't know that our validation ensures these are defined
      computeCreate2Address(safeAddress!, deploymentData, salt!);
    }

    logger.info('Successfully generated pool deployment transaction', {
      poolType,
      token: poolParams.token,
    });

    return {
      to: deployerAddress,
      value: '0',
      data: deploymentData,
      operation: SafeOperationType.DelegateCall,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate deployment transaction', {
        error: error.message,
        stack: error.stack,
      });
      throw new PoolDeploymentError(`Failed to generate deployment transaction: ${error.message}`);
    }
    // Handle unexpected non-Error objects
    logger.error('Unexpected error during deployment transaction generation', { error });
    throw new PoolDeploymentError(
      'An unexpected error occurred during deployment transaction generation',
    );
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
  // Get the appropriate factory based on pool type
  const factory =
    params.poolType === 'BurnMintTokenPool'
      ? BurnMintTokenPool__factory
      : LockReleaseTokenPool__factory;

  // Get the constructor fragment from the ABI
  const methodFragment = factory.createInterface().deploy;

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: `${params.poolType} Deployment`,
      description: `Deploy ${params.poolType} for token at ${params.poolParams.token}`,
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
          name: 'constructor',
          payable: !methodFragment.payable,
        },
        contractInputsValues: {
          token: params.poolParams.token,
          decimals: params.poolParams.decimals.toString(),
          allowlist: JSON.stringify(params.poolParams.allowlist),
          owner: params.poolParams.owner,
          ...(params.poolType === 'LockReleaseTokenPool' && {
            acceptLiquidity: ('acceptLiquidity' in params.poolParams
              ? params.poolParams.acceptLiquidity
              : true
            ).toString(),
          }),
          ccipRouter: params.poolParams.ccipRouter,
        },
      },
    ],
  };
}

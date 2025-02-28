import { ethers } from 'ethers';
import { BYTECODES } from '../constants/bytecodes';
import { TokenDeploymentParams, tokenDeploymentParamsSchema } from '../types/tokenDeployment';
import {
  SafeMetadata,
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SafeOperationType,
  SAFE_TX_BUILDER_VERSION,
} from '../types/safe';
import logger from '../utils/logger';
import { CreateCall__factory, BurnMintERC20__factory } from '../typechain';
import { ZodError } from 'zod';
import { computeCreate2Address } from '../utils/addressComputer';

export class TokenDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenDeploymentError';
  }
}

/**
 * Generates a deployment transaction for BurnMintERC20 token
 * @param inputJson - The input JSON string containing deployment parameters
 * @param deployerAddress - The address of the CreateCall contract
 * @param useCreate2 - Whether to use create2 for deterministic addresses
 * @param salt - The salt to use for create2 (required if useCreate2 is true)
 * @param safeAddress - The address of the Safe that will deploy the contract (required if useCreate2 is true)
 * @returns The Safe transaction data
 */
export async function generateTokenDeploymentTransaction(
  inputJson: string,
  deployerAddress: string,
  useCreate2 = false,
  salt?: string,
  safeAddress?: string,
): Promise<SafeTransactionDataBase> {
  if (!ethers.isAddress(deployerAddress)) {
    throw new TokenDeploymentError('Invalid deployer address');
  }

  // Validate create2 requirements upfront
  if (useCreate2) {
    if (!salt) {
      throw new TokenDeploymentError('Salt is required for create2 deployment');
    }
    if (!safeAddress) {
      throw new TokenDeploymentError('Safe address is required for create2 deployment');
    }
    if (!ethers.isAddress(safeAddress)) {
      throw new TokenDeploymentError('Invalid safe address');
    }
  }

  let parsedInput: TokenDeploymentParams;

  try {
    parsedInput = await tokenDeploymentParamsSchema.parseAsync(JSON.parse(inputJson));
    logger.info('Successfully validated token deployment input', {
      name: parsedInput.name,
      symbol: parsedInput.symbol,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error('Failed to validate input JSON', {
        error: error.errors,
        inputJson,
      });
      throw new TokenDeploymentError(`Invalid input format: ${error.message}`);
    }
    if (error instanceof SyntaxError) {
      logger.error('Failed to parse JSON', {
        error: error.message,
        inputJson,
      });
      throw new TokenDeploymentError(`Invalid JSON: ${error.message}`);
    }
    throw error; // Re-throw unexpected errors
  }

  try {
    // Get the interface for the CreateCall contract
    const createCallInterface = CreateCall__factory.createInterface();

    // Encode constructor parameters using the BurnMintERC20 factory
    const constructorArgs = BurnMintERC20__factory.createInterface().encodeDeploy([
      parsedInput.name,
      parsedInput.symbol,
      parsedInput.decimals,
      parsedInput.maxSupply,
      parsedInput.preMint,
    ]);

    // Combine bytecode and constructor args using solidityPacked
    const deploymentData = ethers.solidityPacked(
      ['bytes', 'bytes'],
      [BYTECODES.BURN_MINT_ERC20, constructorArgs],
    );

    // For create2, compute and log the expected contract address
    if (useCreate2) {
      // We can safely use salt and safeAddress here as we validated them upfront
      // TypeScript doesn't know that our validation ensures these are defined
      computeCreate2Address(safeAddress!, deploymentData, salt!);
    }

    // Encode the deployment transaction
    const data = useCreate2
      ? createCallInterface.encodeFunctionData('performCreate2', [
          0,
          deploymentData,
          salt as string,
        ])
      : createCallInterface.encodeFunctionData('performCreate', [0, deploymentData]);

    logger.info('Successfully generated token deployment transaction', {
      deployerAddress,
      useCreate2,
      salt: useCreate2 ? salt : undefined,
    });

    return {
      to: deployerAddress,
      value: '0',
      data,
      operation: SafeOperationType.DelegateCall,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate deployment transaction', {
        error: error.message,
        stack: error.stack,
      });
      throw new TokenDeploymentError(`Failed to generate deployment transaction: ${error.message}`);
    }
    // Handle unexpected non-Error objects
    logger.error('Unexpected error during deployment transaction generation', { error });
    throw new TokenDeploymentError(
      'An unexpected error occurred during deployment transaction generation',
    );
  }
}

/**
 * Creates a Safe Transaction Builder JSON for the token deployment
 * @param transaction - The Safe transaction data
 * @param params - The token deployment parameters
 * @param metadata - The Safe metadata
 * @returns The Safe Transaction Builder JSON
 */
export function createTokenDeploymentJSON(
  transaction: SafeTransactionDataBase,
  params: TokenDeploymentParams,
  metadata: SafeMetadata,
): SafeTransactionBuilderJSON {
  // Create CreateCall contract interface
  const createCallInterface = CreateCall__factory.createInterface();

  // Parse the function call to determine which method was used
  const functionFragment = createCallInterface.parseTransaction({ data: transaction.data });
  if (!functionFragment) {
    throw new TokenDeploymentError('Failed to parse transaction data');
  }

  // Parse function details
  const isCreate2 = functionFragment.name === 'performCreate2';
  const { value, deploymentData, salt } = {
    value: functionFragment.args[0],
    deploymentData: functionFragment.args[1],
    salt: isCreate2 ? functionFragment.args[2] : undefined,
  };

  // Get the function fragment from the ABI
  const methodFragment = createCallInterface.getFunction(
    isCreate2 ? 'performCreate2' : 'performCreate',
  );

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: 'BurnMintERC20 Token Deployment',
      description: `Deploy ${params.name} (${params.symbol}) token using ${isCreate2 ? 'create2' : 'create'}`,
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
          payable: !methodFragment.payable,
        },
        contractInputsValues: {
          value: value.toString(),
          deploymentData,
          ...(isCreate2 && { salt }),
        },
      },
    ],
  };
}

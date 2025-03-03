import { ethers } from 'ethers';
import { BYTECODES } from '../constants/bytecodes';
import { TokenDeploymentParams, tokenDeploymentParamsSchema } from '../types/tokenDeployment';
import {
  SafeOperationType,
  SafeTransactionDataBase,
  SafeTransactionBuilderJSON,
  SAFE_TX_BUILDER_VERSION,
  SafeMetadata,
} from '../types/safe';
import { TokenPoolFactory__factory, FactoryBurnMintERC20__factory } from '../typechain';
import { computeCreate2Address } from '../utils/addressComputer';
import logger from '../utils/logger';

export class TokenDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenDeploymentError';
  }
}

/**
 * Generates a deployment transaction for both token and pool using TokenPoolFactory
 * @param inputJson - The input JSON string containing deployment parameters
 * @param factoryAddress - The address of the TokenPoolFactory contract
 * @param salt - The salt to use for create2 deployment (required)
 * @param safeAddress - The address of the Safe that will execute the transaction
 * @returns The Safe transaction data
 */
export async function generateTokenAndPoolDeployment(
  inputJson: string,
  factoryAddress: string,
  salt: string,
  safeAddress: string,
): Promise<SafeTransactionDataBase> {
  if (!ethers.isAddress(factoryAddress)) {
    throw new TokenDeploymentError('Invalid factory address');
  }

  if (!ethers.isAddress(safeAddress)) {
    throw new TokenDeploymentError('Invalid Safe address');
  }

  if (!salt) {
    throw new TokenDeploymentError('Salt is required for deployment');
  }

  let parsedInput: TokenDeploymentParams;

  try {
    parsedInput = await tokenDeploymentParamsSchema.parseAsync(JSON.parse(inputJson));
    logger.info('Successfully validated token deployment input', {
      name: parsedInput.name,
      symbol: parsedInput.symbol,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to parse or validate input JSON', { error, inputJson });
      throw new TokenDeploymentError(`Invalid input format: ${error.message}`);
    }
    throw error;
  }

  try {
    // For now, we'll use an empty array for remoteTokenPools
    const remoteTokenPools = parsedInput.remoteTokenPools;

    // Get the factory interface
    const tokenInterface = FactoryBurnMintERC20__factory.createInterface();

    // Encode token constructor parameters using the factory interface
    const constructorArgs = tokenInterface.encodeDeploy([
      parsedInput.name,
      parsedInput.symbol,
      parsedInput.decimals,
      parsedInput.maxSupply,
      parsedInput.preMint,
      safeAddress,
    ]);

    // Combine bytecode and constructor args using solidityPacked
    const tokenInitCode = ethers.solidityPacked(
      ['bytes', 'bytes'],
      [BYTECODES.FACTORY_BURN_MINT_ERC20, constructorArgs],
    );

    // Get the factory interface
    const factoryInterface = TokenPoolFactory__factory.createInterface();

    // Get the appropriate pool bytecode based on pool type
    const tokenPoolInitCode = BYTECODES.BURN_MINT_TOKEN_POOL;

    // Compute deterministic addresses
    const tokenAddress = computeCreate2Address(factoryAddress, tokenInitCode, salt, safeAddress);

    logger.info('Computed Token deterministic addresses', {
      tokenAddress,
      salt,
    });

    // Encode the function call to deployTokenAndTokenPool
    const data = factoryInterface.encodeFunctionData('deployTokenAndTokenPool', [
      remoteTokenPools,
      parsedInput.decimals,
      tokenInitCode,
      tokenPoolInitCode,
      salt,
    ]);

    logger.info('Successfully generated token and pool deployment transaction');

    return {
      to: factoryAddress,
      value: '0',
      data,
      operation: SafeOperationType.Call,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate deployment transaction', { error });
      throw new TokenDeploymentError(`Failed to generate deployment transaction: ${error.message}`);
    }
    throw error;
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
  // Get the factory interface
  const factoryInterface = TokenPoolFactory__factory.createInterface();

  // Get the deployTokenAndTokenPool function fragment
  const methodFragment = factoryInterface.getFunction('deployTokenAndTokenPool');

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: `Token and Pool Factory Deployment - ${params.name}`,
      description: `Deploy ${params.name} (${params.symbol}) token and associated pool using factory`,
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
        contractInputsValues: null, // The data field already contains the encoded function call
      },
    ],
  };
}

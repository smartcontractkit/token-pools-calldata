import { ethers } from 'ethers';
import { BYTECODES } from '../constants/bytecodes';
import { TokenDeploymentParams, tokenDeploymentParamsSchema } from '../types/tokenDeployment';
import { SafeMetadata, SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import logger from '../utils/logger';

export class TokenDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenDeploymentError';
  }
}

/**
 * Generates the deployment transaction for a BurnMintERC20 token
 * @param inputJson - The input JSON string containing deployment parameters
 * @returns The Safe transaction data
 */
export async function generateTokenDeploymentTransaction(
  inputJson: string,
): Promise<SafeTransactionDataBase> {
  let parsedInput: TokenDeploymentParams;

  try {
    // Parse and validate the input JSON
    const rawInput = JSON.parse(inputJson) as unknown;
    parsedInput = await tokenDeploymentParamsSchema.parseAsync(rawInput);

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
    // Encode constructor parameters using ABI encoding
    const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'uint8', 'uint256', 'uint256'],
      [
        parsedInput.name,
        parsedInput.symbol,
        parsedInput.decimals,
        parsedInput.maxSupply,
        parsedInput.preMint,
      ],
    );

    // Combine bytecode and constructor args using solidityPacked
    const deploymentBytecode = ethers.solidityPacked(
      ['bytes', 'bytes'],
      [BYTECODES.BURN_MINT_ERC20, constructorArgs],
    );

    // Create Safe transaction
    const safeTransaction: SafeTransactionDataBase = {
      to: ethers.ZeroAddress, // Contract deployment
      value: '0',
      data: deploymentBytecode,
      operation: 0, // Call
    };

    logger.info('Successfully generated token deployment transaction', {
      bytecodeLength: deploymentBytecode.length,
    });

    return safeTransaction;
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
  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: 'BurnMintERC20 Token Deployment',
      description: `Deploy ${params.name} (${params.symbol}) token`,
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
          inputs: [
            { name: 'name', type: 'string', internalType: 'string' },
            { name: 'symbol', type: 'string', internalType: 'string' },
            { name: 'decimals', type: 'uint8', internalType: 'uint8' },
            { name: 'maxSupply', type: 'uint256', internalType: 'uint256' },
            { name: 'preMint', type: 'uint256', internalType: 'uint256' },
          ],
          name: 'constructor',
          payable: false,
        },
        contractInputsValues: {
          name: params.name,
          symbol: params.symbol,
          decimals: params.decimals.toString(),
          maxSupply: params.maxSupply,
          preMint: params.preMint,
        },
      },
    ],
  };
}

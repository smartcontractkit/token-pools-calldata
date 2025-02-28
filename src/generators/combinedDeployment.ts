import { ethers } from 'ethers';
import {
  PoolDeploymentParams,
  poolDeploymentParamsSchema,
  PoolType,
} from '../types/poolDeployment';
import { tokenDeploymentParamsSchema } from '../types/tokenDeployment';
import { SafeMetadata, SafeTransactionDataBase, SafeTransactionBuilderJSON } from '../types/safe';
import { CombinedDeploymentParams } from '../types/combinedDeployment';
import logger from '../utils/logger';
import { generateTokenDeploymentTransaction } from './tokenDeployment';
import { generatePoolDeploymentTransaction } from './poolDeployment';

export class CombinedDeploymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CombinedDeploymentError';
  }
}

// Raw input type for validation
interface RawCombinedDeploymentInput {
  token: {
    name: string;
    symbol: string;
    decimals: number;
    maxSupply: string;
    preMint: string;
  };
  pool: {
    poolType: PoolType;
    poolParams: {
      decimals: number;
      allowlist: string[];
      owner: string;
      ccipRouter: string;
      armProxy?: string;
    };
  };
}

/**
 * Generates a combined deployment transaction for token and pool
 * @param inputJson - The input JSON string containing deployment parameters
 * @param metadata - The Safe metadata
 * @returns The Safe transaction data array and computed token address
 */
export async function generateCombinedDeploymentTransactions(
  inputJson: string,
  metadata: SafeMetadata,
): Promise<{ transactions: SafeTransactionDataBase[]; computedTokenAddress: string }> {
  let parsedInput: CombinedDeploymentParams;

  try {
    // Parse and validate the input JSON
    const rawInput = JSON.parse(inputJson) as RawCombinedDeploymentInput;
    // Validate token deployment input
    const tokenInput = await tokenDeploymentParamsSchema.parseAsync(rawInput.token);
    // Create pool deployment input with computed token address
    const poolInput = {
      poolType: rawInput.pool.poolType,
      poolParams: {
        decimals: rawInput.pool.poolParams.decimals,
        allowlist: rawInput.pool.poolParams.allowlist,
        owner: rawInput.pool.poolParams.owner,
        ccipRouter: rawInput.pool.poolParams.ccipRouter,
        ...(rawInput.pool.poolParams.armProxy && {
          armProxy: rawInput.pool.poolParams.armProxy,
        }),
        token: '', // Will be computed
      },
    };
    await poolDeploymentParamsSchema.parseAsync(poolInput);

    parsedInput = {
      token: tokenInput,
      pool: {
        poolType: rawInput.pool.poolType,
        poolParams: {
          decimals: rawInput.pool.poolParams.decimals,
          allowlist: rawInput.pool.poolParams.allowlist,
          owner: rawInput.pool.poolParams.owner,
          ccipRouter: rawInput.pool.poolParams.ccipRouter,
          ...(rawInput.pool.poolParams.armProxy && {
            armProxy: rawInput.pool.poolParams.armProxy,
          }),
        },
      },
    };

    logger.info('Successfully validated combined deployment input', {
      tokenName: parsedInput.token.name,
      poolType: parsedInput.pool.poolType,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to parse or validate input JSON', { error, inputJson });
      throw new CombinedDeploymentError(`Invalid input format: ${error.message}`);
    }
    throw error;
  }

  try {
    // Generate token deployment transaction
    const tokenTransaction = await generateTokenDeploymentTransaction(
      JSON.stringify(parsedInput.token),
    );

    // Compute the token address that will be deployed
    const computedTokenAddress = ethers.getCreateAddress({
      from: metadata.safeAddress,
      nonce: 0, // Assuming this is the first transaction from the Safe
    });

    // Generate pool deployment transaction with computed token address
    const poolDeploymentInput: PoolDeploymentParams = {
      ...parsedInput.pool,
      poolParams: {
        ...parsedInput.pool.poolParams,
        token: computedTokenAddress,
      },
    };

    const poolTransaction = await generatePoolDeploymentTransaction(
      JSON.stringify(poolDeploymentInput),
    );

    logger.info('Successfully generated combined deployment transactions', {
      computedTokenAddress,
      transactionCount: 2,
    });

    return {
      transactions: [tokenTransaction, poolTransaction],
      computedTokenAddress,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate deployment transactions', { error });
      throw new CombinedDeploymentError(
        `Failed to generate deployment transactions: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Creates a Safe Transaction Builder JSON for the combined deployment
 * @param transactions - The Safe transaction data array
 * @param params - The combined deployment parameters
 * @param metadata - The Safe metadata
 * @param computedTokenAddress - The computed address where the token will be deployed
 * @returns The Safe Transaction Builder JSON
 */
export function createCombinedDeploymentJSON(
  transactions: SafeTransactionDataBase[],
  params: CombinedDeploymentParams,
  metadata: SafeMetadata,
  computedTokenAddress: string,
): SafeTransactionBuilderJSON {
  if (!transactions[0] || !transactions[1]) {
    throw new CombinedDeploymentError('Invalid transactions array');
  }

  return {
    version: '1.0',
    chainId: metadata.chainId,
    createdAt: Date.now(),
    meta: {
      name: 'Token and Pool Deployment',
      description: `Deploy ${params.token.name} token and ${params.pool.poolType}`,
      txBuilderVersion: '1.18.0',
      createdFromSafeAddress: metadata.safeAddress,
      createdFromOwnerAddress: metadata.ownerAddress,
    },
    transactions: [
      {
        to: transactions[0].to,
        value: transactions[0].value,
        data: transactions[0].data,
        operation: transactions[0].operation,
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
          name: params.token.name,
          symbol: params.token.symbol,
          decimals: params.token.decimals.toString(),
          maxSupply: params.token.maxSupply,
          preMint: params.token.preMint,
        },
      },
      {
        to: transactions[1].to,
        value: transactions[1].value,
        data: transactions[1].data,
        operation: transactions[1].operation,
        contractMethod: {
          inputs:
            params.pool.poolType === 'BurnMintTokenPool'
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
                ],
          name: 'constructor',
          payable: false,
        },
        contractInputsValues: {
          token: computedTokenAddress,
          decimals: params.pool.poolParams.decimals.toString(),
          allowlist: JSON.stringify(params.pool.poolParams.allowlist),
          owner: params.pool.poolParams.owner,
          ...(params.pool.poolType === 'LockReleaseTokenPool' && {
            acceptLiquidity: 'true',
          }),
          ccipRouter: params.pool.poolParams.ccipRouter,
        },
      },
    ],
  };
}

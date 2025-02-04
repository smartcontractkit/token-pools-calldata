import { ethers } from 'ethers';
import { TokenPool__factory, TokenPool } from '../typechain';
import { ChainUpdateInput, ChainUpdatesInput, chainUpdatesInputSchema } from '../types/chainUpdate';
import logger from '../utils/logger';

export class ChainUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainUpdateError';
  }
}

/**
 * Converts a validated chain update input to the contract-ready format
 */
function convertToContractFormat(chainUpdate: ChainUpdateInput): TokenPool.ChainUpdateStruct {
  const abiCoder = new ethers.AbiCoder();

  try {
    return {
      remoteChainSelector: chainUpdate.remoteChainSelector.toString(),
      remotePoolAddresses: chainUpdate.remotePoolAddresses.map((address) =>
        abiCoder.encode(['address'], [address]),
      ),
      remoteTokenAddress: abiCoder.encode(['address'], [chainUpdate.remoteTokenAddress]),
      outboundRateLimiterConfig: {
        isEnabled: chainUpdate.outboundRateLimiterConfig.isEnabled,
        capacity: chainUpdate.outboundRateLimiterConfig.capacity.toString(),
        rate: chainUpdate.outboundRateLimiterConfig.rate.toString(),
      },
      inboundRateLimiterConfig: {
        isEnabled: chainUpdate.inboundRateLimiterConfig.isEnabled,
        capacity: chainUpdate.inboundRateLimiterConfig.capacity.toString(),
        rate: chainUpdate.inboundRateLimiterConfig.rate.toString(),
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
 * Generates calldata for the applyChainUpdates function
 * @param inputJson - The input JSON string containing chain updates
 * @returns The encoded function calldata
 */
export async function generateChainUpdateCalldata(inputJson: string): Promise<string> {
  let parsedInput: ChainUpdatesInput;

  try {
    // Parse and validate the input JSON
    const rawInput = JSON.parse(inputJson);
    parsedInput = await chainUpdatesInputSchema.parseAsync(rawInput);

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
    const calldata = poolInterface.encodeFunctionData('applyChainUpdates', [
      chainSelectorsToRemove,
      chainsToAdd.map(convertToContractFormat),
    ]);

    logger.info('Successfully generated chain update calldata', {
      calldataLength: calldata.length,
    });

    return calldata;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate calldata', { error });
      throw new ChainUpdateError(`Failed to generate calldata: ${error.message}`);
    }
    throw error;
  }
}

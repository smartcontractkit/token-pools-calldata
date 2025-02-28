#!/usr/bin/env node
import { Command, Option } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';
import { ethers } from 'ethers';
import {
  generateChainUpdateCalldata,
  createSafeTransactionJSON,
} from './generators/chainUpdateCalldata';
import logger from './utils/logger';
import {
  generateTokenAndPoolDeployment,
  createTokenDeploymentJSON,
} from './generators/tokenDeployment';
import {
  generatePoolDeploymentTransaction,
  createPoolDeploymentJSON,
} from './generators/poolDeployment';
import { TokenDeploymentParams } from './types/tokenDeployment';
import { PoolDeploymentParams } from './types/poolDeployment';
import { SafeMetadata } from './types/safe';

/**
 * Base options interface for all commands
 */
interface BaseOptions {
  input: string;
  output?: string;
  format?: 'calldata' | 'safe-json';
  safe?: string;
  owner?: string;
  chainId?: string;
}

/**
 * Options for chain update command
 */
interface ChainUpdateOptions extends BaseOptions {
  tokenPool?: string;
}

/**
 * Options for deployment commands
 */
interface DeploymentOptions extends BaseOptions {
  deployer: string; // CreateCall contract address
  tokenAddress?: string; // Token address (required for pool deployment)
  salt?: string; // Salt for create2
}

function createProgram(): Command {
  return new Command()
    .name('token-pools-calldata')
    .description('Generate calldata for TokenPool contract interactions')
    .version('1.0.0');
}

// Function to format JSON consistently using project's prettier config
async function formatJSON(obj: unknown): Promise<string> {
  const config = await prettier.resolveConfig(process.cwd());
  return prettier.format(JSON.stringify(obj), {
    ...config,
    parser: 'json',
  });
}

async function handleChainUpdate(options: ChainUpdateOptions): Promise<void> {
  try {
    // Validate Ethereum addresses if provided
    if (options.safe && !ethers.isAddress(options.safe)) {
      throw new Error(`Invalid Safe address: ${String(options.safe)}`);
    }
    if (options.owner && !ethers.isAddress(options.owner)) {
      throw new Error(`Invalid owner address: ${String(options.owner)}`);
    }
    if (options.tokenPool && !ethers.isAddress(options.tokenPool)) {
      throw new Error(`Invalid Token Pool address: ${String(options.tokenPool)}`);
    }

    const inputPath = path.resolve(options.input);
    const inputJson = await fs.readFile(inputPath, 'utf-8');
    const calldata = await generateChainUpdateCalldata(inputJson);

    // If format is safe-json, generate Safe Transaction Builder JSON
    if (options.format === 'safe-json') {
      if (!options.chainId) {
        throw new Error('chainId is required for Safe Transaction Builder JSON format');
      }

      const safeJson = createSafeTransactionJSON(
        options.chainId,
        options.safe || '--SAFE--', // Use placeholder if not provided
        options.owner || '--OWNER--', // Use placeholder if not provided
        calldata,
        options.tokenPool || '0xYOUR_POOL_ADDRESS', // Use placeholder if not provided
      );

      const formattedJson = await formatJSON(safeJson);

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, formattedJson);
        logger.info('Successfully wrote Safe Transaction Builder JSON to file', { outputPath });
      } else {
        console.log(formattedJson);
      }
    } else {
      // Default format: just output the calldata
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, calldata + '\n');
        logger.info('Successfully wrote calldata to file', { outputPath });
      } else {
        console.log(calldata);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate chain update calldata', {
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Failed to generate chain update calldata', {
        error: 'Unknown error',
      });
    }
    process.exit(1);
  }
}

async function handleTokenDeployment(options: DeploymentOptions): Promise<void> {
  try {
    // Validate Ethereum addresses if provided
    if (options.safe && !ethers.isAddress(options.safe)) {
      throw new Error(`Invalid Safe address: ${String(options.safe)}`);
    }
    if (options.owner && !ethers.isAddress(options.owner)) {
      throw new Error(`Invalid owner address: ${String(options.owner)}`);
    }
    if (!ethers.isAddress(options.deployer)) {
      throw new Error(`Invalid deployer address: ${String(options.deployer)}`);
    }

    const inputPath = path.resolve(options.input);
    const inputJson = await fs.readFile(inputPath, 'utf-8');
    const transaction = await generateTokenAndPoolDeployment(
      inputJson,
      options.deployer,
      options.salt || '',
    );

    // Parse input JSON for Safe JSON format
    const parsedInput = JSON.parse(inputJson) as TokenDeploymentParams;

    if (options.format === 'safe-json') {
      if (!options.chainId || !options.safe || !options.owner) {
        throw new Error(
          'chainId, safe, and owner are required for Safe Transaction Builder JSON format',
        );
      }

      const metadata: SafeMetadata = {
        chainId: options.chainId,
        safeAddress: options.safe,
        ownerAddress: options.owner,
      };

      const safeJson = createTokenDeploymentJSON(transaction, parsedInput, metadata);
      const formattedJson = await formatJSON(safeJson);

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, formattedJson);
        logger.info('Successfully wrote Safe Transaction Builder JSON to file', { outputPath });
      } else {
        console.log(formattedJson);
      }
    } else {
      // Default format: just output the transaction data
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, transaction.data + '\n');
        logger.info('Successfully wrote transaction data to file', { outputPath });
      } else {
        console.log(transaction.data);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate token deployment', {
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Failed to generate token deployment', { error: 'Unknown error' });
    }
    process.exit(1);
  }
}

async function handlePoolDeployment(options: DeploymentOptions): Promise<void> {
  try {
    // Validate Ethereum addresses if provided
    if (options.safe && !ethers.isAddress(options.safe)) {
      throw new Error(`Invalid Safe address: ${String(options.safe)}`);
    }
    if (options.owner && !ethers.isAddress(options.owner)) {
      throw new Error(`Invalid owner address: ${String(options.owner)}`);
    }
    if (!ethers.isAddress(options.deployer)) {
      throw new Error(`Invalid deployer address: ${String(options.deployer)}`);
    }

    const inputPath = path.resolve(options.input);
    const inputJson = await fs.readFile(inputPath, 'utf-8');
    const transaction = await generatePoolDeploymentTransaction(
      inputJson,
      options.deployer,
      options.tokenAddress || '', // This should be required for pool deployment
      options.salt || '',
    );

    // Parse input JSON for Safe JSON format
    const parsedInput = JSON.parse(inputJson) as PoolDeploymentParams;

    if (options.format === 'safe-json') {
      if (!options.chainId || !options.safe || !options.owner) {
        throw new Error(
          'chainId, safe, and owner are required for Safe Transaction Builder JSON format',
        );
      }

      const metadata: SafeMetadata = {
        chainId: options.chainId,
        safeAddress: options.safe,
        ownerAddress: options.owner,
      };

      const safeJson = createPoolDeploymentJSON(transaction, parsedInput, metadata);
      const formattedJson = await formatJSON(safeJson);

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, formattedJson);
        logger.info('Successfully wrote Safe Transaction Builder JSON to file', { outputPath });
      } else {
        console.log(formattedJson);
      }
    } else {
      // Default format: just output the transaction data
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, transaction.data + '\n');
        logger.info('Successfully wrote transaction data to file', { outputPath });
      } else {
        console.log(transaction.data);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate pool deployment', {
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Failed to generate pool deployment', { error: 'Unknown error' });
    }
    process.exit(1);
  }
}

// Initialize the program
const program = createProgram();

// Add commands
program
  .command('generate-chain-update')
  .description('Generate calldata for applyChainUpdates function')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices(['calldata', 'safe-json'])
      .default('calldata'),
  )
  .option('-s, --safe <address>', 'Safe address (for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (for safe-json format)')
  .option(
    '-p, --token-pool <address>',
    'Token Pool contract address (optional, defaults to placeholder)',
  )
  .action(handleChainUpdate);

program
  .command('generate-token-deployment')
  .description('Generate deployment transaction for BurnMintERC20 token')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .requiredOption('-d, --deployer <address>', 'CreateCall contract address')
  .requiredOption('--salt <bytes32>', 'Salt for create2')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices(['calldata', 'safe-json'])
      .default('calldata'),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(handleTokenDeployment);

program
  .command('generate-pool-deployment')
  .description('Generate deployment transaction for TokenPool')
  .requiredOption('-i, --input <path>', 'Path to input JSON file')
  .requiredOption('-d, --deployer <address>', 'CreateCall contract address')
  .requiredOption('-t, --token-address <address>', 'Token address')
  .requiredOption('--salt <bytes32>', 'Salt for create2')
  .option('-o, --output <path>', 'Path to output file (defaults to stdout)')
  .addOption(
    new Option('-f, --format <type>', 'Output format')
      .choices(['calldata', 'safe-json'])
      .default('calldata'),
  )
  .option('-s, --safe <address>', 'Safe address (required for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (required for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (required for safe-json format)')
  .action(handlePoolDeployment);

// Parse command line arguments
void program.parse(process.argv);

#!/usr/bin/env node
import { Command, Option } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import {
  generateChainUpdateCalldata,
  createSafeTransactionJSON,
} from './generators/chainUpdateCalldata';
import logger from './utils/logger';

interface ChainUpdateOptions {
  input: string;
  output?: string;
  safe?: string;
  owner?: string;
  chainId?: string;
  format?: 'calldata' | 'safe-json';
  tokenPool?: string;
}

function createProgram(): Command {
  return new Command()
    .name('token-pools-calldata')
    .description('Generate calldata for TokenPool contract interactions')
    .version('1.0.0');
}

async function handleChainUpdate(options: ChainUpdateOptions): Promise<void> {
  try {
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

      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, JSON.stringify(safeJson, null, 2));
        logger.info('Successfully wrote Safe Transaction Builder JSON to file', { outputPath });
      } else {
        console.log(JSON.stringify(safeJson, null, 2));
      }
    } else {
      // Default format: just output the calldata
      if (options.output) {
        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, calldata);
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
      .default('calldata')
  )
  .option('-s, --safe <address>', 'Safe address (for safe-json format)')
  .option('-w, --owner <address>', 'Owner address (for safe-json format)')
  .option('-c, --chain-id <id>', 'Chain ID (for safe-json format)')
  .option('-p, --token-pool <address>', 'Token Pool contract address (optional, defaults to placeholder)')
  .action(handleChainUpdate);

// Parse command line arguments
void program.parse(process.argv);

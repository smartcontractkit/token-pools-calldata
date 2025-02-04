#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { generateChainUpdateCalldata } from './generators/chainUpdateCalldata';
import logger from './utils/logger';

interface ChainUpdateOptions {
  input: string;
  output?: string;
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

    if (options.output) {
      const outputPath = path.resolve(options.output);
      await fs.writeFile(outputPath, calldata);
      logger.info('Successfully wrote calldata to file', { outputPath });
    } else {
      console.log(calldata);
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
  .action(handleChainUpdate);

// Parse command line arguments
void program.parse(process.argv);

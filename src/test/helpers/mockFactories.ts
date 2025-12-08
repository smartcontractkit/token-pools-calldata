/**
 * Mock factories for testing
 * Provides lightweight test doubles for all interfaces
 */

import { ILogger, IInterfaceProvider, IAddressComputer } from '../../interfaces';
import { Interface } from 'ethers';

/**
 * Creates a mock logger that silently discards all log messages
 * Use for tests where logging output is not relevant
 */
export function createMockLogger(): ILogger {
  const noop = (): void => {};
  return {
    error: noop,
    warn: noop,
    info: noop,
    debug: noop,
  };
}

/**
 * Type for metadata that can be passed to logger
 */
type LogMetadata = Record<string, unknown> | undefined;

/**
 * Type for captured log calls
 */
type LogCall = [string, LogMetadata];

/**
 * Spy logger type with calls tracking
 */
type SpyLogger = ILogger & {
  calls: {
    error: LogCall[];
    warn: LogCall[];
    info: LogCall[];
    debug: LogCall[];
  };
};

/**
 * Creates a spy logger that captures log calls for assertions
 * Use when you need to verify logging behavior
 */
export function createSpyLogger(): SpyLogger {
  const calls = {
    error: [] as LogCall[],
    warn: [] as LogCall[],
    info: [] as LogCall[],
    debug: [] as LogCall[],
  };

  const spyLogger: SpyLogger = {
    error: (msg: string, meta?: LogMetadata): void => {
      calls.error.push([msg, meta]);
    },
    warn: (msg: string, meta?: LogMetadata): void => {
      calls.warn.push([msg, meta]);
    },
    info: (msg: string, meta?: LogMetadata): void => {
      calls.info.push([msg, meta]);
    },
    debug: (msg: string, meta?: LogMetadata): void => {
      calls.debug.push([msg, meta]);
    },
    calls,
  };

  return spyLogger;
}

/**
 * Creates a mock interface provider for testing
 * Returns real ethers Interface objects for the specified contracts
 */
export function createMockInterfaceProvider(interfaces: {
  TokenPool?: Interface;
  TokenPoolFactory?: Interface;
  BurnMintERC20?: Interface;
}): IInterfaceProvider {
  return {
    getTokenPoolInterface(): Interface {
      if (!interfaces.TokenPool) {
        throw new Error('No mock interface provided for TokenPool');
      }
      return interfaces.TokenPool;
    },
    getTokenPoolFactoryInterface(): Interface {
      if (!interfaces.TokenPoolFactory) {
        throw new Error('No mock interface provided for TokenPoolFactory');
      }
      return interfaces.TokenPoolFactory;
    },
    getFactoryBurnMintERC20Interface(): Interface {
      if (!interfaces.BurnMintERC20) {
        throw new Error('No mock interface provided for BurnMintERC20');
      }
      return interfaces.BurnMintERC20;
    },
  };
}

/**
 * Creates a mock address computer for testing
 * @param predictedAddress - The address to return from computeCreate2Address
 */
export function createMockAddressComputer(predictedAddress: string): IAddressComputer {
  return {
    computeCreate2Address(): string {
      return predictedAddress;
    },
  };
}

import { ethers } from 'ethers';
import logger from './logger';

/**
 * Computes and logs the expected contract address for create2 deployment
 * @param safeAddress - The address of the Safe that will deploy the contract
 * @param deploymentData - The deployment bytecode including constructor args
 * @param salt - The salt for create2
 * @returns The computed contract address
 */
export function computeCreate2Address(
  safeAddress: string,
  deploymentData: string,
  salt: string,
): string {
  const computedAddress = ethers.getCreate2Address(
    safeAddress,
    salt,
    ethers.keccak256(deploymentData),
  );

  logger.info('Computed expected create2 contract address', {
    safeAddress,
    salt,
    computedAddress,
  });

  return computedAddress;
}

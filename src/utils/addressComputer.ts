import { ethers } from 'ethers';
import logger from './logger';

/**
 * Computes the modified salt by hashing the original salt with the sender's address
 * Matches the TokenPoolFactory's salt modification: keccak256(abi.encodePacked(salt, msg.sender))
 * @param salt - The original salt
 * @param sender - The address of the sender
 * @returns The modified salt as bytes32
 */
export function computeModifiedSalt(salt: string, sender: string): string {
  if (!ethers.isAddress(sender)) {
    throw new Error('Invalid sender address');
  }
  return ethers.keccak256(ethers.solidityPacked(['bytes32', 'address'], [salt, sender]));
}

/**
 * Computes the deterministic address for a contract deployed using CREATE2
 * Uses ethers.getCreate2Address
 * @param deployer - The address of the contract deploying the new contract (TokenPoolFactory)
 * @param bytecode - The deployment bytecode including constructor args
 * @param salt - The original salt (will be modified with sender's address)
 * @param sender - The address of the sender who will deploy the contract
 * @returns The computed contract address
 */
export function computeCreate2Address(
  deployer: string,
  bytecode: string,
  salt: string,
  sender: string,
): string {
  // Validate inputs
  if (!ethers.isAddress(deployer)) {
    throw new Error('Invalid deployer address');
  }

  if (!ethers.isAddress(sender)) {
    throw new Error('Invalid sender address');
  }

  // Modify the salt as done in the TokenPoolFactory
  const modifiedSalt = computeModifiedSalt(salt, sender);

  // Compute the init code hash
  const initCodeHash = ethers.keccak256(bytecode);

  // Use ethers.getCreate2Address to compute the deterministic address
  const predictedAddress = ethers.getCreate2Address(deployer, modifiedSalt, initCodeHash);

  logger.info('Computed CREATE2 address', {
    deployer,
    originalSalt: salt,
    modifiedSalt,
    sender,
    initCodeHash,
    predictedAddress,
  });

  return predictedAddress;
}

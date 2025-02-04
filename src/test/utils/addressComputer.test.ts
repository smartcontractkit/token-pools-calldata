/**
 * Tests for addressComputer utility
 * Covers CREATE2 address computation and salt modification
 */

import { ethers } from 'ethers';
import { computeModifiedSalt, createAddressComputer } from '../../utils/addressComputer';
import { createMockLogger, createSpyLogger } from '../helpers';

describe('computeModifiedSalt', () => {
  const validSalt = '0x0000000000000000000000000000000000000000000000000000000000000001';
  const validSender = '0x5419c6d83473d1c653e7b51e8568fafedce94f01';

  it('should compute modified salt correctly', () => {
    const result = computeModifiedSalt(validSalt, validSender);

    // Result should be a valid bytes32 hex string
    expect(result).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.length).toBe(66); // 0x + 64 hex chars
  });

  it('should produce different results for different salts', () => {
    const salt1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
    const salt2 = '0x0000000000000000000000000000000000000000000000000000000000000002';

    const result1 = computeModifiedSalt(salt1, validSender);
    const result2 = computeModifiedSalt(salt2, validSender);

    expect(result1).not.toBe(result2);
  });

  it('should produce different results for different senders', () => {
    const sender1 = '0x5419c6d83473d1c653e7b51e8568fafedce94f01';
    const sender2 = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

    const result1 = computeModifiedSalt(validSalt, sender1);
    const result2 = computeModifiedSalt(validSalt, sender2);

    expect(result1).not.toBe(result2);
  });

  it('should be deterministic for same inputs', () => {
    const result1 = computeModifiedSalt(validSalt, validSender);
    const result2 = computeModifiedSalt(validSalt, validSender);

    expect(result1).toBe(result2);
  });

  it('should throw error for invalid sender address', () => {
    expect(() => {
      computeModifiedSalt(validSalt, 'invalid-address');
    }).toThrow('Invalid sender address');
  });

  it('should throw error for malformed sender address', () => {
    expect(() => {
      computeModifiedSalt(validSalt, '0xinvalid');
    }).toThrow('Invalid sender address');
  });

  it('should handle zero address as sender', () => {
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const result = computeModifiedSalt(validSalt, zeroAddress);

    expect(result).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should handle zero salt', () => {
    const zeroSalt = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const result = computeModifiedSalt(zeroSalt, validSender);

    expect(result).toMatch(/^0x[a-f0-9]{64}$/i);
  });

  it('should match ethers.js solidityPacked behavior', () => {
    // Verify the computation matches ethers.js solidityPacked + keccak256
    const expected = ethers.keccak256(
      ethers.solidityPacked(['bytes32', 'address'], [validSalt, validSender]),
    );
    const result = computeModifiedSalt(validSalt, validSender);

    expect(result).toBe(expected);
  });
});

describe('createAddressComputer', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let addressComputer: ReturnType<typeof createAddressComputer>;

  // Known CREATE2 deployment values for testing
  const DEPLOYER = '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e';
  const SENDER = '0x5419c6d83473d1c653e7b51e8568fafedce94f01';
  const SALT = '0x0000000000000000000000000000000000000000000000000000000000000001';
  // Minimal valid EVM bytecode (just a STOP opcode)
  const BYTECODE = '0x00';

  beforeEach(() => {
    mockLogger = createMockLogger();
    addressComputer = createAddressComputer(mockLogger);
  });

  describe('computeCreate2Address', () => {
    it('should compute CREATE2 address correctly', () => {
      const result = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, SENDER);

      // Result should be a valid Ethereum address
      expect(ethers.isAddress(result)).toBe(true);
      expect(result).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should be deterministic for same inputs', () => {
      const result1 = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, SENDER);
      const result2 = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, SENDER);

      expect(result1).toBe(result2);
    });

    it('should produce different addresses for different deployers', () => {
      const deployer1 = '0x17d8a409fe2cef2d3808bcb61f14abeffc28876e';
      const deployer2 = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

      const result1 = addressComputer.computeCreate2Address(deployer1, BYTECODE, SALT, SENDER);
      const result2 = addressComputer.computeCreate2Address(deployer2, BYTECODE, SALT, SENDER);

      expect(result1).not.toBe(result2);
    });

    it('should produce different addresses for different bytecodes', () => {
      const bytecode1 = '0x00';
      const bytecode2 = '0x60806040';

      const result1 = addressComputer.computeCreate2Address(DEPLOYER, bytecode1, SALT, SENDER);
      const result2 = addressComputer.computeCreate2Address(DEPLOYER, bytecode2, SALT, SENDER);

      expect(result1).not.toBe(result2);
    });

    it('should produce different addresses for different salts', () => {
      const salt1 = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const salt2 = '0x0000000000000000000000000000000000000000000000000000000000000002';

      const result1 = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, salt1, SENDER);
      const result2 = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, salt2, SENDER);

      expect(result1).not.toBe(result2);
    });

    it('should produce different addresses for different senders', () => {
      const sender1 = '0x5419c6d83473d1c653e7b51e8568fafedce94f01';
      const sender2 = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

      const result1 = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, sender1);
      const result2 = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, sender2);

      expect(result1).not.toBe(result2);
    });

    it('should throw error for invalid deployer address', () => {
      expect(() => {
        addressComputer.computeCreate2Address('invalid-address', BYTECODE, SALT, SENDER);
      }).toThrow('Invalid deployer address');
    });

    it('should throw error for invalid sender address', () => {
      expect(() => {
        addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, 'invalid-address');
      }).toThrow('Invalid sender address');
    });

    it('should handle zero address as deployer', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const result = addressComputer.computeCreate2Address(zeroAddress, BYTECODE, SALT, SENDER);

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should handle zero address as sender', () => {
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const result = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, zeroAddress);

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should handle empty bytecode', () => {
      const result = addressComputer.computeCreate2Address(DEPLOYER, '0x', SALT, SENDER);

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should handle large bytecode', () => {
      // Simulate a large contract bytecode (1KB)
      const largeBytecode = '0x' + '60'.repeat(1024);
      const result = addressComputer.computeCreate2Address(DEPLOYER, largeBytecode, SALT, SENDER);

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should log address computation details', () => {
      const spyLogger = createSpyLogger();
      const spyAddressComputer = createAddressComputer(spyLogger);

      spyAddressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, SENDER);

      // Verify logger.info was called with correct structure
      expect(spyLogger.calls.info).toHaveLength(1);
      expect(spyLogger.calls.info[0]?.[0]).toBe('Computed CREATE2 address');
      const logMeta = spyLogger.calls.info[0]?.[1] as
        | {
            deployer: string;
            originalSalt: string;
            sender: string;
            modifiedSalt: string;
            initCodeHash: string;
            predictedAddress: string;
          }
        | undefined;

      expect(logMeta).toBeDefined();
      expect(logMeta).toMatchObject({
        deployer: DEPLOYER,
        originalSalt: SALT,
        sender: SENDER,
      });

      if (logMeta) {
        expect(logMeta.modifiedSalt).toMatch(/^0x[a-f0-9]{64}$/i);
        expect(logMeta.initCodeHash).toMatch(/^0x[a-f0-9]{64}$/i);
        expect(logMeta.predictedAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it('should match ethers.js getCreate2Address with modified salt', () => {
      const modifiedSalt = computeModifiedSalt(SALT, SENDER);
      const initCodeHash = ethers.keccak256(BYTECODE);
      const expected = ethers.getCreate2Address(DEPLOYER, modifiedSalt, initCodeHash);

      const result = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, SALT, SENDER);

      expect(result).toBe(expected);
    });

    it('should handle checksummed addresses', () => {
      // Test with checksummed addresses
      const checksummedDeployer = ethers.getAddress(DEPLOYER);
      const checksummedSender = ethers.getAddress(SENDER);

      const result = addressComputer.computeCreate2Address(
        checksummedDeployer,
        BYTECODE,
        SALT,
        checksummedSender,
      );

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should handle lowercase addresses', () => {
      const lowercaseDeployer = DEPLOYER.toLowerCase();
      const lowercaseSender = SENDER.toLowerCase();

      const result = addressComputer.computeCreate2Address(
        lowercaseDeployer,
        BYTECODE,
        SALT,
        lowercaseSender,
      );

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should produce same result regardless of address casing', () => {
      const checksummedResult = addressComputer.computeCreate2Address(
        ethers.getAddress(DEPLOYER),
        BYTECODE,
        SALT,
        ethers.getAddress(SENDER),
      );

      const lowercaseResult = addressComputer.computeCreate2Address(
        DEPLOYER.toLowerCase(),
        BYTECODE,
        SALT,
        SENDER.toLowerCase(),
      );

      expect(checksummedResult.toLowerCase()).toBe(lowercaseResult.toLowerCase());
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum uint256 salt value', () => {
      const maxSalt = '0x' + 'f'.repeat(64);
      const result = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, maxSalt, SENDER);

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should handle bytecode with constructor arguments', () => {
      // Typical pattern: bytecode + encoded constructor args
      const bytecodeWithArgs =
        '0x60806040' + // Contract bytecode
        '0000000000000000000000000000000000000000000000000000000000000020' + // Constructor arg
        '000000000000000000000000000000000000000000000000000000000000000a'; // Constructor arg

      const result = addressComputer.computeCreate2Address(
        DEPLOYER,
        bytecodeWithArgs,
        SALT,
        SENDER,
      );

      expect(ethers.isAddress(result)).toBe(true);
    });

    it('should handle sequential salt values', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);
        const result = addressComputer.computeCreate2Address(DEPLOYER, BYTECODE, salt, SENDER);
        results.push(result);
      }

      // All addresses should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);
    });
  });
});

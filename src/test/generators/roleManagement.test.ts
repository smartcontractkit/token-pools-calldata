/**
 * Tests for roleManagement generator
 * Covers granting and revoking mint/burn roles
 */

import { createRoleManagementGenerator } from '../../generators/roleManagement';
import { SafeOperationType } from '../../types/safe';
import {
  createMockLogger,
  createMockInterfaceProvider,
  VALID_ADDRESSES,
  VALID_ROLE_PARAMS,
  expectValidTransaction,
  expectValidCalldata,
  expectValidTransactionArray,
} from '../helpers';
import { FactoryBurnMintERC20__factory } from '../../typechain';

describe('RoleManagementGenerator', () => {
  let generator: ReturnType<typeof createRoleManagementGenerator>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockInterfaceProvider: ReturnType<typeof createMockInterfaceProvider>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    const tokenInterface = FactoryBurnMintERC20__factory.createInterface();
    mockInterfaceProvider = createMockInterfaceProvider({
      BurnMintERC20: tokenInterface,
    });

    generator = createRoleManagementGenerator(mockLogger, mockInterfaceProvider);
  });

  describe('Grant Roles', () => {
    it('should generate transaction for granting both mint and burn roles', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'both',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expectValidTransactionArray(result.transactions);
      expect(result.functionNames[0]).toBe('grantMintAndBurnRoles');

      const tx = result.transactions[0]!;
      expect(tx.to).toBe(VALID_ADDRESSES.token);
      expect(tx.value).toBe('0');
      expectValidCalldata(tx.data);
      expect(tx.operation).toBe(SafeOperationType.Call);
    });

    it('should generate transaction for granting only mint role', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expectValidTransaction(result.transactions[0]!);
      expect(result.transactions[0]!.to).toBe(VALID_ADDRESSES.token);
      expectValidCalldata(result.transactions[0]!.data);
    });

    it('should generate transaction for granting only burn role', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'burn',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expectValidTransaction(result.transactions[0]!);
      expect(result.transactions[0]!.to).toBe(VALID_ADDRESSES.token);
      expectValidCalldata(result.transactions[0]!.data);
    });

    it('should generate different calldata for mint vs burn roles', async () => {
      const inputJsonMint = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
      });

      const inputJsonBurn = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'burn',
      });

      const resultMint = await generator.generate(inputJsonMint, VALID_ADDRESSES.token);
      const resultBurn = await generator.generate(inputJsonBurn, VALID_ADDRESSES.token);

      expect(resultMint.transactions[0]!.data).not.toBe(resultBurn.transactions[0]!.data);
    });

    it('should handle different pool addresses', async () => {
      const inputJson1 = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'both',
      });

      const inputJson2 = JSON.stringify({
        pool: VALID_ADDRESSES.receiver,
        roleType: 'both',
      });

      const result1 = await generator.generate(inputJson1, VALID_ADDRESSES.token);
      const result2 = await generator.generate(inputJson2, VALID_ADDRESSES.token);

      expect(result1.transactions).toHaveLength(1);
      expect(result2.transactions).toHaveLength(1);
      expect(result1.transactions[0]!.data).not.toBe(result2.transactions[0]!.data);
    });
  });

  describe('Revoke Roles', () => {
    it('should generate transactions for revoking both mint and burn roles', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'both',
        action: 'revoke',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(2);
      expectValidTransactionArray(result.transactions);
    });

    it('should generate transaction for revoking only mint role', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
        action: 'revoke',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expectValidTransaction(result.transactions[0]!);
    });

    it('should generate transaction for revoking only burn role', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'burn',
        action: 'revoke',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expectValidTransaction(result.transactions[0]!);
    });

    it('should generate different calldata for grant vs revoke', async () => {
      const inputJsonGrant = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
        action: 'grant',
      });

      const inputJsonRevoke = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
        action: 'revoke',
      });

      const resultGrant = await generator.generate(inputJsonGrant, VALID_ADDRESSES.token);
      const resultRevoke = await generator.generate(inputJsonRevoke, VALID_ADDRESSES.token);

      expect(resultGrant.transactions[0]!.data).not.toBe(resultRevoke.transactions[0]!.data);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', async () => {
      await expect(generator.generate('invalid json', VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for invalid token address', async () => {
      const inputJson = JSON.stringify(VALID_ROLE_PARAMS);

      await expect(generator.generate(inputJson, 'invalid-address')).rejects.toThrow();
    });

    it('should throw error for invalid pool address', async () => {
      const inputJson = JSON.stringify({
        pool: 'invalid-address',
        roleType: 'both',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should throw error for missing pool address', async () => {
      const inputJson = JSON.stringify({
        roleType: 'both',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });

    it('should use default role type "both" when not specified', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expect(result.functionNames[0]).toBe('grantMintAndBurnRoles');
    });

    it('should throw error for invalid role type', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'invalid-role',
      });

      await expect(generator.generate(inputJson, VALID_ADDRESSES.token)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle granting roles to zero address', async () => {
      const inputJson = JSON.stringify({
        pool: '0x0000000000000000000000000000000000000000',
        roleType: 'both',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expect(result.transactions).toHaveLength(1);
      expectValidTransactionArray(result.transactions);
      expect(result.functionNames[0]).toBe('grantMintAndBurnRoles');
    });

    it('should handle different token addresses', async () => {
      const inputJson = JSON.stringify(VALID_ROLE_PARAMS);

      const result1 = await generator.generate(inputJson, VALID_ADDRESSES.token);
      const result2 = await generator.generate(inputJson, VALID_ADDRESSES.pool);

      expect(result1.transactions[0]!.to).toBe(VALID_ADDRESSES.token);
      expect(result2.transactions[0]!.to).toBe(VALID_ADDRESSES.pool);
    });

    it('should default to grant when action is not specified', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result.transactions[0]!);
    });

    it('should handle action: "grant" explicitly', async () => {
      const inputJson = JSON.stringify({
        pool: VALID_ADDRESSES.pool,
        roleType: 'mint',
        action: 'grant',
      });

      const result = await generator.generate(inputJson, VALID_ADDRESSES.token);

      expectValidTransaction(result.transactions[0]!);
    });
  });
});

/**
 * Test helper utilities
 * Common utility functions for testing
 */

import { SafeTransactionDataBase } from '../../types/safe';

/**
 * Validates that a transaction has the expected base structure
 */
export function expectValidTransaction(tx: SafeTransactionDataBase): void {
  expect(tx).toHaveProperty('to');
  expect(tx).toHaveProperty('value');
  expect(tx).toHaveProperty('data');
  expect(tx).toHaveProperty('operation');
  expect(typeof tx.to).toBe('string');
  expect(typeof tx.value).toBe('string');
  expect(typeof tx.data).toBe('string');
  expect(typeof tx.operation).toBe('number');
}

/**
 * Validates that calldata is properly formatted hex string
 */
export function expectValidCalldata(data: string): void {
  expect(data).toMatch(/^0x[a-fA-F0-9]+$/);
  expect(data.length).toBeGreaterThan(10); // At least function selector + some data
}

/**
 * Validates that an address is a valid Ethereum address
 */
export function expectValidAddress(address: string): void {
  expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
}

/**
 * Type guard to check if value has the required Safe JSON structure
 */
function isSafeJsonLike(value: unknown): value is {
  version: unknown;
  chainId: unknown;
  meta: unknown;
  transactions: unknown;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    'chainId' in value &&
    'meta' in value &&
    'transactions' in value
  );
}

/**
 * Validates that Safe JSON has the required structure
 */
export function expectValidSafeJson(json: unknown): void {
  expect(json).toHaveProperty('version');
  expect(json).toHaveProperty('chainId');
  expect(json).toHaveProperty('meta');
  expect(json).toHaveProperty('transactions');

  if (isSafeJsonLike(json)) {
    expect(Array.isArray(json.transactions)).toBe(true);
    if (Array.isArray(json.transactions)) {
      expect(json.transactions.length).toBeGreaterThan(0);
    }
  }
}

/**
 * Creates a matcher for error messages
 */
export function expectToThrowError(fn: () => void, expectedMessage: string | RegExp): void {
  expect(fn).toThrow(expectedMessage);
}

/**
 * Validates that a string is a valid bytes32 hex string
 */
export function expectValidBytes32(bytes: string): void {
  expect(bytes).toMatch(/^0x[a-fA-F0-9]{64}$/);
}

/**
 * Helper to validate transaction array structure
 */
export function expectValidTransactionArray(transactions: SafeTransactionDataBase[]): void {
  expect(Array.isArray(transactions)).toBe(true);
  expect(transactions.length).toBeGreaterThan(0);
  transactions.forEach((tx) => {
    expectValidTransaction(tx);
  });
}

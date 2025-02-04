/**
 * Tests for InterfaceProvider
 * Covers interface caching and retrieval
 */

import { createInterfaceProvider } from '../../services/InterfaceProvider';
import {
  TokenPool__factory,
  TokenPoolFactory__factory,
  FactoryBurnMintERC20__factory,
} from '../../typechain';

describe('InterfaceProvider', () => {
  describe('getTokenPoolInterface', () => {
    it('should return TokenPool interface', () => {
      const provider = createInterfaceProvider();
      const tokenPoolInterface = provider.getTokenPoolInterface();

      expect(tokenPoolInterface).toBeDefined();
      expect(tokenPoolInterface.fragments.length).toBeGreaterThan(0);
    });

    it('should cache and return same interface instance on subsequent calls', () => {
      const provider = createInterfaceProvider();
      const firstCall = provider.getTokenPoolInterface();
      const secondCall = provider.getTokenPoolInterface();

      expect(firstCall).toBe(secondCall);
    });

    it('should have applyChainUpdates function', () => {
      const provider = createInterfaceProvider();
      const tokenPoolInterface = provider.getTokenPoolInterface();

      const fragment = tokenPoolInterface.getFunction('applyChainUpdates');
      expect(fragment).toBeDefined();
      expect(fragment?.name).toBe('applyChainUpdates');
    });

    it('should have setChainRateLimiterConfig function', () => {
      const provider = createInterfaceProvider();
      const tokenPoolInterface = provider.getTokenPoolInterface();

      const fragment = tokenPoolInterface.getFunction('setChainRateLimiterConfig');
      expect(fragment).toBeDefined();
    });

    it('should have applyAllowListUpdates function', () => {
      const provider = createInterfaceProvider();
      const tokenPoolInterface = provider.getTokenPoolInterface();

      const fragment = tokenPoolInterface.getFunction('applyAllowListUpdates');
      expect(fragment).toBeDefined();
    });
  });

  describe('getTokenPoolFactoryInterface', () => {
    it('should return TokenPoolFactory interface', () => {
      const provider = createInterfaceProvider();
      const factoryInterface = provider.getTokenPoolFactoryInterface();

      expect(factoryInterface).toBeDefined();
      expect(factoryInterface.fragments.length).toBeGreaterThan(0);
    });

    it('should cache and return same interface instance on subsequent calls', () => {
      const provider = createInterfaceProvider();
      const firstCall = provider.getTokenPoolFactoryInterface();
      const secondCall = provider.getTokenPoolFactoryInterface();

      expect(firstCall).toBe(secondCall);
    });

    it('should have deployTokenAndTokenPool function', () => {
      const provider = createInterfaceProvider();
      const factoryInterface = provider.getTokenPoolFactoryInterface();

      const fragment = factoryInterface.getFunction('deployTokenAndTokenPool');
      expect(fragment).toBeDefined();
      expect(fragment?.name).toBe('deployTokenAndTokenPool');
    });

    it('should have deployTokenPoolWithExistingToken function', () => {
      const provider = createInterfaceProvider();
      const factoryInterface = provider.getTokenPoolFactoryInterface();

      const fragment = factoryInterface.getFunction('deployTokenPoolWithExistingToken');
      expect(fragment).toBeDefined();
    });
  });

  describe('getFactoryBurnMintERC20Interface', () => {
    it('should return FactoryBurnMintERC20 interface', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      expect(tokenInterface).toBeDefined();
      expect(tokenInterface.fragments.length).toBeGreaterThan(0);
    });

    it('should cache and return same interface instance on subsequent calls', () => {
      const provider = createInterfaceProvider();
      const firstCall = provider.getFactoryBurnMintERC20Interface();
      const secondCall = provider.getFactoryBurnMintERC20Interface();

      expect(firstCall).toBe(secondCall);
    });

    it('should have mint function', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      const fragment = tokenInterface.getFunction('mint');
      expect(fragment).toBeDefined();
      expect(fragment?.name).toBe('mint');
    });

    it('should have grantMintRole function', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      const fragment = tokenInterface.getFunction('grantMintRole');
      expect(fragment).toBeDefined();
    });

    it('should have grantBurnRole function', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      const fragment = tokenInterface.getFunction('grantBurnRole');
      expect(fragment).toBeDefined();
    });

    it('should have grantMintAndBurnRoles function', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      const fragment = tokenInterface.getFunction('grantMintAndBurnRoles');
      expect(fragment).toBeDefined();
    });

    it('should have revokeMintRole function', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      const fragment = tokenInterface.getFunction('revokeMintRole');
      expect(fragment).toBeDefined();
    });

    it('should have revokeBurnRole function', () => {
      const provider = createInterfaceProvider();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      const fragment = tokenInterface.getFunction('revokeBurnRole');
      expect(fragment).toBeDefined();
    });
  });

  describe('Cache behavior', () => {
    it('should maintain separate caches for different interfaces', () => {
      const provider = createInterfaceProvider();

      const tokenPoolInterface = provider.getTokenPoolInterface();
      const factoryInterface = provider.getTokenPoolFactoryInterface();
      const tokenInterface = provider.getFactoryBurnMintERC20Interface();

      // All should be different instances
      expect(tokenPoolInterface).not.toBe(factoryInterface);
      expect(tokenPoolInterface).not.toBe(tokenInterface);
      expect(factoryInterface).not.toBe(tokenInterface);
    });

    it('should not share cache between different provider instances', () => {
      const provider1 = createInterfaceProvider();
      const provider2 = createInterfaceProvider();

      const interface1 = provider1.getTokenPoolInterface();
      const interface2 = provider2.getTokenPoolInterface();

      // Different provider instances should create separate interface instances
      // (even though they represent the same contract)
      expect(interface1).not.toBe(interface2);
    });

    it('should cache all three interfaces independently', () => {
      const provider = createInterfaceProvider();

      // Get all interfaces
      const tokenPool1 = provider.getTokenPoolInterface();
      const factory1 = provider.getTokenPoolFactoryInterface();
      const token1 = provider.getFactoryBurnMintERC20Interface();

      // Get them again
      const tokenPool2 = provider.getTokenPoolInterface();
      const factory2 = provider.getTokenPoolFactoryInterface();
      const token2 = provider.getFactoryBurnMintERC20Interface();

      // Each should be cached
      expect(tokenPool1).toBe(tokenPool2);
      expect(factory1).toBe(factory2);
      expect(token1).toBe(token2);
    });
  });

  describe('Interface compatibility', () => {
    it('TokenPool interface should match factory-created interface', () => {
      const provider = createInterfaceProvider();
      const providerInterface = provider.getTokenPoolInterface();
      const factoryInterface = TokenPool__factory.createInterface();

      // Should have same function count
      expect(providerInterface.fragments.length).toBe(factoryInterface.fragments.length);
    });

    it('TokenPoolFactory interface should match factory-created interface', () => {
      const provider = createInterfaceProvider();
      const providerInterface = provider.getTokenPoolFactoryInterface();
      const factoryInterface = TokenPoolFactory__factory.createInterface();

      expect(providerInterface.fragments.length).toBe(factoryInterface.fragments.length);
    });

    it('FactoryBurnMintERC20 interface should match factory-created interface', () => {
      const provider = createInterfaceProvider();
      const providerInterface = provider.getFactoryBurnMintERC20Interface();
      const factoryInterface = FactoryBurnMintERC20__factory.createInterface();

      expect(providerInterface.fragments.length).toBe(factoryInterface.fragments.length);
    });
  });

  describe('Multiple calls performance', () => {
    it('should handle multiple sequential calls efficiently', () => {
      const provider = createInterfaceProvider();

      // Call each interface method multiple times
      for (let i = 0; i < 10; i++) {
        provider.getTokenPoolInterface();
        provider.getTokenPoolFactoryInterface();
        provider.getFactoryBurnMintERC20Interface();
      }

      // Verify cache is working (instances should be same)
      const tokenPool1 = provider.getTokenPoolInterface();
      const tokenPool2 = provider.getTokenPoolInterface();
      expect(tokenPool1).toBe(tokenPool2);
    });
  });
});

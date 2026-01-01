import { Cart } from '../domain/entities/cart';
import {
  type CartRepositoryPort,
  CartVersionConflictError,
} from '../domain/interfaces/cart-repository.port';
import { type PriceProviderPort } from '../domain/interfaces/price-provider.port';
import { promotionsConfig } from '../domain/promotions/promotions.config';
import { PromotionsEngine } from '../domain/services/promotions-engine';
import { PromotionsFactory } from '../domain/services/promotions-factory';
import { Money } from '../domain/value-objects/money';
import { type SKU } from '../domain/value-objects/sku';

import { CheckoutService } from './checkout.service';
import { IdempotencyKeyConflictError } from './idempotency-store';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let cartRepository: jest.Mocked<CartRepositoryPort>;
  let priceProvider: jest.Mocked<PriceProviderPort>;
  let promotionsEngine: PromotionsEngine;

  beforeEach(async () => {
    const mockCartRepository: jest.Mocked<CartRepositoryPort> = {
      create: jest.fn(),
      get: jest.fn(),
      save: jest.fn(),
    };

    const mockPriceProvider: jest.Mocked<PriceProviderPort> = {
      getPrices: jest.fn(),
    };

    const factory = new PromotionsFactory();
    const promotions = factory.build(promotionsConfig);
    promotionsEngine = new PromotionsEngine(promotions);

    service = new CheckoutService(mockCartRepository, mockPriceProvider, promotionsEngine);
    cartRepository = mockCartRepository;
    priceProvider = mockPriceProvider;
  });

  describe('createCart', () => {
    it('should create a new cart and return cartId', async () => {
      const cart = new Cart('cart-1');
      cartRepository.create.mockResolvedValue(cart);

      const cartId = await service.createCart();

      expect(cartId).toBe('cart-1');
      expect(cartRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('scan', () => {
    it('should add item to cart and return new version', async () => {
      const cart = new Cart('cart-1');
      cartRepository.get.mockResolvedValue(cart);
      cartRepository.save.mockResolvedValue(undefined);

      const version = await service.scan('cart-1', 'APE', 1);

      expect(version).toBe(2);
      expect(cartRepository.get).toHaveBeenCalledWith('cart-1');
      expect(cartRepository.save).toHaveBeenCalledWith(cart, 1);
      expect(cart.getItemQuantity('APE')).toBe(1);
    });

    it('should be idempotent when same idempotencyKey is reused with same fingerprint', async () => {
      const cart = new Cart('cart-1');
      cartRepository.get.mockResolvedValue(cart);
      cartRepository.save.mockResolvedValue(undefined);

      const idempotencyKey = 'key-123';

      const version1 = await service.scan('cart-1', 'APE', 1, idempotencyKey);
      expect(version1).toBe(2);
      expect(cartRepository.save).toHaveBeenCalledTimes(1);
      expect(cart.getItemQuantity('APE')).toBe(1);

      const version2 = await service.scan('cart-1', 'APE', 1, idempotencyKey);
      expect(version2).toBe(2);
      expect(cartRepository.save).toHaveBeenCalledTimes(1);
      expect(cart.getItemQuantity('APE')).toBe(1);
    });

    it('should throw IdempotencyKeyConflictError when same key is reused with different fingerprint', async () => {
      const cart = new Cart('cart-1');
      cartRepository.get.mockResolvedValue(cart);
      cartRepository.save.mockResolvedValue(undefined);

      const idempotencyKey = 'key-123';

      await service.scan('cart-1', 'APE', 1, idempotencyKey);
      expect(cartRepository.save).toHaveBeenCalledTimes(1);

      await expect(service.scan('cart-1', 'PUNK', 1, idempotencyKey)).rejects.toThrow(
        IdempotencyKeyConflictError,
      );

      expect(cartRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw IdempotencyKeyConflictError when same key is reused with different quantity', async () => {
      const cart = new Cart('cart-1');
      cartRepository.get.mockResolvedValue(cart);
      cartRepository.save.mockResolvedValue(undefined);

      const idempotencyKey = 'key-123';

      await service.scan('cart-1', 'APE', 1, idempotencyKey);

      await expect(service.scan('cart-1', 'APE', 2, idempotencyKey)).rejects.toThrow(
        IdempotencyKeyConflictError,
      );
    });

    it('should throw IdempotencyKeyConflictError when same key is reused with different cart', async () => {
      const cart1 = new Cart('cart-1');
      const cart2 = new Cart('cart-2');
      cartRepository.get.mockResolvedValueOnce(cart1).mockResolvedValueOnce(cart2);
      cartRepository.save.mockResolvedValue(undefined);

      const idempotencyKey = 'key-123';

      await service.scan('cart-1', 'APE', 1, idempotencyKey);

      await expect(service.scan('cart-2', 'APE', 1, idempotencyKey)).rejects.toThrow(
        IdempotencyKeyConflictError,
      );
    });

    it('should apply idempotency check before mutating cart', async () => {
      const cart = new Cart('cart-1');
      cartRepository.get.mockResolvedValue(cart);
      cartRepository.save.mockResolvedValue(undefined);

      const idempotencyKey = 'key-123';

      await service.scan('cart-1', 'APE', 1, idempotencyKey);
      const initialQuantity = cart.getItemQuantity('APE');

      await service.scan('cart-1', 'APE', 1, idempotencyKey);

      expect(cart.getItemQuantity('APE')).toBe(initialQuantity);
      expect(cartRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should handle version conflict on concurrent updates', async () => {
      const cart1 = new Cart('cart-1');
      const cart2 = new Cart('cart-1', 2);
      cart2.addItem('PUNK', 1);

      cartRepository.get.mockResolvedValueOnce(cart1).mockResolvedValueOnce(cart2);

      cartRepository.save
        .mockRejectedValueOnce(new CartVersionConflictError('cart-1', 1, 2))
        .mockResolvedValueOnce(undefined);

      await expect(service.scan('cart-1', 'APE', 1)).rejects.toThrow(CartVersionConflictError);

      expect(cartRepository.save).toHaveBeenCalledWith(cart1, 1);
    });

    it('should throw error if cart not found', async () => {
      cartRepository.get.mockResolvedValue(null);

      await expect(service.scan('cart-1', 'APE', 1)).rejects.toThrow('Cart cart-1 not found');
    });
  });

  describe('getTotal', () => {
    it('should fetch latest prices every time', async () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 3);
      cartRepository.get.mockResolvedValue(cart);

      const prices1 = new Map<SKU, Money>();
      prices1.set('APE', Money.fromEther('0.1'));

      const prices2 = new Map<SKU, Money>();
      prices2.set('APE', Money.fromEther('0.15'));

      const prices3 = new Map<SKU, Money>();
      prices3.set('APE', Money.fromEther('0.2'));

      priceProvider.getPrices
        .mockResolvedValueOnce(prices1)
        .mockResolvedValueOnce(prices2)
        .mockResolvedValueOnce(prices3);

      const result1 = await service.getTotal('cart-1');
      expect(result1.total.toEther()).toBe('0.2');

      const result2 = await service.getTotal('cart-1');
      expect(result2.total.toEther()).toBe('0.3');

      const result3 = await service.getTotal('cart-1');
      expect(result3.total.toEther()).toBe('0.4');

      expect(priceProvider.getPrices).toHaveBeenCalledTimes(3);
      expect(priceProvider.getPrices).toHaveBeenCalledWith(['APE']);
    });

    it('should call PriceProviderPort on every getTotal invocation', async () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 1);
      cart.addItem('PUNK', 1);
      cartRepository.get.mockResolvedValue(cart);

      const prices = new Map<SKU, Money>();
      prices.set('APE', Money.fromEther('75'));
      prices.set('PUNK', Money.fromEther('60'));

      priceProvider.getPrices.mockResolvedValue(prices);

      await service.getTotal('cart-1');
      await service.getTotal('cart-1');
      await service.getTotal('cart-1');

      expect(priceProvider.getPrices).toHaveBeenCalledTimes(3);
      expect(priceProvider.getPrices).toHaveBeenCalledWith(['APE', 'PUNK']);
    });

    it('should calculate pricing with promotions', async () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 3);
      cart.addItem('PUNK', 3);
      cartRepository.get.mockResolvedValue(cart);

      const prices = new Map<SKU, Money>();
      prices.set('APE', Money.fromEther('0.1'));
      prices.set('PUNK', Money.fromEther('0.2'));

      priceProvider.getPrices.mockResolvedValue(prices);

      const result = await service.getTotal('cart-1');

      expect(result.lineItems).toHaveLength(2);
      expect(result.adjustments).toHaveLength(2);
      expect(result.total.toEther()).toBe('0.68');
    });

    it('should throw error if cart not found', async () => {
      cartRepository.get.mockResolvedValue(null);

      await expect(service.getTotal('cart-1')).rejects.toThrow('Cart cart-1 not found');
    });
  });
});

import { Injectable, Inject } from '@nestjs/common';

import {
  CartRepositoryPort,
  CartVersionConflictError,
} from '../domain/interfaces/cart-repository.port';
import { PriceProviderPort } from '../domain/interfaces/price-provider.port';
import { type PricingBreakdown } from '../domain/models/pricing-breakdown';
import { PromotionsEngine } from '../domain/services/promotions-engine';
import { CART_REPOSITORY_TOKEN, PRICE_PROVIDER_TOKEN } from '../infrastructure/modules/checkout.tokens';

import { IdempotencyStore } from './idempotency-store';

@Injectable()
export class CheckoutService {
  private readonly idempotencyStore = new IdempotencyStore();

  constructor(
    @Inject(CART_REPOSITORY_TOKEN)
    private readonly cartRepository: CartRepositoryPort,
    @Inject(PRICE_PROVIDER_TOKEN)
    private readonly priceProvider: PriceProviderPort,
    private readonly promotionsEngine: PromotionsEngine,
  ) {}

  async createCart(): Promise<string> {
    const cart = await this.cartRepository.create();
    return cart.getId();
  }

  async scan(
    cartId: string,
    sku: string,
    quantity: number = 1,
    idempotencyKey?: string,
  ): Promise<number> {
    if (idempotencyKey) {
      const fingerprint = this.idempotencyStore.createFingerprint(sku, quantity);
      const verification = this.idempotencyStore.verifyAndSet(idempotencyKey, cartId, fingerprint);

      if (verification.isDuplicate) {
        return verification.version ?? 0;
      }
    }

    const cart = await this.cartRepository.get(cartId);
    if (!cart) {
      throw new Error(`Cart ${cartId} not found`);
    }

    const expectedVersion = cart.getVersion();
    cart.addItem(sku, quantity);
    const newVersion = cart.getVersion();

    try {
      await this.cartRepository.save(cart, expectedVersion);

      if (idempotencyKey) {
        const fingerprint = this.idempotencyStore.createFingerprint(sku, quantity);
        this.idempotencyStore.set(idempotencyKey, cartId, newVersion, fingerprint);
      }

      return newVersion;
    } catch (error) {
      if (error instanceof CartVersionConflictError) {
        throw error;
      }
      throw error;
    }
  }

  async getTotal(cartId: string): Promise<PricingBreakdown> {
    const cart = await this.cartRepository.get(cartId);
    if (!cart) {
      throw new Error(`Cart ${cartId} not found`);
    }

    const snapshot = cart.snapshot();
    const skus = Array.from(new Set(snapshot.items.map((item) => item.sku)));

    const prices = await this.priceProvider.getPrices(skus);

    return this.promotionsEngine.calculatePricing(snapshot, prices);
  }
}

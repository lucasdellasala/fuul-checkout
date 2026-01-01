import { Injectable } from '@nestjs/common';

import { type PriceProviderPort } from '../../domain/interfaces/price-provider.port';
import { Money } from '../../domain/value-objects/money';
import { type SKU } from '../../domain/value-objects/sku';

@Injectable()
export class ExternalTokenPriceService implements PriceProviderPort {
  private prices = new Map<SKU, Money>([
    ['APE', Money.fromEther('75')],
    ['PUNK', Money.fromEther('60')],
    ['MEEBIT', Money.fromEther('4')],
  ]);

  private simulateLatency = false;
  private latencyMs = 100;

  async getPrices(skus: SKU[]): Promise<Map<SKU, Money>> {
    if (this.simulateLatency) {
      await this.delay(this.latencyMs);
    }

    const result = new Map<SKU, Money>();
    for (const sku of skus) {
      const price = this.prices.get(sku);
      if (price) {
        result.set(sku, price);
      }
    }
    return result;
  }

  setPrice(sku: SKU, price: Money): void {
    this.prices.set(sku, price);
  }

  setPrices(prices: Map<SKU, Money>): void {
    this.prices = new Map(prices);
  }

  enableLatencySimulation(latencyMs: number = 100): void {
    this.simulateLatency = true;
    this.latencyMs = latencyMs;
  }

  disableLatencySimulation(): void {
    this.simulateLatency = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

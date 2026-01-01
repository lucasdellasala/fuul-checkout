import { Injectable } from '@nestjs/common';

import { type PriceProviderPort } from '../../domain/interfaces/price-provider.port';
import { Money } from '../../domain/value-objects/money';
import { type SKU } from '../../domain/value-objects/sku';

@Injectable()
export class MockPriceProvider implements PriceProviderPort {
  private readonly prices = new Map<SKU, Money>([
    ['APE', Money.fromEther('0.1')],
    ['PUNK', Money.fromEther('0.2')],
    ['MEEBIT', Money.fromEther('0.15')],
  ]);

  async getPrices(skus: SKU[]): Promise<Map<SKU, Money>> {
    const result = new Map<SKU, Money>();
    for (const sku of skus) {
      const price = this.prices.get(sku);
      if (price) {
        result.set(sku, price);
      }
    }
    return result;
  }
}

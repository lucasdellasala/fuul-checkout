import { type Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

export interface PriceProviderPort {
  getPrices(skus: SKU[]): Promise<Map<SKU, Money>>;
}

import { type CartSnapshot } from '../entities/cart';
import { type Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

export interface Adjustment {
  promoId: string;
  sku: SKU;
  type: string;
  amount: Money;
  description: string;
}

export interface Promotion {
  id: string;
  priority: number;

  applies(cartSnapshot: CartSnapshot, prices: Map<SKU, Money>): boolean;

  apply(
    cartSnapshot: CartSnapshot,
    prices: Map<SKU, Money>,
  ): {
    adjustments: Adjustment[];
    subtotals: Map<SKU, Money>;
  };
}

import { type Adjustment } from '../interfaces/promotion.interface';
import { type Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

export interface LineItem {
  sku: SKU;
  quantity: number;
  unitPrice: Money;
  subtotalBeforePromo: Money;
  subtotalAfterPromo: Money;
}

export interface PricingBreakdown {
  lineItems: readonly LineItem[];
  adjustments: readonly Adjustment[];
  total: Money;
  priceTimestamp: Date;
  metadata?: Record<string, unknown>;
}

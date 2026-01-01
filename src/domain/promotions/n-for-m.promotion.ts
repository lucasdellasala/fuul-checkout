import { type CartSnapshot } from '../entities/cart';
import { type Promotion, type Adjustment } from '../interfaces/promotion.interface';
import { type Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

interface NForMPromotionParams {
  id: string;
  priority: number;
  sku: SKU;
  n: number;
  m: number;
}

export class NForMPromotion implements Promotion {
  readonly id: string;
  readonly priority: number;

  private readonly sku: SKU;
  private readonly n: number;
  private readonly m: number;

  constructor(params: NForMPromotionParams) {
    if (params.n <= 0 || params.m <= 0) {
      throw new Error('n and m must be positive integers');
    }

    this.id = params.id;
    this.priority = params.priority;
    this.sku = params.sku;
    this.n = params.n;
    this.m = params.m;
  }

  applies(cartSnapshot: CartSnapshot, _prices: Map<SKU, Money>): boolean {
    const item = cartSnapshot.items.find((cartItem) => cartItem.sku === this.sku);
    return item !== undefined && item.quantity >= this.n;
  }

  appliesToSKU(sku: SKU, quantity: number): boolean {
    return sku === this.sku && quantity >= this.n;
  }

  apply(
    cartSnapshot: CartSnapshot,
    prices: Map<SKU, Money>,
  ): {
    adjustments: Adjustment[];
    subtotals: Map<SKU, Money>;
  } {
    const item = cartSnapshot.items.find((cartItem) => cartItem.sku === this.sku);
    if (!item || item.quantity < this.n) {
      return { adjustments: [], subtotals: new Map() };
    }

    const unitPrice = prices.get(this.sku);
    if (!unitPrice) {
      return { adjustments: [], subtotals: new Map() };
    }

    const quantity = item.quantity;
    const groups = Math.floor(quantity / this.n);
    const remainder = quantity % this.n;
    const chargedUnits = groups * this.m + remainder;

    const baseSubtotal = unitPrice.multiply(quantity);
    const finalSubtotal = unitPrice.multiply(chargedUnits);
    const discount = baseSubtotal.subtract(finalSubtotal);

    const adjustments: Adjustment[] = [
      {
        promoId: this.id,
        sku: this.sku,
        type: 'discount',
        amount: discount,
        description: `${this.n} for ${this.m}: pay ${chargedUnits} when buying ${quantity} ${this.sku}`,
      },
    ];

    const subtotals = new Map<SKU, Money>();
    subtotals.set(this.sku, finalSubtotal);

    return { adjustments, subtotals };
  }
}

import { type CartSnapshot } from '../entities/cart';
import { type Promotion, type Adjustment } from '../interfaces/promotion.interface';
import { Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

interface BulkDiscountPromotionParams {
  id: string;
  priority: number;
  sku: SKU;
  minQty: number;
  percentOff: number;
}

export class BulkDiscountPromotion implements Promotion {
  readonly id: string;
  readonly priority: number;

  private readonly sku: SKU;
  private readonly minQty: number;
  private readonly percentOff: number;

  constructor(params: BulkDiscountPromotionParams) {
    if (params.minQty <= 0) {
      throw new Error('minQty must be a positive integer');
    }
    if (params.percentOff <= 0 || params.percentOff >= 1) {
      throw new Error('percentOff must be between 0 and 1 (exclusive)');
    }

    this.id = params.id;
    this.priority = params.priority;
    this.sku = params.sku;
    this.minQty = params.minQty;
    this.percentOff = params.percentOff;
  }

  applies(cartSnapshot: CartSnapshot, _prices: Map<SKU, Money>): boolean {
    const item = cartSnapshot.items.find((cartItem) => cartItem.sku === this.sku);
    return item !== undefined && item.quantity >= this.minQty;
  }

  appliesToSKU(sku: SKU, quantity: number): boolean {
    return sku === this.sku && quantity >= this.minQty;
  }

  apply(
    cartSnapshot: CartSnapshot,
    prices: Map<SKU, Money>,
  ): {
    adjustments: Adjustment[];
    subtotals: Map<SKU, Money>;
  } {
    const item = cartSnapshot.items.find((cartItem) => cartItem.sku === this.sku);
    if (!item || item.quantity < this.minQty) {
      return { adjustments: [], subtotals: new Map() };
    }

    const unitPrice = prices.get(this.sku);
    if (!unitPrice) {
      return { adjustments: [], subtotals: new Map() };
    }

    const quantity = item.quantity;
    const baseSubtotal = unitPrice.multiply(quantity);

    const percentFactor = BigInt(Math.round(this.percentOff * 10000));
    const discountWei = (baseSubtotal.toWei() * percentFactor) / 10000n;
    const discount = Money.fromWei(discountWei);
    const finalSubtotal = baseSubtotal.subtract(discount);

    const percentLabel = (this.percentOff * 100).toFixed(2).replace(/\.?0+$/, '');

    const adjustments: Adjustment[] = [
      {
        promoId: this.id,
        sku: this.sku,
        type: 'discount',
        amount: discount,
        description: `${percentLabel}% off each unit (${quantity} units)`,
      },
    ];

    const subtotals = new Map<SKU, Money>();
    subtotals.set(this.sku, finalSubtotal);

    return { adjustments, subtotals };
  }
}

import { type CartSnapshot } from '../entities/cart';
import { type Promotion, type Adjustment } from '../interfaces/promotion.interface';
import { Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

export class PunkBulkDiscountPromotion implements Promotion {
  readonly id = 'PUNK_BULK_20_OFF';
  readonly priority = 1;

  applies(cartSnapshot: CartSnapshot, _prices: Map<SKU, Money>): boolean {
    const punkItem = cartSnapshot.items.find((item) => item.sku === 'PUNK');
    return punkItem !== undefined && punkItem.quantity >= 3;
  }

  appliesToSKU(sku: SKU, quantity: number): boolean {
    return sku === 'PUNK' && quantity >= 3;
  }

  apply(
    cartSnapshot: CartSnapshot,
    prices: Map<SKU, Money>,
  ): {
    adjustments: Adjustment[];
    subtotals: Map<SKU, Money>;
  } {
    const punkItem = cartSnapshot.items.find((item) => item.sku === 'PUNK');
    if (!punkItem || punkItem.quantity < 3) {
      return { adjustments: [], subtotals: new Map() };
    }

    const unitPrice = prices.get('PUNK');
    if (!unitPrice) {
      return { adjustments: [], subtotals: new Map() };
    }

    const quantity = punkItem.quantity;
    const baseSubtotal = unitPrice.multiply(quantity);
    const discountPercent = 20;
    const discountAmountWei = (baseSubtotal.toWei() * BigInt(discountPercent)) / 100n;
    const discountAmountMoney = Money.fromWei(discountAmountWei);
    const finalSubtotal = baseSubtotal.subtract(discountAmountMoney);

    const adjustments: Adjustment[] = [
      {
        promoId: this.id,
        sku: 'PUNK',
        type: 'discount',
        amount: discountAmountMoney,
        description: `20% off each unit (${quantity} units)`,
      },
    ];

    const subtotals = new Map<SKU, Money>();
    subtotals.set('PUNK', finalSubtotal);

    return { adjustments, subtotals };
  }
}

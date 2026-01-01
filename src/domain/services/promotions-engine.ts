import { type CartSnapshot } from '../entities/cart';
import { type Promotion, type Adjustment } from '../interfaces/promotion.interface';
import { type PricingBreakdown, type LineItem } from '../models/pricing-breakdown';
import { Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

export class PromotionsEngine {
  constructor(private readonly promotions: Promotion[]) {
    this.promotions.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.id.localeCompare(b.id);
    });
  }

  calculatePricing(cartSnapshot: CartSnapshot, prices: Map<SKU, Money>): PricingBreakdown {
    const lineItems: LineItem[] = [];
    const allAdjustments: Adjustment[] = [];
    let total = Money.zero();

    const itemsBySKU = this.groupItemsBySKU(cartSnapshot.items);

    for (const [sku, quantity] of itemsBySKU.entries()) {
      if (quantity <= 0) {
        continue;
      }

      const unitPrice = prices.get(sku);
      if (!unitPrice) {
        continue;
      }

      const baseSubtotal = unitPrice.multiply(quantity);
      const selectedPromo = this.selectPromotionForSKU(sku, quantity, cartSnapshot, prices);

      let finalSubtotal = baseSubtotal;
      const skuAdjustments: Adjustment[] = [];

      if (selectedPromo) {
        const skuOnlySnapshot: CartSnapshot = {
          id: cartSnapshot.id,
          version: cartSnapshot.version,
          items: Object.freeze([{ sku, quantity }]),
          createdAt: cartSnapshot.createdAt,
        };
        const promoResult = selectedPromo.apply(skuOnlySnapshot, prices);
        const skuSubtotal = promoResult.subtotals.get(sku);
        if (skuSubtotal) {
          finalSubtotal = skuSubtotal;
        }
        skuAdjustments.push(...promoResult.adjustments.filter((adj) => adj.sku === sku));
      }

      lineItems.push({
        sku,
        quantity,
        unitPrice,
        subtotalBeforePromo: baseSubtotal,
        subtotalAfterPromo: finalSubtotal,
      });

      allAdjustments.push(...skuAdjustments);
      total = total.add(finalSubtotal);
    }

    return {
      lineItems: Object.freeze(lineItems),
      adjustments: Object.freeze(allAdjustments),
      total,
      priceTimestamp: new Date(),
    };
  }

  private groupItemsBySKU(items: readonly { sku: SKU; quantity: number }[]): Map<SKU, number> {
    const grouped = new Map<SKU, number>();

    for (const item of items) {
      const currentQuantity = grouped.get(item.sku) || 0;
      grouped.set(item.sku, currentQuantity + item.quantity);
    }

    return grouped;
  }

  private selectPromotionForSKU(
    sku: SKU,
    quantity: number,
    cartSnapshot: CartSnapshot,
    prices: Map<SKU, Money>,
  ): Promotion | null {
    const applicablePromos: Promotion[] = [];

    for (const promo of this.promotions) {
      if ('appliesToSKU' in promo && typeof promo.appliesToSKU === 'function') {
        if (promo.appliesToSKU(sku, quantity)) {
          applicablePromos.push(promo);
        }
      } else {
        const skuOnlySnapshot: CartSnapshot = {
          id: cartSnapshot.id,
          version: cartSnapshot.version,
          items: Object.freeze([{ sku, quantity }]),
          createdAt: cartSnapshot.createdAt,
        };
        if (promo.applies(skuOnlySnapshot, prices)) {
          applicablePromos.push(promo);
        }
      }
    }

    if (applicablePromos.length === 0) {
      return null;
    }

    return applicablePromos[0];
  }
}

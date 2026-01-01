import { type CartSnapshot } from '../entities/cart';
import { promotionsConfig } from '../promotions/promotions.config';
import { Money } from '../value-objects/money';
import { type SKU } from '../value-objects/sku';

import { PromotionsEngine } from './promotions-engine';
import { PromotionsFactory } from './promotions-factory';

describe('PromotionsEngine', () => {
  let engine: PromotionsEngine;
  let prices: Map<SKU, Money>;
  let factory: PromotionsFactory;

  beforeEach(() => {
    factory = new PromotionsFactory();
    const promotions = factory.build(promotionsConfig);
    engine = new PromotionsEngine(promotions);

    prices = new Map<SKU, Money>();
    prices.set('APE', Money.fromEther('0.1'));
    prices.set('PUNK', Money.fromEther('0.2'));
    prices.set('MEEBIT', Money.fromEther('0.15'));
  });

  function createCartSnapshot(items: { sku: SKU; quantity: number }[]): CartSnapshot {
    return {
      id: 'cart-1',
      version: 1,
      items: Object.freeze(items),
      createdAt: new Date(),
    };
  }

  describe('APE 2 for 1 promotion', () => {
    it('should charge for 1 unit when quantity is 1 APE', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 1 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].sku).toBe('APE');
      expect(result.lineItems[0].quantity).toBe(1);
      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.1');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.1');
      expect(result.adjustments).toHaveLength(0);
      expect(result.total.toEther()).toBe('0.1');
    });

    it('should charge for 1 unit when quantity is 2 APE', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 2 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.2');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.1');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].promoId).toBe('APE_2_FOR_1');
      expect(result.adjustments[0].amount.toEther()).toBe('0.1');
      expect(result.total.toEther()).toBe('0.1');
    });

    it('should charge for 2 units when quantity is 3 APE', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 3 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.3');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.2');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].promoId).toBe('APE_2_FOR_1');
      expect(result.adjustments[0].sku).toBe('APE');
      expect(result.adjustments[0].amount.toEther()).toBe('0.1');
      expect(result.total.toEther()).toBe('0.2');
    });

    it('should charge for 2 units when quantity is 4 APE', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 4 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.4');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.2');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].amount.toEther()).toBe('0.2');
      expect(result.total.toEther()).toBe('0.2');
    });

    it('should charge for 3 units when quantity is 5 APE', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 5 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.5');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.3');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].amount.toEther()).toBe('0.2');
      expect(result.total.toEther()).toBe('0.3');
    });

    it('should charge for 3 units when quantity is 6 APE', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 6 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.6');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.3');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].amount.toEther()).toBe('0.3');
      expect(result.total.toEther()).toBe('0.3');
    });
  });

  describe('PUNK bulk discount promotion', () => {
    it('should not apply discount for 1 PUNK', () => {
      const snapshot = createCartSnapshot([{ sku: 'PUNK', quantity: 1 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.2');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.2');
      expect(result.adjustments).toHaveLength(0);
      expect(result.total.toEther()).toBe('0.2');
    });

    it('should not apply discount for 2 PUNK', () => {
      const snapshot = createCartSnapshot([{ sku: 'PUNK', quantity: 2 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.4');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.4');
      expect(result.adjustments).toHaveLength(0);
      expect(result.total.toEther()).toBe('0.4');
    });

    it('should apply 20% discount for 3 PUNK', () => {
      const snapshot = createCartSnapshot([{ sku: 'PUNK', quantity: 3 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.6');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.48');
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].promoId).toBe('PUNK_BULK_20_OFF');
      expect(result.adjustments[0].sku).toBe('PUNK');
      expect(result.adjustments[0].amount.toEther()).toBe('0.12');
      expect(result.total.toEther()).toBe('0.48');
    });

    it('should apply 20% discount for 4 PUNK', () => {
      const snapshot = createCartSnapshot([{ sku: 'PUNK', quantity: 4 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.8');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.64');
      expect(result.adjustments[0].amount.toEther()).toBe('0.16');
      expect(result.total.toEther()).toBe('0.64');
    });
  });

  describe('MEEBIT (no promotion)', () => {
    it('should not apply any discount for MEEBIT', () => {
      const snapshot = createCartSnapshot([{ sku: 'MEEBIT', quantity: 5 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems[0].subtotalBeforePromo.toEther()).toBe('0.75');
      expect(result.lineItems[0].subtotalAfterPromo.toEther()).toBe('0.75');
      expect(result.adjustments).toHaveLength(0);
      expect(result.total.toEther()).toBe('0.75');
    });
  });

  describe('Mixed cart scenarios', () => {
    it('should handle cart with multiple SKUs', () => {
      const snapshot = createCartSnapshot([
        { sku: 'APE', quantity: 3 },
        { sku: 'PUNK', quantity: 3 },
        { sku: 'MEEBIT', quantity: 2 },
      ]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems).toHaveLength(3);
      expect(result.adjustments).toHaveLength(2);

      const apeItem = result.lineItems.find((item) => item.sku === 'APE');
      expect(apeItem?.subtotalAfterPromo.toEther()).toBe('0.2');

      const punkItem = result.lineItems.find((item) => item.sku === 'PUNK');
      expect(punkItem?.subtotalAfterPromo.toEther()).toBe('0.48');

      const meebitItem = result.lineItems.find((item) => item.sku === 'MEEBIT');
      expect(meebitItem?.subtotalAfterPromo.toEther()).toBe('0.3');

      expect(result.total.toEther()).toBe('0.98');
    });

    it('should handle empty cart', () => {
      const snapshot = createCartSnapshot([]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems).toHaveLength(0);
      expect(result.adjustments).toHaveLength(0);
      expect(result.total.toEther()).toBe('0');
    });
  });

  describe('Order independence', () => {
    it('should produce same total regardless of item order in cart', () => {
      const snapshot1 = createCartSnapshot([
        { sku: 'APE', quantity: 3 },
        { sku: 'PUNK', quantity: 2 },
      ]);
      const snapshot2 = createCartSnapshot([
        { sku: 'PUNK', quantity: 2 },
        { sku: 'APE', quantity: 3 },
      ]);

      const result1 = engine.calculatePricing(snapshot1, prices);
      const result2 = engine.calculatePricing(snapshot2, prices);

      expect(result1.total.toEther()).toBe(result2.total.toEther());
      expect(result1.lineItems.length).toBe(result2.lineItems.length);
      expect(result1.adjustments.length).toBe(result2.adjustments.length);
    });

    it('should group same SKU items correctly', () => {
      const snapshot = createCartSnapshot([
        { sku: 'APE', quantity: 2 },
        { sku: 'PUNK', quantity: 1 },
        { sku: 'APE', quantity: 1 },
      ]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems).toHaveLength(2);
      const apeItem = result.lineItems.find((item) => item.sku === 'APE');
      expect(apeItem?.quantity).toBe(3);
      expect(apeItem?.subtotalAfterPromo.toEther()).toBe('0.2');
    });
  });

  describe('Edge cases', () => {
    it('should handle missing price gracefully', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 3 }]);
      const emptyPrices = new Map<SKU, Money>();
      const result = engine.calculatePricing(snapshot, emptyPrices);

      expect(result.lineItems).toHaveLength(0);
      expect(result.total.toEther()).toBe('0');
    });

    it('should skip zero quantity items', () => {
      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 0 }]);
      const result = engine.calculatePricing(snapshot, prices);

      expect(result.lineItems).toHaveLength(0);
      expect(result.total.toEther()).toBe('0');
    });
  });

  describe('Promotion selection determinism', () => {
    it('should select promotions deterministically by priority DESC then id ASC', () => {
      const promotions1 = factory.build(promotionsConfig);
      const promotions2 = [...factory.build(promotionsConfig)].reverse();
      const engine1 = new PromotionsEngine(promotions1);
      const engine2 = new PromotionsEngine(promotions2);

      const snapshot = createCartSnapshot([{ sku: 'APE', quantity: 2 }]);
      const result1 = engine1.calculatePricing(snapshot, prices);
      const result2 = engine2.calculatePricing(snapshot, prices);

      expect(result1.adjustments[0]?.promoId).toBe('APE_2_FOR_1');
      expect(result2.adjustments[0]?.promoId).toBe('APE_2_FOR_1');
      expect(result1.total.toEther()).toBe(result2.total.toEther());
    });
  });
});

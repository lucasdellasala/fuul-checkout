import { Money } from '../../domain/value-objects/money';
import { type SKU } from '../../domain/value-objects/sku';

import { ExternalTokenPriceService } from './external-token-price.service';

describe('ExternalTokenPriceService', () => {
  let service: ExternalTokenPriceService;

  beforeEach(() => {
    service = new ExternalTokenPriceService();
  });

  describe('getPrices', () => {
    it('should return default prices', async () => {
      const prices = await service.getPrices(['APE', 'PUNK', 'MEEBIT']);

      expect(prices.get('APE')?.toEther()).toBe('75');
      expect(prices.get('PUNK')?.toEther()).toBe('60');
      expect(prices.get('MEEBIT')?.toEther()).toBe('4');
    });

    it('should return only requested SKUs', async () => {
      const prices = await service.getPrices(['APE']);

      expect(prices.size).toBe(1);
      expect(prices.get('APE')?.toEther()).toBe('75');
      expect(prices.has('PUNK')).toBe(false);
    });

    it('should return empty map for unknown SKUs', async () => {
      const prices = await service.getPrices([]);
      expect(prices.size).toBe(0);
    });
  });

  describe('setPrice', () => {
    it('should override price for specific SKU', async () => {
      service.setPrice('APE', Money.fromEther('100'));

      const prices = await service.getPrices(['APE']);
      expect(prices.get('APE')?.toEther()).toBe('100');
    });

    it('should not affect other SKUs', async () => {
      service.setPrice('APE', Money.fromEther('100'));

      const prices = await service.getPrices(['APE', 'PUNK']);
      expect(prices.get('APE')?.toEther()).toBe('100');
      expect(prices.get('PUNK')?.toEther()).toBe('60');
    });
  });

  describe('setPrices', () => {
    it('should replace all prices', async () => {
      const newPrices = new Map<SKU, Money>([
        ['APE', Money.fromEther('50')],
        ['PUNK', Money.fromEther('40')],
        ['MEEBIT', Money.fromEther('3')],
      ]);

      service.setPrices(newPrices);

      const prices = await service.getPrices(['APE', 'PUNK', 'MEEBIT']);
      expect(prices.get('APE')?.toEther()).toBe('50');
      expect(prices.get('PUNK')?.toEther()).toBe('40');
      expect(prices.get('MEEBIT')?.toEther()).toBe('3');
    });
  });

  describe('latency simulation', () => {
    it('should not delay by default', async () => {
      const start = Date.now();
      await service.getPrices(['APE']);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should delay when latency is enabled', async () => {
      service.enableLatencySimulation(50);
      const start = Date.now();
      await service.getPrices(['APE']);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100);
    });

    it('should use custom latency duration', async () => {
      service.enableLatencySimulation(200);
      const start = Date.now();
      await service.getPrices(['APE']);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(200);
      expect(duration).toBeLessThan(250);
    });

    it('should disable latency simulation', async () => {
      service.enableLatencySimulation(100);
      service.disableLatencySimulation();

      const start = Date.now();
      await service.getPrices(['APE']);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});

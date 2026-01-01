import { BulkDiscountPromotion } from '../../../../prompts/bulk-discount.promotion';
import { type Promotion } from '../interfaces/promotion.interface';
import { NForMPromotion } from '../promotions/n-for-m.promotion';
import { type PromotionsConfig } from '../promotions/promotions.config';

export class PromotionsFactory {
  build(configs: PromotionsConfig): Promotion[] {
    return configs.map((config) => {
      switch (config.kind) {
        case 'N_FOR_M':
          return new NForMPromotion({
            id: config.id,
            priority: config.priority,
            sku: config.sku,
            n: config.n,
            m: config.m,
          });
        case 'BULK_PERCENT':
          return new BulkDiscountPromotion({
            id: config.id,
            priority: config.priority,
            sku: config.sku,
            minQty: config.minQty,
            percentOff: config.percentOff,
          });
        default:
          // Exhaustive guard
          throw new Error(`Unknown promotion kind: ${(config as { kind: string }).kind}`);
      }
    });
  }
}

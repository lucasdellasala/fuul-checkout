import { type SKU } from '../value-objects/sku';

export type PromotionConfig =
  | {
      kind: 'N_FOR_M';
      id: string;
      priority: number;
      sku: SKU;
      n: number;
      m: number;
    }
  | {
      kind: 'BULK_PERCENT';
      id: string;
      priority: number;
      sku: SKU;
      minQty: number;
      percentOff: number;
    };

export type PromotionsConfig = PromotionConfig[];

export const promotionsConfig: PromotionsConfig = [
  {
    kind: 'N_FOR_M',
    id: 'APE_2_FOR_1',
    priority: 1,
    sku: 'APE',
    n: 2,
    m: 1,
  },
  {
    kind: 'BULK_PERCENT',
    id: 'PUNK_BULK_20_OFF',
    priority: 1,
    sku: 'PUNK',
    minQty: 3,
    percentOff: 0.2,
  },
];

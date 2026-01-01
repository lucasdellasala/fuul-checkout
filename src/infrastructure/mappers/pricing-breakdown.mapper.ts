import { type PricingBreakdown } from '../../domain/models/pricing-breakdown';
import { type PricingBreakdownResponseDto } from '../dto/pricing-breakdown-response.dto';

import { MoneyMapper } from './money.mapper';

export class PricingBreakdownMapper {
  static toDto(breakdown: PricingBreakdown): PricingBreakdownResponseDto {
    return {
      lineItems: breakdown.lineItems.map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: MoneyMapper.toEthString(item.unitPrice),
        subtotalBeforePromo: MoneyMapper.toEthString(item.subtotalBeforePromo),
        subtotalAfterPromo: MoneyMapper.toEthString(item.subtotalAfterPromo),
      })),
      adjustments: breakdown.adjustments.map((adj) => ({
        promoId: adj.promoId,
        sku: adj.sku,
        type: adj.type,
        amount: MoneyMapper.toEthString(adj.amount),
        description: adj.description,
      })),
      total: MoneyMapper.toEthString(breakdown.total),
      priceTimestamp: breakdown.priceTimestamp.toISOString(),
      metadata: breakdown.metadata,
    };
  }
}

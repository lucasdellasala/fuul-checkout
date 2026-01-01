export class LineItemDto {
  sku: string;
  quantity: number;
  unitPrice: string;
  subtotalBeforePromo: string;
  subtotalAfterPromo: string;
}

export class AdjustmentDto {
  promoId: string;
  sku: string;
  type: string;
  amount: string;
  description: string;
}

export class PricingBreakdownResponseDto {
  lineItems: LineItemDto[];
  adjustments: AdjustmentDto[];
  total: string;
  priceTimestamp: string;
  metadata?: Record<string, unknown>;
}

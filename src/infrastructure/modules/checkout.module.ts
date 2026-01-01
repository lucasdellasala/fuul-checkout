import { Module } from '@nestjs/common';

import { CheckoutService } from '../../application/checkout.service';
import { promotionsConfig } from '../../domain/promotions/promotions.config';
import { PromotionsEngine } from '../../domain/services/promotions-engine';
import { PromotionsFactory } from '../../domain/services/promotions-factory';
import { InMemoryCartRepository } from '../persistence/in-memory-cart.repository';
import { ExternalTokenPriceService } from '../providers/external-token-price.service';

import { CART_REPOSITORY_TOKEN, PRICE_PROVIDER_TOKEN } from './checkout.tokens';

@Module({
  providers: [
    CheckoutService,
    {
      provide: CART_REPOSITORY_TOKEN,
      useClass: InMemoryCartRepository,
    },
    {
      provide: PRICE_PROVIDER_TOKEN,
      useClass: ExternalTokenPriceService,
    },
    {
      provide: PromotionsEngine,
      useFactory: (): PromotionsEngine => {
        const factory = new PromotionsFactory();
        const promotions = factory.build(promotionsConfig);
        return new PromotionsEngine(promotions);
      },
    },
  ],
  exports: [CheckoutService, CART_REPOSITORY_TOKEN, PRICE_PROVIDER_TOKEN],
})
export class CheckoutModule {}

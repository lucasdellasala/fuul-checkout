import { Module } from '@nestjs/common';

import { CartsController } from '../src/infrastructure/controllers/carts.controller';
import { CheckoutModule } from '../src/infrastructure/modules/checkout.module';

@Module({
  imports: [CheckoutModule],
  controllers: [CartsController],
})
export class TestCheckoutModule {}
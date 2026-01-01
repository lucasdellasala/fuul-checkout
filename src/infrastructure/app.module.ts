import { Module } from '@nestjs/common';

import { AppService } from '../application/app.service';

import { AppController } from './app.controller';
import { CartsController } from './controllers/carts.controller';
import { CheckoutModule } from './modules/checkout.module';

@Module({
  imports: [CheckoutModule],
  controllers: [AppController, CartsController],
  providers: [AppService],
})
export class AppModule {}

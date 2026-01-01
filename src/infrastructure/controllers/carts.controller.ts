import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';

import { CheckoutService } from '../../application/checkout.service';
import { CartVersionConflictError } from '../../domain/interfaces/cart-repository.port';
import { AddItemRequestDto } from '../dto/add-item-request.dto';
import { type AddItemResponseDto } from '../dto/add-item-response.dto';
import { type CreateCartResponseDto } from '../dto/create-cart-response.dto';
import { type PricingBreakdownResponseDto } from '../dto/pricing-breakdown-response.dto';
import { PricingBreakdownMapper } from '../mappers/pricing-breakdown.mapper';

@Controller('carts')
export class CartsController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCart(): Promise<CreateCartResponseDto> {
    const cartId = await this.checkoutService.createCart();
    return { cartId };
  }

  @Post(':cartId/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('cartId') cartId: string,
    @Body() addItemDto: AddItemRequestDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<AddItemResponseDto> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const quantity = addItemDto.quantity ?? 1;

    // Single retry on version conflict to handle race conditions
    // The retry will re-fetch the latest cart state via CheckoutService.scan()
    // Idempotency is preserved because the idempotency key check happens
    // before the version check in CheckoutService.scan()
    try {
      const version = await this.checkoutService.scan(
        cartId,
        addItemDto.sku,
        quantity,
        idempotencyKey,
      );

      return {
        cartId,
        version,
      };
    } catch (error) {
      // Retry once if version conflict occurs (optimistic concurrency)
      // The retry will re-fetch the latest cart state before attempting again
      if (error instanceof CartVersionConflictError) {
        // Retry with same idempotency key - CheckoutService.scan() will
        // re-fetch the cart and use the latest version
        const version = await this.checkoutService.scan(
          cartId,
          addItemDto.sku,
          quantity,
          idempotencyKey,
        );

        return {
          cartId,
          version,
        };
      }
      throw error;
    }
  }

  @Get(':cartId/total')
  async getTotal(@Param('cartId') cartId: string): Promise<PricingBreakdownResponseDto> {
    const breakdown = await this.checkoutService.getTotal(cartId);
    return PricingBreakdownMapper.toDto(breakdown);
  }
}

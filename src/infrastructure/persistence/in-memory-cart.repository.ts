import { Injectable } from '@nestjs/common';

import { Cart } from '../../domain/entities/cart';
import {
  type CartRepositoryPort,
  CartVersionConflictError,
} from '../../domain/interfaces/cart-repository.port';

@Injectable()
export class InMemoryCartRepository implements CartRepositoryPort {
  private readonly carts = new Map<string, Cart>();
  private cartIdCounter = 0;

  async create(): Promise<Cart> {
    const cartId = `cart-${++this.cartIdCounter}`;
    const cart = new Cart(cartId);
    this.carts.set(cartId, cart);
    return cart;
  }

  async get(cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      return null;
    }

    return this.cloneCart(cart);
  }

  async save(cart: Cart, expectedVersion: number): Promise<void> {
    const existingCart = this.carts.get(cart.getId());

    if (!existingCart) {
      throw new Error(`Cart ${cart.getId()} not found`);
    }

    if (existingCart.getVersion() !== expectedVersion) {
      throw new CartVersionConflictError(cart.getId(), expectedVersion, existingCart.getVersion());
    }

    this.carts.set(cart.getId(), this.cloneCart(cart));
  }

  private cloneCart(cart: Cart): Cart {
    const snapshot = cart.snapshot();
    return Cart.fromSnapshot(snapshot);
  }
}

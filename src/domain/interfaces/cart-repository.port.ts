import { type Cart } from '../entities/cart';

export class CartVersionConflictError extends Error {
  constructor(
    public readonly cartId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
  ) {
    super(
      `Cart version conflict: expected version ${expectedVersion}, but cart is at version ${actualVersion}`,
    );
    this.name = 'CartVersionConflictError';
  }
}

export interface CartRepositoryPort {
  create(): Promise<Cart>;

  get(cartId: string): Promise<Cart | null>;

  save(cart: Cart, expectedVersion: number): Promise<void>;
}

import { type SKU, validateSKU } from '../value-objects/sku';

export interface CartItem {
  sku: SKU;
  quantity: number;
}

export interface CartSnapshot {
  id: string;
  version: number;
  items: readonly CartItem[];
  createdAt: Date;
}

export class Cart {
  private readonly id: string;
  private version: number;
  private readonly items: Map<SKU, number>;

  constructor(id: string, version: number = 1) {
    if (!id || id.trim().length === 0) {
      throw new Error('Cart ID cannot be empty');
    }
    this.id = id;
    this.version = version;
    this.items = new Map<SKU, number>();
  }

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  addItem(sku: string, quantity: number = 1): void {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    const validatedSKU = validateSKU(sku);
    const currentQuantity = this.items.get(validatedSKU) || 0;
    this.items.set(validatedSKU, currentQuantity + quantity);
    this.version += 1;
  }

  getItemQuantity(sku: SKU): number {
    return this.items.get(sku) || 0;
  }

  getItems(): ReadonlyMap<SKU, number> {
    return new Map(this.items);
  }

  snapshot(): CartSnapshot {
    const items: CartItem[] = Array.from(this.items.entries()).map(([sku, quantity]) => ({
      sku,
      quantity,
    }));

    return {
      id: this.id,
      version: this.version,
      items: Object.freeze(items),
      createdAt: new Date(),
    };
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }

  getTotalItemCount(): number {
    return Array.from(this.items.values()).reduce((sum, qty) => sum + qty, 0);
  }

  static fromSnapshot(snapshot: CartSnapshot): Cart {
    const cart = new Cart(snapshot.id, snapshot.version);
    for (const item of snapshot.items) {
      const currentQuantity = cart.items.get(item.sku) || 0;
      cart.items.set(item.sku, currentQuantity + item.quantity);
    }
    return cart;
  }
}

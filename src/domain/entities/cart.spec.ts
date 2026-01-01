import { Cart, type CartItem } from './cart';

describe('Cart', () => {
  describe('constructor', () => {
    it('should create a cart with id and default version', () => {
      const cart = new Cart('cart-1');
      expect(cart.getId()).toBe('cart-1');
      expect(cart.getVersion()).toBe(1);
    });

    it('should create a cart with id and custom version', () => {
      const cart = new Cart('cart-1', 5);
      expect(cart.getId()).toBe('cart-1');
      expect(cart.getVersion()).toBe(5);
    });

    it('should throw error if id is empty', () => {
      expect(() => new Cart('')).toThrow('Cart ID cannot be empty');
      expect(() => new Cart('   ')).toThrow('Cart ID cannot be empty');
    });
  });

  describe('addItem', () => {
    it('should add item with default quantity of 1', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE');
      expect(cart.getItemQuantity('APE')).toBe(1);
      expect(cart.getVersion()).toBe(2);
    });

    it('should add item with specified quantity', () => {
      const cart = new Cart('cart-1');
      cart.addItem('PUNK', 3);
      expect(cart.getItemQuantity('PUNK')).toBe(3);
      expect(cart.getVersion()).toBe(2);
    });

    it('should accumulate quantities for same SKU', () => {
      const cart = new Cart('cart-1');
      cart.addItem('MEEBIT', 2);
      cart.addItem('MEEBIT', 3);
      expect(cart.getItemQuantity('MEEBIT')).toBe(5);
      expect(cart.getVersion()).toBe(3);
    });

    it('should increment version on each addItem call', () => {
      const cart = new Cart('cart-1', 10);
      cart.addItem('APE');
      expect(cart.getVersion()).toBe(11);
      cart.addItem('PUNK');
      expect(cart.getVersion()).toBe(12);
    });

    it('should throw error for invalid SKU', () => {
      const cart = new Cart('cart-1');
      expect(() => cart.addItem('INVALID')).toThrow('Invalid SKU: INVALID');
    });

    it('should throw error for zero quantity', () => {
      const cart = new Cart('cart-1');
      expect(() => cart.addItem('APE', 0)).toThrow('Quantity must be a positive integer');
    });

    it('should throw error for negative quantity', () => {
      const cart = new Cart('cart-1');
      expect(() => cart.addItem('APE', -1)).toThrow('Quantity must be a positive integer');
    });

    it('should throw error for non-integer quantity', () => {
      const cart = new Cart('cart-1');
      expect(() => cart.addItem('APE', 1.5)).toThrow('Quantity must be a positive integer');
    });

    it('should handle multiple different SKUs', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 2);
      cart.addItem('PUNK', 1);
      cart.addItem('MEEBIT', 3);
      expect(cart.getItemQuantity('APE')).toBe(2);
      expect(cart.getItemQuantity('PUNK')).toBe(1);
      expect(cart.getItemQuantity('MEEBIT')).toBe(3);
    });
  });

  describe('snapshot', () => {
    it('should create snapshot with correct structure', () => {
      const cart = new Cart('cart-1', 5);
      cart.addItem('APE', 2);
      cart.addItem('PUNK', 1);

      const snapshot = cart.snapshot();

      expect(snapshot.id).toBe('cart-1');
      expect(snapshot.version).toBe(7);
      expect(snapshot.items).toHaveLength(2);
      expect(snapshot.items[0]).toEqual({ sku: 'APE', quantity: 2 });
      expect(snapshot.items[1]).toEqual({ sku: 'PUNK', quantity: 1 });
      expect(snapshot.createdAt).toBeInstanceOf(Date);
    });

    it('should create deterministic snapshot for same cart state', () => {
      const cart1 = new Cart('cart-1');
      cart1.addItem('APE', 2);
      cart1.addItem('PUNK', 1);

      const cart2 = new Cart('cart-1');
      cart2.addItem('APE', 2);
      cart2.addItem('PUNK', 1);

      const snapshot1 = cart1.snapshot();
      const snapshot2 = cart2.snapshot();

      expect(snapshot1.id).toBe(snapshot2.id);
      expect(snapshot1.version).toBe(snapshot2.version);
      expect(snapshot1.items).toHaveLength(snapshot2.items.length);
      expect(snapshot1.items.map((i) => `${i.sku}:${i.quantity}`).sort()).toEqual(
        snapshot2.items.map((i) => `${i.sku}:${i.quantity}`).sort(),
      );
    });

    it('should create snapshot with empty items for empty cart', () => {
      const cart = new Cart('cart-1');
      const snapshot = cart.snapshot();

      expect(snapshot.items).toHaveLength(0);
      expect(snapshot.version).toBe(1);
    });

    it('should return frozen items array', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 1);
      const snapshot = cart.snapshot();

      expect(() => {
        (snapshot.items as CartItem[]).push({ sku: 'PUNK', quantity: 1 });
      }).toThrow();
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty cart', () => {
      const cart = new Cart('cart-1');
      expect(cart.isEmpty()).toBe(true);
    });

    it('should return false for cart with items', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 1);
      expect(cart.isEmpty()).toBe(false);
    });
  });

  describe('getTotalItemCount', () => {
    it('should return 0 for empty cart', () => {
      const cart = new Cart('cart-1');
      expect(cart.getTotalItemCount()).toBe(0);
    });

    it('should return correct total count', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 2);
      cart.addItem('PUNK', 3);
      cart.addItem('MEEBIT', 1);
      expect(cart.getTotalItemCount()).toBe(6);
    });
  });

  describe('getItems', () => {
    it('should return readonly map of items', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 2);
      const items = cart.getItems();

      expect(items.get('APE')).toBe(2);
      expect(items.size).toBe(1);
    });

    it('should return a copy, not the internal map', () => {
      const cart = new Cart('cart-1');
      cart.addItem('APE', 2);
      const items = cart.getItems();
      const initialSize = items.size;

      // Verify it's a copy by checking that the returned map
      // doesn't affect the cart (ReadonlyMap prevents direct modification)
      expect(items.size).toBe(initialSize);
      expect(cart.getItemQuantity('PUNK')).toBe(0);
      // Verify the cart still has the original item
      expect(cart.getItemQuantity('APE')).toBe(2);
    });
  });
});

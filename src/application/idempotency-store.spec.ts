import { IdempotencyStore, IdempotencyKeyConflictError } from './idempotency-store';

describe('IdempotencyStore', () => {
  let store: IdempotencyStore;

  beforeEach(() => {
    store = new IdempotencyStore();
  });

  describe('createFingerprint', () => {
    it('should create fingerprint from sku and quantity', () => {
      const fingerprint = store.createFingerprint('APE', 2);
      expect(fingerprint).toBe('APE:2');
    });

    it('should handle different skus and quantities', () => {
      expect(store.createFingerprint('APE', 1)).toBe('APE:1');
      expect(store.createFingerprint('PUNK', 3)).toBe('PUNK:3');
      expect(store.createFingerprint('MEEBIT', 5)).toBe('MEEBIT:5');
    });
  });

  describe('get and set', () => {
    it('should return null for non-existent key', () => {
      expect(store.get('non-existent')).toBeNull();
    });

    it('should store and retrieve record', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');
      const record = store.get('key-1');

      expect(record).toEqual({
        cartId: 'cart-1',
        version: 5,
        fingerprint: 'APE:2',
      });
    });

    it('should overwrite existing record', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');
      store.set('key-1', 'cart-1', 7, 'APE:3');
      const record = store.get('key-1');

      expect(record?.version).toBe(7);
      expect(record?.fingerprint).toBe('APE:3');
    });
  });

  describe('verifyAndSet', () => {
    it('should return isDuplicate: false for new key', () => {
      const result = store.verifyAndSet('key-1', 'cart-1', 'APE:2');
      expect(result.isDuplicate).toBe(false);
      expect(result.version).toBeUndefined();
    });

    it('should return isDuplicate: true for same key, cart, and fingerprint', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');
      const result = store.verifyAndSet('key-1', 'cart-1', 'APE:2');

      expect(result.isDuplicate).toBe(true);
      expect(result.version).toBe(5);
    });

    it('should throw error for same key but different cart', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');

      expect(() => {
        store.verifyAndSet('key-1', 'cart-2', 'APE:2');
      }).toThrow(IdempotencyKeyConflictError);
    });

    it('should throw error for same key and cart but different fingerprint', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');

      expect(() => {
        store.verifyAndSet('key-1', 'cart-1', 'PUNK:3');
      }).toThrow(IdempotencyKeyConflictError);
    });

    it('should throw error with correct message for different fingerprint', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');

      try {
        store.verifyAndSet('key-1', 'cart-1', 'PUNK:3');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(IdempotencyKeyConflictError);
        expect((error as IdempotencyKeyConflictError).idempotencyKey).toBe('key-1');
        expect((error as IdempotencyKeyConflictError).expectedFingerprint).toBe('APE:2');
        expect((error as IdempotencyKeyConflictError).receivedFingerprint).toBe('PUNK:3');
      }
    });
  });

  describe('clear', () => {
    it('should clear all records', () => {
      store.set('key-1', 'cart-1', 5, 'APE:2');
      store.set('key-2', 'cart-2', 3, 'PUNK:1');

      store.clear();

      expect(store.get('key-1')).toBeNull();
      expect(store.get('key-2')).toBeNull();
    });
  });
});

import { Money } from './money';

describe('Money', () => {
  describe('fromWei', () => {
    it('should create Money from wei', () => {
      const money = Money.fromWei(1000000000000000000n);
      expect(money.toWei()).toBe(1000000000000000000n);
    });

    it('should throw error for negative wei', () => {
      expect(() => Money.fromWei(-1n)).toThrow('Money amount cannot be negative');
    });
  });

  describe('fromEther', () => {
    it('should create Money from whole ether', () => {
      const money = Money.fromEther('1');
      expect(money.toWei()).toBe(1000000000000000000n);
    });

    it('should create Money from decimal ether', () => {
      const money = Money.fromEther('0.5');
      expect(money.toWei()).toBe(500000000000000000n);
    });

    it('should create Money from number', () => {
      const money = Money.fromEther(1);
      expect(money.toWei()).toBe(1000000000000000000n);
    });

    it('should handle small decimal values', () => {
      const money = Money.fromEther('0.000000000000000001');
      expect(money.toWei()).toBe(1n);
    });

    it('should throw error for too many decimal places', () => {
      expect(() => Money.fromEther('0.0000000000000000001')).toThrow(
        'Ether value has too many decimal places',
      );
    });
  });

  describe('zero', () => {
    it('should create zero Money', () => {
      const money = Money.zero();
      expect(money.toWei()).toBe(0n);
      expect(money.isZero()).toBe(true);
    });
  });

  describe('toEther', () => {
    it('should convert wei to ether string', () => {
      const money = Money.fromWei(1000000000000000000n);
      expect(money.toEther()).toBe('1');
    });

    it('should convert fractional wei to ether string', () => {
      const money = Money.fromWei(500000000000000000n);
      expect(money.toEther()).toBe('0.5');
    });

    it('should convert zero to "0"', () => {
      const money = Money.zero();
      expect(money.toEther()).toBe('0');
    });
  });

  describe('add', () => {
    it('should add two Money amounts', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('0.5');
      const result = money1.add(money2);
      expect(result.toEther()).toBe('1.5');
    });
  });

  describe('subtract', () => {
    it('should subtract two Money amounts', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('0.5');
      const result = money1.subtract(money2);
      expect(result.toEther()).toBe('0.5');
    });

    it('should throw error if result would be negative', () => {
      const money1 = Money.fromEther('0.5');
      const money2 = Money.fromEther('1');
      expect(() => money1.subtract(money2)).toThrow('Subtraction would result in negative amount');
    });
  });

  describe('multiply', () => {
    it('should multiply by number', () => {
      const money = Money.fromEther('1');
      const result = money.multiply(3);
      expect(result.toEther()).toBe('3');
    });

    it('should multiply by bigint', () => {
      const money = Money.fromEther('1');
      const result = money.multiply(3n);
      expect(result.toEther()).toBe('3');
    });

    it('should throw error for negative factor', () => {
      const money = Money.fromEther('1');
      expect(() => money.multiply(-1)).toThrow('Multiplication factor cannot be negative');
      expect(() => money.multiply(-1n)).toThrow('Multiplication factor cannot be negative');
    });

    it('should throw error for non-integer number', () => {
      const money = Money.fromEther('1');
      expect(() => money.multiply(1.5)).toThrow('Multiplication factor must be an integer');
    });
  });

  describe('equals', () => {
    it('should return true for equal amounts', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('1');
      expect(money1.equals(money2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('2');
      expect(money1.equals(money2)).toBe(false);
    });
  });

  describe('compare', () => {
    it('should return -1 for less than', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('2');
      expect(money1.compare(money2)).toBe(-1);
    });

    it('should return 1 for greater than', () => {
      const money1 = Money.fromEther('2');
      const money2 = Money.fromEther('1');
      expect(money1.compare(money2)).toBe(1);
    });

    it('should return 0 for equal', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('1');
      expect(money1.compare(money2)).toBe(0);
    });
  });

  describe('isZero', () => {
    it('should return true for zero', () => {
      expect(Money.zero().isZero()).toBe(true);
    });

    it('should return false for non-zero', () => {
      expect(Money.fromEther('1').isZero()).toBe(false);
    });
  });

  describe('isGreaterThan and isLessThan', () => {
    it('should correctly compare amounts', () => {
      const money1 = Money.fromEther('1');
      const money2 = Money.fromEther('2');

      expect(money2.isGreaterThan(money1)).toBe(true);
      expect(money1.isLessThan(money2)).toBe(true);
      expect(money1.isGreaterThan(money2)).toBe(false);
      expect(money2.isLessThan(money1)).toBe(false);
    });
  });
});

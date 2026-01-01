export class Money {
  private readonly amount: bigint;

  private constructor(amount: bigint) {
    if (amount < 0n) {
      throw new Error('Money amount cannot be negative');
    }
    this.amount = amount;
  }

  static fromWei(wei: bigint): Money {
    return new Money(wei);
  }

  static fromEther(ether: string | number): Money {
    const etherStr = typeof ether === 'number' ? ether.toString() : ether;
    const parts = etherStr.split('.');
    const wholePart = parts[0] || '0';
    const decimalPart = parts[1] || '';

    if (decimalPart.length > 18) {
      throw new Error('Ether value has too many decimal places (max 18)');
    }

    const paddedDecimal = decimalPart.padEnd(18, '0');
    const wei = BigInt(wholePart) * 10n ** 18n + BigInt(paddedDecimal);

    return new Money(wei);
  }

  static zero(): Money {
    return new Money(0n);
  }

  toWei(): bigint {
    return this.amount;
  }

  toEther(): string {
    const weiStr = this.amount.toString().padStart(19, '0');
    const wholePart = weiStr.slice(0, -18) || '0';
    const decimalPart = weiStr.slice(-18).replace(/\.?0+$/, '');
    return decimalPart ? `${wholePart}.${decimalPart}` : wholePart;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    const result = this.amount - other.amount;
    if (result < 0n) {
      throw new Error('Subtraction would result in negative amount');
    }
    return new Money(result);
  }

  multiply(factor: number | bigint): Money {
    if (typeof factor === 'number') {
      if (!Number.isInteger(factor)) {
        throw new TypeError('Multiplication factor must be an integer');
      }
      if (factor < 0) {
        throw new Error('Multiplication factor cannot be negative');
      }
      factor = BigInt(factor);
    }
    if (factor < 0n) {
      throw new Error('Multiplication factor cannot be negative');
    }
    return new Money(this.amount * factor);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }

  compare(other: Money): number {
    if (this.amount < other.amount) return -1;
    if (this.amount > other.amount) return 1;
    return 0;
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    return this.amount < other.amount;
  }
}

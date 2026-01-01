import { type Money } from '../../domain/value-objects/money';

export class MoneyMapper {
  static toEthString(money: Money): string {
    const wei = money.toWei();
    const weiStr = wei.toString().padStart(19, '0');
    const wholePart = weiStr.slice(0, -18) || '0';
    const decimalPart = weiStr.slice(-18);
    return `${wholePart}.${decimalPart}`;
  }
}

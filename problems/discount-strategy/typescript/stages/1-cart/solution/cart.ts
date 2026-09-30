export interface DiscountStrategy {
  apply(total: number): number;
}

export class NoDiscount implements DiscountStrategy {
  apply(total: number): number {
    return total;
  }
}

export class PercentOff implements DiscountStrategy {
  constructor(private percent: number) {}
  apply(total: number): number {
    return Math.floor((total * (100 - this.percent)) / 100);
  }
}

export class FlatOff implements DiscountStrategy {
  constructor(private amount: number) {}
  apply(total: number): number {
    return Math.max(0, total - this.amount);
  }
}

export class Cart {
  private prices: number[] = [];
  constructor(private strategy: DiscountStrategy) {}
  add(price: number): void {
    this.prices.push(price);
  }
  setStrategy(strategy: DiscountStrategy): void {
    this.strategy = strategy;
  }
  total(): number {
    return this.strategy.apply(this.prices.reduce((a, b) => a + b, 0));
  }
}

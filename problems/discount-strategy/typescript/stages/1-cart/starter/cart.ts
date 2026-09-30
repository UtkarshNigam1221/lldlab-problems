export interface DiscountStrategy {
  apply(total: number): number;
}

export class NoDiscount implements DiscountStrategy {
  apply(total: number): number {
    // TODO
    return 0;
  }
}

export class PercentOff implements DiscountStrategy {
  constructor(private percent: number) {}
  apply(total: number): number {
    // TODO
    return 0;
  }
}

export class FlatOff implements DiscountStrategy {
  constructor(private amount: number) {}
  apply(total: number): number {
    // TODO
    return 0;
  }
}

export class Cart {
  constructor(strategy: DiscountStrategy) {
    // TODO
  }
  add(price: number): void {}
  setStrategy(strategy: DiscountStrategy): void {}
  total(): number {
    return 0;
  }
}

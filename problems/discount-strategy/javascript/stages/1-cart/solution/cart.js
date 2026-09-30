export class NoDiscount {
  apply(total) {
    return total;
  }
}

export class PercentOff {
  constructor(percent) {
    this.percent = percent;
  }
  apply(total) {
    return Math.floor((total * (100 - this.percent)) / 100);
  }
}

export class FlatOff {
  constructor(amount) {
    this.amount = amount;
  }
  apply(total) {
    return Math.max(0, total - this.amount);
  }
}

export class Cart {
  constructor(strategy) {
    this.strategy = strategy;
    this.prices = [];
  }
  add(price) {
    this.prices.push(price);
  }
  setStrategy(strategy) {
    this.strategy = strategy;
  }
  total() {
    return this.strategy.apply(this.prices.reduce((a, b) => a + b, 0));
  }
}

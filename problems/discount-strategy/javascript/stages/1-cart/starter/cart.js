export class NoDiscount {
  apply(total) {
    // TODO
    return 0;
  }
}

export class PercentOff {
  constructor(percent) {
    this.percent = percent;
  }
  apply(total) {
    // TODO
    return 0;
  }
}

export class FlatOff {
  constructor(amount) {
    this.amount = amount;
  }
  apply(total) {
    // TODO
    return 0;
  }
}

export class Cart {
  constructor(strategy) {
    // TODO
  }
  add(price) {}
  setStrategy(strategy) {}
  total() {
    return 0;
  }
}

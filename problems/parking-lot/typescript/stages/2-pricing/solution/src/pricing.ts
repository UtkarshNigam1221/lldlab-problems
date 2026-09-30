export interface PricingStrategy {
  /** Fee in cents for a stay of `hours` (fractional hours allowed). */
  fee(hours: number): number;
}

export class HourlyPricing implements PricingStrategy {
  constructor(private centsPerHour: number) {}

  fee(hours: number): number {
    return Math.ceil(hours) * this.centsPerHour;
  }
}

export class FlatPricing implements PricingStrategy {
  constructor(private cents: number) {}

  fee(_hours: number): number {
    return this.cents;
  }
}

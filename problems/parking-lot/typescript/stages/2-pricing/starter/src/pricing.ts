export interface PricingStrategy {
  /** Fee in cents for a stay of `hours` (fractional hours allowed). */
  fee(hours: number): number;
}

export class HourlyPricing implements PricingStrategy {
  constructor(private centsPerHour: number) {}

  fee(hours: number): number {
    throw new Error('not implemented');
  }
}

export class FlatPricing implements PricingStrategy {
  constructor(private cents: number) {}

  fee(hours: number): number {
    throw new Error('not implemented');
  }
}

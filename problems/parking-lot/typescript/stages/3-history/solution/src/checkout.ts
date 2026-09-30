import type { ParkingLot } from './lot';
import type { PricingStrategy } from './pricing';

export class Checkout {
  constructor(private lot: ParkingLot, private pricing: PricingStrategy) {}

  exit(ticket: string, hours: number): number {
    this.lot.unpark(ticket);
    return this.pricing.fee(hours);
  }

  setPricing(pricing: PricingStrategy): void {
    this.pricing = pricing;
  }
}

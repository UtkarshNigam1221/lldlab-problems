import type { ParkingLot } from './lot';
import type { PricingStrategy } from './pricing';

export class Checkout {
  constructor(private lot: ParkingLot, private pricing: PricingStrategy) {}

  /** Unparks the ticket and returns the fee. Unknown tickets throw the lot's error and charge nothing. */
  exit(ticket: string, hours: number): number {
    throw new Error('not implemented');
  }

  setPricing(pricing: PricingStrategy): void {
    throw new Error('not implemented');
  }
}

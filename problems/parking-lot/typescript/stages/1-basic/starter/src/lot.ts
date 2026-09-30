import type { Size, Vehicle } from './vehicle';

/**
 * A lot with a fixed number of compact and large spots.
 * Compact vehicles may use a large spot when no compact spot is free; large vehicles need a large spot.
 */
export class ParkingLot {
  constructor(spots: Record<Size, number>) {
    throw new Error('not implemented');
  }

  /** Parks the vehicle and returns a ticket id ("T1", "T2", ...). Throws Error('lot full') when nothing fits. */
  park(vehicle: Vehicle): string {
    throw new Error('not implemented');
  }

  /** Frees the vehicle's spot and returns the vehicle. Throws Error('unknown ticket') for unknown or used tickets. */
  unpark(ticket: string): Vehicle {
    throw new Error('not implemented');
  }

  /** Number of free spots of the given size. */
  free(size: Size): number {
    throw new Error('not implemented');
  }
}

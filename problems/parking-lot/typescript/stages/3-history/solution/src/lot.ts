import type { Size, Vehicle } from './vehicle';

export class ParkingLot {
  private freeSpots: Record<Size, number>;
  private parked = new Map<string, { vehicle: Vehicle; spot: Size }>();
  private tickets = new Map<string, string[]>();
  private next = 1;

  constructor(spots: Record<Size, number>) {
    this.freeSpots = { ...spots };
  }

  park(vehicle: Vehicle): string {
    const spot = this.pick(vehicle.size);
    if (!spot) throw new Error('lot full');
    this.freeSpots[spot]--;
    const ticket = `T${this.next++}`;
    this.parked.set(ticket, { vehicle, spot });
    this.tickets.set(vehicle.plate, [...(this.tickets.get(vehicle.plate) ?? []), ticket]);
    return ticket;
  }

  unpark(ticket: string): Vehicle {
    const entry = this.parked.get(ticket);
    if (!entry) throw new Error('unknown ticket');
    this.parked.delete(ticket);
    this.freeSpots[entry.spot]++;
    return entry.vehicle;
  }

  free(size: Size): number {
    return this.freeSpots[size];
  }

  history(plate: string): string[] {
    return [...(this.tickets.get(plate) ?? [])];
  }

  private pick(size: Size): Size | undefined {
    if (size === 'compact' && this.freeSpots.compact > 0) return 'compact';
    if (this.freeSpots.large > 0) return 'large';
    return undefined;
  }
}

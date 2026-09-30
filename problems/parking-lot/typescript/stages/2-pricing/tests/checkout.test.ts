import { Checkout } from '../src/checkout';
import { ParkingLot } from '../src/lot';
import { FlatPricing, HourlyPricing } from '../src/pricing';

test('hourly pricing rounds partial hours up', () => {
  assertEqual(new HourlyPricing(200).fee(2.25), 600);
});

test('flat pricing ignores duration', () => {
  assertEqual(new FlatPricing(1500).fee(9), 1500);
});

test('exit unparks and charges', () => {
  const lot = new ParkingLot({ compact: 1, large: 0 });
  const checkout = new Checkout(lot, new HourlyPricing(300));
  const t = lot.park({ plate: 'A1', size: 'compact' });
  assertEqual(checkout.exit(t, 1.5), 600);
  assertEqual(lot.free('compact'), 1);
});

test('pricing can be swapped at runtime', () => {
  const lot = new ParkingLot({ compact: 2, large: 0 });
  const checkout = new Checkout(lot, new HourlyPricing(300));
  checkout.setPricing(new FlatPricing(1000));
  assertEqual(checkout.exit(lot.park({ plate: 'A1', size: 'compact' }), 5), 1000);
});

test('unknown ticket charges nothing', () => {
  const checkout = new Checkout(new ParkingLot({ compact: 1, large: 0 }), new FlatPricing(1000));
  let error = '';
  try {
    checkout.exit('T9', 1);
  } catch (e) {
    error = (e as Error).message;
  }
  assertEqual(error, 'unknown ticket');
});

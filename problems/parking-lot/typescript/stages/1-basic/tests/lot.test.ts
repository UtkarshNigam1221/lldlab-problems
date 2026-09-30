import { ParkingLot } from '../src/lot';

function errorOf(fn: () => unknown): string {
  try {
    fn();
    return '';
  } catch (e) {
    return (e as Error).message;
  }
}

test('parks a compact car in a compact spot', () => {
  const lot = new ParkingLot({ compact: 1, large: 1 });
  assertEqual(lot.park({ plate: 'A1', size: 'compact' }), 'T1');
  assertEqual(lot.free('compact'), 0);
  assertEqual(lot.free('large'), 1);
});

test('compact car overflows into a large spot', () => {
  const lot = new ParkingLot({ compact: 1, large: 1 });
  lot.park({ plate: 'A1', size: 'compact' });
  assertEqual(lot.park({ plate: 'A2', size: 'compact' }), 'T2');
  assertEqual(lot.free('large'), 0);
});

test('large vehicle never takes a compact spot', () => {
  const lot = new ParkingLot({ compact: 2, large: 0 });
  assertEqual(errorOf(() => lot.park({ plate: 'B1', size: 'large' })), 'lot full');
});

test('unpark frees the spot and returns the vehicle', () => {
  const lot = new ParkingLot({ compact: 1, large: 0 });
  const t = lot.park({ plate: 'A1', size: 'compact' });
  assertEqual(lot.unpark(t), { plate: 'A1', size: 'compact' });
  assertEqual(lot.free('compact'), 1);
});

test('a ticket can only be used once', () => {
  const lot = new ParkingLot({ compact: 1, large: 0 });
  const t = lot.park({ plate: 'A1', size: 'compact' });
  lot.unpark(t);
  assertEqual(errorOf(() => lot.unpark(t)), 'unknown ticket');
});

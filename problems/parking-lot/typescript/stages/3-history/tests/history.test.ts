import { ParkingLot } from '../src/lot';

test('history lists tickets in order, including finished stays', () => {
  const lot = new ParkingLot({ compact: 1, large: 0 });
  const t1 = lot.park({ plate: 'A1', size: 'compact' });
  lot.unpark(t1);
  const t2 = lot.park({ plate: 'A1', size: 'compact' });
  assertEqual(lot.history('A1'), [t1, t2]);
});

test('unknown plate has empty history', () => {
  assertEqual(new ParkingLot({ compact: 1, large: 0 }).history('ZZ'), []);
});

test('history is a copy', () => {
  const lot = new ParkingLot({ compact: 1, large: 0 });
  lot.park({ plate: 'A1', size: 'compact' });
  lot.history('A1').push('T99');
  assertEqual(lot.history('A1'), ['T1']);
});

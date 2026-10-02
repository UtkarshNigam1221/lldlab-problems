import { checkout } from '../checkout';

test('SAVE10 takes 10% off', () => {
  assertEqual(checkout(1000, ['SAVE10']), 900);
});

test('unknown codes change nothing', () => {
  assertEqual(checkout(1000, ['NOPE']), 1000);
});

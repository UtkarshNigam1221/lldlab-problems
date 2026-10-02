import { checkout } from '../checkout';

test('FLAT100 applies before SAVE10', () => {
  assertEqual(checkout(1000, ['SAVE10', 'FLAT100']), 810);
});

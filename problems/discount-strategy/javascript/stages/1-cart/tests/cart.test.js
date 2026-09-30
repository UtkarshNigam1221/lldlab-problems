import { Cart, FlatOff, NoDiscount, PercentOff } from '../cart';

test('no discount sums prices', () => {
  const c = new Cart(new NoDiscount());
  c.add(300);
  c.add(700);
  assertEqual(c.total(), 1000);
});

test('percent off rounds down', () => {
  const c = new Cart(new PercentOff(15));
  c.add(999);
  assertEqual(c.total(), 849);
});

test('flat off never below zero', () => {
  const c = new Cart(new FlatOff(5000));
  c.add(1000);
  assertEqual(c.total(), 0);
});

test('strategy can be swapped', () => {
  const c = new Cart(new NoDiscount());
  c.add(1000);
  c.setStrategy(new FlatOff(100));
  assertEqual(c.total(), 900);
});
